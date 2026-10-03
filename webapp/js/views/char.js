import { ELEMENTS, WEAPONS, ROLES, KINDS, COST_LABEL } from '../lib/labels.js';
import { charRuns, teamSlots } from '../lib/logic.js';
import { fmtDate, daysBetween } from '../lib/time.js';
import { esc, ava, elIcon, elColor, tierChip, icons } from '../ui.js';
import { toggleFav } from '../store.js';
import { haptic, shareInline } from '../tg.js';

const RC = { 5: 'var(--gold)', 4: 'var(--purple)', 3: '#5aa9ff' };

function weaponRow(w, i, d) {
  const meta = d.weapons[w.name] || {};
  return `<button class="wpn" data-weapon="${esc(w.name)}">
    <span class="rank">${String(i + 1).padStart(2, '0')}</span>
    <span class="wi" style="--rc:${RC[meta.rarity] || 'var(--gold)'}">${meta.icon ? `<img src="${esc(meta.icon)}" alt="" loading="lazy">` : ''}</span>
    <div class="grow">
      <div class="wn">${esc(w.name)}</div>
      <div class="ws">${meta.rarity ? '★'.repeat(meta.rarity) : ''}${meta.sub ? ` · ${esc(meta.sub.name)} ${esc(meta.sub.value)}` : ''}</div>
    </div>
    ${w.sig ? '<span class="badge acc">сигна</span>' : icons.chev}
  </button>`;
}

function setCard(s, i, d) {
  const info = d.setsByName[s.name];
  return `<div class="set ${i ? 'alt' : ''}">
    <div class="sn">${info?.icon ? `<img class="set-ico" src="${esc(info.icon)}" alt="" loading="lazy">` : ''}<span class="grow">${i ? '<span class="muted mono" style="font-size:11px">ALT · </span>' : ''}${esc(s.name)}</span><span class="pc">${s.pieces} шт</span></div>
    ${info ? `<div class="sd">${info.two ? `<b>2:</b> ${esc(info.two)}<br>` : ''}<b>${info.pieces}:</b> ${esc(info.full)}</div>` : ''}
  </div>`;
}

function echoRow(name, i, d) {
  const e = d.echoes[name] || {};
  return `<div class="wpn">
    <span class="rank">${i ? 'ALT' : '01'}</span>
    <span class="wi" style="--rc:var(--acc)">${e.icon ? `<img src="${esc(e.icon)}" alt="" loading="lazy">` : ''}</span>
    <div class="grow"><div class="wn">${esc(name)}</div><div class="ws">${i ? 'альтернатива' : 'в главный слот'}</div></div>
  </div>`;
}

function prioChain(str) {
  const parts = str.split(/\s+(>>>|>|≥|=)\s+/);
  return `<div class="prio">${parts
    .map((p) => (['>>>', '>', '≥', '='].includes(p) ? `<span class="op">${p}</span>` : `<span class="p">${esc(p)}</span>`))
    .join('')}</div>`;
}

