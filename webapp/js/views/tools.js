import { plan, copiesCurve, ASTRITE_PER_PULL, HARD_PITY } from '../lib/gacha.js';
import { upcomingBanners, currentBanners } from '../lib/logic.js';
import { SERVERS, nextReset, fmtDate } from '../lib/time.js';
import { ELEMENTS, WEAPONS, plural } from '../lib/labels.js';
import { esc, icons, pct } from '../ui.js';
import { state, save } from '../store.js';
import { haptic, openLink } from '../tg.js';

const TOOLS = [
  ['calc', 'Калькулятор круток', 'Шанс выбить S0–S6 и сигнатуру за твои астриты', icons.calc],
  ['plan', 'Планер астритов', 'Сколько накопится к нужному баннеру', icons.plan],
  ['pity', 'Трекер гаранта', 'Счётчики круток для трёх баннеров', icons.pity],
  ['weapons', 'Оружие', 'Статы и пассивки всего оружия', icons.sword],
  ['sets', 'Сеты эхо', 'Все бонусы сетов кратко по-русски', icons.sets],
  ['codes', 'Коды', 'Активные и истёкшие коды обмена', icons.codes],
  ['resets', 'Ресеты серверов', 'Ежедневный и недельный ресет', icons.reset],
  ['about', 'О приложении', 'Источники данных и обновления', icons.info],
];

const num = (id, label, value, { min = 0, max = 999999, step = 1 } = {}) => `
  <label class="field"><span>${label}</span>
    <div class="num" data-num="${id}" data-min="${min}" data-max="${max}" data-step="${step}">
      <button type="button" data-d="-1" aria-label="меньше">−</button>
      <input id="${id}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}">
      <button type="button" data-d="1" aria-label="больше">+</button>
    </div>
  </label>`;

const toggle = (id, label, on, hint = '') => `
  <div class="switch"><div class="tx">${label}${hint ? `<small>${hint}</small>` : ''}</div>
  <button type="button" class="tgl" role="switch" id="${id}" aria-checked="${on}"></button></div>`;

const head = (n, title, lead) => `
  <section class="section">
    <div class="label">Тулза ${n}</div>
    <h1 class="h1">${title}</h1>
    ${lead ? `<p class="lead">${lead}</p>` : ''}
  </section>`;

/* ---------------- hub ---------------- */
function hub() {
  return `
  ${head('00', 'Тулзы', 'Полезное для планирования круток и фарма.')}
  <section class="section"><div class="tiles">
    ${TOOLS.map(([k, t, dsc, ico], i) => `<a class="tile ${i === 0 ? 'acc wide' : ''}" href="#/tools/${k}">
      <span class="ico">${ico}</span><span class="n">${String(i + 1).padStart(2, '0')}</span>
      <div><div class="ttl">${t}</div><div class="dsc">${dsc}</div></div></a>`).join('')}
  </div></section>`;
}

