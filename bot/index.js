// GachaBot — Telegram-бот по Wuthering Waves (grammY, long polling).
import { config } from './config.js';
import { getData } from './data.js';

if (!config.token) {
  console.error('Не задан BOT_TOKEN. Скопируй .env.example в .env и впиши токен от @BotFather.');
  process.exit(1);
}

const { bot, COMMANDS } = await import('./bot.js');

async function main() {
  await getData(); // прогрев кэша и проверка данных
  await bot.api.setMyCommands(COMMANDS.map(([command, description]) => ({ command, description })));
  if (config.webappUrl) {
    await bot.api.setChatMenuButton({ menu_button: { type: 'web_app', text: 'GachaBot', web_app: { url: config.webappUrl } } });
  }
  process.once('SIGINT', () => bot.stop());
  process.once('SIGTERM', () => bot.stop());
  await bot.start({
    allowed_updates: ['message', 'callback_query', 'inline_query'],
    onStart: (me) => console.log(`✓ @${me.username} запущен${config.webappUrl ? ` · Mini App: ${config.webappUrl}` : ' (без Mini App)'}`),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
