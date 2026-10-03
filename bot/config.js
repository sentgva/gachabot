// Конфиг из переменных окружения (+ необязательный файл .env в корне).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const envFile = join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const trimSlash = (s) => (s ? s.replace(/\/+$/, '') + '/' : '');

// На Vercel Mini App раздаётся с того же домена — берём его, если WEBAPP_URL не задан.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/` : '';
const webappUrl = trimSlash(process.env.WEBAPP_URL) || vercelUrl;

const token = process.env.BOT_TOKEN || '';

// Откуда брать данные. На Vercel файлы лежат в той же сборке — читаем с диска.
// В остальных случаях — с сайта Mini App, чтобы правки JSON подхватывались без перезапуска.
// DATA_URL=local — всегда локальная папка webapp/data.
function dataUrl() {
  if (process.env.DATA_URL === 'local') return '';
  if (process.env.DATA_URL) return trimSlash(process.env.DATA_URL);
  if (process.env.VERCEL) return '';
  return webappUrl ? webappUrl + 'data/' : '';
}

export const config = {
  token,
  // Секрет вебхука: WEBHOOK_SECRET или производный от токена — тогда на Vercel хватает одной переменной BOT_TOKEN
  webhookSecret: process.env.WEBHOOK_SECRET || (token ? createHash('sha256').update(`gachabot:${token}`).digest('hex').slice(0, 48) : ''),
  // Адрес опубликованного Mini App, например https://gachabot.vercel.app/
  webappUrl,
  dataUrl: dataUrl(),
  // Ссылка вида https://t.me/<bot>/<app> — для кнопок в группах (web_app-кнопки там не работают)
  miniappLink: process.env.MINIAPP_LINK || '',
  dataTtl: Number(process.env.DATA_TTL_MIN || 10) * 60e3,
};
