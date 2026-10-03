// Подписи и цвета. Общий модуль для Mini App и бота.

export const ELEMENTS = {
  glacio: { ru: 'Глацио', color: '#6fd3ff', emoji: '❄️' },
  fusion: { ru: 'Фьюжн', color: '#ff6b3d', emoji: '🔥' },
  electro: { ru: 'Электро', color: '#b57bff', emoji: '⚡' },
  aero: { ru: 'Аэро', color: '#4ce0b3', emoji: '🌪' },
  spectro: { ru: 'Спектро', color: '#f3d35b', emoji: '✨' },
  havoc: { ru: 'Хавок', color: '#e0457b', emoji: '🌑' },
};

export const WEAPONS = {
  broadblade: { ru: 'Клеймор' },
  sword: { ru: 'Меч' },
  pistols: { ru: 'Пистолеты' },
  gauntlets: { ru: 'Перчатки' },
  rectifier: { ru: 'Выпрямитель' },
};

export const ROLES = {
  dps: { ru: 'Основной ДД', short: 'ДД' },
  hybrid: { ru: 'Саб-ДД', short: 'Саб-ДД' },
  support: { ru: 'Саппорт', short: 'Сапп' },
};

export const TIER_ORDER = ['T0', 'T0.5', 'T1', 'T1.5', 'T2', 'T3', 'T4'];

export const KINDS = {
  event: 'Ивентовый баннер',
  anniversary: 'Юбилейный реран',
  collab: 'Коллаборация',
  reverb: 'Ревёрб-реран (выбор)',
};

export const COST_LABEL = { 4: '4-кост', 3: '3-кост', 1: '1-кост' };

export const sequenceLabel = (copies) => `S${copies - 1}`;
export const refineLabel = (copies) => `R${copies}`;

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