/* ---------------- calculator ---------------- */
function calcView() {
  const c = state.calc;
  const p = state.pity;
  const segS = ['—', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  const segR = ['—', 'R1', 'R2', 'R3', 'R4', 'R5'];
  return `
  ${head('01', 'Калькулятор', 'Оценка по модели: 0.8% базово, мягкий гарант с 66-й, жёсткий — 80. 50/50 на персонажа, 100% на оружие.')}
  <section class="section"><div class="fields">
    <div class="full">${num('astrite', 'Астриты', c.astrite, { step: 160 })}</div>
    ${num('radiant', 'Сияющие приливы', c.radiant)}
    ${num('forging', 'Кующие приливы', c.forging)}
  </div></section>
  <section class="section">
    <div class="label">Цель — персонаж</div>
    <div class="seg" style="margin-top:10px" data-seg="copies">${segS.map((s, i) => `<button data-v="${i}" aria-pressed="${c.copies === i}">${s}</button>`).join('')}</div>
    <div class="fields" style="margin-top:10px">
      ${num('pity', 'Крутки с последней 5★', p.char, { max: HARD_PITY - 1 })}
      <div class="field"><span>Проиграл 50/50?</span>${toggle('guar', 'Есть гарант', p.charGuarantee)}</div>
    </div>
  </section>
  <section class="section">
    <div class="label">Цель — сигнатурное оружие</div>
    <div class="seg" style="margin-top:10px" data-seg="weapon">${segR.map((s, i) => `<button data-v="${i}" aria-pressed="${c.weapon === i}">${s}</button>`).join('')}</div>
    <div class="fields" style="margin-top:10px">${num('wpity', 'Крутки на оружейном', p.weapon, { max: HARD_PITY - 1 })}</div>
  </section>
  <section class="section" id="calc-out"></section>`;
}

function calcResult() {
  const c = state.calc;
  const p = state.pity;
  const pulls = Math.floor(c.astrite / ASTRITE_PER_PULL) + c.radiant + c.forging;
  const r = plan({
    pulls,
    char: c.copies ? { copies: c.copies, pity: p.char, guaranteed: p.charGuarantee } : null,
    weapon: c.weapon ? { copies: c.weapon, pity: p.weapon } : null,
  });
  const curve = copiesCurve({ pulls, pity: p.char, guaranteed: p.charGuarantee });
  const target = [c.copies ? `S${c.copies - 1}` : '', c.weapon ? `R${c.weapon}` : ''].filter(Boolean).join(' + ');
  const short = r ? Math.max(0, r.p90 - pulls) : 0;
  return `
  <div class="result">
    ${r ? `<div class="ring" style="--p:${(r.chance * 100).toFixed(1)}"></div>` : ''}
    <div class="cap">${pulls} ${plural(pulls, 'крутка', 'крутки', 'круток')} · цель ${target || '—'}</div>
    <div class="big" style="margin-top:14px">${r ? pct(r.chance) : '—'}<small>%</small></div>
    <div class="muted" style="font-size:13px;margin-top:6px">${r ? (r.chance >= 0.9 ? 'Почти наверняка 👌' : r.chance >= 0.5 ? 'Шансы на твоей стороне' : r.chance >= 0.2 ? 'Рискованно' : 'Лучше копить дальше') : 'Выбери цель'}</div>
    ${r ? `<div class="meta3">
      <div><b>${Math.round(r.expected)}</b><span>в среднем</span></div>
      <div><b>${r.p90}</b><span>для 90%</span></div>
      <div><b>${r.worst}</b><span>худший случай</span></div>
    </div>
    ${short ? `<div class="note info" style="margin-top:12px">До 90% не хватает ~<b>${short}</b> ${plural(short, 'крутки', 'круток', 'круток')} ≈ <b>${(short * ASTRITE_PER_PULL).toLocaleString('ru')}</b> астритов.</div>` : ''}` : ''}
  </div>
  <div class="card" style="margin-top:10px">
    <div class="label">Шанс получить персонажа до уровня…</div>
    <div class="bars">${curve.map((v, i) => `<div class="b"><em>${pct(v)}</em><i style="height:${Math.max(2, v * 100)}%"></i><span>S${i}</span></div>`).join('')}</div>
  </div>`;
}

function mountCalc(root) {
  const out = root.querySelector('#calc-out');
  const update = () => {
    out.innerHTML = calcResult();
  };
  const read = () => {
    const v = (id) => Math.max(0, parseInt(root.querySelector('#' + id).value, 10) || 0);
    state.calc.astrite = v('astrite');
    state.calc.radiant = v('radiant');
    state.calc.forging = v('forging');
    state.pity.char = Math.min(HARD_PITY - 1, v('pity'));
    state.pity.weapon = Math.min(HARD_PITY - 1, v('wpity'));
    save('calc');
    save('pity');
    update();
  };
  bindNums(root, read);
  root.addEventListener('click', (e) => {
    const s = e.target.closest('[data-seg] button');
    if (s) {
      haptic.tap();
      const key = s.parentElement.dataset.seg;
      state.calc[key] = Number(s.dataset.v);
      for (const b of s.parentElement.children) b.setAttribute('aria-pressed', String(b === s));
      save('calc');
      update();
    }
    const g = e.target.closest('#guar');
    if (g) {
      haptic.tap();
      state.pity.charGuarantee = !state.pity.charGuarantee;
      g.setAttribute('aria-checked', String(state.pity.charGuarantee));
      save('pity');
      update();
    }
  });
  update();
}

/* ---------------- planner ---------------- */
function planTargets(ctx) {
  const up = upcomingBanners(ctx.data.banners, ctx.server).filter((b) => b.kind === 'event');
  const live = currentBanners(ctx.data.banners, ctx.server).filter((b) => b.kind === 'event');
  const opts = [];
  for (const b of up) opts.push([`s:${b.id}`, `Старт ${b.version} ф.${b.phase === 1 ? 'I' : 'II'} — ${b.featured.map((id) => ctx.data.byId[id]?.name).join(', ')}`, b.startMs]);
  for (const b of [...live, ...up]) opts.push([`e:${b.id}`, `Конец ${b.version} ф.${b.phase === 1 ? 'I' : 'II'} (${fmtDate(b.endMs, ctx.server)})`, b.endMs]);
  for (const days of [30, 42, 60, 90]) opts.push([`d:${days}`, `Через ${days} ${plural(days, 'день', 'дня', 'дней')}`, Date.now() + days * 864e5]);
  return opts;
}

function planView(ctx) {
  const p = state.plan;
  const opts = planTargets(ctx);
  if (!opts.some((o) => o[0] === p.target)) p.target = opts[0]?.[0] || 'd:42';
  return `
  ${head('02', 'Планер', 'Примерный доход к выбранной дате. Ежедневки — 60 астритов в день; остальное впиши под себя.')}
  <section class="section">
    <label class="field"><span>Копим до</span>
      <div class="num" style="padding:0 6px"><select id="target" style="flex:1;height:100%;background:none;border:0;outline:none;font:600 14px var(--f-body)">
        ${opts.map(([v, l]) => `<option value="${v}" ${v === p.target ? 'selected' : ''}>${esc(l)}</option>`).join('')}
      </select></div>
    </label>
    <div class="fields" style="margin-top:10px">
      ${num('pa', 'Астриты сейчас', p.astrite, { step: 160 })}
      ${num('pt', 'Приливы сейчас', p.tides)}
      <div class="full">${num('pw', 'Прочее за неделю (события, Башня, Пустоши)', p.weekly, { step: 50 })}</div>
    </div>
    <div style="margin-top:10px">${toggle('lun', 'Подписка Lunite', p.lunite, '+90 астритов в день')}</div>
  </section>
  <section class="section" id="plan-out"></section>`;
}

function planResult(ctx) {
  const p = state.plan;
  const opt = planTargets(ctx).find((o) => o[0] === p.target);
  const days = Math.max(0, Math.floor(((opt?.[2] || Date.now()) - Date.now()) / 864e5));
  const daily = 60 + (p.lunite ? 90 : 0);
  const income = days * daily + Math.floor((days / 7) * p.weekly);
  const total = p.astrite + income;
  const pulls = Math.floor(total / ASTRITE_PER_PULL) + p.tides;
  return `
  <div class="result">
    <div class="cap">через ${days} ${plural(days, 'день', 'дня', 'дней')}</div>
    <div class="big" style="margin-top:14px">${pulls}<small> ${plural(pulls, 'крутка', 'крутки', 'круток')}</small></div>
    <div class="meta3">
      <div><b>${total.toLocaleString('ru')}</b><span>астритов</span></div>
      <div><b>+${income.toLocaleString('ru')}</b><span>доход</span></div>
      <div><b>${(pulls / 80).toFixed(1)}</b><span>жёстких гаранта</span></div>
    </div>
  </div>
  <a class="btn ghost block" href="#/tools/calc" id="to-calc" style="margin-top:10px">Посчитать шансы с этим запасом →</a>`;
}

function mountPlan(root, ctx) {
  const out = root.querySelector('#plan-out');
  const update = () => (out.innerHTML = planResult(ctx));
  const read = () => {
    const v = (id) => Math.max(0, parseInt(root.querySelector('#' + id).value, 10) || 0);
    state.plan.astrite = v('pa');
    state.plan.tides = v('pt');
    state.plan.weekly = v('pw');
    save('plan');
    update();
  };
  bindNums(root, read);
  root.querySelector('#target').addEventListener('change', (e) => {
    state.plan.target = e.target.value;
    save('plan');
    update();
  });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('#lun');
    if (t) {
      haptic.tap();
      state.plan.lunite = !state.plan.lunite;
      t.setAttribute('aria-checked', String(state.plan.lunite));
      save('plan');
      update();
    }
    if (e.target.closest('#to-calc')) {
      const r = planResultNumbers(ctx);
      state.calc.astrite = r.total;
      state.calc.radiant = state.plan.tides;
      state.calc.forging = 0;
      save('calc');
    }
  });
  update();
}

