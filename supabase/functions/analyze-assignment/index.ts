import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callGemini(prompt: string, apiKey: string, retries = 3, delay = 2000): Promise<any> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (response.status === 429 && retries > 0) {
    const jitter = Math.random() * 1000;
    const wait = delay + jitter;
    console.warn(`Rate limited. Retrying in ${wait.toFixed(0)}ms (${retries} left)`);
    await new Promise(r => setTimeout(r, wait));
    return callGemini(prompt, apiKey, retries - 1, delay * 2);
  }

  if (!response.ok) {
    const t = await response.text();
    console.error("Gemini error:", response.status, t);
    throw new Error(`Gemini API error (${response.status})`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const truncated = text.slice(0, 12000);

    const prompt = `You are an AI content detector and plagiarism checker. Analyze the provided text and determine:
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
}

Analyze this text:

${truncated}`;

    const data = await callGemini(prompt, GEMINI_API_KEY);
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    if (result.internetPercentage === undefined) result.internetPercentage = 0;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-assignment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
