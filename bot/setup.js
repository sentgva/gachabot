// Привязка вебхука, меню команд и кнопки Mini App к адресу деплоя.
import { bot, COMMANDS } from './bot.js';
import { config } from './config.js';

export async function setupWebhook(origin) {
  const base = origin.replace(/\/+$/, '');
  const appUrl = config.webappUrl || `${base}/`;
  await bot.api.setWebhook(`${base}/api/bot`, {
    secret_token: config.webhookSecret,
    allowed_updates: ['message', 'callback_query', 'inline_query'],
    drop_pending_updates: true,
  });
  await bot.api.setMyCommands(COMMANDS.map(([command, description]) => ({ command, description })));
  await bot.api.setChatMenuButton({ menu_button: { type: 'web_app', text: 'GachaBot', web_app: { url: appUrl } } });
  const me = await bot.api.getMe();
  const info = await bot.api.getWebhookInfo();
  return {
    ok: true,
    bot: `@${me.username}`,
    webhook: info.url,
    mini_app: appUrl,
    inline_mode: me.supports_inline_queries ? 'включён' : 'выключен — включи в @BotFather: /setinline',
  };
}
