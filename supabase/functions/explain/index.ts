// Supabase Edge Function: proxies AI explanations to OpenRouter so the
// API key stays server-side. Only signed-in users can call it (JWT verified
// by the Supabase gateway).
//
// Deploy:
//   supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
//   supabase secrets set OPENROUTER_MODEL=<model-id>   (optional primary model, defaults to google/gemma-4-26b-a4b-it:free;
//                                                        OpenRouter falls back to the other free models if it is rate-limited)
//   supabase functions deploy explain

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT =
  "You are a friendly KCET tutor. Explain MCQ questions in very simple language a student can easily understand. Format your answer like this:\n\nCORRECT ANSWER: [the answer letter and text]\n\nSTEP-BY-STEP EXPLANATION: Explain why it is correct in simple numbered steps.\n\nEXAMPLE: Give a small real-life or practical example to make the concept clear.\n\nCOMMON MISTAKE: Mention one common mistake students make.\n\nKeep it short, clear, and encouraging. Never just say the answer — always explain the METHOD of solving. Use only basic Hindi or English, whatever the question language is.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return json({ error: "OPENROUTER_API_KEY secret is not set" }, 500);

  let payload: { chapter?: string; question?: string; options?: Record<string, string>; correctAnswer?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { chapter = "", question, options = {}, correctAnswer = "" } = payload;
  if (!question || question.length > 4000) return json({ error: "Invalid question" }, 400);

  const optionsText = Object.entries(options)
    .slice(0, 6)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 1000)}`)
    .join("\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "KCET MCQ Practice",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      models: [
        Deno.env.get("OPENROUTER_MODEL") ?? "google/gemma-4-26b-a4b-it:free",
        "qwen/qwen3.8-27b:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
      ],
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Chapter: ${chapter}\n\nQuestion: ${question}\n\nOptions:\n${optionsText}\n\nCorrect Answer: ${correctAnswer}\n\nExplain this question in a simple and friendly way. Show the correct answer first, then explain the method step by step with an example if possible.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 1000,
    }),
  });

  if (res.status === 402) return json({ error: "AI credits exhausted. Please try again later." }, 502);
  if (res.status === 429) {
    const detail = await res.text();
    console.warn("OpenRouter 429:", detail);
    const daily = /per-day|daily/i.test(detail);
    return json(
      {
        error: daily
          ? "Daily free AI limit reached. It resets tomorrow (or add credits on OpenRouter)."
          : "AI is busy right now. Please try again in a minute.",
        detail,
      },
      502,
    );
  }
  if (!res.ok) return json({ error: `OpenRouter error ${res.status}: ${await res.text()}` }, 502);

  const data = await res.json();
  return json({ content: data.choices?.[0]?.message?.content ?? "" });
});
