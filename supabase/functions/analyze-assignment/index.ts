// supabase/functions/analyze-assignment/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AnalysisResult {
  aiPercentage: number;
  humanPercentage: number;
  internetPercentage: number;
  confidence: number;
  flaggedSections: string[];
  recommendations: string[];
  summary: string;
  isQnA: boolean;
  questionsAnalysis: unknown[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const SYSTEM_PROMPT = `You are an AI content detector... (same as before)`;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function callGemini(
  text: string,
  apiKey: string
): Promise<{ ok: true; data: AnalysisResult } | { ok: false }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${SYSTEM_PROMPT}\n\nAnalyze this text:\n\n${text}` }],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    if (!response.ok) return { ok: false };
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return { ok: false };
    return { ok: true, data: JSON.parse(content) };
  } catch {
    return { ok: false };
  }
}

async function callGroq(
  text: string,
  apiKey: string
): Promise<{ ok: true; data: AnalysisResult } | { ok: false }> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this text:\n\n${text}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) return { ok: false };
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ok: false };
    return { ok: true, data: JSON.parse(content) };
  } catch {
    return { ok: false };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // ── Read raw body text first for debugging ───────────────────────────
    const rawText = await req.text();
    console.log("Raw request body:", rawText.slice(0, 500));

    // ── Parse JSON safely ────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawText);
    } catch {
      console.error("Body is not valid JSON");
      return new Response(
        JSON.stringify({ error: "Request body must be valid JSON." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    console.log("Parsed body keys:", Object.keys(body));

    // ── Support BOTH old field names and new ones ────────────────────────
    // Old: { file, text }  →  New: { fileHash, fileName, text }
    const fileHash = (body.fileHash ?? body.file_hash ?? null) as string | null;
    const fileName = (body.fileName ?? body.file_name ?? "unknown.pdf") as string;
    const extractedText = (body.text ?? body.extractedText ?? null) as string | null;

    // ── Validation with descriptive errors ──────────────────────────────
    if (!fileHash) {
      console.error("Missing fileHash. Received keys:", Object.keys(body));
      return new Response(
        JSON.stringify({
          error: "Missing 'fileHash' in request body.",
          receivedKeys: Object.keys(body),
          hint: "Compute SHA-256 hash of the file in the browser and send it as 'fileHash'.",
        }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (!extractedText) {
      console.error("Missing text. Received keys:", Object.keys(body));
      return new Response(
        JSON.stringify({
          error: "Missing 'text' in request body.",
          receivedKeys: Object.keys(body),
          hint: "Send extracted PDF text as 'text'.",
        }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // ── 1. Cache lookup ──────────────────────────────────────────────────
    const { data: cached } = await supabase
      .from("pdf_analysis_cache")
      .select("full_report")
      .eq("file_hash", fileHash)
      .single();

    if (cached?.full_report) {
      console.log(`Cache HIT for ${fileHash.slice(0, 10)}…`);
      return new Response(
        JSON.stringify({ ...cached.full_report, cached: true }),
        { headers: jsonHeaders }
      );
    }

    // ── 2. Call AI ───────────────────────────────────────────────────────
    console.log(`Cache MISS — calling AI for ${fileHash.slice(0, 10)}…`);

    const truncated = extractedText.slice(0, 12000);
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");

    let result: AnalysisResult | null = null;

    if (GEMINI_KEY) {
      const g = await callGemini(truncated, GEMINI_KEY);
      if (g.ok) result = g.data;
    }
    if (!result && GROQ_KEY) {
      const g = await callGroq(truncated, GROQ_KEY);
      if (g.ok) result = g.data;
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Both AI providers failed.", fallback: true }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ── 3. Save to cache ─────────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from("pdf_analysis_cache")
      .insert({
        file_hash: fileHash,
        file_name: fileName,
        full_report: result,
        ai_percentage: result.aiPercentage,
        human_percentage: result.humanPercentage,
      });

    if (insertError) {
      console.error("Cache insert failed:", insertError.message);
    }

    return new Response(
      JSON.stringify({ ...result, cached: false }),
      { headers: jsonHeaders }
    );

  } catch (err) {
    console.error("Unhandled edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Analyze service unavailable.", fallback: true }),
      { status: 200, headers: jsonHeaders }
    );
  }
});