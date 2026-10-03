// Обработчики бота. Запуск — в index.js.
import { Bot, InlineKeyboard, GrammyError } from 'grammy';
import { config } from './config.js';
import { getData, assetUrl, getServer, setServer } from './data.js';
import * as F from './format.js';
import { findChars, currentBanners, norm } from '../webapp/js/lib/logic.js';
import { ELEMENTS, TIER_ORDER } from '../webapp/js/lib/labels.js';
import { SERVERS } from '../webapp/js/lib/time.js';

export const bot = new Bot(config.token || '0:test');
const HTML = { parse_mode: 'HTML' };
const NO_PREVIEW = { link_preview_options: { is_disabled: true } };

/* ---------------- кнопки ---------------- */

/** Кнопка Mini App: в личке — web_app, в группах — ссылка (web_app-кнопки там запрещены). */
function appButton(kb, ctx, text, hash = '', startapp = '') {
  if (!config.webappUrl) return kb;
  const isPrivate = ctx.chat?.type === 'private';
  if (isPrivate && !ctx.inlineQuery) return kb.webApp(text, config.webappUrl + hash);
  if (config.miniappLink) return kb.url(text, config.miniappLink + (startapp ? `?startapp=${startapp}` : ''));
  return kb.url(text, config.webappUrl + hash);
}

function menuKb(ctx) {
  const kb = new InlineKeyboard();
  if (config.webappUrl) appButton(kb, ctx, 'Открыть приложение').row();
  return kb
    .text('Баннеры', 'banners').text('Сборки', 'chars').row()
    .text('Тир-лист', 'tier').text('Коды', 'codes').row()
    .text('Ресет', 'reset').text('Засуха реранов', 'drought').row()
    .text('Калькулятор', 'calc').text('Сервер', 'server');
}

function elementsKb() {
  const kb = new InlineKeyboard();
  Object.entries(ELEMENTS).forEach(([k, e], i) => {
    kb.text(e.ru, `el:${k}`);
    if (i % 3 === 2) kb.row();
  });
  return kb.row().text('Меню', 'menu');
}

function charsKb(d, element) {
  const list = d.chars
    .filter((c) => c.element === element)
    .sort((a, b) => b.rarity - a.rarity || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
  const kb = new InlineKeyboard();
  list.forEach((c, i) => {
    kb.text(`${c.name}${c.rarity === 4 ? ' (4★)' : ''}`, `b:${c.id}`);
    if (i % 2 === 1) kb.row();
  });
  return kb.row().text('Назад', 'chars');
}

const backKb = (extra) => {
  const kb = new InlineKeyboard();
  if (extra) extra(kb);
  return kb.text('Меню', 'menu');
};

/* ---------------- ответы ---------------- */

async function show(ctx, text, extra = {}) {
  const opts = { ...HTML, ...NO_PREVIEW, ...extra };
  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, opts);
    } catch (e) {
      if (e instanceof GrammyError && /not modified/.test(e.description)) return;
      if (ctx.callbackQuery.inline_message_id) return;
    }
  }
  return ctx.reply(text, opts);
}

function buildKb(ctx, c) {
  const kb = new InlineKeyboard().text('История баннеров', `h:${c.id}`);
  appButton(kb, ctx, 'В приложении', `#/char/${c.id}`, `char_${c.id}`);
  return kb.row().text(`Другие: ${ELEMENTS[c.element]?.ru || ''}`, `el:${c.element}`);
}

async function sendBuild(ctx, c) {
  const d = await getData();
  return show(ctx, F.buildText(c, d), { reply_markup: buildKb(ctx, c) });
}

async function sendBanners(ctx) {
  const d = await getData();
  const server = await getServer(ctx.from?.id);
  const kb = new InlineKeyboard().text('Обновить', 'banners').text('Засуха реранов', 'drought').row();
  appButton(kb, ctx, 'Все баннеры в приложении', '#/banners', 'banners');
  return show(ctx, F.bannersText(d, server), { reply_markup: kb.row().text('Меню', 'menu') });
}

