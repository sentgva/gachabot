// Модель круток Wuthering Waves. Общий модуль для Mini App и бота.
//
// База 0.8% на 5★, гарант на 80-й крутке, мягкий гарант с 66-й.
// Шаг роста шанса — приближение по статистике сообщества (официально не раскрыт),
// поэтому результаты — оценка, а не точный расчёт.
// Баннер персонажа: 50/50, после проигрыша — гарант. Баннер оружия: 100% на featured.

export const HARD_PITY = 80;
export const ASTRITE_PER_PULL = 160;

export function rate5(n) {
  if (n <= 65) return 0.008;
  if (n <= 70) return 0.008 + 0.04 * (n - 65);
  if (n <= 75) return 0.208 + 0.08 * (n - 70);
  if (n <= 78) return 0.608 + 0.1 * (n - 75);
  return 1;
}

/**
 * Распределение числа круток до получения `copies` копий featured-предмета.
 * pmf[n] — вероятность, что цель достигнута ровно на n-й крутке.
 */
export function pullsPmf({ copies = 1, pity = 0, guaranteed = false, fifty = 0.5 } = {}) {
  const P = HARD_PITY;
  const max = copies * P * (fifty < 1 ? 2 : 1) + 1;
  const mk = () => Array.from({ length: copies }, () => [new Float64Array(P), new Float64Array(P)]);
  let cur = mk();
  cur[0][guaranteed ? 1 : 0][Math.max(0, Math.min(pity, P - 1))] = 1;
  const pmf = new Float64Array(max + 1);
  for (let n = 1; n <= max; n++) {
    const next = mk();
    let alive = 0;
    for (let k = 0; k < copies; k++) {
      for (let g = 0; g < 2; g++) {
        const row = cur[k][g];
        for (let p = 0; p < P; p++) {
          const m = row[p];
          if (!m) continue;
          const r = rate5(p + 1);
          if (r < 1) {
            next[k][g][p + 1] += m * (1 - r);
            alive += m * (1 - r);
          }
          const hit = m * r;
          const win = g ? 1 : fifty;
          if (k + 1 === copies) pmf[n] += hit * win;
          else {
            next[k + 1][0][0] += hit * win;
            alive += hit * win;
          }
          if (win < 1) {
            next[k][1][0] += hit * (1 - win);
            alive += hit * (1 - win);
          }
        }
      }
    }
    cur = next;
    if (alive < 1e-12) return pmf.subarray(0, n + 1);
  }
  return pmf;
}

/** Свёртка двух распределений (персонаж + оружие из общего бюджета круток). */
export function convolve(a, b) {
  const out = new Float64Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  }
  return out;
}

export function cdfAt(pmf, n) {
  let s = 0;
  for (let i = 0; i <= Math.min(n, pmf.length - 1); i++) s += pmf[i];
  return Math.min(1, s);
}

export function expected(pmf) {
  let e = 0;
  for (let i = 0; i < pmf.length; i++) e += i * pmf[i];
  return e;
}

export function percentile(pmf, q) {
  let s = 0;
  for (let i = 0; i < pmf.length; i++) {
    s += pmf[i];
    if (s >= q) return i;
  }
  return pmf.length - 1;
}

/**
 * Полный расчёт: шанс собрать цель за `pulls` круток.
 * char: { copies, pity, guaranteed } | null; weapon: { copies, pity } | null
 */
export function plan({ pulls, char = null, weapon = null }) {
  const parts = [];
  if (char && char.copies > 0) parts.push(pullsPmf({ copies: char.copies, pity: char.pity, guaranteed: char.guaranteed, fifty: 0.5 }));
  if (weapon && weapon.copies > 0) parts.push(pullsPmf({ copies: weapon.copies, pity: weapon.pity, fifty: 1 }));
  if (!parts.length) return null;
  const pmf = parts.reduce((a, b) => convolve(a, b));
  return {
    chance: cdfAt(pmf, pulls),
    expected: expected(pmf),
    p50: percentile(pmf, 0.5),
    p90: percentile(pmf, 0.9),
    worst: pmf.length - 1,
    pmf,
  };
}

/** Шанс получить хотя бы k копий персонажа за N круток — для мини-графика. */
export function copiesCurve({ pulls, pity = 0, guaranteed = false, maxCopies = 7 }) {
  const out = [];
  for (let c = 1; c <= maxCopies; c++) out.push(cdfAt(pullsPmf({ copies: c, pity, guaranteed }), pulls));
  return out;
}

export const pullsFrom = ({ astrite = 0, tides = 0 }) => Math.floor(astrite / ASTRITE_PER_PULL) + tides;
