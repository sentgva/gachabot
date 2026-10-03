// Логика поверх данных: текущие баннеры, история, засуха реранов, поиск.
// Общий модуль для Mini App и бота.
import { bannerStart, bannerEnd, bannerStatus, daysBetween } from './time.js';

export function withTimes(banners, server, now = Date.now()) {
  return banners.map((b) => ({
    ...b,
    startMs: bannerStart(b, server),
    endMs: bannerEnd(b, server),
    status: bannerStatus(b, server, now),
  }));
}

/** Текущие баннеры; если сейчас пауза между фазами — ближайшие. */
export function currentBanners(banners, server, now = Date.now()) {
  const list = withTimes(banners, server, now);
  return list.filter((b) => b.status === 'live');
}

export function upcomingBanners(banners, server, now = Date.now()) {
  return withTimes(banners, server, now)
    .filter((b) => b.status === 'upcoming')
    .sort((a, b) => a.startMs - b.startMs);
}

/** Все запуски персонажа (кроме ревёрб-выбора — он помечается отдельно). */
export function charRuns(id, banners, server, now = Date.now()) {
  return withTimes(banners, server, now)
    .filter((b) => b.featured.includes(id))
    .sort((a, b) => a.startMs - b.startMs);
}

/** Таблица «засухи»: сколько дней лимитный персонаж не появлялся на баннере. */
export function rerunTable(chars, banners, server, now = Date.now()) {
  const rows = [];
  for (const c of chars) {
    if (!c.limited || c.rarity !== 5) continue;
    const runs = charRuns(c.id, banners, server, now);
    if (!runs.length) continue;
    const live = runs.find((r) => r.status === 'live');
    const next = runs.find((r) => r.status === 'upcoming');
    const past = runs.filter((r) => r.status === 'past');
    const last = past[past.length - 1];
    const realRuns = runs.filter((r) => r.kind !== 'reverb' && r.status !== 'upcoming').length;
    rows.push({
      char: c,
      runs: realRuns,
      live: live || null,
      next: next || null,
      lastEnd: last ? last.endMs : null,
      lastVersion: last ? last.version : null,
      days: live ? 0 : last ? daysBetween(last.endMs, now) : null,
      debut: runs[0],
    });
  }
  return rows.sort((a, b) => {
    const ra = a.live ? -1 : a.next && !a.lastEnd ? -2 : a.days;
    const rb = b.live ? -1 : b.next && !b.lastEnd ? -2 : b.days;
    return rb - ra;
  });
}

export const norm = (s) => (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');

// Частые сокращения и альтернативные написания
const ALIASES = {
  shorekeeper: ['шк', 'шор', 'шоркипер', 'sk', 'tsk', 'хранительница'],
  'yangyang-xuanling': ['сюаньлин', 'xuanling', 'янян2', 'ксуанлинг'],
  'xiangli-yao': ['яо', 'yao', 'xly', 'сянлияо'],
  'luuk-herssen': ['люк', 'luuk', 'лук'],
  'rover-spectro': ['ровер спектро', 'спектро ровер', 'mc spectro'],
  'rover-havoc': ['ровер хавок', 'хавок ровер', 'mc havoc'],
  'rover-aero': ['ровер аэро', 'аэро ровер', 'mc aero'],
  'rover-electro': ['ровер электро', 'электро ровер', 'mc electro'],
  jinhsi: ['цзинси', 'джинхси', 'джинси', 'цзиньси'],
  camellya: ['камилла', 'камеля'],
  cartethyia: ['картезия', 'карти', 'фледелис', 'флердели'],
  phrolova: ['фрола'],
  hsin: ['хсин', 'синь', 'xin', 'синь'],
  lynae: ['линэй', 'лайна', 'линей', 'лине'],
  aemeath: ['эмит', 'эмиат', 'aemeat'],
  changli: ['чангли'],
  zhezhi: ['чжечжи', 'жежи', 'zezhi'],
  ciaccona: ['чакона', 'чиаккона'],
  jiyan: ['джиян', 'цзиян'],
  qiuyuan: ['киюань', 'цюйюань'],
  qingxiao: ['цинсяо', 'кингсяо'],
  jingran: ['цзинжан', 'джинран'],
  suoming: ['суоминг', 'соминг'],
  denia: ['дения', 'дениа'],
  mornye: ['морни', 'морнье'],
};

/** Нечёткий поиск персонажа по англ./рус. имени или алиасу. */
export function findChars(chars, query, limit = 8) {
  const q = norm(query);
  if (!q) return [];
  const scored = [];
  for (const c of chars) {
    const keys = [c.id, c.name, c.ru, ...(ALIASES[c.id] || [])].map(norm);
    let best = 0;
    for (const k of keys) {
      if (!k) continue;
      if (k === q) best = Math.max(best, 100);
      else if (k.startsWith(q)) best = Math.max(best, 80 - (k.length - q.length));
      else if (k.includes(q)) best = Math.max(best, 50);
      else if (q.length >= 4 && lev(k.slice(0, q.length + 1), q) <= (q.length >= 6 ? 2 : 1)) best = Math.max(best, 30);
    }
    if (best) scored.push([best, c]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map((x) => x[1]);
}

function lev(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export const byId = (chars) => Object.fromEntries(chars.map((c) => [c.id, c]));

/** Слоты команды: основной вариант и альтернативы, без повторов между слотами. */
export function teamSlots(t, d) {
  const slots = (Array.isArray(t) ? t.map((x) => [x]) : t.slots).map((opts) => opts.filter((id) => d.byId[id]));
  const used = new Set();
  const mains = slots.map((opts) => {
    const m = opts.find((id) => !used.has(id)) || opts[0];
    used.add(m);
    return m;
  });
  return slots.map((opts, i) => ({ main: mains[i], alts: opts.filter((id) => !mains.includes(id)) }));
}
