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

interface RequestBody {
  fileHash: string;
  fileName: string;
  text: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const SYSTEM_PROMPT = `You are an expert AI content detector. Analyze the given text and determine:
1. What percentage was written by AI (e.g. ChatGPT, Gemini, etc.)
2. What percentage was written by a human
3. What percentage appears to be copied from the internet

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.
The JSON must exactly match this structure:
{
  "aiPercentage": <number 0-100>,
  "humanPercentage": <number 0-100>,
  "internetPercentage": <number 0-100>,
  "confidence": <number 0-100>,
  "flaggedSections": ["<short excerpt that looks AI-generated>"],
  "recommendations": ["<actionable suggestion for the student>"],
  "summary": "<2-3 sentence overall assessment>",
  "isQnA": <true if document is Q&A format, false otherwise>,
  "questionsAnalysis": []
}
All three percentages (aiPercentage + humanPercentage + internetPercentage) must add up to 100.`;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function callGemini(text: string, apiKey: string): Promise<{ ok: true; data: AnalysisResult } | { ok: false }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nAnalyze this text:\n\n${text}` }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    if (!response.ok) {
      console.error(`Gemini HTTP ${response.status}:`, await response.text());
      return { ok: false };
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) { console.error("Gemini: empty content", JSON.stringify(data)); return { ok: false }; }
    try { return { ok: true, data: JSON.parse(content) }; }
    catch { console.error("Gemini: bad JSON:", content.slice(0, 300)); return { ok: false }; }
  } catch (err) { console.error("Gemini exception:", err); return { ok: false }; }
}

async function callGroq(text: string, apiKey: string): Promise<{ ok: true; data: AnalysisResult } | { ok: false }> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this text:\n\n${text}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });
    if (!response.ok) {
      console.error(`Groq HTTP ${response.status}:`, await response.text());
      return { ok: false };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) { console.error("Groq: empty content", JSON.stringify(data)); return { ok: false }; }
    try { return { ok: true, data: JSON.parse(content) }; }
    catch { console.error("Groq: bad JSON:", content.slice(0, 300)); return { ok: false }; }
  } catch (err) { console.error("Groq exception:", err); return { ok: false }; }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    const { fileHash, fileName, text: extractedText } = body;

    console.log("fileHash:", fileHash?.slice(0, 10), "| textLength:", extractedText?.length);
    console.log("GEMINI_KEY present:", !!Deno.env.get("GEMINI_API_KEY"));
    console.log("GROQ_KEY present:", !!Deno.env.get("GROQ_API_KEY"));

    if (!fileHash || !extractedText) {
      return new Response(
        JSON.stringify({ error: "Missing fileHash or text in request body." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Guard: reject suspiciously short hashes (should be 64-char SHA-256 hex)
    if (fileHash.length < 16) {
      return new Response(
        JSON.stringify({ error: "Invalid fileHash — must be a SHA-256 hex string." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 1. Cache check
    const { data: cached, error: cacheError } = await supabase
      .from("pdf_analysis_cache")
      .select("full_report")
      .eq("file_hash", fileHash)
      .single();

    if (cacheError && cacheError.code !== "PGRST116") console.error("Cache error:", cacheError.message);

    if (cached?.full_report) {
      console.log("Cache HIT");
      return new Response(JSON.stringify({ ...cached.full_report, cached: true }), { headers: jsonHeaders });
    }

    // 2. Call AI
    console.log("Cache MISS — calling AI...");
    const truncated = extractedText.slice(0, 12000);
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    let result: AnalysisResult | null = null;

    if (GEMINI_KEY) {
      console.log("Trying Gemini...");
      const g = await callGemini(truncated, GEMINI_KEY);
      if (g.ok) { result = g.data; console.log("Gemini OK"); }
    }
    if (!result && GROQ_KEY) {
      console.log("Trying Groq...");
      const g = await callGroq(truncated, GROQ_KEY);
      if (g.ok) { result = g.data; console.log("Groq OK"); }
    }

    if (!result) {
      console.error("Both providers failed");
      return new Response(
        JSON.stringify({ error: "Both AI providers failed.", fallback: true }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 3. Save cache
    const { error: insertError } = await supabase.from("pdf_analysis_cache").insert({
      file_hash: fileHash,
      file_name: fileName ?? "unknown",
      full_report: result,
      ai_percentage: result.aiPercentage,
      human_percentage: result.humanPercentage,
    });
    if (insertError) console.error("Cache insert failed:", insertError.message);

    return new Response(JSON.stringify({ ...result, cached: false }), { headers: jsonHeaders });

  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Analyze service unavailable.", fallback: true }),
      { status: 200, headers: jsonHeaders }
    );
  }
});