// Исток · проверка статуса платежа ЮKassa.
// Если платёж succeeded — выдаёт подписанный токен (HMAC от id платежа),
// который analyze.mjs принимает как доказательство оплаты. Базы данных не нужно.

import { createHmac } from 'node:crypto';

export const payToken = (id, secret) =>
  createHmac('sha256', secret).update('istok-pay:' + id).digest('hex');

export default async (req) => {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) return new Response('payments not configured', { status: 501 });

  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^[\w-]{10,64}$/.test(id)) return new Response('bad id', { status: 400 });

  const resp = await fetch('https://api.yookassa.ru/v3/payments/' + id, {
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secret}`).toString('base64') },
  });
  if (!resp.ok) return new Response('yookassa error', { status: 502 });
  const p = await resp.json();

  if (p.status === 'succeeded') {
    return new Response(JSON.stringify({ status: 'succeeded', token: payToken(id, secret) }), {
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ status: p.status }), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config = { path: '/api/pay-check' };
