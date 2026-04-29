// Домашний ангел · AI Chat Edge Function
// Supabase Dashboard → Edge Functions → New Function → "ai-chat"
// Добавь секрет: ANTHROPIC_API_KEY = твой ключ от Anthropic

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { messages, systemPrompt } = await req.json();

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) {
      return new Response(
        JSON.stringify({ error: { message: "ANTHROPIC_API_KEY not set" } }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Ограничиваем историю — последние 10 сообщений
    const recentMessages = messages.slice(-10);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        system: systemPrompt || "Ты — ИИ-ассистент системы «Домашний ангел». Помогаешь родственникам следить за безопасностью пожилых близких. Отвечай тепло, конкретно, на русском языке.",
        messages: recentMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", data);
      return new Response(
        JSON.stringify({ error: { message: data.error?.message || "Anthropic API error" } }),
        { status: response.status, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ error: { message: err.message || "Internal error" } }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
