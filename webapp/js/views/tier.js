import { ELEMENTS } from '../lib/labels.js';
import { esc, ava, TIER_COLORS } from '../ui.js';
import { haptic } from '../tg.js';

const ROLE_COLS = [
  ['dps', 'DPS'],
  ['hybrid', 'ГИБ'],
  ['support', 'САП'],
];

let elFilter = '';

function rows(ctx) {
  const d = ctx.data;
  return d.tier.tiers
    .map((t) => {
      const lines = ROLE_COLS.map(([key, label]) => {
        const list = t[key].map((id) => d.byId[id]).filter((c) => c && (!elFilter || c.element === elFilter));
        if (!list.length) return '';
        return `<div class="rl"><em>${label}</em><div class="avs">${list.map((c) => `<a href="#/char/${c.id}" title="${esc(c.name)}">${ava(c)}</a>`).join('')}</div></div>`;
      }).join('');
      if (!lines) return '';
      return `<div class="tier-row">
        <div class="tl" style="--tc:${TIER_COLORS[t.tier]}"><b>${t.tier}</b><span>${esc(t.label)}</span></div>
        <div class="roles">${lines}</div>
      </div>`;
    })
    .join('');
}

export function render(ctx) {
  ctx.setGlow(null);
  const d = ctx.data;
  return `
  <section class="section">
    <div class="label">Патч ${esc(d.tier.patch)} · обновлён ${esc(d.tier.updated)}</div>
    <h1 class="h1">Тир-лист</h1>
    <p class="lead">${esc(d.tier.mode)}. Оценка при S0 для 5★ и S6 для 4★, в лучших командах.</p>
  </section>
  <section style="margin-top:14px">
    <div class="chips">
      <button class="chip" data-el="" aria-pressed="${!elFilter}">Все</button>
      ${Object.entries(ELEMENTS)
        .map(([k, e]) => `<button class="chip el" style="--el:${e.color}" data-el="${k}" aria-pressed="${elFilter === k}"><span class="dot"></span>${e.ru}</button>`)
        .join('')}
    </div>
  </section>
  <section class="section" id="rows">${rows(ctx)}</section>
  <footer class="foot"><p>Тир — ориентир, а не приговор: любимый персонаж с хорошей сборкой закрывает весь контент.</p></footer>`;
}

export function mount(root, ctx) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-el]');
    if (!b) return;
    haptic.tap();
    elFilter = b.dataset.el;
    for (const x of root.querySelectorAll('[data-el]')) x.setAttribute('aria-pressed', String(x === b));
    root.querySelector('#rows').innerHTML = rows(ctx);
  });
}
