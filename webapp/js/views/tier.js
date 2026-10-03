import { ROLES } from '../lib/labels.js';
import { esc, ava, TIER_COLORS } from '../ui.js';
import { haptic } from '../tg.js';

const ROLE_KEYS = ['dps', 'hybrid', 'support'];
let roleFilter = '';

function rows(ctx) {
  const d = ctx.data;
  const keys = roleFilter ? [roleFilter] : ROLE_KEYS;
  return d.tier.tiers
    .map((t) => {
      const lines = keys
        .map((key) => {
          const list = t[key].map((id) => d.byId[id]).filter(Boolean);
          if (!list.length) return '';
          return `<div class="rl"><em>${ROLES[key].short}</em><div class="avs">${list.map((c) => `<a href="#/char/${c.id}" title="${esc(c.name)}">${ava(c)}</a>`).join('')}</div></div>`;
        })
        .join('');
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
    <div class="seg" id="roles">
      <button data-role="" aria-pressed="${!roleFilter}">Все</button>
      ${ROLE_KEYS.map((k) => `<button data-role="${k}" aria-pressed="${roleFilter === k}">${ROLES[k].short}</button>`).join('')}
    </div>
  </section>
  <section class="section" id="rows">${rows(ctx)}</section>`;
}

export function mount(root, ctx) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-role]');
    if (!b) return;
    haptic.tap();
    roleFilter = b.dataset.role;
    for (const x of root.querySelectorAll('[data-role]')) x.setAttribute('aria-pressed', String(x === b));
    root.querySelector('#rows').innerHTML = rows(ctx);
  });
}