function planResultNumbers(ctx) {
  const p = state.plan;
  const opt = planTargets(ctx).find((o) => o[0] === p.target);
  const days = Math.max(0, Math.floor(((opt?.[2] || Date.now()) - Date.now()) / 864e5));
  return { total: p.astrite + days * (60 + (p.lunite ? 90 : 0)) + Math.floor((days / 7) * p.weekly) };
}

/* ---------------- pity tracker ---------------- */
function pityCard(key, title, hint) {
  const p = state.pity;
  const val = p[key];
  const left = HARD_PITY - val;
  return `<div class="card pity-card" data-pity="${key}">
    <div class="row"><div class="label">${title}</div>${key === 'char' && p.charGuarantee ? '<span class="badge acc" style="margin-left:auto">гарант</span>' : ''}</div>
    <div class="row" style="margin-top:10px;align-items:baseline"><div class="pv">${val}<small> / ${HARD_PITY}</small></div>
      <div class="muted mono" style="margin-left:auto;font-size:12px">${val >= 66 ? '🔥 мягкий гарант' : `до гаранта ${left}`}</div></div>
    <div class="bar"><i style="width:${(val / HARD_PITY) * 100}%;${val >= 66 ? 'background:var(--hot);box-shadow:0 0 12px var(--hot)' : ''}"></i></div>
    <div class="btns">
      <button class="btn ghost sm" data-p="-1">−1</button>
      <button class="btn ghost sm" data-p="1">+1</button>
      <button class="btn ghost sm" data-p="10">+10</button>
      <button class="btn ghost sm" data-p="reset">0</button>
    </div>
    ${key === 'char'
      ? `<div class="fields" style="margin-top:8px"><button class="btn sm" data-p="win">Выпал featured</button><button class="btn sm ghost" data-p="lose">Проиграл 50/50</button></div>`
      : `<button class="btn sm block" style="height:36px;margin-top:8px" data-p="reset">Выпала 5★</button>`}
    <div class="muted" style="font-size:12px;margin-top:10px">${hint}</div>
  </div>`;
}

