// Тексты сообщений бота: обычный человеческий текст (parse_mode: HTML только ради имени и кодов).
import { ELEMENTS, WEAPONS, ROLES, plural } from '../webapp/js/lib/labels.js';
import { SERVERS, fmtLeft, fmtDate, nextReset, daysBetween } from '../webapp/js/lib/time.js';
import { currentBanners, upcomingBanners, charRuns, rerunTable, teamSlots } from '../webapp/js/lib/logic.js';
import { plan, ASTRITE_PER_PULL, HARD_PITY } from '../webapp/js/lib/gacha.js';

export const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const now = () => Date.now();
const lower = (s) => s.toLowerCase().replace(/\bhp\b/g, 'HP');
const list = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} и ${arr.at(-1)}`);
const phaseName = (b) => (b.phase === 1 ? 'первая фаза' : 'вторая фаза');
const names = (d, ids) => ids.map((id) => d.byId[id]?.name || id);

/* ---------------- баннеры ---------------- */

export function bannersText(d, server) {
  const live = currentBanners(d.banners, server);
  const up = upcomingBanners(d.banners, server);
  const ev = live.find((b) => b.kind === 'event');
  const out = [];
  if (ev) {
    out.push(`Сейчас идёт версия ${ev.version}, ${phaseName(ev)}. Она закончится ${fmtDate(ev.endMs, server)}, осталось ${fmtLeft(ev.endMs - now())}.`);
    out.push('');
    const fresh = names(d, ev.new);
    const reruns = names(d, ev.featured.filter((id) => !ev.new.includes(id)));
    const parts = [];
    if (fresh.length) parts.push(`${fresh.length > 1 ? 'новые персонажи' : 'новый персонаж'} ${list(fresh)}`);
    if (reruns.length) parts.push(`реран ${list(reruns)}`);
    out.push(`На баннерах ${parts.join(', ')}.`);
    if (ev.weapons.length) out.push(`Оружие: ${list(ev.weapons)}.`);
    if (ev.fourStars.length) out.push(`Повышенный шанс из 4★: ${list(names(d, ev.fourStars))}.`);
  } else {
    out.push('Сейчас пауза между фазами.');
  }
  for (const b of live.filter((x) => x.kind !== 'event')) {
    out.push('');
    const what = b.kind === 'reverb' ? 'ревёрб-реран, можно выбрать одного из' : b.kind === 'collab' ? 'коллаборация' : 'юбилейный реран';
    out.push(`Ещё идёт ${what}: ${list(names(d, b.featured))}. До ${fmtDate(b.endMs, server)}.`);
  }
  const next = up.find((b) => b.kind === 'event');
  if (next) {
    out.push('');
    const fresh = names(d, next.new);
    const reruns = names(d, next.featured.filter((id) => !next.new.includes(id)));
    const who = [fresh.length ? `${list(fresh)} (${fresh.length > 1 ? 'новые' : 'новый персонаж'})` : '', reruns.length ? `реран — ${list(reruns)}` : '']
      .filter(Boolean)
      .join(', ');
    out.push(`Дальше, с ${fmtDate(next.startMs, server)} (через ${fmtLeft(next.startMs - now())}): ${who}.`);
    if (next.fourStars.length) out.push(`Из 4★ там будут ${list(names(d, next.fourStars))}.`);
  }
  out.push('', `Время указано для сервера ${SERVERS[server].short}.`);
  return out.join('\n');
}

/* ---------------- сборка ---------------- */

function statText(s) {
  return lower(s).replace(/ \/ /g, ' или ').replace(/ (≥|>|=) /g, ' или ');
}

function mainStatsText(main) {
  const by = {};
  for (const m of main) (by[m.cost] ||= []).push(statText(m.stat));
  const parts = [];
  for (const cost of ['4', '3', '1']) {
    const arr = by[cost];
    if (!arr) continue;
    const uniq = [...new Set(arr)];
    parts.push(uniq.length === 1 ? `в ${cost}-кост — ${uniq[0]}` : `в ${cost}-кост — ${uniq[0]}, во второй ${uniq[1]}`);
  }
  return parts.join('; ');
}

function substatsText(str) {
  const groups = str.split(/\s+(?:>>>|>)\s+/).map((g) => g.split(/\s+(?:=|≥)\s+/).map(lower).join(' и '));
  if (groups.length === 1) return groups[0];
  return `сначала ${groups[0]}, потом ${groups[1]}${groups.length > 2 ? `, дальше ${groups.slice(2).join(', ')}` : ''}`;
}

function teamText(t, d) {
  return teamSlots(t, d)
    .map((s) => {
      const main = d.byId[s.main]?.name || s.main;
      return s.alts.length ? `${main} (или ${names(d, s.alts).join(', ')})` : main;
    })
    .join(' + ');
}

export function buildText(c, d) {
  const b = c.build;
  const el = ELEMENTS[c.element]?.ru.toLowerCase() || '';
  const wp = WEAPONS[c.weapon]?.ru.toLowerCase() || '';
  const role = ROLES[c.role]?.ru;
  const out = [`<b>${esc(c.name)}</b> (${esc(c.ru)}) — ${c.rarity}★, ${el}, ${wp}.${role ? ` ${role}` : ''}${c.tier ? `, тир ${c.tier}` : ''}.`];
  if (!b) return [...out, '', 'Сборки для этого персонажа пока нет.'].join('\n');
  if (b.preliminary) out.push('', 'Персонаж ещё не вышел, поэтому сборка предварительная.');

  const [first, ...rest] = b.weapons;
  if (first) {
    out.push('');
    const head = first.sig ? `Лучше всего сигнатурное оружие ${esc(first.name)}.` : `Лучшее оружие — ${esc(first.name)}.`;
    out.push(`${head}${rest.length ? ` Если его нет, подойдут ${list(rest.map((w) => esc(w.name)))}.` : ''}`);
  }

  if (b.sets.length) {
    const [s, ...alt] = b.sets;
    const info = d.setsByName[s.name];
    out.push('');
    const eff = info ? (/^[А-ЯЁ]/.test(info.full) ? info.full[0].toLowerCase() + info.full.slice(1) : info.full) : '';
    out.push(`Эхо: ${s.pieces === 5 ? 'полный сет' : `сет на ${s.pieces} шт.`} ${esc(s.name)}${eff ? ` — ${esc(eff)}` : ''}.`);
    if (alt.length) out.push(`Как альтернатива — ${list(alt.map((x) => esc(x.name)))}.`);
  }
  if (b.mainEcho.length) out.push(`Главное эхо — ${esc(b.mainEcho[0])}${b.mainEcho[1] ? `, можно ${esc(b.mainEcho[1])}` : ''}.`);
  if (b.mainStats.length) out.push('', `Основные статы: ${esc(mainStatsText(b.mainStats))}.`);
  if (b.substats) out.push(`Сабстаты: ${esc(substatsText(b.substats))}.`);
  if (b.skills.length) out.push(`Навыки качать в таком порядке: ${lower(b.skills.join(', '))}.`);

  if (b.teams?.length) {
    out.push('', 'С кем играть:');
    for (const t of b.teams) out.push(esc(teamText(t, d)));
  }
  return out.join('\n');
}

/* ---------------- история и засуха ---------------- */

export function historyText(c, d, server) {
  const runs = charRuns(c.id, d.banners, server);
  if (!runs.length) {
    return c.limited
      ? `У ${esc(c.name)} ещё не было баннеров.`
      : `${esc(c.name)} — не лимитный персонаж: есть в стандартном баннере или выдаётся бесплатно.`;
  }
  const past = runs.filter((r) => r.status === 'past');
  const live = runs.find((r) => r.status === 'live');
  const next = runs.find((r) => r.status === 'upcoming');
  const last = past[past.length - 1];
  const label = (r) => {
    const base = r.kind === 'event' ? `${r.version}` : r.kind === 'reverb' ? `${r.version} (ревёрб, на выбор)` : r.kind === 'anniversary' ? `${r.version} (юбилейный)` : `${r.version} (коллаборация)`;
    return r.new.includes(c.id) ? `${base} (дебют, ${fmtDate(r.startMs, server, true)})` : base;
  };
  const real = runs.filter((r) => r.status !== 'upcoming');
  const out = [`Баннеров у ${esc(c.name)}: ${real.length}. Это ${list(real.map(label))}.`];
  if (live) out.push(`Сейчас на баннере, осталось ${fmtLeft(live.endMs - now())}.`);
  else if (last) out.push(`С последнего баннера прошло ${daysBetween(last.endMs, now())} ${plural(daysBetween(last.endMs, now()), 'день', 'дня', 'дней')} (закончился ${fmtDate(last.endMs, server, true)}).`);
  if (next) out.push(`Следующий — с ${fmtDate(next.startMs, server)}, через ${fmtLeft(next.startMs - now())}.`);
  else if (!live) out.push('Новых анонсов пока нет.');
  return out.join('\n');
}

export function droughtText(d, server) {
  const rows = rerunTable(d.chars, d.banners, server).filter((r) => !r.live && !r.next).slice(0, 15);
  return [
    'Дольше всех без рерана:',
    '',
    ...rows.map((r, i) => `${i + 1}. ${esc(r.char.name)} — ${r.days} ${plural(r.days, 'день', 'дня', 'дней')} (последний раз в ${r.lastVersion})`),
  ].join('\n');
}

/* ---------------- тир-лист, коды, ресеты ---------------- */

export function tierText(d) {
  const t = d.tier;
  const out = [`Тир-лист на патч ${esc(t.patch)}, ${esc(t.mode)}.`];
  for (const row of t.tiers) {
    const parts = [];
    for (const k of ['dps', 'hybrid', 'support']) {
      if (row[k].length) parts.push(`${ROLES[k].short}: ${names(d, row[k]).join(', ')}`);
    }
    out.push('', `${row.tier} (${row.label.toLowerCase()})`, ...parts.map(esc));
  }
  return out.join('\n');
}

export function codesText(d) {
  const act = d.codes.codes.filter((c) => c.active);
  const out = [];
  if (!act.length) out.push('Сейчас активных кодов нет.');
  else {
    out.push(act.length > 1 ? 'Активные коды (нажми на код, чтобы скопировать):' : 'Активный код (нажми, чтобы скопировать):', '');
    for (const c of act) out.push(`<code>${esc(c.code)}</code> — ${esc(c.rewards)}`);
  }
  out.push('', esc(d.codes.howTo));
  return out.join('\n');
}

export function resetText(server) {
  const me = SERVERS[server];
  const others = Object.entries(SERVERS).filter(([k]) => k !== server);
  const groups = new Map();
  for (const [k, s] of others) {
    const left = fmtLeft(nextReset(k) - now());
    if (!groups.has(left)) groups.set(left, []);
    groups.get(left).push(s.short);
  }
  return [
    `Ежедневный ресет на ${me.short} через ${fmtLeft(nextReset(server) - now())}, недельный — через ${fmtLeft(nextReset(server, true) - now())}.`,
    `На других серверах ежедневный ресет: ${[...groups].map(([left, s]) => `${s.join('/')} — через ${left}`).join(', ')}.`,
    '',
    'Ресет в 04:00 по времени сервера, недельный — в понедельник.',
  ].join('\n');
}

/* ---------------- калькулятор ---------------- */

/** /calc 16000 гарант s1 r1 pity 40  |  /calc 120 круток */
export function parseCalc(text) {
  const o = { astrite: 0, pulls: 0, copies: 1, weapon: 0, pity: 0, guaranteed: false };
  const NB = '(?<![a-zа-я0-9])'; // «не после буквы/цифры» — \b не работает с кириллицей
  let t = ` ${text.toLowerCase().replace(/,/g, ' ')} `;
  t = t.replace(/(?:pity|пити|счётчик|счетчик)\s*(\d+)/g, (_, n) => ((o.pity = Math.min(HARD_PITY - 1, Number(n))), ' '));
  t = t.replace(new RegExp(NB + '[sсc]([0-6])(?![0-9])', 'g'), (_, n) => ((o.copies = Number(n) + 1), ' '));
  t = t.replace(new RegExp(NB + '[rр]([1-5])(?![0-9])', 'g'), (_, n) => ((o.weapon = Number(n)), ' '));
  t = t.replace(/гарант|guarantee/g, () => ((o.guaranteed = true), ' '));
  for (const m of t.matchAll(/(\d+)\s*(?:(к|k)(?![а-яa-z])|(тыс\S*))?\s*(крут\S*|pulls?|прыж\S*|аст\S*|astr\S*)?/g)) {
    const n = Number(m[1]) * (m[2] || m[3] ? 1000 : 1);
    if (/^(крут|pull|прыж)/.test(m[4] || '')) o.pulls += n;
    else if (/^(аст|astr)/.test(m[4] || '') || n >= 1000) o.astrite += n;
    else o.pulls += n;
  }
  return o;
}

export function calcText(o) {
  const pulls = o.pulls + Math.floor(o.astrite / ASTRITE_PER_PULL);
  if (!pulls) {
    return [
      'Напиши, сколько у тебя астритов или круток, и я посчитаю шанс. Например:',
      '',
      '<code>/calc 16000</code> — шанс выбить персонажа с 16 000 астритов',
      '<code>/calc 90 круток s1</code> — шанс на S1 за 90 круток',
      '<code>/calc 28800 r1 гарант pity 40</code> — персонаж и сигна, есть гарант, 40 круток на счётчике',
    ].join('\n');
  }
  const r = plan({
    pulls,
    char: o.copies ? { copies: o.copies, pity: o.pity, guaranteed: o.guaranteed } : null,
    weapon: o.weapon ? { copies: o.weapon, pity: 0 } : null,
  });
  const goal = [`S${o.copies - 1}`, o.weapon ? `R${o.weapon}` : ''].filter(Boolean).join(' + ');
  const p = r.chance * 100;
  const chance = p >= 99.95 ? 'больше 99.9%' : `${p.toFixed(r.chance < 0.1 ? 1 : 0)}%`;
  const cond = [o.astrite ? `${o.astrite.toLocaleString('ru')} астритов` : '', o.pity ? `${o.pity} на счётчике` : '', o.guaranteed ? 'с гарантом' : '']
    .filter(Boolean)
    .join(', ');
  const short = r.p90 - pulls;
  return [
    `С ${pulls} ${plural(pulls, 'круткой', 'крутками', 'крутками')}${cond ? ` (${cond})` : ''} шанс получить ${goal} — ${chance}.`,
    `В среднем на это уходит ${Math.round(r.expected)} ${plural(Math.round(r.expected), 'крутка', 'крутки', 'круток')}, для уверенности 90% нужно ${r.p90}, в худшем случае — ${r.worst}.`,
    short > 0
      ? `До 90% не хватает примерно ${short} ${plural(short, 'крутки', 'круток', 'круток')}, это ${(short * ASTRITE_PER_PULL).toLocaleString('ru')} астритов.`
      : 'Круток хватает с запасом.',
    '',
    'Это оценка: базовый шанс 0.8%, мягкий гарант с 66-й крутки, жёсткий на 80-й, на персонажа 50/50.',
  ].join('\n');
}

export const HELP = `Я помогаю с Wuthering Waves. Напиши имя персонажа — расскажу, как его собрать. Можно по-русски: «камелия», «шк», «синь».

Что ещё умею:
/banners — кто сейчас на баннерах и кто следующий
/build имя — сборка персонажа
/chars — выбрать персонажа по стихии
/history имя — когда у персонажа были баннеры
/drought — кто дольше всех без рерана
/tier — тир-лист
/codes — активные коды
/calc — шанс выбить персонажа
/reset — когда ресет
/server — выбрать свой сервер
/app — открыть мини-приложение

В любом чате можно написать <code>@бот имя</code> и отправить сборку собеседнику.`;