function buildTab(c, d) {
  const b = c.build;
  if (!b) return '<div class="empty"><b>Сборки пока нет</b>Данные появятся после обновления.</div>';
  return `
    ${b.preliminary ? '<div class="note" style="margin-top:18px">Персонаж ещё не вышел — сборка предварительная и будет уточнена после релиза.</div>' : ''}
    <div class="block"><div class="label">Оружие<span class="count">нажми, чтобы прочитать</span></div><div class="stack">${b.weapons.map((w, i) => weaponRow(w, i, d)).join('')}</div></div>
    ${b.sets.length ? `<div class="block"><div class="label">Сет эхо</div>${b.sets.map((s, i) => setCard(s, i, d)).join('')}</div>` : ''}
    ${b.mainEcho.length ? `<div class="block"><div class="label">Главное эхо</div><div class="stack">${b.mainEcho.map((e, i) => echoRow(e, i, d)).join('')}</div></div>` : ''}
    ${b.mainStats.length ? `<div class="block"><div class="label">Основные статы<span class="count">${b.mainStats.map((m) => m.cost).join('-')}</span></div>
      <div class="slots">${b.mainStats.map((m) => `<div class="slot"><div class="c">${m.cost}<small>${COST_LABEL[m.cost] || ''}</small></div><div class="s">${esc(m.stat)}</div></div>`).join('')}</div></div>` : ''}
    ${b.substats ? `<div class="block"><div class="label">Приоритет сабстатов</div>${prioChain(b.substats)}</div>` : ''}
    ${b.skills.length ? `<div class="block"><div class="label">Прокачка навыков</div><ol class="steps">${b.skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}`;
}

function teamCard(t, c, d) {
  const slots = teamSlots(t, d);
  const member = (id) => {
    const m = d.byId[id];
    const inner = `${ava(m, 'lg')}<span>${esc(m.name)}</span>`;
    return id === c.id ? `<div class="m-main">${inner}</div>` : `<a class="m-main" href="#/char/${id}">${inner}</a>`;
  };
  return `<div class="team-card">
    ${t.name ? `<div class="team-head"><span>${esc(t.name)}</span>${tierChip(t.tier)}</div>` : ''}
    <div class="team">
      ${slots
        .map(
          (s, j) => `${j ? '<span class="plus">+</span>' : ''}<div class="m">
            ${member(s.main)}
            ${s.alts.length ? `<div class="alts"><em>или</em>${s.alts.map((a) => `<a href="#/char/${a}" title="${esc(d.byId[a].name)}">${ava(d.byId[a], 'xs')}</a>`).join('')}</div>` : ''}
          </div>`,
        )
        .join('')}
    </div>
  </div>`;
}

function teamsTab(c, d) {
  const teams = c.build?.teams || [];
  if (!teams.length) return '<div class="empty"><b>Команд пока нет</b></div>';
  return `<div class="block"><div class="label">Рекомендуемые отряды</div>
    <div class="stack">${teams.map((t) => teamCard(t, c, d)).join('')}</div>
    <p class="muted" style="font-size:12.5px;margin-top:14px">Под персонажем — кем его можно заменить в этом слоте.</p>
  </div>`;
}

function historyTab(c, d, server) {
  const runs = charRuns(c.id, d.banners, server);
  if (!runs.length) return `<div class="empty"><b>${c.limited ? 'Баннеров не было' : 'Не лимитный'}</b>${c.limited ? '' : 'Доступен в стандартном баннере, наградах или бесплатно.'}</div>`;
  const past = runs.filter((r) => r.status === 'past');
  const live = runs.find((r) => r.status === 'live');
  const next = runs.find((r) => r.status === 'upcoming');
  const last = past[past.length - 1];
  const since = live ? 0 : last ? daysBetween(last.endMs, Date.now()) : null;
  return `
    <div class="duo block">
      <div class="card stat"><div class="k">запусков</div><div class="v">${runs.filter((r) => r.kind !== 'reverb').length}</div><div class="s">дебют ${fmtDate(runs[0].startMs, server, true)}</div></div>
      <div class="card stat"><div class="k">${live ? 'сейчас' : next && !last ? 'дебют через' : 'без рерана'}</div>
        <div class="v">${live ? '<span style="color:var(--acc-text)">LIVE</span>' : next && !last ? `<span data-cd="${next.startMs}"></span>` : since + '<small style="font-size:12px"> дн</small>'}</div>
        <div class="s">${live ? 'до ' + fmtDate(live.endMs, server) : last ? 'последний в ' + last.version : ''}</div></div>
    </div>
    <div class="block"><div class="label">Все баннеры</div><div class="list">
      ${runs
        .slice()
        .reverse()
        .map(
          (r) => `<div class="item">
          <div class="mono" style="font:800 15px var(--f-mono);width:34px">${r.version}</div>
          <div class="grow"><div class="t1">${r.kind === 'event' ? `Фаза ${r.phase === 1 ? 'I' : 'II'}` : KINDS[r.kind]}${r.new.includes(c.id) ? ' · дебют' : ''}</div>
          <div class="t2">${fmtDate(r.startMs, server, true)} — ${fmtDate(r.endMs, server, true)}</div></div>
          ${r.status === 'live' ? '<span class="badge acc live">live</span>' : r.status === 'upcoming' ? '<span class="badge">скоро</span>' : ''}
        </div>`,
        )
        .join('')}
    </div></div>`;
}

export function render(ctx) {
  const d = ctx.data;
  const c = d.byId[ctx.params[0]];
  if (!c) return '<div class="empty"><b>Персонаж не найден</b><a class="btn" href="#/chars">К списку</a></div>';
  ctx.setGlow(elColor(c.element));
  const tab = ctx.ui.charTab;
  const fav = ctx.state.favs.includes(c.id);
  const role = ROLES[c.role];
  return `
  <div class="ch-hero" style="--el:${elColor(c.element)}">
    ${c.bg ? `<img class="hero-bg" src="${esc(c.bg)}" alt="">` : ''}
    ${c.art ? `<img class="hero-art" src="${esc(c.art)}" alt="">` : ''}
    <div class="ch-info">
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <span class="badge el" style="--el:${elColor(c.element)}">${elIcon(c.element)} ${ELEMENTS[c.element]?.ru}</span>
        <span class="badge">${WEAPONS[c.weapon]?.ru}</span>
        ${role ? `<span class="badge">${role.short}</span>` : ''}
        ${c.tier ? tierChip(c.tier) : ''}
      </div>
      <div class="ch-name" style="margin-top:12px">${esc(c.name)}</div>
      <div class="ch-ru"><span class="stars">${'★'.repeat(c.rarity || 0)}</span> · ${esc(c.ru)}${c.limited ? ' · лимитный' : ''}</div>
      <div class="ch-actions">
        <button class="btn ghost fav-btn" data-act="fav" aria-pressed="${fav}">${fav ? icons.star : icons.starO}${fav ? 'В избранном' : 'В избранное'}</button>
        <button class="btn" data-act="share">${icons.share}Отправить в чат</button>
      </div>
    </div>
  </div>
  <div class="tabs"><div class="seg">
    <button data-tab="build" aria-pressed="${tab === 'build'}">Сборка</button>
    <button data-tab="teams" aria-pressed="${tab === 'teams'}">Команды</button>
    <button data-tab="history" aria-pressed="${tab === 'history'}">Баннеры</button>
  </div></div>
  <div id="tab">${tab === 'teams' ? teamsTab(c, d) : tab === 'history' ? historyTab(c, d, ctx.server) : buildTab(c, d)}</div>
  `;
}

export function mount(root, ctx) {
  const c = ctx.data.byId[ctx.params[0]];
  if (!c) return;
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) {
      haptic.tap();
      ctx.ui.charTab = t.dataset.tab;
      for (const b of root.querySelectorAll('[data-tab]')) b.setAttribute('aria-pressed', String(b === t));
      root.querySelector('#tab').innerHTML =
        t.dataset.tab === 'teams' ? teamsTab(c, ctx.data) : t.dataset.tab === 'history' ? historyTab(c, ctx.data, ctx.server) : buildTab(c, ctx.data);
      return;
    }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'fav') {
      const on = toggleFav(c.id);
      haptic.impact(on ? 'medium' : 'light');
      a.setAttribute('aria-pressed', String(on));
      a.innerHTML = `${on ? icons.star : icons.starO}${on ? 'В избранном' : 'В избранное'}`;
      ctx.toast(on ? 'Добавлено в избранное' : 'Убрано из избранного');
    }
    if (a.dataset.act === 'share') {
      haptic.impact();
      if (!shareInline(c.name)) ctx.copy(`${location.origin}${location.pathname}#/char/${c.id}`);
    }
  });
}
