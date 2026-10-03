// Разовая настройка после деплоя: открыть в браузере https://<проект>.vercel.app/api/setup?key=<WEBHOOK_SECRET>
// Привязывает вебхук к этому домену, выставляет меню команд и кнопку Mini App.
import { bot, COMMANDS } from '../bot/bot.js';
import { config } from '../bot/config.js';

export async function GET(request) {
  const url = new URL(request.url);
  const secret = process.env.WEBHOOK_SECRET;
  if (!config.token) return new Response('Не задан BOT_TOKEN в настройках проекта Vercel', { status: 500 });
  if (!secret) return new Response('Задай WEBHOOK_SECRET в настройках проекта Vercel', { status: 500 });
  if (url.searchParams.get('key') !== secret) return new Response('Неверный key', { status: 403 });

  const host = request.headers.get('x-forwarded-host') || url.host;
  const hook = `https://${host}/api/bot`;
  await bot.api.setWebhook(hook, {
    secret_token: secret,
    allowed_updates: ['message', 'callback_query', 'inline_query'],
    drop_pending_updates: true,
  });
  await bot.api.setMyCommands(COMMANDS.map(([command, description]) => ({ command, description })));
  if (config.webappUrl) {
    await bot.api.setChatMenuButton({ menu_button: { type: 'web_app', text: 'GachaBot', web_app: { url: config.webappUrl } } });
  }
  const me = await bot.api.getMe();
  const info = await bot.api.getWebhookInfo();
  return Response.json({
    ok: true,
    bot: `@${me.username}`,
    webhook: info.url,
    inline_mode: me.supports_inline_queries ? 'включён' : 'выключен — включи в @BotFather через /setinline',
    mini_app: config.webappUrl || 'WEBAPP_URL не задан',
  });
}
