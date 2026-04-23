import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─── CORS Headers ────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI content detector, plagiarism checker, AND an academic answer evaluator for Stella College.

The submitted text may be a plain essay OR a question-and-answer style assignment (where the student writes questions followed by their answers, or numbered Q&A pairs). Detect the format automatically.

Analyze the text and determine:
1. What percentage is likely AI-generated vs human-written.
2. What percentage appears to match common internet content (plagiarism/copied from web sources).
3. Which specific parts look AI-generated or copied.
4. Confidence in your analysis.
5. If the assignment is in Q&A format: evaluate each answer for correctness, completeness, and relevance to its question. List each question with a verdict (Correct / Partially Correct / Incorrect), a brief explanation, and the ideal/expected answer when the student is wrong or incomplete.
6. Actionable recommendations for the student.

Respond with ONLY a valid JSON object in this exact format:
{
  "aiPercentage": <number 0-100>,
  "humanPercentage": <number 0-100>,
  "internetPercentage": <number 0-100>,
  "confidence": <number 0-100>,
  "flaggedSections": ["<section1>", "<section2>"],
  "recommendations": ["<rec1>", "<rec2>"],
  "summary": "<brief overall analysis, mention if Q&A format was detected and overall answer quality>",
  "isQnA": <true|false>,
  "questionsAnalysis": [
    {
      "question": "<the question text>",
      "studentAnswer": "<short excerpt of the student's answer>",
      "verdict": "Correct" | "Partially Correct" | "Incorrect",
      "explanation": "<why it is correct or what is missing/wrong>",
      "correctAnswer": "<the ideal answer; empty string if verdict is Correct>"
    }
  ]
}

If the text is NOT in Q&A format, set "isQnA": false and "questionsAnalysis": [].`;

// ─── Gemini Provider ──────────────────────────────────────────────────────────
async function callGemini(
  text: string,
  apiKey: string
): Promise<{ ok: true; data: unknown } | { ok: false }> {
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

// ─── Groq Provider ────────────────────────────────────────────────────────────
async function callGroq(
  text: string,
  apiKey: string
): Promise<{ ok: true; data: unknown } | { ok: false }> {
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

// ─── Request Handler ──────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
 if (req.method === "OPTIONS") {
  return new Response("ok", {
    status: 200,
    headers: corsHeaders,
  });
}

  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'text' field in request body." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Truncate to avoid token limits
    const truncated = text.slice(0, 12000);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_API_KEY   = Deno.env.get("GROQ_API_KEY");

    // Validate that at least one key is configured
    if (!GEMINI_API_KEY && !GROQ_API_KEY) {
      console.error("No AI provider API keys found in environment.");
      return new Response(
        JSON.stringify({
          error: "Server misconfiguration: no AI provider keys set.",
          fallback: true,
        }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // deno-lint-ignore no-explicit-any
    let result: any = null;
    let provider = "none";

    // 1️⃣  Try Gemini first
    if (GEMINI_API_KEY) {
      const gemini = await callGemini(truncated, GEMINI_API_KEY);
      if (gemini.ok) {
        result   = gemini.data;
        provider = "gemini";
      } else {
        console.warn("Gemini failed — falling back to Groq...");
      }
    }

    // 2️⃣  Fallback to Groq
    if (!result && GROQ_API_KEY) {
      const groq = await callGroq(truncated, GROQ_API_KEY);
      if (groq.ok) {
        result   = groq.data;
        provider = "groq";
      } else {
        console.error("Groq also failed.");
      }
    }

    // Both providers failed
    if (!result) {
      return new Response(
        JSON.stringify({
          error: "Both AI providers are currently unavailable. Please try again later.",
          fallback: true,
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // Ensure optional field is always present
    if (result.internetPercentage === undefined) result.internetPercentage = 0;

    console.log(`✅ Analysis completed via ${provider}`);
    return new Response(JSON.stringify(result), { headers: jsonHeaders });

  } catch (e) {
    console.error("analyze-assignment error:", e);
    return new Response(
      JSON.stringify({
        error: "Analysis service temporarily unavailable. Please try again later.",
        fallback: true,
      }),
      { status: 200, headers: jsonHeaders }
    );
  }
});