function pityView() {
  return `
  ${head('03', 'Трекер гаранта', 'Веди счётчики круток. Сохраняется в облаке Telegram и подставляется в калькулятор.')}
  <section class="section stack" id="pity-list">${pityList()}</section>`;
}
const pityList = () =>
  pityCard('char', 'Лимитный персонаж', 'Гарант общий для всех лимитных баннеров персонажей и переносится между фазами.') +
  pityCard('weapon', 'Лимитное оружие', 'Отдельный счётчик. Оружейный баннер гарантирует featured-оружие.') +
  pityCard('std', 'Стандартный', 'Отдельный счётчик для постоянного баннера.');

function mountPity(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    const key = b.closest('[data-pity]').dataset.pity;
    const p = state.pity;
    const a = b.dataset.p;
    if (a === 'reset') p[key] = 0;
    else if (a === 'win') {
      p.char = 0;
      p.charGuarantee = false;
    } else if (a === 'lose') {
      p.char = 0;
      p.charGuarantee = true;
    } else p[key] = Math.max(0, Math.min(HARD_PITY - 1, p[key] + Number(a)));
    a === 'win' || a === 'lose' || a === 'reset' ? haptic.ok() : haptic.tap();
    save('pity');
    root.querySelector('#pity-list').innerHTML = pityList();
  });
}

