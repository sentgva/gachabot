// Настройки пользователя: Telegram CloudStorage (синхронизируется между устройствами),
// локальная копия в localStorage — как быстрый кэш и запасной вариант вне Telegram.
import { cloud } from './tg.js';

const PREFIX = 'gb_';
const DEFAULTS = {
  server: 'eu',
  favs: [],
  pity: { char: 0, charGuarantee: false, weapon: 0, std: 0 },
  calc: { astrite: 0, radiant: 0, forging: 0, copies: 1, weapon: 0 },
  plan: { astrite: 0, tides: 0, lunite: false, weekly: 900, target: '' },
};

export const state = structuredClone(DEFAULTS);

function readLocal(key) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v == null ? undefined : JSON.parse(v);
  } catch {
    return undefined;
  }
}

function readCloud(keys) {
  return new Promise((resolve) => {
    if (!cloud) return resolve({});
    const timer = setTimeout(() => resolve({}), 1500);
    try {
      cloud.getItems(keys.map((k) => PREFIX + k), (err, values) => {
        clearTimeout(timer);
        if (err || !values) return resolve({});
        const out = {};
        for (const k of keys) {
          const raw = values[PREFIX + k];
          if (raw) {
            try { out[k] = JSON.parse(raw); } catch {}
          }
        }
        resolve(out);
      });
    } catch {
      clearTimeout(timer);
      resolve({});
    }
  });
}

export async function loadState() {
  const keys = Object.keys(DEFAULTS);
  for (const k of keys) {
    const v = readLocal(k);
    if (v !== undefined) state[k] = merge(DEFAULTS[k], v);
  }
  const remote = await readCloud(keys);
  for (const k of keys) if (remote[k] !== undefined) state[k] = merge(DEFAULTS[k], remote[k]);
  return state;
}

function merge(def, v) {
  if (Array.isArray(def) || typeof def !== 'object' || def === null) return v;
  return { ...def, ...(v && typeof v === 'object' ? v : {}) };
}

export function save(key) {
  const raw = JSON.stringify(state[key]);
  try { localStorage.setItem(PREFIX + key, raw); } catch {}
  try { cloud?.setItem(PREFIX + key, raw); } catch {}
}

export function toggleFav(id) {
  const i = state.favs.indexOf(id);
  if (i >= 0) state.favs.splice(i, 1);
  else state.favs.unshift(id);
  save('favs');
  return i < 0;
}
