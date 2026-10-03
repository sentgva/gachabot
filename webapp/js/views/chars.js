import { ELEMENTS, WEAPONS, TIER_ORDER } from '../lib/labels.js';
import { findChars } from '../lib/logic.js';
import { esc, elIcon, elColor, tierChip, icons } from '../ui.js';
import { haptic } from '../tg.js';

function filtered(ctx) {
  const { q, el, wp, r, fav } = ctx.ui.filter;
  let list = q.trim() ? findChars(ctx.data.chars, q, 60) : [...ctx.data.chars];
  if (el) list = list.filter((c) => c.element === el);
  if (wp) list = list.filter((c) => c.weapon === wp);
  if (r) list = list.filter((c) => String(c.rarity) === r);
  if (fav) list = list.filter((c) => ctx.state.favs.includes(c.id));
  if (!q.trim()) {
    // Сначала новые (по дате выхода), потом по тиру
    list.sort((a, b) => {
      if (a.rarity !== b.rarity) return b.rarity - a.rarity;
      return (b.released || '').localeCompare(a.released || '') || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    });
  }
  return list;
}

function grid(ctx) {
  const list = filtered(ctx);
  if (!list.length) return '<div class="empty" style="grid-column:1/-1"><b>Никого</b>Попробуй другой запрос или сбрось фильтры</div>';
  return list
    .map((c, i) => {
      const fav = ctx.state.favs.includes(c.id);
      const soon = !c.released && c.limited;
      return `<a class="cc r${c.rarity} ${soon ? 'soon' : ''}" href="#/char/${c.id}" style="--el:${elColor(c.element)};--i:${Math.min(i, 30)}">
        <img src="${esc(c.icon)}" alt="" loading="lazy" decoding="async">
        ${fav ? `<span class="fav">${icons.star}</span>` : ''}
        <span class="tier">${soon ? '<span class="badge acc" style="height:18px;font-size:9px">скоро</span>' : tierChip(c.tier)}</span>
        <div class="meta">
          <div class="nm">${esc(c.name)}</div>
          <div class="sb">${elIcon(c.element)}${(WEAPONS[c.weapon]?.ru || '').toUpperCase()}</div>
        </div>
      </a>`;
    })
    .join('');
}

const chip = (key, val, label, pressed, { cls = '', style = '' } = {}) =>
  `<button class="chip ${cls}" style="${style}" data-f="${key}" data-v="${val}" aria-pressed="${pressed}">${label}</button>`;

export function render(ctx) {
  ctx.setGlow(null);
  const f = ctx.ui.filter;
  const pressed = (k, v) => String(f[k]) === String(v);
  const els = Object.entries(ELEMENTS)
    .map(([k, e]) => chip('el', k, `<span class="dot"></span>${e.ru}`, pressed('el', k), { cls: 'el', style: `--el:${e.color}` }))
    .join('');
  const wps = Object.entries(WEAPONS)
    .map(([k, w]) => chip('wp', k, w.ru, pressed('wp', k)))
    .join('');
  return `
  <section class="section">
    <div class="label">Резонаторы<span class="count">${ctx.data.chars.length}</span></div>
    <h1 class="h1">Сборки</h1>
    <label class="search">${icons.search}<input id="q" type="search" placeholder="Имя: Синь, Camellya, шк…" value="${esc(f.q)}" autocomplete="off" enterkeyhint="search"></label>
  </section>
  <section style="margin-top:12px">
    <div class="chips">
      <button class="chip" data-f="fav" data-v="1" aria-pressed="${f.fav}">★ Избранные</button>
      <button class="chip" data-f="r" data-v="5" aria-pressed="${pressed('r', '5')}">5★</button>
      <button class="chip" data-f="r" data-v="4" aria-pressed="${pressed('r', '4')}">4★</button>
      ${els}
    </div>
    <div class="chips" style="margin-top:8px">${wps}</div>
  </section>
  <div class="grid" id="grid">${grid(ctx)}</div>`;
}

export function mount(root, ctx) {
  const $grid = root.querySelector('#grid');
  const $q = root.querySelector('#q');
  $q.addEventListener('input', () => {
    ctx.ui.filter.q = $q.value;
    $grid.innerHTML = grid(ctx);
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    haptic.tap();
    const { f: key, v } = b.dataset;
    const f = ctx.ui.filter;
    if (key === 'fav') f.fav = !f.fav;
    else f[key] = String(f[key]) === v ? '' : v;
    for (const el of root.querySelectorAll(`[data-f="${key}"]`)) {
      el.setAttribute('aria-pressed', key === 'fav' ? String(f.fav) : String(String(f[key]) === el.dataset.v));
    }
    $grid.innerHTML = grid(ctx);
  });
}
