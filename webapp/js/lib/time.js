// Время серверов, баннеров и ресетов. Общий модуль для Mini App и бота.

export const SERVERS = {
  eu: { short: 'EU', name: 'Europe', offset: 1 },
  na: { short: 'NA', name: 'America', offset: -5 },
  asia: { short: 'ASIA', name: 'Asia', offset: 8 },
  sea: { short: 'SEA', name: 'SEA', offset: 8 },
  hmt: { short: 'HMT', name: 'HMT', offset: 8 },
};
export const DEFAULT_SERVER = 'eu';

// Время в banners.json записано по серверу Asia (UTC+8).
const BASE_OFFSET = 8;
const H = 3600e3;
const DAY = 24 * H;

const off = (server) => (SERVERS[server] || SERVERS[DEFAULT_SERVER]).offset;

/** 'YYYY-MM-DDTHH:mm' как локальное время сервера с данным смещением → epoch ms */
export function wallToMs(str, offsetH) {
  const [d, t = '00:00'] = str.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return Date.UTC(y, m - 1, day, hh, mm) - offsetH * H;
}

/** Старт баннера: запуск версии — глобальный, смена фаз — по локальному времени сервера. */
export function bannerStart(b, server) {
  return wallToMs(b.start, b.globalStart ? BASE_OFFSET : off(server));
}

/** Конец баннера (xx:59 → до конца минуты). */
export function bannerEnd(b, server) {
  return wallToMs(b.end, off(server)) + 59e3;
}

export function bannerStatus(b, server, now = Date.now()) {
  if (now < bannerStart(b, server)) return 'upcoming';
  if (now < bannerEnd(b, server)) return 'live';
  return 'past';
}

/** Ближайший ежедневный (04:00) или еженедельный (пн 04:00) ресет. */
export function nextReset(server, weekly = false, now = Date.now()) {
  const o = off(server) * H;
  const local = new Date(now + o);
  let t = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 4, 0, 0);
  if (t <= now + o) t += DAY;
  if (weekly) while (new Date(t).getUTCDay() !== 1) t += DAY;
  return t - o;
}

export function splitMs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const p2 = (n) => String(n).padStart(2, '0');

/** «18д 04:12:33» или «04:12:33» */
export function fmtCountdown(ms) {
  const { d, h, m, s } = splitMs(ms);
  return `${d ? d + 'д ' : ''}${p2(h)}:${p2(m)}:${p2(s)}`;
}

/** «18 д 4 ч» / «4 ч 12 мин» / «12 мин» — коротко, для текста */
export function fmtLeft(ms) {
  const { d, h, m } = splitMs(ms);
  if (d) return `${d} д ${h} ч`;
  if (h) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** Дата в часовом поясе сервера: «30 сен» или «30 сен 2025» */
export function fmtDate(ms, server, withYear = false) {
  const d = new Date(ms + off(server) * H);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${withYear ? ' ' + d.getUTCFullYear() : ''}`;
}

export function fmtDateTime(ms, server) {
  const d = new Date(ms + off(server) * H);
  return `${fmtDate(ms, server)}, ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}

export const daysBetween = (a, b) => Math.floor((b - a) / DAY);
