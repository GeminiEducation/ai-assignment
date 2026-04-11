import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

type GeminiResult =
  | { ok: true; data: any }
  | { ok: false; response: Response };

const extractRetryDelaySeconds = (payload: any): number | null => {
  const details = payload?.error?.details;
  if (!Array.isArray(details)) return null;

  const retryInfo = details.find(
    (detail: Record<string, unknown>) => detail?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
  ) as { retryDelay?: string } | undefined;

  if (!retryInfo?.retryDelay) return null;

  const match = retryInfo.retryDelay.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
};

async function callGemini(prompt: string, apiKey: string): Promise<GeminiResult> {
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

  if (response.ok) {
    return { ok: true, data: await response.json() };
  }

  const errorText = await response.text();
  console.error("Gemini error:", response.status, errorText);

  let parsedError: any = null;
  try {
    parsedError = JSON.parse(errorText);
  } catch {
    parsedError = null;
  }

  if (response.status === 429 || response.status >= 500) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error:
            response.status === 429
              ? "Gemini is temporarily unavailable because the current API quota is exhausted. Please try again later."
              : "The analysis service is temporarily unavailable. Please try again later.",
          fallback: true,
          retryAfterSeconds: extractRetryDelaySeconds(parsedError),
        }),
        { status: 200, headers: jsonHeaders }
      ),
    };
  }

  return {
    ok: false,
    response: new Response(
      JSON.stringify({
        error: parsedError?.error?.message || `Gemini API error (${response.status})`,
        fallback: false,
      }),
      { status: response.status, headers: jsonHeaders }
    ),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: jsonHeaders,
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

    const geminiResult = await callGemini(prompt, GEMINI_API_KEY);
    if (!geminiResult.ok) {
      return geminiResult.response;
    }

    const content = geminiResult.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!content) {
      return new Response(
        JSON.stringify({
          error: "The analysis service returned an empty response. Please try again later.",
          fallback: true,
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return new Response(
          JSON.stringify({
            error: "The analysis service returned an invalid response. Please try again later.",
            fallback: true,
          }),
          { status: 200, headers: jsonHeaders }
        );
      }

      result = JSON.parse(jsonMatch[0]);
    }

    if (result.internetPercentage === undefined) {
      result.internetPercentage = 0;
    }

    return new Response(JSON.stringify(result), {
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("analyze-assignment error:", e);
    return new Response(
      JSON.stringify({
        error: "The analysis service is temporarily unavailable. Please try again later.",
        fallback: true,
      }),
      { status: 200, headers: jsonHeaders }
    );
  }
});
