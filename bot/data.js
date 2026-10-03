// Загрузка данных: с сайта Mini App (с кэшем) или из локальной папки webapp/data.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { config, ROOT } from './config.js';
import { byId } from '../webapp/js/lib/logic.js';

const FILES = ['characters', 'banners', 'tierlist', 'codes', 'echo-sets', 'weapons', 'echoes', 'meta'];
const LOCAL = join(ROOT, 'webapp', 'data');

let cache = null;
let loadedAt = 0;
let pending = null;

async function fetchRemote(name) {
  const r = await fetch(`${config.dataUrl}${name}.json?t=${Date.now()}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return r.json();
}

async function readLocal(name) {
  return JSON.parse(await readFile(join(LOCAL, `${name}.json`), 'utf8'));
}

async function load() {
  let raw;
  if (config.dataUrl) {
    try {
      raw = Object.fromEntries(await Promise.all(FILES.map(async (f) => [f, await fetchRemote(f)])));
    } catch (e) {
      console.warn('[data] не удалось загрузить с сайта, беру локальные файлы:', e.message);
    }
  }
  raw ||= Object.fromEntries(await Promise.all(FILES.map(async (f) => [f, await readLocal(f)])));
  return {
    chars: raw.characters,
    byId: byId(raw.characters),
    banners: raw.banners.banners,
    tier: raw.tierlist,
    codes: raw.codes,
    sets: raw['echo-sets'],
    setsByName: Object.fromEntries(raw['echo-sets'].map((s) => [s.name, s])),
    weapons: raw.weapons,
    echoes: raw.echoes,
    meta: raw.meta,
  };
}

export async function getData() {
  if (cache && Date.now() - loadedAt < config.dataTtl) return cache;
  pending ||= load()
    .then((d) => {
      cache = d;
      loadedAt = Date.now();
      return d;
    })
    .finally(() => (pending = null));
  try {
    return await pending;
  } catch (e) {
    if (cache) return cache;
    throw e;
  }
}

/** Абсолютный URL картинки (для превью и инлайн-режима), если сайт опубликован. */
export const assetUrl = (path) => (config.webappUrl && path ? config.webappUrl + path : null);

// --- настройки пользователей (сервер) ---
// Upstash Redis (REST), если заданы переменные — нужно для Vercel, где диск только для чтения.
// Иначе — JSON-файл (.cache/prefs.json, на Vercel — во временной папке, живёт до холодного старта).
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? { url: process.env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, ''), token: process.env.UPSTASH_REDIS_REST_TOKEN }
  : null;

async function redisCmd(...args) {
  const r = await fetch(redis.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(4000),
  });
  if (!r.ok) throw new Error(`redis HTTP ${r.status}`);
  return (await r.json()).result;
}

const PREFS_DIR = process.env.VERCEL ? join(tmpdir(), 'gachabot') : join(ROOT, '.cache');
const PREFS = join(PREFS_DIR, 'prefs.json');
let prefs = null;

async function loadPrefs() {
  if (prefs) return prefs;
  try {
    prefs = JSON.parse(await readFile(PREFS, 'utf8'));
  } catch {
    prefs = {};
  }
  return prefs;
}

export async function getServer(userId) {
  if (redis && userId) {
    try {
      return (await redisCmd('HGET', 'gachabot:server', String(userId))) || 'eu';
    } catch (e) {
      console.warn('[prefs]', e.message);
    }
  }
  return (await loadPrefs())[userId]?.server || 'eu';
}

export async function setServer(userId, server) {
  if (redis) {
    try {
      await redisCmd('HSET', 'gachabot:server', String(userId), server);
      return;
    } catch (e) {
      console.warn('[prefs]', e.message);
    }
  }
  const p = await loadPrefs();
  p[userId] = { ...(p[userId] || {}), server };
  try {
    await mkdir(PREFS_DIR, { recursive: true });
    await writeFile(PREFS, JSON.stringify(p));
  } catch (e) {
    console.warn('[prefs] не удалось сохранить:', e.message);
  }
}
