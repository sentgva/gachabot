import { currentBanners, upcomingBanners } from '../lib/logic.js';
import { nextReset, fmtDate, fmtLeft, SERVERS } from '../lib/time.js';
import { ELEMENTS, WEAPONS } from '../lib/labels.js';
import { esc, ava, elIcon, elColor, tierChip, icons } from '../ui.js';

function heroCard(c, b, d, single) {
  const isNew = b.new.includes(c.id);
  const now = Date.now();
  const upcoming = b.status === 'upcoming';
  const target = upcoming ? b.startMs : b.endMs;
  const fours = b.fourStars.map((id) => d.byId[id]).filter(Boolean);
  return `<a class="hero" href="#/char/${c.id}" style="--el:${elColor(c.element)}">
    <span class="hero-ghost" aria-hidden="true">${esc(c.name)}</span>
    <img class="hero-art" src="${esc(c.art)}" alt="" ${single ? '' : 'loading="lazy"'}>
    <div class="hero-top">
      ${upcoming ? '<span class="badge">скоро</span>' : '<span class="badge acc live">live</span>'}
      <span class="badge ${isNew ? 'hot' : ''}">${isNew ? 'новый' : 'реран'}</span>
      <span class="badge el">${elIcon(c.element)} ${ELEMENTS[c.element]?.ru}</span>
    </div>
    <div class="hero-body">
      <div class="hero-name">${esc(c.name)}</div>
      <div class="hero-sub">${esc(c.ru)} · ${WEAPONS[c.weapon]?.ru} · ${esc(c.signature || '')}</div>
      <div class="hero-timer"><span class="k">${upcoming ? 'старт через' : 'до конца'}</span><span class="t mono" data-cd="${target}"></span></div>
      ${upcoming ? '' : `<div class="bar"><i data-bar="${b.startMs}:${b.endMs}" style="width:${((now - b.startMs) / (b.endMs - b.startMs)) * 100}%"></i></div>`}
      <div class="hero-foot">
        ${fours.length ? `<span class="ava-stack">${fours.map((f) => ava(f, 'sm')).join('')}</span><span class="muted" style="font-size:12px">4★ рейт-ап</span>` : ''}
        <span style="margin-left:auto">${tierChip(c.tier)}</span>
      </div>
    </div>
  </a>`;
}