/* ---------------- echo sets ---------------- */
let setQuery = '';
function setsList(ctx) {
  const q = setQuery.toLowerCase();
  const users = {};
  for (const c of ctx.data.chars) c.build?.sets?.forEach((s, i) => !i && (users[s.name] ||= []).push(c));
  return ctx.data.sets
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.full.toLowerCase().includes(q))
    .map((s) => {
      const el = ELEMENTS[s.element];
      const who = (users[s.name] || []).slice(0, 6);
      return `<div class="set" style="--el:${el?.color || 'var(--acc)'}">
        <div class="sn">${s.icon ? `<img class="set-ico" src="${esc(s.icon)}" alt="" loading="lazy">` : ''}<span class="grow">${esc(s.name)}</span><span class="pc">${s.pieces} шт</span></div>
        <div class="sd">${s.two ? `<b>2:</b> ${esc(s.two)}<br>` : ''}<b>${s.pieces}:</b> ${esc(s.full)}</div>
        ${who.length ? `<div class="row" style="margin-top:10px;gap:6px">${who.map((c) => `<a href="#/char/${c.id}"><span class="ava sm" style="--el:${ELEMENTS[c.element]?.color}"><img src="${esc(c.icon)}" alt="${esc(c.name)}" loading="lazy"></span></a>`).join('')}<span class="muted" style="font-size:11.5px">носят как основной</span></div>` : ''}
      </div>`;
    })
    .join('');
}
function setsView(ctx) {
  return `
  ${head('05', 'Сеты эхо', `Все ${ctx.data.sets.length} сонат: что дают 2 и 5 (или 3) предметов.`)}
  <label class="search">${icons.search}<input id="sq" type="search" placeholder="Название или эффект: щит, крит…" value="${esc(setQuery)}"></label>
  <section class="section" id="sets">${setsList(ctx)}</section>`;
}
function mountSets(root, ctx) {
  const i = root.querySelector('#sq');
  i.addEventListener('input', () => {
    setQuery = i.value;
    root.querySelector('#sets').innerHTML = setsList(ctx);
  });
}

/* ---------------- codes ---------------- */
function codesView(ctx) {
  const c = ctx.data.codes;
  const row = (x) => `<button class="code ${x.active ? '' : 'off'}" ${x.active ? `data-copy="${esc(x.code)}"` : ''}>
    <div class="grow" style="text-align:left"><div class="c">${esc(x.code)}</div><div class="r">${esc(x.rewards)}${x.source ? ' · ' + esc(x.source) : ''}${!x.active && x.expires ? ' · истёк ' + esc(x.expires) : ''}</div></div>
    ${x.active ? `<span class="btn sm ghost">${icons.copy}</span>` : ''}</button>`;
  const act = c.codes.filter((x) => x.active);
  const old = c.codes.filter((x) => !x.active);
  return `
  ${head('06', 'Коды', esc(c.howTo))}
  <section class="section"><div class="label">Активные<span class="count">${act.length}</span></div><div class="list" style="margin-top:10px">${act.map(row).join('') || '<div class="empty">Сейчас активных нет</div>'}</div></section>
  <button class="btn block" style="margin-top:14px" data-redeem>Открыть страницу активации</button>
  ${old.length ? `<section class="section"><div class="label">Истёкшие</div><div class="list" style="margin-top:10px">${old.map(row).join('')}</div></section>` : ''}`;
}
function mountCodes(root, ctx) {
  root.querySelector('[data-redeem]')?.addEventListener('click', () => openLink(ctx.data.codes.redeemUrl));
}

/* ---------------- resets ---------------- */
function resetsView(ctx) {
  return `
  ${head('07', 'Ресеты', 'Ежедневный ресет — 04:00 по времени сервера, недельный — в понедельник в 04:00.')}
  <section class="section"><div class="list resets">
    ${Object.entries(SERVERS)
      .map(([k, s]) => `<div class="item" ${k === ctx.server ? 'style="border-color:var(--acc)"' : ''}>
        <div style="width:54px;font:800 14px var(--f-mono)">${s.short}</div>
        <div class="grow"><div class="t2">UTC${s.offset >= 0 ? '+' : ''}${s.offset}</div></div>
        <div class="end"><div class="t1 mono" data-cd="${nextReset(k)}"></div><div class="t2 mono">нед. <span data-cd="${nextReset(k, true)}"></span></div></div>
      </div>`)
      .join('')}
  </div></section>`;
}

/* ---------------- about ---------------- */
function aboutView(ctx) {
  const m = ctx.data.meta;
  return `
  ${head('08', 'О приложении', 'GachaBot — неофициальный фан-проект по Wuthering Waves. Не связан с Kuro Games.')}
  <section class="section card stack">
    <div><div class="label">Версия данных</div><div style="margin-top:8px;font:800 22px var(--f-display)">${esc(m.version)} <span class="muted" style="font:500 13px var(--f-body)">от ${esc(m.updated)}</span></div></div>
    <div><div class="label">Источники</div><ul style="margin:8px 0 0;padding-left:18px;color:var(--muted);font-size:13.5px">${m.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
    <div><div class="label">Шрифты</div><p class="muted" style="font-size:13.5px;margin:8px 0 0">Unbounded, Onest и JetBrains Mono — все с кириллицей, Google Fonts.</p></div>
  </section>
  <section class="section card">
    <div class="label">Бот</div>
    <p class="muted" style="font-size:13.5px;margin:8px 0 0">В чате с ботом: /banners, /build имя, /tier, /codes, /calc, /reset. В любом чате: <span class="mono">@бот имя</span> — отправить сборку.</p>
  </section>`;
}

