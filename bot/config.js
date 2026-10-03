// Конфиг из переменных окружения (+ необязательный файл .env в корне).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const envFile = join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const trimSlash = (s) => (s ? s.replace(/\/+$/, '') + '/' : '');

export const config = {
  token: process.env.BOT_TOKEN || '',
  // Адрес опубликованного Mini App (GitHub Pages), например https://user.github.io/gachabot/
  webappUrl: trimSlash(process.env.WEBAPP_URL),
  // Откуда брать данные. По умолчанию — с сайта Mini App, чтобы правки JSON подхватывались без перезапуска.
  // DATA_URL=local — только локальная папка webapp/data.
  dataUrl:
    process.env.DATA_URL === 'local'
      ? ''
      : trimSlash(process.env.DATA_URL) || (process.env.WEBAPP_URL ? trimSlash(process.env.WEBAPP_URL) + 'data/' : ''),
  // Ссылка вида https://t.me/<bot>/<app> — для кнопок в группах (web_app-кнопки там не работают)
  miniappLink: process.env.MINIAPP_LINK || '',
  dataTtl: Number(process.env.DATA_TTL_MIN || 10) * 60e3,
};