export function render(ctx) {
  const d = ctx.data;
  const server = ctx.server;
  let live = currentBanners(d.banners, server);
  const upcoming = upcomingBanners(d.banners, server);
  const showUpcoming = !live.some((b) => b.kind === 'event');
  const heroBanners = showUpcoming ? [...live, ...upcoming.slice(0, 1)] : live;

  // Карточки: новые персонажи первыми
  const cards = [];
  for (const b of heroBanners.filter((x) => x.kind !== 'reverb')) {
    for (const id of b.featured) {
      const c = d.byId[id];
      if (c) cards.push({ c, b });
    }
  }
  cards.sort((x, y) => Number(y.b.new.includes(y.c.id)) - Number(x.b.new.includes(x.c.id)));
  const lead = cards[0]?.c;
  ctx.setGlow(lead ? elColor(lead.element) : null);

  const nextPhase = upcoming.find((b) => b.kind === 'event' && !heroBanners.includes(b));
  const reverb = live.find((b) => b.kind === 'reverb');
  const daily = nextReset(server);
  const weekly = nextReset(server, true);
  const activeCodes = d.codes.codes.filter((c) => c.active);
  const favs = ctx.state.favs.map((id) => d.byId[id]).filter(Boolean);
  const eb = live.find((b) => b.kind === 'event');

  const tickerItems = [
    eb ? `<span><em>◆</em> ${eb.version} · фаза ${eb.phase === 1 ? 'I' : 'II'}</span>` : '',
    ...cards.map(({ c, b }) => `<span><b>${esc(c.name)}</b> ${b.new.includes(c.id) ? '· new' : '· rerun'}</span>`),
    eb ? `<span>до конца фазы <b>${fmtLeft(eb.endMs - Date.now())}</b></span>` : '',
    nextPhase ? `<span>далее: <b>${nextPhase.featured.map((id) => esc(d.byId[id]?.name)).join(' / ')}</b></span>` : '',
    ...activeCodes.map((c) => `<span>код <em>${esc(c.code)}</em></span>`),
    `<span>сервер <b>${SERVERS[server].short}</b></span>`,
  ].filter(Boolean);
  const ticker = tickerItems.join('');

  return `
  <div class="ticker" aria-hidden="true"><div class="ticker-track">${ticker}${ticker}</div></div>

  <section class="section">
    <div class="label">${showUpcoming ? 'Между фазами' : 'Сейчас на баннере'}<span class="count">${eb ? eb.version + ' / ' + (eb.phase === 1 ? 'I' : 'II') : ''}</span></div>
    <div class="heroes ${cards.length === 1 ? 'single' : ''}">
      ${cards.map(({ c, b }, i) => heroCard(c, b, d, i === 0)).join('') || '<div class="empty"><b>Нет данных</b>Обновите данные о баннерах</div>'}
    </div>
  </section>

  ${nextPhase ? `
  <section class="section">
    <div class="label">Следующая фаза</div>
    <a class="card next" href="#/banners" style="margin-top:10px">
      <span class="ava-stack">${nextPhase.featured.map((id) => ava(d.byId[id], 'lg')).join('')}</span>
      <div class="grow">
        <div style="font-weight:700">${nextPhase.featured.map((id) => esc(d.byId[id]?.name)).join(' · ')}</div>
        <div class="muted" style="font-size:12.5px;margin-top:3px">${nextPhase.version} фаза ${nextPhase.phase === 1 ? 'I' : 'II'} · с ${fmtDate(nextPhase.startMs, server)}</div>
        <div class="mono" style="font-size:13px;margin-top:6px;color:var(--acc-text)" data-cd="${nextPhase.startMs}"></div>
      </div>
      ${icons.chev}
    </a>
  </section>` : ''}

  ${reverb ? `
  <section class="section">
    <div class="label">Ревёрб-реран — выбери одного</div>
    <div class="card" style="margin-top:10px">
      <div class="ava-stack" style="flex-wrap:wrap;gap:8px">${reverb.featured.map((id) => `<a href="#/char/${id}">${ava(d.byId[id])}</a>`).join('')}</div>
      <div class="muted mono" style="font-size:12px;margin-top:10px">до конца: <span data-cd="${reverb.endMs}"></span></div>
    </div>
  </section>` : ''}

  <section class="section">
    <div class="label">Ресет · ${SERVERS[server].short}</div>
    <div class="duo" style="margin-top:10px">
      <div class="card stat"><div class="k">ежедневный</div><div class="v" data-cd="${daily}"></div><div class="s">в 04:00 по серверу</div></div>
      <div class="card stat"><div class="k">недельный</div><div class="v" data-cd="${weekly}"></div><div class="s">пн, 04:00</div></div>
    </div>
  </section>

  ${favs.length ? `
  <section class="section">
    <div class="label">Избранное<span class="count">${favs.length}</span></div>
    <div class="chips" style="margin-top:10px;gap:10px">
      ${favs.map((c) => `<a href="#/char/${c.id}" style="flex:none;text-align:center;width:62px">${ava(c, 'lg')}<div style="font-size:11px;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</div></a>`).join('')}
    </div>
  </section>` : ''}

  ${activeCodes.length ? `
  <section class="section">
    <div class="label">Активные коды<span class="count">нажми, чтобы скопировать</span></div>
    <div class="list" style="margin-top:10px">
      ${activeCodes.map((c) => `<button class="code" data-copy="${esc(c.code)}">
        <div class="grow" style="text-align:left"><div class="c">${esc(c.code)}</div><div class="r">${esc(c.rewards)}</div></div>
        <span class="btn sm ghost">${icons.copy}</span></button>`).join('')}
    </div>
  </section>` : ''}

  <section class="section">
    <div class="label">Инструменты</div>
    <div class="tiles" style="margin-top:10px">
      <a class="tile acc" href="#/tools/calc"><span class="ico">${icons.calc}</span><span class="n">01</span><div><div class="ttl">Калькулятор круток</div><div class="dsc">Шанс выбить S0–S6 + сигну</div></div></a>
      <a class="tile" href="#/tools/plan"><span class="ico">${icons.plan}</span><span class="n">02</span><div><div class="ttl">Планер астритов</div><div class="dsc">Сколько накопишь к баннеру</div></div></a>
      <a class="tile" href="#/tools/pity"><span class="ico">${icons.pity}</span><span class="n">03</span><div><div class="ttl">Трекер гаранта</div><div class="dsc">Свои счётчики круток</div></div></a>
      <a class="tile" href="#/banners" data-tab-drought><span class="ico">${icons.drought}</span><span class="n">04</span><div><div class="ttl">Засуха реранов</div><div class="dsc">Кто давно не выходил</div></div></a>
    </div>
  </section>

  <footer class="foot">
    <p>Данные: версия ${esc(d.meta.version)}, обновлено ${esc(d.meta.updated)}. Неофициальный фан-проект.</p>
  </footer>`;
}

export function mount(root, ctx) {
  root.querySelector('[data-tab-drought]')?.addEventListener('click', () => {
    ctx.ui.bannersTab = 'drought';
  });
}
