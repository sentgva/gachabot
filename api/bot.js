// Вебхук бота для Vercel: Telegram шлёт апдейты POST-запросом на /api/bot.
import { webhookCallback } from 'grammy';
import { bot } from '../bot/bot.js';
import { config } from '../bot/config.js';

const handle = webhookCallback(bot, 'std/http', {
  secretToken: config.webhookSecret || undefined,
  timeoutMilliseconds: 25_000,
});

export async function POST(request) {
  try {
    return await handle(request);
  } catch (err) {
    // В режиме вебхука bot.catch не срабатывает. Отвечаем 200, иначе Telegram будет
    // повторять апдейт. В лог — только суть: в объекте ошибки лежит контекст с токеном.
    const e = err?.error ?? err;
    console.error(`[bot] update ${err?.ctx?.update?.update_id ?? '?'}: ${e?.description || e?.message || String(e)}`);
    return new Response('ok');
  }
}

export const GET = () => new Response(config.token ? 'GachaBot webhook работает' : 'Не задан BOT_TOKEN в настройках проекта Vercel');
