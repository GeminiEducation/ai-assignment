// ──────────────────────────────────────────────────────────────────────────────
// analyze-pdf/index.ts (TypeScript)
// ──────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFileHash } from "./utils/hashFile.ts";

// ─── Types ─────────────────────────────────────────────────────────────────────
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

// ─── CORS Headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

// ─── AI System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI content detector... (same as before)`;

// ─── Supabase Client ───────────────────────────────────────────────────────────
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Gemini Provider ───────────────────────────────────────────────────────────
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

// ─── Groq Provider ─────────────────────────────────────────────────────────────
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

// ─── Analyze Handler ───────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const file: File = body.file; // ← Browser sends "file"
    const extractedText: string = body.text;

    if (!file || !extractedText) {
      return new Response(
        JSON.stringify({ error: "Missing PDF or text extraction." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 1. Hash the uploaded file
    const fileHash = await getFileHash(file);

    // 2. Check cache
    const { data: cached } = await supabase
      .from("pdf_analysis_cache")
      .select("*")
      .eq("file_hash", fileHash)
      .single();

    if (cached) {
      console.log("Cache hit → returning stored result.");
      return new Response(JSON.stringify(cached.full_report), {
        headers: jsonHeaders,
      });
    }

    // truncate (token safety)
    const truncated = extractedText.slice(0, 12000);

    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");

    let result: AnalysisResult | null = null;
    let provider = "none";

    // Try Gemini
    if (GEMINI_KEY) {
      const g = await callGemini(truncated, GEMINI_KEY);
      if (g.ok) {
        result = g.data;
        provider = "gemini";
      }
    }

    // fallback → Groq
    if (!result && GROQ_KEY) {
      const g = await callGroq(truncated, GROQ_KEY);
      if (g.ok) {
        result = g.data;
        provider = "groq";
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({
          error: "Both AI providers failed.",
          fallback: true,
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 3. Save result in cache
    await supabase.from("pdf_analysis_cache").insert({
      file_hash: fileHash,
      file_name: file.name,
      full_report: result,
      ai_percentage: result.aiPercentage,
      human_percentage: result.humanPercentage,
    });

    return new Response(JSON.stringify(result), {
      headers: jsonHeaders,
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        error: "Analyze service unavailable.",
        fallback: true,
      }),
      { status: 200, headers: jsonHeaders }
    );
  }
});