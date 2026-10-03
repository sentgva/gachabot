// Ручная перепривязка вебхука к этому домену: /api/setup?key=<секрет вебхука>
// Секрет — WEBHOOK_SECRET или производный от токена (его печатает `npm run webhook`).
import { setupWebhook } from '../bot/setup.js';
import { config } from '../bot/config.js';

export async function GET(request) {
  const url = new URL(request.url);
  if (!config.token) return new Response('Не задан BOT_TOKEN в настройках проекта Vercel', { status: 500 });
  if (url.searchParams.get('key') !== config.webhookSecret) return new Response('Неверный key', { status: 403 });
  const host = request.headers.get('x-forwarded-host') || url.host;
  return Response.json(await setupWebhook(`https://${host}`));
}
