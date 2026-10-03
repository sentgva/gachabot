// Вебхук бота для Vercel: Telegram шлёт апдейты POST-запросом на /api/bot.
import { webhookCallback } from 'grammy';
import { bot } from '../bot/bot.js';
import { config } from '../bot/config.js';

const handle = webhookCallback(bot, 'std/http', {
  secretToken: config.webhookSecret || undefined,
  timeoutMilliseconds: 25_000,
});

export const POST = (request) => handle(request);
export const GET = () => new Response(config.token ? 'GachaBot webhook работает' : 'Не задан BOT_TOKEN в настройках проекта Vercel');