async function findOne(ctx, query, { quiet = false } = {}) {
  const d = await getData();
  const found = findChars(d.chars, query, 6);
  if (!found.length) {
    if (!quiet) await ctx.reply(`Не нашёл «${F.esc(query)}». Напиши имя персонажа (можно по-русски) или выбери его по стихии:`, { ...HTML, reply_markup: elementsKb() });
    return null;
  }
  const qn = norm(query);
  const exact = found.find((c) => [c.id, c.name, c.ru].some((k) => norm(k) === qn));
  if (exact) return exact;
  // «ровер», «скиталец», «yang» — несколько равноценных совпадений: дать выбрать
  const prefixed = found.filter((c) => norm(c.name).startsWith(qn) || norm(c.ru).startsWith(qn));
  if (prefixed.length > 1) {
    const kb = new InlineKeyboard();
    prefixed.forEach((c) => kb.text(c.name, `b:${c.id}`).row());
    await ctx.reply('Кого именно ты имеешь в виду?', { reply_markup: kb });
    return null;
  }
  return found[0];
}

/* ---------------- команды ---------------- */

bot.command('start', async (ctx) => {
  const p = ctx.match?.trim();
  const d = await getData();
  if (p?.startsWith('char_') && d.byId[p.slice(5)]) return sendBuild(ctx, d.byId[p.slice(5)]);
  if (p === 'banners') return sendBanners(ctx);
  const name = ctx.from?.first_name ? `, ${F.esc(ctx.from.first_name)}` : '';
  await ctx.reply(
    `Привет${name}! Я GachaBot, помогаю с Wuthering Waves ${F.esc(d.meta.version)}: подскажу, кто сейчас на баннерах, как собрать персонажа, покажу тир-лист и коды, посчитаю шансы на крутки.\n\nНапиши имя персонажа (можно по-русски) или выбери раздел ниже.`,
    { ...HTML, reply_markup: menuKb(ctx) },
  );
});

bot.command('help', (ctx) => ctx.reply(F.HELP, { ...HTML, reply_markup: menuKb(ctx) }));
bot.command(['banners', 'banner'], sendBanners);
bot.command(['chars', 'characters'], (ctx) => ctx.reply('Выбери стихию:', { reply_markup: elementsKb() }));
bot.command(['build', 'b'], async (ctx) => {
  const q = ctx.match?.trim();
  if (!q) return ctx.reply('Чью сборку показать? Напиши <code>/build имя</code> или выбери стихию:', { ...HTML, reply_markup: elementsKb() });
  const c = await findOne(ctx, q);
  if (c) await sendBuild(ctx, c);
});
bot.command(['history', 'h'], async (ctx) => {
  const q = ctx.match?.trim();
  if (!q) return ctx.reply('Напиши <code>/history имя</code>', HTML);
  const c = await findOne(ctx, q);
  if (!c) return;
  const d = await getData();
  await show(ctx, F.historyText(c, d, await getServer(ctx.from?.id)), { reply_markup: new InlineKeyboard().text('Сборка', `b:${c.id}`) });
});
bot.command('drought', async (ctx) => show(ctx, F.droughtText(await getData(), await getServer(ctx.from?.id)), { reply_markup: backKb() }));
bot.command(['tier', 'tierlist'], async (ctx) => {
  show(ctx, F.tierText(await getData()), { reply_markup: backKb((kb) => appButton(kb, ctx, 'Тир-лист в приложении', '#/tier', 'tier').row()) });
});
bot.command('codes', async (ctx) => show(ctx, F.codesText(await getData()), { reply_markup: backKb() }));
bot.command('reset', async (ctx) => show(ctx, F.resetText(await getServer(ctx.from?.id)), { reply_markup: backKb((kb) => kb.text('Сменить сервер', 'server').row()) }));
bot.command('calc', (ctx) => {
  const kb = backKb((k) => appButton(k, ctx, 'Калькулятор в приложении', '#/tools/calc', 'calc').row());
  return show(ctx, F.calcText(F.parseCalc(ctx.match || '')), { reply_markup: kb });
});
bot.command('server', (ctx) => showServers(ctx));
bot.command('app', (ctx) => {
  if (!config.webappUrl) return ctx.reply('Mini App ещё не опубликован (не задан WEBAPP_URL).');
  return ctx.reply('Жми кнопку ниже, чтобы открыть приложение.', { reply_markup: appButton(new InlineKeyboard(), ctx, 'Открыть GachaBot') });
});