/* ---------------- router ---------------- */
/* ---------------- weapons ---------------- */
let wQuery = '';
let wType = '';
function weaponsList(ctx) {
  const q = wQuery.toLowerCase();
  const list = Object.entries(ctx.data.weapons)
    .filter(([n, w]) => (!wType || w.type === wType) && (!q || n.toLowerCase().includes(q) || (w.ru || '').toLowerCase().includes(q)))
    .sort((a, b) => (b[1].rarity || 0) - (a[1].rarity || 0) || a[0].localeCompare(b[0]));
  if (!list.length) return '<div class="empty"><b>Ничего</b>Попробуй другой запрос</div>';
  const RC = { 5: 'var(--gold)', 4: 'var(--purple)', 3: '#5aa9ff' };
  return list
    .map(([n, w]) => `<button class="wpn" data-weapon="${esc(n)}">
      <span class="wi" style="--rc:${RC[w.rarity] || 'var(--gold)'}">${w.icon ? `<img src="${esc(w.icon)}" alt="" loading="lazy">` : ''}</span>
      <div class="grow"><div class="wn">${esc(n)}</div><div class="ws">${'★'.repeat(w.rarity || 0)} · ${WEAPONS[w.type]?.ru || ''}${w.sub ? ` · ${esc(w.sub.name)} ${esc(w.sub.value)}` : ''}</div></div>
      ${icons.chev}
    </button>`)
    .join('');
}
function weaponsView(ctx) {
  return `
  ${head('04', 'Оружие', 'Всё оружие из сборок: статы на 90 уровне и что делает пассивка.')}
  <label class="search">${icons.search}<input id="wq" type="search" placeholder="Название или эффект: щит, крит…" value="${esc(wQuery)}"></label>
  <div class="chips" style="margin-top:10px">
    <button class="chip" data-wt="" aria-pressed="${!wType}">Все</button>
    ${Object.entries(WEAPONS).map(([k, v]) => `<button class="chip" data-wt="${k}" aria-pressed="${wType === k}">${v.ru}</button>`).join('')}
  </div>
  <section class="section stack" id="wlist">${weaponsList(ctx)}</section>`;
}
function mountWeapons(root, ctx) {
  const i = root.querySelector('#wq');
  const upd = () => (root.querySelector('#wlist').innerHTML = weaponsList(ctx));
  i.addEventListener('input', () => {
    wQuery = i.value;
    upd();
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-wt]');
    if (!b) return;
    haptic.tap();
    wType = b.dataset.wt;
    for (const x of root.querySelectorAll('[data-wt]')) x.setAttribute('aria-pressed', String(x === b));
    upd();
  });
}

const VIEWS = {
  weapons: [weaponsView, mountWeapons],
  calc: [calcView, mountCalc],
  plan: [planView, mountPlan],
  pity: [pityView, mountPity],
  sets: [setsView, mountSets],
  codes: [codesView, mountCodes],
  resets: [resetsView],
  about: [aboutView],
};

export function render(ctx) {
  ctx.setGlow(null);
  const v = VIEWS[ctx.params[0]];
  return v ? v[0](ctx) : hub();
}

export function mount(root, ctx) {
  VIEWS[ctx.params[0]]?.[1]?.(root, ctx);
}

/* общие числовые поля со степперами */
function bindNums(root, onChange) {
  let t;
  const fire = () => {
    clearTimeout(t);
    t = setTimeout(onChange, 120);
  };
  root.querySelectorAll('[data-num]').forEach((box) => {
    const input = box.querySelector('input');
    const step = Number(box.dataset.step);
    const min = Number(box.dataset.min);
    const max = Number(box.dataset.max);
    input.addEventListener('input', fire);
    input.addEventListener('focus', () => input.select());
    box.querySelectorAll('[data-d]').forEach((b) =>
      b.addEventListener('click', () => {
        haptic.tap();
        const v = (parseInt(input.value, 10) || 0) + Number(b.dataset.d) * step;
        input.value = Math.max(min, Math.min(max, v));
        fire();
      }),
    );
  });
}
