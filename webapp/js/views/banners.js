import { withTimes, rerunTable } from '../lib/logic.js';
import { fmtDate } from '../lib/time.js';
import { KINDS, plural } from '../lib/labels.js';
import { esc, ava, elColor } from '../ui.js';
import { haptic } from '../tg.js';

const PH = (b) => (b.kind === 'event' ? `фаза ${b.phase === 1 ? 'I' : 'II'}` : KINDS[b.kind]);

function phaseCard(b, d, server) {
  const first = d.byId[b.featured[0]];
  const badge =
    b.status === 'live'
      ? '<span class="badge acc live">live</span>'
      : b.status === 'upcoming'
        ? '<span class="badge">скоро</span>'
        : '';
  const fours = b.fourStars.map((id) => d.byId[id]).filter(Boolean);
  const big = b.kind !== 'reverb' && b.featured.length <= 3;
  return `<div class="phase ${b.status}" style="--el:${elColor(first?.element)}">
    <div class="ph"><span>${PH(b)}</span><span>·</span><span>${fmtDate(b.startMs, server)} — ${fmtDate(b.endMs, server)}</span>${badge}</div>
    <div class="who">
      ${b.featured
        .map((id) => {
          const c = d.byId[id];
          if (!c) return '';
          return big
            ? `<a class="w" href="#/char/${id}">${ava(c)}<div><div class="nm">${esc(c.name)}</div>${b.new.includes(id) ? '<div class="nw">NEW</div>' : ''}</div></a>`
            : `<a href="#/char/${id}">${ava(c, 'sm')}</a>`;
        })
        .join('')}
    </div>
    ${b.weapons.length ? `<div class="wp">⚔ ${b.weapons.map(esc).join(' · ')}</div>` : ''}
    ${fours.length ? `<div class="fs"><span class="ava-stack">${fours.map((f) => ava(f, 'sm')).join('')}</span> 4★: ${fours.map((f) => esc(f.name)).join(', ')}</div>` : ''}
    ${b.status === 'live' ? `<div class="bar"><i data-bar="${b.startMs}:${b.endMs}"></i></div><div class="mono muted" style="font-size:12px;margin-top:8px">осталось <span data-cd="${b.endMs}"></span></div>` : ''}
    ${b.status === 'upcoming' ? `<div class="mono muted" style="font-size:12px;margin-top:10px">старт через <span data-cd="${b.startMs}"></span></div>` : ''}
  </div>`;
}

function timeline(ctx) {
  const d = ctx.data;
  const list = withTimes(d.banners, ctx.server).sort((a, b) => b.startMs - a.startMs || (a.kind === 'event' ? -1 : 1));
  const groups = new Map();
  for (const b of list) {
    if (!groups.has(b.version)) groups.set(b.version, []);
    groups.get(b.version).push(b);
  }
  const versions = [...groups.keys()];
  const shown = ctx.ui.showAll ? versions : versions.slice(0, 6);
  return `
    ${shown
      .map((v) => {
        const items = groups.get(v).sort((a, b) => a.startMs - b.startMs);
        const from = Math.min(...items.map((x) => x.startMs));
        const to = Math.max(...items.map((x) => x.endMs));
        return `<div class="ver-group">
          <div class="ver-head"><span class="v">${v}</span><span class="d">${fmtDate(from, ctx.server, true)} — ${fmtDate(to, ctx.server, true)}</span></div>
          ${items.map((b) => phaseCard(b, d, ctx.server)).join('')}
        </div>`;
      })
      .join('')}
    ${ctx.ui.showAll ? '' : `<button class="btn ghost block" data-act="all" style="margin-top:18px">Показать всю историю с 1.0</button>`}`;
}

function drought(ctx) {
  const d = ctx.data;
  const rows = rerunTable(d.chars, d.banners, ctx.server);
  const now = rows.filter((r) => r.live || r.next);
  const rest = rows.filter((r) => !r.live && !r.next);
  const max = Math.max(...rest.map((r) => r.days || 0), 1);
  const row = (r) => {
    const c = r.char;
    const status = r.live
      ? '<span class="badge acc live">сейчас</span>'
      : r.next
        ? `<span class="badge">${r.lastEnd ? 'реран' : 'дебют'} ${fmtDate(r.next.startMs, ctx.server)}</span>`
        : `<div class="days">${r.days}<small>${plural(r.days, 'день', 'дня', 'дней')}</small></div>`;
    return `<a class="item drought" href="#/char/${c.id}" style="--el:${elColor(c.element)}">
      ${ava(c)}
      <div class="grow">
        <div class="t1">${esc(c.name)}</div>
        <div class="t2">${r.runs} ${plural(r.runs, 'баннер', 'баннера', 'баннеров')}${r.lastVersion ? ' · последний в ' + r.lastVersion : ''}</div>
        ${!r.live && !r.next ? `<div class="meter"><i style="width:${((r.days || 0) / max) * 100}%"></i></div>` : ''}
      </div>
      <div class="end">${status}</div>
    </a>`;
  };
  return `
    <p class="lead">Сколько дней прошло с последнего баннера каждого лимитного 5★. Ревёрб-выбор (3.5) не считается полноценным рераном.</p>
    ${now.length ? `<div class="label" style="margin-top:18px">Сейчас и скоро</div><div class="list" style="margin-top:10px">${now.map(row).join('')}</div>` : ''}
    <div class="label" style="margin-top:22px">Дольше всего без рерана<span class="count">${rest.length}</span></div>
    <div class="list" style="margin-top:10px">${rest.map(row).join('')}</div>`;
}

export function render(ctx) {
  ctx.setGlow(null);
  const tab = ctx.ui.bannersTab;
  return `
  <section class="section">
    <div class="label">Конвенты</div>
    <h1 class="h1">Баннеры</h1>
    <div class="seg" style="margin-top:16px">
      <button data-tab="timeline" aria-pressed="${tab === 'timeline'}">Таймлайн</button>
      <button data-tab="drought" aria-pressed="${tab === 'drought'}">Засуха реранов</button>
    </div>
  </section>
  <section class="section">${tab === 'timeline' ? timeline(ctx) : drought(ctx)}</section>
  `;
}

export function mount(root, ctx) {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) {
      haptic.tap();
      ctx.ui.bannersTab = t.dataset.tab;
      ctx.rerender();
    }
    if (e.target.closest('[data-act="all"]')) {
      ctx.ui.showAll = true;
      ctx.rerender();
    }
  });
}