async function showServers(ctx) {
  const cur = await getServer(ctx.from?.id);
  const kb = new InlineKeyboard();
  Object.entries(SERVERS).forEach(([k, s], i) => {
    kb.text(`${k === cur ? '● ' : ''}${s.short} (UTC${s.offset >= 0 ? '+' : ''}${s.offset})`, `srv:${k}`);
    if (i % 2 === 1) kb.row();
  });
  return show(ctx, 'На каком ты сервере? От этого зависят таймеры баннеров и ресетов.', { reply_markup: kb.row().text('Меню', 'menu') });
}

/* ---------------- кнопки (callback) ---------------- */

bot.callbackQuery('menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  return show(ctx, 'Выбери раздел или напиши имя персонажа:', { reply_markup: menuKb(ctx) });
});
bot.callbackQuery('banners', async (ctx) => {
  await ctx.answerCallbackQuery();
  return sendBanners(ctx);
});
bot.callbackQuery('chars', async (ctx) => {
  await ctx.answerCallbackQuery();
  return show(ctx, 'Выбери стихию:', { reply_markup: elementsKb() });
});
bot.callbackQuery(/^el:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const el = ctx.match[1];
  const d = await getData();
  return show(ctx, `${ELEMENTS[el]?.ru}: выбери персонажа`, { reply_markup: charsKb(d, el) });
});
bot.callbackQuery(/^b:([\w-]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const c = (await getData()).byId[ctx.match[1]];
  if (c) return sendBuild(ctx, c);
});
bot.callbackQuery(/^h:([\w-]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const d = await getData();
  const c = d.byId[ctx.match[1]];
  if (!c) return;
  return show(ctx, F.historyText(c, d, await getServer(ctx.from?.id)), { reply_markup: new InlineKeyboard().text('Назад к сборке', `b:${c.id}`) });
});
bot.callbackQuery('tier', async (ctx) => {
  await ctx.answerCallbackQuery();
  return show(ctx, F.tierText(await getData()), { reply_markup: backKb((kb) => appButton(kb, ctx, 'Тир-лист в приложении', '#/tier', 'tier').row()) });
});
bot.callbackQuery('codes', async (ctx) => {
  await ctx.answerCallbackQuery();
  return show(ctx, F.codesText(await getData()), { reply_markup: backKb() });
});
bot.callbackQuery('reset', async (ctx) => {
  await ctx.answerCallbackQuery();
  return show(ctx, F.resetText(await getServer(ctx.from?.id)), { reply_markup: backKb((kb) => kb.text('Обновить', 'reset').text('Сервер', 'server').row()) });
});
bot.callbackQuery('drought', async (ctx) => {
  await ctx.answerCallbackQuery();
  return show(ctx, F.droughtText(await getData(), await getServer(ctx.from?.id)), { reply_markup: backKb() });
});
bot.callbackQuery('calc', async (ctx) => {
  await ctx.answerCallbackQuery();
  const kb = backKb((k) => appButton(k, ctx, 'Калькулятор в приложении', '#/tools/calc', 'calc').row());
  return show(ctx, F.calcText(F.parseCalc('')), { reply_markup: kb });
});
bot.callbackQuery('server', async (ctx) => {
  await ctx.answerCallbackQuery();
  return showServers(ctx);
});
bot.callbackQuery(/^srv:(\w+)$/, async (ctx) => {
  const s = ctx.match[1];
  if (!SERVERS[s]) return ctx.answerCallbackQuery();
  await setServer(ctx.from.id, s);
  await ctx.answerCallbackQuery(`Сервер: ${SERVERS[s].short}`);
  return show(ctx, F.resetText(s), { reply_markup: backKb((kb) => kb.text('Баннеры', 'banners').row()) });
});

