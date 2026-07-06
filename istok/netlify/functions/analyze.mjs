// Исток · ИИ-разбор результатов теста.
// Прокси к Claude API: ключ хранится в переменной окружения Netlify,
// в браузер никогда не попадает. Ответ стримится как plain text.

const SYSTEM = `Ты — психолог проекта «Исток», тёплый и внимательный. Тебе передают результаты
глубокого теста на детские паттерны: пять шкал с процентами (тревога покинутости, внутренний
критик, контроль как защита, эмоциональная закрытость, гиперответственность) и все 50 ответов
человека, включая его собственные формулировки в незаконченных предложениях.

Напиши персональный разбор на русском языке, обращаясь на «ты» (поле gender: "f" — женский род,
"m" — мужской). Структура:

1. Два-три абзаца о главном: что складывается из ответов в цельную картину. Обязательно опирайся
   на конкретные формулировки человека из незаконченных предложений — цитируй их бережно.
2. **Что это объясняет в твоей жизни** — 3-4 конкретных примера, как ведущие паттерны могут
   проявляться в отношениях, работе, деньгах, дружбе.
3. **С чего начать** — 3 конкретных первых шага под ведущий паттерн.

Пиши тепло и по делу, без клише и воды, 350–500 слов. Выделяй подзаголовки как **жирный текст**.
Не ставь диагнозов, не упоминай, что ты ИИ. Если в ответах видна острая боль — мягко порекомендуй
живого специалиста, без драматизации.`;

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY is not configured', { status: 500 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }
  // лёгкая валидация и обрезка, чтобы не гонять мусор
  if (!payload || !payload.patterns || !Array.isArray(payload.answers)) {
    return new Response('Bad payload', { status: 400 });
  }
  payload.answers = payload.answers.slice(0, 80).map(a => ({
    n: a.n, type: a.type,
    question: String(a.question || '').slice(0, 300),
    answer: String(a.answer ?? '').slice(0, 300),
  }));

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ISTOK_MODEL || 'claude-opus-4-8',
      max_tokens: 2000,
      stream: true,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    }),
  });

  if (!upstream.ok) {
    const detail = (await upstream.text()).slice(0, 500);
    return new Response('Claude API error: ' + detail, { status: 502 });
  }

  // Перекодируем SSE Claude API в чистый текстовый поток для браузера
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const s = line.slice(5).trim();
            if (!s || s === '[DONE]') continue;
            try {
              const ev = JSON.parse(s);
              if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(ev.delta.text));
              }
              if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason === 'refusal') {
                controller.enqueue(encoder.encode('\n\n(Разбор не может быть создан для этих ответов.)'));
              }
            } catch { /* пропускаем битые чанки */ }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};

export const config = { path: '/api/analyze' };
