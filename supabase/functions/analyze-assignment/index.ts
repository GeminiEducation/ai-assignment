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

// ── FIX 1: Revised system prompt — less biased, targets real AI signals ──────
const SYSTEM_PROMPT = `
You are a probabilistic writing analysis assistant. Your job is to estimate whether text was
likely AI-generated or human-written based on reliable linguistic signals.

IMPORTANT RULES:
- You are NOT a ground-truth classifier. Provide ESTIMATES, not verdicts.
- Do NOT penalise text simply for being well-structured, formal, or academic.
  Students are taught to write clearly. That alone is NOT an AI signal.
- Confidence should be LOW (< 0.5) unless multiple strong AI signals are present.
- When in doubt, lean toward HUMAN. A false positive harms a real student.

GENUINE AI SIGNALS to look for:
1. Overuse of filler phrases: "It is worth noting", "In today's world", "This essay will explore",
   "In conclusion, it is clear that", "One must consider", "It is important to note"
2. Suspiciously perfect hedging — always balanced ("On one hand… on the other hand") with no personal stance
3. Implausible consistency — every paragraph is the same length, same rhythm, no typos, no contractions
4. Hollow generalities — claims sound authoritative but are vague and cite nothing specific
5. Absence of any concrete personal experience, named examples, or specific dates/numbers where expected
6. Abrupt topic transitions that feel list-like rather than conversational

DO NOT flag as AI signals:
- Good grammar and spelling
- Formal or academic tone
- Clear structure (introduction, body, conclusion)
- Use of topic sentences
- Passive voice
- Absence of slang

Return ONLY valid JSON, no markdown, no fences:
{
  "aiPercentage": number (0-100),
  "humanPercentage": number (0-100),
  "internetPercentage": number (0-100),
  "confidence": number (0.0-1.0, be conservative),
  "flaggedSections": ["exact short excerpt that triggered a flag — must be a real AI signal, not just formal writing"],
  "recommendations": ["specific, actionable suggestion"],
  "summary": "2-3 sentence assessment, mention uncertainty clearly",
  "isQnA": boolean,
  "questionsAnalysis": []
}

All three percentages must sum to 100.
`;

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
          generationConfig: {
            responseMimeType: "application/json",
            // FIX 2: Raise temperature slightly so identical human text
            // doesn't always get the exact same (wrong) score.
            // Keep it low enough to remain consistent but not robotically deterministic.
            temperature: 0.2,
            topP: 0.9,
          }
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
        temperature: 0.2, // FIX 2: same change here
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

// FIX 3: Apply a bias-correction pass.
// General-purpose LLMs are known to over-predict AI content for formal writing.
// We apply a mild downward adjustment to aiPercentage when confidence is low.
function applyBiasCorrection(result: AnalysisResult): AnalysisResult {
  if (result.confidence < 0.6 && result.aiPercentage > 40) {
    const adjustment = Math.round((0.6 - result.confidence) * 30); // max ~18 points
    const newAi = Math.max(0, result.aiPercentage - adjustment);
    const diff = result.aiPercentage - newAi;
    return {
      ...result,
      aiPercentage: newAi,
      humanPercentage: Math.min(100, result.humanPercentage + diff),
    };
  }
  return result;
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
      .maybeSingle();

    if (cacheError) console.error("Cache error:", cacheError.message);

    if (cached?.full_report) {
      console.log("Cache HIT for:", fileHash.slice(0, 10));
      return new Response(JSON.stringify({ ...cached.full_report, cached: true }), { headers: jsonHeaders });
    }

    // 2. Call AI
    console.log("Cache MISS — calling AI for:", fileName);
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

    // FIX 3: Apply bias correction before caching
    result = applyBiasCorrection(result);

    // 3. Save cache
    const { error: upsertError } = await supabase.from("pdf_analysis_cache").upsert({
      file_hash: fileHash,
      file_name: fileName ?? "unknown",
      full_report: result,
      ai_percentage: result.aiPercentage,
      human_percentage: result.humanPercentage,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'file_hash' });

    if (upsertError) console.error("Cache upsert failed:", upsertError.message);

    return new Response(JSON.stringify({ ...result, cached: false }), { headers: jsonHeaders });

  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Analyze service unavailable.", fallback: true }),
      { status: 200, headers: jsonHeaders }
    );
  }
});