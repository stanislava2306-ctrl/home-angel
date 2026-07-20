// Исток · создание платежа в ЮKassa за ИИ-разбор.
// Требует env: YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY.
// Пока они не заданы, возвращает 501 — клиент понимает, что разбор бесплатный.

import { randomUUID } from 'node:crypto';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) return new Response('payments not configured', { status: 501 });

  const price = (process.env.PAY_PRICE_RUB || '249').replace(',', '.');
  let origin;
  try { origin = new URL(req.url).origin; } catch { origin = 'https://istokyoursoul.netlify.app'; }

  const resp = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secret}`).toString('base64'),
      'Idempotence-Key': randomUUID(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { value: Number(price).toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: origin + '/?paid=1' },
      description: 'Исток — персональный ИИ-разбор результатов теста',
    }),
  });
  if (!resp.ok) {
    const detail = (await resp.text()).slice(0, 300);
    return new Response('yookassa error: ' + detail, { status: 502 });
  }
  const p = await resp.json();
  return new Response(JSON.stringify({ id: p.id, url: p.confirmation && p.confirmation.confirmation_url }), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config = { path: '/api/pay-create' };