/* ---------------- инлайн-режим: @бот имя ---------------- */

bot.on('inline_query', async (ctx) => {
  const d = await getData();
  const q = ctx.inlineQuery.query.trim();
  const server = await getServer(ctx.from.id);
  let list = q ? findChars(d.chars, q, 20) : [];
  if (!q) {
    const ids = currentBanners(d.banners, server).flatMap((b) => (b.kind === 'reverb' ? [] : b.featured));
    list = [...new Set(ids)].map((id) => d.byId[id]).filter(Boolean);
  }
  const results = list.map((c) => {
    const kb = new InlineKeyboard().text('История баннеров', `h:${c.id}`);
    if (config.webappUrl) kb.url('В приложении', config.miniappLink ? `${config.miniappLink}?startapp=char_${c.id}` : `${config.webappUrl}#/char/${c.id}`);
    const set = c.build?.sets?.[0]?.name;
    return {
      type: 'article',
      id: `c:${c.id}`,
      title: `${c.name} · ${c.ru}`,
      description: [c.tier, ELEMENTS[c.element]?.ru, c.build?.weapons?.[0]?.name, set].filter(Boolean).join(' · '),
      thumbnail_url: assetUrl(`assets/thumbs/${c.id}.jpg`) || undefined,
      input_message_content: { message_text: F.buildText(c, d), ...HTML, ...NO_PREVIEW },
      reply_markup: kb,
    };
  });
  if (!q) {
    results.unshift({
      type: 'article',
      id: 'banners',
      title: 'Текущие баннеры',
      description: 'Кто сейчас на баннере и сколько осталось',
      thumbnail_url: assetUrl('assets/thumbs/_banners.jpg') || undefined,
      input_message_content: { message_text: F.bannersText(d, server), ...HTML, ...NO_PREVIEW },
    });
  }
  await ctx.answerInlineQuery(results.slice(0, 50), { cache_time: q ? 600 : 120, is_personal: !q });
});

/* ---------------- обычный текст ---------------- */

bot.on('message:text', async (ctx) => {
  let text = ctx.message.text.trim();
  const isPrivate = ctx.chat.type === 'private';
  const me = ctx.me.username;
  if (!isPrivate) {
    // В группах отвечаем только на упоминание или ответ на сообщение бота
    const mentioned = text.includes(`@${me}`);
    const replied = ctx.message.reply_to_message?.from?.id === ctx.me.id;
    if (!mentioned && !replied) return;
    text = text.replace(`@${me}`, '').trim();
  }
  if (text.startsWith('/')) return; // неизвестная команда
  const low = text.toLowerCase();
  if (/баннер|banner|конвент/.test(low)) return sendBanners(ctx);
  if (/^код|codes?$/.test(low)) return show(ctx, F.codesText(await getData()));
  if (/тир|tier/.test(low)) return show(ctx, F.tierText(await getData()));
  if (/ресет|reset/.test(low)) return show(ctx, F.resetText(await getServer(ctx.from.id)));
  if (/^\d/.test(low) || /крут|астрит/.test(low)) return show(ctx, F.calcText(F.parseCalc(text)));
  const c = await findOne(ctx, text, { quiet: !isPrivate });
  if (c) return sendBuild(ctx, c);
});

/* ---------------- ошибки и меню команд ---------------- */

bot.catch((err) => {
  const e = err.error;
  console.error(`[bot] update ${err.ctx?.update?.update_id}: ${e?.description || e?.message || String(e)}`);
});

export const COMMANDS = [
  ['banners', 'Текущие и следующие баннеры'],
  ['build', 'Сборка персонажа: /build имя'],
  ['chars', 'Выбрать персонажа по стихии'],
  ['tier', 'Тир-лист'],
  ['history', 'Когда был баннер: /history имя'],
  ['drought', 'Кто дольше всех без рерана'],
  ['codes', 'Активные коды'],
  ['calc', 'Калькулятор круток'],
  ['reset', 'Таймеры ресета'],
  ['server', 'Выбрать сервер'],
  ['app', 'Открыть мини-приложение'],
  ['help', 'Помощь'],
];
