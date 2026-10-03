// Вебхук бота для Vercel: Telegram шлёт апдейты POST-запросом на /api/bot.
import { webhookCallback } from 'grammy';
import { bot } from '../bot/bot.js';

const handle = webhookCallback(bot, 'std/http', {
  secretToken: process.env.WEBHOOK_SECRET || undefined,
  timeoutMilliseconds: 25_000,
});

export const POST = (request) => handle(request);
export const GET = () => new Response('GachaBot webhook работает. Настройка: /api/setup?key=WEBHOOK_SECRET');
