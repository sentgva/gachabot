import { initTelegram, haptic, setBack, startParam } from './tg.js';
import { state, loadState, save } from './store.js';
import { SERVERS, fmtCountdown } from './lib/time.js';
import { byId } from './lib/logic.js';
import { esc } from './ui.js';
import * as home from './views/home.js';
import * as banners from './views/banners.js';
import * as chars from './views/chars.js';
import * as char from './views/char.js';
import * as tier from './views/tier.js';
import * as tools from './views/tools.js';

const $view = document.getElementById('view');
const $nav = document.getElementById('nav');
const $toast = document.getElementById('toast');
const $sheet = document.getElementById('sheet');
const $server = document.getElementById('server');

const FILES = ['characters', 'banners', 'tierlist', 'codes', 'echo-sets', 'weapons', 'echoes', 'meta'];

const ctx = {
  data: null,
  state,
  ui: { bannersTab: 'timeline', charTab: 'build', filter: { q: '', el: '', wp: '', r: '', fav: false }, showAll: false },
  get server() { return state.server; },
  go: (hash) => { location.hash = hash; },
  toast,
  rerender: () => render(false),
  setGlow: (color) => document.documentElement.style.setProperty('--glow', color || '#dcff3f'),
};

const ROUTES = [
  [/^#?\/?$/, home, 'home'],
  [/^#\/banners$/, banners, 'banners'],
  [/^#\/chars$/, chars, 'chars'],
  [/^#\/char\/([\w-]+)$/, char, 'chars'],
  [/^#\/tier$/, tier, 'tier'],
  [/^#\/tools(?:\/([\w-]+))?$/, tools, 'tools'],
];

const scrollMemo = new Map();
let current = null;

function match(hash) {
  for (const [re, view, tab] of ROUTES) {
    const m = hash.match(re);
    if (m) return { view, tab, params: m.slice(1) };
  }
  return { view: home, tab: 'home', params: [] };
}

function render(fresh = true) {
  const hash = location.hash || '#/';
  const r = match(hash);
  if (fresh && current) scrollMemo.set(current, scrollY);
  current = hash;
  ctx.params = r.params;
  $view.innerHTML = `<div class="page">${r.view.render(ctx)}</div>`;
  r.view.mount?.($view.firstElementChild, ctx);
  for (const a of $nav.querySelectorAll('a')) a.classList.toggle('on', a.dataset.tab === r.tab);
  const isRoot = ['#/', '#/banners', '#/chars', '#/tier', '#/tools', ''].includes(hash);
  setBack(!isRoot, () => (history.length > 1 ? history.back() : ctx.go('#/')));
  if (fresh) scrollTo(0, scrollMemo.get(hash) || 0);
  tick();
}

function tick() {
  const now = Date.now();
  for (const el of $view.querySelectorAll('[data-cd]')) {
    const left = Number(el.dataset.cd) - now;
    el.textContent = left > 0 ? fmtCountdown(left) : '00:00:00';
    if (left <= 0 && el.dataset.reload !== 'done') {
      el.dataset.reload = 'done';
      setTimeout(() => render(false), 1500);
    }
  }
  for (const el of $view.querySelectorAll('[data-bar]')) {
    const [a, b] = el.dataset.bar.split(':').map(Number);
    el.style.width = `${Math.min(100, Math.max(0, ((now - a) / (b - a)) * 100))}%`;
  }
}

let toastTimer;
function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('show'), 1800);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  haptic.ok();
  toast(`Скопировано: ${text}`);
}
ctx.copy = copyText;

function openServerSheet() {
  haptic.tap();
  $sheet.innerHTML = `<div class="panel">
    <div class="label">Сервер — для таймеров и ресетов</div>
    <div style="margin-top:10px">
      ${Object.entries(SERVERS)
        .map(([k, s]) => `<button class="opt" data-server="${k}" aria-pressed="${state.server === k}">
          <b>${s.short}</b><span>${s.name} · UTC${s.offset >= 0 ? '+' : ''}${s.offset}</span></button>`)
        .join('')}
    </div></div>`;
  $sheet.hidden = false;
}

$sheet.addEventListener('click', (e) => {
  const b = e.target.closest('[data-server]');
  if (b) {
    state.server = b.dataset.server;
    save('server');
    $server.textContent = SERVERS[state.server].short;
    haptic.impact();
    render(false);
  }
  if (b || e.target === $sheet) $sheet.hidden = true;
});
$server.addEventListener('click', openServerSheet);

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"], .nav a');
  if (a) haptic.tap();
  const c = e.target.closest('[data-copy]');
  if (c) {
    e.preventDefault();
    copyText(c.dataset.copy);
  }
});

async function loadData() {
  const v = Math.floor(Date.now() / 6e5); // обновлять кэш раз в 10 минут
  const entries = await Promise.all(
    FILES.map(async (f) => {
      const r = await fetch(`data/${f}.json?v=${v}`);
      if (!r.ok) throw new Error(`${f}: ${r.status}`);
      return [f, await r.json()];
    }),
  );
  const d = Object.fromEntries(entries);
  return {
    chars: d.characters,
    byId: byId(d.characters),
    banners: d.banners.banners,
    tier: d.tierlist,
    codes: d.codes,
    sets: d['echo-sets'],
    setsByName: Object.fromEntries(d['echo-sets'].map((s) => [s.name, s])),
    weapons: d.weapons,
    echoes: d.echoes,
    meta: d.meta,
  };
}

function routeFromStartParam() {
  const p = startParam();
  if (!p || location.hash.length > 2) return;
  if (p.startsWith('char_')) location.hash = `#/char/${p.slice(5)}`;
  else if (['banners', 'chars', 'tier', 'tools'].includes(p)) location.hash = `#/${p}`;
  else if (['calc', 'plan', 'pity', 'sets', 'codes', 'resets'].includes(p)) location.hash = `#/tools/${p}`;
}

async function boot() {
  initTelegram();
  try {
    const [data] = await Promise.all([loadData(), loadState()]);
    ctx.data = data;
  } catch (err) {
    $view.innerHTML = `<div class="empty"><b>Не удалось загрузить данные</b>${esc(err.message)}<br><br>
      <button class="btn" onclick="location.reload()">Повторить</button></div>`;
    return;
  }
  $server.textContent = SERVERS[state.server]?.short || 'EU';
  document.getElementById('ver').textContent = `WUWA ${ctx.data.meta.version}`;
  routeFromStartParam();
  addEventListener('hashchange', () => render(true));
  render(true);
  setInterval(tick, 1000);
}

boot();
