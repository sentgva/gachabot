// Проверка данных и дымовой тест бота без сети: npm run check
// 1) все ссылки на персонажей в баннерах/тир-листе/командах существуют, картинки на месте;
// 2) бот обрабатывает типовые апдейты (API Telegram подменён заглушкой).
import { access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
process.env.DATA_URL = 'local'; // только локальные файлы
process.env.WEBAPP_URL ||= 'https://example.github.io/gachabot/';

const { getData } = await import('../bot/data.js');
const errors = [];
const d = await getData();
const has = (id) => Boolean(d.byId[id]);
const exists = (p) => access(join(ROOT, 'webapp', p)).then(() => true, () => false);

for (const b of d.banners) {
  for (const id of [...b.featured, ...b.fourStars]) if (!has(id)) errors.push(`баннер ${b.id}: нет персонажа ${id}`);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(b.start) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(b.end)) errors.push(`баннер ${b.id}: формат даты`);
}
for (const t of d.tier.tiers) for (const k of ['dps', 'hybrid', 'support']) for (const id of t[k]) if (!has(id)) errors.push(`тир ${t.tier}: нет ${id}`);
for (const c of d.chars) {
  for (const team of c.build?.teams || []) {
    const slots = Array.isArray(team) ? team.map((x) => [x]) : team.slots || [];
    if (slots.length !== 3) errors.push(`${c.id}: в команде не 3 слота`);
    for (const id of slots.flat()) if (!has(id)) errors.push(`${c.id}: в команде нет ${id}`);
  }
  for (const w of c.build?.weapons || []) if (!d.weapons[w.name]?.ru) errors.push(`${c.id}: нет описания оружия ${w.name}`);
  if (c.bg && !(await exists(c.bg))) errors.push(`${c.id}: нет фона ${c.bg}`);
  for (const s of c.build?.sets || []) if (!d.setsByName[s.name]) errors.push(`${c.id}: неизвестный сет ${s.name}`);
  for (const f of ['icon', 'art']) if (!c[f] || !(await exists(c[f]))) errors.push(`${c.id}: нет картинки ${f}`);
  if (!c.element || !c.weapon || !c.rarity) errors.push(`${c.id}: не заполнены element/weapon/rarity (запусти npm run sync)`);
}
console.log(`данные: ${d.chars.length} персонажей, ${d.banners.length} баннеров — ${errors.length ? errors.length + ' ошибок' : 'ок'}`);

// ---- бот ----
const { bot } = await import('../bot/bot.js');
bot.botInfo = { id: 1, is_bot: true, first_name: 'GachaBot', username: 'gachabot_test', can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: true };
const calls = [];
bot.api.config.use(async (prev, method, payload) => {
  calls.push({ method, payload });
  return { ok: true, result: method === 'sendMessage' || method === 'editMessageText' ? { message_id: 1, date: 0, chat: { id: 1, type: 'private' } } : true };
});

const user = { id: 42, is_bot: false, first_name: 'Тест' };
const chat = { id: 42, type: 'private' };
let uid = 1;
const msg = (text) => ({
  update_id: uid++,
  message: { message_id: uid, date: 0, chat, from: user, text, ...(text.startsWith('/') ? { entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] } : {}) },
});
const cb = (data) => ({ update_id: uid++, callback_query: { id: String(uid), from: user, chat_instance: '1', data, message: { message_id: 5, date: 0, chat, text: 'x' } } });
const inline = (query) => ({ update_id: uid++, inline_query: { id: String(uid), from: user, query, offset: '' } });

const cases = [
  [msg('/start'), 'sendMessage'],
  [msg('/start char_hsin'), 'sendMessage'],
  [msg('/banners'), 'sendMessage'],
  [msg('/build камелия'), 'sendMessage'],
  [msg('/build'), 'sendMessage'],
  [msg('/history jinhsi'), 'sendMessage'],
  [msg('/tier'), 'sendMessage'],
  [msg('/codes'), 'sendMessage'],
  [msg('/calc 28800 r1 гарант'), 'sendMessage'],
  [msg('/reset'), 'sendMessage'],
  [msg('шк'), 'sendMessage'],
  [msg('ровер'), 'sendMessage'],
  [msg('абракадабра'), 'sendMessage'],
  [cb('menu'), 'editMessageText'],
  [cb('chars'), 'editMessageText'],
  [cb('el:electro'), 'editMessageText'],
  [cb('b:hsin'), 'editMessageText'],
  [cb('h:hsin'), 'editMessageText'],
  [cb('drought'), 'editMessageText'],
  [cb('srv:na'), 'editMessageText'],
  [inline(''), 'answerInlineQuery'],
  [inline('синь'), 'answerInlineQuery'],
];
for (const [update, expect] of cases) {
  const before = calls.length;
  try {
    await bot.handleUpdate(update);
  } catch (e) {
    errors.push(`бот упал на ${JSON.stringify(update).slice(0, 80)}: ${e.message}`);
    continue;
  }
  const made = calls.slice(before).map((c) => c.method);
  if (!made.includes(expect)) errors.push(`бот: ожидался ${expect} на ${JSON.stringify(update).slice(0, 90)}, было: ${made.join(',') || 'ничего'}`);
  for (const c of calls.slice(before)) {
    const text = c.payload.text || '';
    if (text.length > 4096) errors.push(`бот: сообщение длиннее 4096 (${text.length})`);
    const tags = text.replace(/<\/?(b|i|code|a)( [^>]*)?>/g, '');
    if (/[<>]/.test(tags)) errors.push(`бот: неэкранированный < или > в ответе на ${c.method}`);
  }
}
const inl = calls.filter((c) => c.method === 'answerInlineQuery').pop();
console.log(`бот: ${cases.length} апдейтов, ${calls.length} вызовов API; инлайн «синь» → ${inl?.payload.results.map((r) => r.title).slice(0, 3).join(', ')}`);

if (errors.length) {
  console.error('\n' + errors.map((e) => '✗ ' + e).join('\n'));
  process.exit(1);
}
console.log('✓ всё в порядке');
