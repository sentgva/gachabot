// Привязать бота к деплою на Vercel с этого компьютера:
//   BOT_TOKEN=... npm run webhook -- https://gachabot.vercel.app
// (токен можно положить в .env)
import { config } from '../bot/config.js';

const origin = process.argv[2] || process.env.WEBAPP_URL;
if (!config.token || !origin) {
  console.error('Нужны BOT_TOKEN и адрес деплоя: npm run webhook -- https://<проект>.vercel.app');
  process.exit(1);
}
const { setupWebhook } = await import('../bot/setup.js');
console.log(await setupWebhook(origin));
console.log(`Ручная перепривязка: ${origin.replace(/\/+$/, '')}/api/setup?key=${config.webhookSecret}`);
