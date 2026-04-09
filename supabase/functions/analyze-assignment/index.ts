import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const truncated = text.slice(0, 12000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI content detector and plagiarism checker. Analyze the provided text and determine:
1. What percentage is likely AI-generated vs human-written
2. What percentage appears to match common internet content (plagiarism/copied from web sources)
3. Which specific parts look AI-generated or copied
4. Confidence in your analysis
5. Actionable recommendations for the student

Return results via the report_analysis function. The internetPercentage should estimate how much of the text appears to be directly copied or closely paraphrased from commonly available internet sources.`,
          },
          { role: "user", content: truncated },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_analysis",
              description: "Report AI content and internet plagiarism analysis results",
              parameters: {
                type: "object",
                properties: {
                  aiPercentage: { type: "number", description: "Percentage of text likely AI-generated (0-100)" },
                  humanPercentage: { type: "number", description: "Percentage of text likely human-written (0-100)" },
                  internetPercentage: { type: "number", description: "Percentage of text matching internet sources (0-100)" },
                  confidence: { type: "number", description: "Confidence in the analysis (0-100)" },
                  flaggedSections: { type: "array", items: { type: "string" }, description: "Sections that look AI-generated or copied" },
                  recommendations: { type: "array", items: { type: "string" }, description: "Actionable recommendations" },
                  summary: { type: "string", description: "Brief overall analysis summary" },
                },
                required: ["aiPercentage", "humanPercentage", "internetPercentage", "confidence", "flaggedSections", "recommendations", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      result = JSON.parse(content);
    }

    // Ensure internetPercentage exists
    if (result.internetPercentage === undefined) {
      result.internetPercentage = 0;
    }

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
