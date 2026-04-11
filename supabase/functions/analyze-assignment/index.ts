import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const SYSTEM_PROMPT = `You are an AI content detector and plagiarism checker. Analyze the provided text and determine:
1. What percentage is likely AI-generated vs human-written
2. What percentage appears to match common internet content (plagiarism/copied from web sources)
3. Which specific parts look AI-generated or copied
4. Confidence in your analysis
5. Actionable recommendations for the student

Respond with ONLY a valid JSON object in this exact format:
{
  "aiPercentage": <number 0-100>,
  "humanPercentage": <number 0-100>,
  "internetPercentage": <number 0-100>,
  "confidence": <number 0-100>,
  "flaggedSections": ["<section1>", "<section2>"],
  "recommendations": ["<rec1>", "<rec2>"],
  "summary": "<brief overall analysis>"
}`;

async function callGemini(text: string, apiKey: string): Promise<{ ok: true; data: any } | { ok: false }> {
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
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      return { ok: false };
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return { ok: false };
    return { ok: true, data: JSON.parse(content) };
  } catch (e) {
    console.error("Gemini call failed:", e);
    return { ok: false };
  }
}

async function callGroq(text: string, apiKey: string): Promise<{ ok: true; data: any } | { ok: false }> {
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
    if (!response.ok) {
      const t = await response.text();
      console.error("Groq error:", response.status, t);
      return { ok: false };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ok: false };
    return { ok: true, data: JSON.parse(content) };
  } catch (e) {
    console.error("Groq call failed:", e);
    return { ok: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), { status: 400, headers: jsonHeaders });
    }

    const truncated = text.slice(0, 12000);
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    let result: any = null;
    let provider = "none";

    // Try Gemini first
    if (GEMINI_API_KEY) {
      const gemini = await callGemini(truncated, GEMINI_API_KEY);
      if (gemini.ok) {
        result = gemini.data;
        provider = "gemini";
      } else {
        console.warn("Gemini failed, falling back to Groq...");
      }
    }

    // Fallback to Groq
    if (!result && GROQ_API_KEY) {
      const groq = await callGroq(truncated, GROQ_API_KEY);
      if (groq.ok) {
        result = groq.data;
        provider = "groq";
      } else {
        console.error("Groq also failed.");
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Both AI providers are currently unavailable. Please try again later.", fallback: true }),
        { status: 200, headers: jsonHeaders }
      );
    }

    if (result.internetPercentage === undefined) result.internetPercentage = 0;
    console.log(`Analysis completed via ${provider}`);

    return new Response(JSON.stringify(result), { headers: jsonHeaders });
  } catch (e) {
    console.error("analyze-assignment error:", e);
    return new Response(
      JSON.stringify({ error: "Analysis service temporarily unavailable. Please try again later.", fallback: true }),
      { status: 200, headers: jsonHeaders }
    );
  }
});
