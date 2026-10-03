// Тексты сообщений бота (parse_mode: HTML).
import { ELEMENTS, WEAPONS, ROLES, KINDS, plural } from '../webapp/js/lib/labels.js';
import { SERVERS, fmtLeft, fmtDate, nextReset, daysBetween } from '../webapp/js/lib/time.js';
import { currentBanners, upcomingBanners, charRuns, rerunTable } from '../webapp/js/lib/logic.js';
import { plan, ASTRITE_PER_PULL, HARD_PITY } from '../webapp/js/lib/gacha.js';

export const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const el = (c) => `${ELEMENTS[c.element]?.emoji || ''} ${ELEMENTS[c.element]?.ru || ''}`;
const ph = (b) => (b.kind === 'event' ? `${b.version} · фаза ${b.phase === 1 ? 'I' : 'II'}` : `${b.version} · ${KINDS[b.kind]}`);
const now = () => Date.now();

export function bannersText(d, server) {
  const live = currentBanners(d.banners, server);
  const up = upcomingBanners(d.banners, server);
  const lines = [`<b>🌀 Баннеры</b> · сервер ${SERVERS[server].short}`, ''];
  if (!live.length) lines.push('Сейчас между фазами.');
  for (const b of live) {
    lines.push(`<b>${ph(b)}</b> — до конца <b>${fmtLeft(b.endMs - now())}</b>`);
    for (const id of b.featured) {
      const c = d.byId[id];
      if (!c) continue;
      const tag = b.kind === 'reverb' ? '' : b.new.includes(id) ? ' 🆕' : ' · реран';
      lines.push(`  ${ELEMENTS[c.element]?.emoji} <b>${esc(c.name)}</b>${tag}${c.tier ? ` · ${c.tier}` : ''}`);
    }
    if (b.weapons.length) lines.push(`  ⚔ ${b.weapons.map(esc).join(', ')}`);
    if (b.fourStars.length) lines.push(`  4★: ${b.fourStars.map((id) => esc(d.byId[id]?.name)).join(', ')}`);
    lines.push('');
  }
  const next = up.find((b) => b.kind === 'event');
  if (next) {
    lines.push(`<b>Далее: ${ph(next)}</b> — через ${fmtLeft(next.startMs - now())} (${fmtDate(next.startMs, server)})`);
    lines.push(`  ${next.featured.map((id) => `${ELEMENTS[d.byId[id]?.element]?.emoji} ${esc(d.byId[id]?.name)}${next.new.includes(id) ? ' 🆕' : ''}`).join('  ')}`);
    if (next.fourStars.length) lines.push(`  4★: ${next.fourStars.map((id) => esc(d.byId[id]?.name)).join(', ')}`);
  }
  return lines.join('\n').trim();
}

export function buildText(c, d) {
  const b = c.build;
  const role = ROLES[c.role]?.ru;
  const head = [
    `<b>${esc(c.name)}</b> · ${esc(c.ru)}`,
    `${'★'.repeat(c.rarity || 0)} · ${el(c)} · ${WEAPONS[c.weapon]?.ru || ''}${role ? ' · ' + role : ''}${c.tier ? ` · <b>${c.tier}</b>` : ''}`,
  ];
  if (!b) return [...head, '', 'Сборки пока нет.'].join('\n');
  const out = [...head, ''];
  if (b.preliminary) out.push('⚠️ <i>Персонаж ещё не вышел — сборка предварительная.</i>', '');
  out.push('<b>⚔ Оружие</b>');
  b.weapons.forEach((w, i) => out.push(`${i + 1}. ${esc(w.name)}${w.sig ? ' — сигна' : ''}`));
  if (b.sets.length) {
    out.push('', '<b>💠 Сет эхо</b>');
    b.sets.forEach((s, i) => {
      const info = d.setsByName[s.name];
      out.push(`${i ? '↳ альт: ' : ''}${esc(s.name)} (${s.pieces})${!i && info ? `\n<i>${esc(info.full)}</i>` : ''}`);
    });
  }
  if (b.mainEcho.length) out.push('', `<b>🐉 Главное эхо:</b> ${b.mainEcho.map(esc).join(' / ')}`);
  if (b.mainStats.length) {
    out.push('', `<b>📊 Статы ${b.mainStats.map((m) => m.cost).join('-')}</b>`);
    b.mainStats.forEach((m) => out.push(`${m.cost}: ${esc(m.stat)}`));
  }
  if (b.substats) out.push('', `<b>🎯 Сабстаты:</b> ${esc(b.substats)}`);
  if (b.skills.length) out.push('', `<b>📈 Навыки:</b> ${b.skills.map(esc).join(' → ')}`);
  if (b.teams?.length) {
    out.push('', '<b>👥 Команды</b>');
    b.teams.forEach((t) => out.push('• ' + t.map((id) => esc(d.byId[id]?.name || id)).join(' + ')));
  }
  return out.join('\n');
}

