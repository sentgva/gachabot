// Мелкие помощники разметки: экранирование, иконки, аватары.
import { ELEMENTS } from './lib/labels.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const elColor = (el) => ELEMENTS[el]?.color || 'var(--acc)';

export const TIER_COLORS = {
  T0: '#dcff3f', 'T0.5': '#b6f25c', T1: '#5ee6c6', 'T1.5': '#6fd3ff', T2: '#f5c451', T3: '#ff9a62', T4: '#9a98a3',
};
export const tierChip = (t) => (t ? `<span class="tierchip" style="--tc:${TIER_COLORS[t]}">${t}</span>` : '');

const EL_PATHS = {
  glacio: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4l2.5 2.5L14.5 4M9.5 20l2.5-2.5 2.5 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  fusion: '<path d="M12 2.5c.9 3.9 5.5 5.6 5.5 10.6a5.5 5.5 0 0 1-11 0c0-2.6 1.4-3.9 2.1-5.9.8 1.3 1.6 2 2.7 2.2-.6-2.4-.5-4.6.7-6.9z" fill="currentColor"/>',
  electro: '<path d="M13.5 2 5 13.6h6.2L10.3 22 19 9.9h-6.3z" fill="currentColor"/>',
  aero: '<path d="M3 9h11.5a3 3 0 1 0-3-3M3 14h15.5a3 3 0 1 1-3 3M3 19h6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>',
  spectro: '<path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z" fill="currentColor"/>',
  havoc: '<path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1z" fill="currentColor"/>',
};
export const elIcon = (el) =>
  `<svg class="el-ico" viewBox="0 0 24 24" style="--el:${elColor(el)}" aria-hidden="true">${EL_PATHS[el] || ''}</svg>`;

export const icons = {
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  starO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v13M7 8l5-5 5 5"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="2.5" width="16" height="19" rx="3"/><path d="M8 7h8M8 12h2M14 12h2M8 16.5h2M14 16.5h2"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4M8 14h3"/></svg>',
  pity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  sets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9z"/><path d="M12 12 21 7.5M12 12v9.5M12 12 3 7.5"/></svg>',
  codes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="11" rx="2.5"/><path d="M7 3.5h10M8 12.5h.01M12 12.5h.01M16 12.5h.01" stroke-linecap="round" stroke-width="2.4"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01" stroke-linecap="round" stroke-width="2.2"/></svg>',
  drought: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/><path d="M4 4l16 16"/></svg>',
};

export function ava(c, cls = '') {
  if (!c) return '';
  const r4 = c.rarity === 4 ? ' r4' : '';
  return `<span class="ava ${cls}${r4}" style="--el:${elColor(c.element)}"><img src="${esc(c.icon)}" alt="${esc(c.name)}" loading="lazy" decoding="async"></span>`;
}

export const pct = (x) => {
  const v = x * 100;
  if (v > 99.9 && v < 100) return '>99.9';
  if (v > 0 && v < 0.1) return '<0.1';
  return v >= 10 ? v.toFixed(0) : v.toFixed(1);
};