export function historyText(c, d, server) {
  const runs = charRuns(c.id, d.banners, server);
  if (!runs.length) return `<b>${esc(c.name)}</b> — ${c.limited ? 'баннеров ещё не было.' : 'не лимитный персонаж (стандарт / бесплатно).'}`;
  const past = runs.filter((r) => r.status === 'past');
  const live = runs.find((r) => r.status === 'live');
  const next = runs.find((r) => r.status === 'upcoming');
  const last = past[past.length - 1];
  const lines = [`<b>📜 ${esc(c.name)} — баннеры</b>`, ''];
  if (live) lines.push(`🟢 Сейчас на баннере — ещё ${fmtLeft(live.endMs - now())}`);
  else if (next) lines.push(`⏳ ${last ? 'Реран' : 'Дебют'} через ${fmtLeft(next.startMs - now())} (${fmtDate(next.startMs, server)})`);
  if (!live && last) lines.push(`Без рерана: <b>${daysBetween(last.endMs, now())}</b> дн. (последний — ${last.version})`);
  lines.push('');
  for (const r of runs) {
    lines.push(`${r.status === 'live' ? '🟢' : r.status === 'upcoming' ? '⏳' : '▫️'} ${ph(r)} — ${fmtDate(r.startMs, server, true)}${r.new.includes(c.id) ? ' · дебют' : ''}`);
  }
  return lines.join('\n');
}

export function droughtText(d, server) {
  const rows = rerunTable(d.chars, d.banners, server).filter((r) => !r.live && !r.next).slice(0, 15);
  return [
    '<b>🏜 Засуха реранов</b> — дольше всех без баннера:',
    '',
    ...rows.map((r, i) => `${String(i + 1).padStart(2, ' ')}. ${ELEMENTS[r.char.element]?.emoji} <b>${esc(r.char.name)}</b> — ${r.days} дн. (посл. ${r.lastVersion})`),
  ].join('\n');
}

export function tierText(d) {
  const t = d.tier;
  const role = { dps: 'DPS', hybrid: 'Гибрид', support: 'Саппорт' };
  const lines = [`<b>🏆 Тир-лист</b> · патч ${esc(t.patch)}`, `<i>${esc(t.mode)}</i>`, ''];
  for (const row of t.tiers) {
    lines.push(`<b>${row.tier}</b> — ${esc(row.label)}`);
    for (const k of ['dps', 'hybrid', 'support']) {
      if (row[k].length) lines.push(`  ${role[k]}: ${row[k].map((id) => esc(d.byId[id]?.name || id)).join(', ')}`);
    }
  }
  return lines.join('\n');
}

export function codesText(d) {
  const act = d.codes.codes.filter((c) => c.active);
  const lines = ['<b>🎁 Коды обмена</b>', ''];
  if (!act.length) lines.push('Сейчас активных кодов нет.');
  for (const c of act) lines.push(`<code>${esc(c.code)}</code> — ${esc(c.rewards)}`);
  lines.push('', `<i>${esc(d.codes.howTo)}</i>`, 'Нажми на код, чтобы скопировать.');
  return lines.join('\n');
}

export function resetText(server) {
  const lines = ['<b>⏰ Ресеты</b> (ежедневный 04:00, недельный — пн 04:00)', ''];
  for (const [k, s] of Object.entries(SERVERS)) {
    const mark = k === server ? '▸' : ' ';
    lines.push(`${mark} <b>${s.short}</b>: через ${fmtLeft(nextReset(k) - now())} · неделя ${fmtLeft(nextReset(k, true) - now())}`);
  }
  return lines.join('\n');
}

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
      '<b>🎲 Калькулятор круток</b>',
      '',
      'Примеры:',
      '<code>/calc 16000</code> — астриты',
      '<code>/calc 90 круток s1</code> — S1 за 90 круток',
      '<code>/calc 28800 r1 гарант pity 40</code> — персонаж + сигна, есть гарант, 40 круток на счётчике',
    ].join('\n');
  }
  const r = plan({
    pulls,
    char: o.copies ? { copies: o.copies, pity: o.pity, guaranteed: o.guaranteed } : null,
    weapon: o.weapon ? { copies: o.weapon, pity: 0 } : null,
  });
  const goal = [`S${o.copies - 1}`, o.weapon ? `R${o.weapon}` : ''].filter(Boolean).join(' + ');
  const pct = (x) => (x * 100 >= 99.95 ? '&gt;99.9' : (x * 100).toFixed(x < 0.1 ? 1 : 0));
  return [
    '<b>🎲 Калькулятор круток</b>',
    '',
    `Круток: <b>${pulls}</b>${o.astrite ? ` (${o.astrite} астр.)` : ''} · счётчик ${o.pity}${o.guaranteed ? ' · гарант' : ''}`,
    `Цель: <b>${goal}</b>`,
    '',
    `Шанс: <b>${pct(r.chance)}%</b>`,
    `В среднем нужно: ${Math.round(r.expected)} · для 90%: ${r.p90} · худший случай: ${r.worst}`,
    r.p90 > pulls ? `До 90% не хватает ~${r.p90 - pulls} ${plural(r.p90 - pulls, 'крутки', 'круток', 'круток')} (${(r.p90 - pulls) * ASTRITE_PER_PULL} астр.)` : '✅ Хватает с запасом',
    '',
    '<i>Модель: 0.8%, мягкий гарант с 66-й, жёсткий 80, 50/50.</i>',
  ].join('\n');
}

export const HELP = `<b>GachaBot · Wuthering Waves</b>

Просто напиши имя персонажа — пришлю сборку. Можно по-русски: «камелия», «шк», «синь».

/banners — текущие и следующие баннеры
/build имя — сборка (оружие, эхо, статы, команды)
/chars — выбрать персонажа по стихии
/history имя — когда был на баннере
/drought — кто дольше всех без рерана
/tier — тир-лист
/codes — активные коды
/calc — шанс выбить персонажа
/reset — таймеры ресета
/server — выбрать сервер
/app — открыть мини-приложение

В любом чате: <code>@бот имя</code> — отправить сборку собеседнику.`;
