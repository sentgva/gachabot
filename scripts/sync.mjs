// Синхронизация базовых данных и картинок с публичного API encore.moe.
// Курируемые поля (сборки, тиры, команды, русские имена) не трогаются.
//
//   npm run sync            — обновить данные, докачать недостающие картинки
//   npm run sync -- --force — перекачать все картинки
//   npm run sync -- --add   — добавить заглушки для новых персонажей из API
//   npm run sync -- --cards — перерисовать карточки-превью
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'webapp', 'data');
const ASSETS = join(ROOT, 'webapp', 'assets');
const API = 'https://api.encore.moe/en';
const FORCE = process.argv.includes('--force');
const ADD = process.argv.includes('--add');
const FORCE_CARDS = FORCE || process.argv.includes('--cards');

const ELEMENTS = { 1: 'glacio', 2: 'fusion', 3: 'electro', 4: 'aero', 5: 'spectro', 6: 'havoc' };
const WEAPONS = { 1: 'broadblade', 2: 'sword', 3: 'pistols', 4: 'gauntlets', 5: 'rectifier' };

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('! sharp не установлен — картинки сохранятся без сжатия (npm i -D sharp)');
}

const readJson = async (f) => JSON.parse(await readFile(join(DATA, f), 'utf8'));
const writeJson = (f, v) => writeFile(join(DATA, f), JSON.stringify(v, null, 1) + '\n');
const exists = (p) => access(p).then(() => true, () => false);
export const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/['’:#.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error('fetch failed: ' + url);
}

async function saveImage(url, file, { width, height, quality = 78 }) {
  if (!url) return false;
  if (!FORCE && (await exists(file))) return true;
  const r = await fetch(url);
  if (!r.ok) return false;
  const buf = Buffer.from(await r.arrayBuffer());
  await mkdir(dirname(file), { recursive: true });
  if (sharp) {
    await sharp(buf).resize({ width, height, fit: 'inside', withoutEnlargement: true }).webp({ quality }).toFile(file);
  } else {
    await writeFile(file, buf);
  }
  return true;
}

// Карточки 960×540 для превью ссылок в боте и JPEG-миниатюры для инлайн-режима
// (Telegram принимает в миниатюрах только JPEG).
const EL_COLORS = { glacio: '#6fd3ff', fusion: '#ff6b3d', electro: '#b57bff', aero: '#4ce0b3', spectro: '#f3d35b', havoc: '#e0457b' };
const TIER_COLORS = { T0: '#dcff3f', 'T0.5': '#b6f25c', T1: '#5ee6c6', 'T1.5': '#6fd3ff', T2: '#f5c451', T3: '#ff9a62', T4: '#9a98a3' };
const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function makeShareImages(chars) {
  if (!sharp) return;
  const W = 960;
  const H = 540;
  for (const c of chars) {
    const color = EL_COLORS[c.element] || '#dcff3f';
    const card = join(ASSETS, 'cards', `${c.id}.jpg`);
    const thumb = join(ASSETS, 'thumbs', `${c.id}.jpg`);
    await mkdir(dirname(card), { recursive: true });
    await mkdir(dirname(thumb), { recursive: true });
    if (c.art && (FORCE_CARDS || !(await exists(card)))) {
      const size = Math.min(92, Math.floor(470 / (c.name.length * 0.8)));
      const tier = c.tier ? `<rect x="40" y="${H - 96}" width="84" height="40" rx="10" fill="${TIER_COLORS[c.tier]}"/>
        <text x="82" y="${H - 69}" text-anchor="middle" font-family="Consolas, 'DejaVu Sans Mono', monospace" font-weight="700" font-size="20" fill="#0a0a0d">${c.tier}</text>` : '';
      const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs>
          <radialGradient id="g" cx="74%" cy="42%" r="62%"><stop offset="0" stop-color="${color}" stop-opacity=".7"/><stop offset="1" stop-color="#0a0a0d" stop-opacity="0"/></radialGradient>
          <pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#fff" stroke-opacity=".06"/></pattern>
        </defs>
        <rect width="${W}" height="${H}" fill="#0a0a0d"/><rect width="${W}" height="${H}" fill="url(#p)"/><rect width="${W}" height="${H}" fill="url(#g)"/>
        <rect x="40" y="44" width="34" height="34" rx="9" fill="#dcff3f"/>
        <path d="M45 61h5l3-9 5 18 5-13 3 7 3-3h5" fill="none" stroke="#0a0a0d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="86" y="69" font-family="'Arial Black', 'DejaVu Sans', sans-serif" font-weight="900" font-size="22" fill="#edebe4">GACHA<tspan fill="#dcff3f">/</tspan>BOT</text>
        <text x="40" y="${H / 2 - 30}" font-family="Consolas, 'DejaVu Sans Mono', monospace" font-size="18" letter-spacing="4" fill="${color}">// СБОРКА</text>
        <text x="38" y="${H / 2 + size * 0.55}" font-family="'Arial Black', 'DejaVu Sans', sans-serif" font-weight="900" font-size="${size}" fill="#edebe4">${xml(c.name.toUpperCase())}</text>
        <text x="40" y="${H / 2 + size * 0.55 + 44}" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="26" fill="#8d8b96">${xml(c.ru)}</text>
        ${tier}
      </svg>`;
      const art = await sharp(join(ROOT, 'webapp', c.art)).resize({ height: H - 10 }).toBuffer({ resolveWithObject: true });
      await sharp(Buffer.from(bg))
        .composite([{ input: art.data, left: Math.max(0, W - art.info.width - 30), top: 10 }])
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(card);
    }
    if (c.icon && (FORCE || !(await exists(thumb)))) {
      await sharp(join(ROOT, 'webapp', c.icon)).resize(96, 96).flatten({ background: color }).jpeg({ quality: 82 }).toFile(thumb);
    }
    if (c.art) c.card = `assets/cards/${c.id}.jpg`;
  }
  const bannersThumb = join(ASSETS, 'thumbs', '_banners.jpg');
  if (FORCE || !(await exists(bannersThumb))) {
    await sharp(join(ASSETS, 'icon.svg')).resize(96, 96).flatten({ background: '#dcff3f' }).jpeg({ quality: 85 }).toFile(bannersThumb);
  }
}

const fixUrl = (p) => (p && p.startsWith('/Game/') ? `https://api.encore.moe/resource/Data${p.replace(/\.[^/.]+$/, '')}.webp` : p);

async function main() {
  const chars = await readJson('characters.json');
  const list = (await getJson(`${API}/character`)).roleList;
  const known = new Set(chars.map((c) => c.gameId));

  // Новые персонажи, которых ещё нет в нашем списке
  const seenNames = new Set(chars.map((c) => c.name));
  const fresh = list.filter((r) => !known.has(r.Id) && !seenNames.has(r.Name) && !r.Name.startsWith('Rover'));
  if (fresh.length) {
    console.log('Новые персонажи в API:', fresh.map((r) => `${r.Name} (${r.Id})`).join(', '));
    if (ADD) {
      for (const r of fresh) {
        chars.push({
          id: slugify(r.Name), gameId: r.Id, name: r.Name, ru: r.Name, rarity: r.QualityId, element: ELEMENTS[r.Element?.Id],
          weapon: WEAPONS[r.WeaponType?.Id], limited: r.QualityId === 5, signature: null, role: 'dps', tier: null, build: null, released: null,
        });
      }
    }
  }

  for (const c of chars) {
    const d = await getJson(`${API}/character/${c.gameId}`);
    if (!d) {
      console.warn('  нет данных для', c.id);
      continue;
    }
    c.name = d.Name?.Content?.trim().replace(/^Rover: (\w+)$/, 'Rover ($1)') || c.name;
    c.rarity = d.QualityId;
    c.element = ELEMENTS[d.ElementId] || c.element;
    c.weapon = WEAPONS[d.WeaponType] || c.weapon;
    c.tags = (d.Tags || []).map((t) => t.TagName).filter(Boolean);
    const head = await saveImage(d.RoleHeadIconLarge, join(ASSETS, 'chars', `${c.id}.webp`), { width: 160, height: 160, quality: 80 });
    const art = await saveImage(d.FormationRoleCard, join(ASSETS, 'art', `${c.id}.webp`), { height: 640, quality: 76 });
    // Фон с баннера персонажа (есть у лимитных и части стандартных)
    const bg = await saveImage(d.GachaViewInfo?.[0]?.UnderBgTexturePath, join(ASSETS, 'bg', `${c.id}.webp`), { width: 1000, quality: 70 });
    c.icon = head ? `assets/chars/${c.id}.webp` : null;
    c.art = art ? `assets/art/${c.id}.webp` : null;
    c.bg = bg ? `assets/bg/${c.id}.webp` : null;
    process.stdout.write(`  ✓ ${c.name}\n`);
  }
  await makeShareImages(chars);
  await writeJson('characters.json', chars);

  // Иконки оружия и эхо, которые встречаются в сборках
  const wantWeapons = new Set();
  const wantEchoes = new Set();
  for (const c of chars) {
    c.build?.weapons?.forEach((w) => wantWeapons.add(w.name));
    c.build?.mainEcho?.forEach((e) => wantEchoes.add(e));
    if (c.signature) wantWeapons.add(c.signature);
  }
  const banners = await readJson('banners.json');
  banners.banners.forEach((b) => b.weapons.forEach((w) => wantWeapons.add(w)));

  const weaponList = (await getJson(`${API}/weapon`)).weapons;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const wIndex = new Map(weaponList.map((w) => [norm(w.Name), w]));
  // Статы на 90 уровне и пассивка (англ.). Русское описание `ru` пишется руками и сохраняется.
  const SUB_RU = { 'Crit. DMG': 'Крит. урон', 'Crit. Rate': 'Крит. шанс', 'Energy Regen': 'Восст. энергии', ATK: 'Атака', HP: 'HP', DEF: 'Защита' };
  const oldWeapons = await readJson('weapons.json').catch(() => ({}));
  const weapons = {};
  for (const name of wantWeapons) {
    const w = wIndex.get(norm(name));
    if (!w) {
      console.warn('  оружие не найдено:', name);
      weapons[name] = { rarity: null, icon: null };
      continue;
    }
    const file = `assets/weapons/${slugify(name)}.webp`;
    const ok = await saveImage(w.Icon, join(ROOT, 'webapp', file), { width: 96, height: 96, quality: 80 });
    const info = { ...oldWeapons[name], rarity: w.QualityId, type: w.TypeName?.toLowerCase(), icon: ok ? file : null };
    const det = await getJson(`${API}/weapon/${w.Id}`);
    if (det) {
      const props = (det.Properties || []).map((p) => [p.Name, p.GrowthValues?.at(-1)?.Value ?? String(p.BaseValue)]);
      const atk = props.find(([n]) => n === 'ATK');
      info.atk = atk ? Math.floor(Number(atk[1])) : null;
      if (props[1]) {
        const [n, v] = props[1];
        info.sub = { name: SUB_RU[n] || n, value: v.endsWith('%') ? v : String(Math.floor(Number(v))) };
      }
      info.passive = det.ResonName || null;
      info.en = (det.Desc || '').replace(/<[^>]+>/g, '').trim();
      if (!info.ru) console.warn('  нет русского описания оружия:', name);
    }
    weapons[name] = info;
  }
  await writeJson('weapons.json', weapons);

  const echoList = (await getJson(`${API}/echo`)).Echo;
  const eIndex = new Map();
  for (const e of echoList) if (!eIndex.has(norm(e.Name))) eIndex.set(norm(e.Name), e);
  const echoes = {};
  for (const name of wantEchoes) {
    const e = eIndex.get(norm(name)) || eIndex.get(norm(name.replace(/^Reminiscence - /, 'Reminiscence: ')));
    if (!e) {
      console.warn('  эхо не найдено:', name);
      echoes[name] = { icon: null };
      continue;
    }
    const file = `assets/echoes/${slugify(name)}.webp`;
    const ok = await saveImage(fixUrl(e.IconMiddle || e.Icon), join(ROOT, 'webapp', file), { width: 96, height: 96, quality: 80 });
    echoes[name] = { icon: ok ? file : null, element: e.Element?.Name?.toLowerCase() || null };
  }
  await writeJson('echoes.json', echoes);

  // Значки сетов эхо (сонат)
  const setIcons = new Map();
  for (const e of echoList) for (const g of e.FetterGroups || []) if (!setIcons.has(g.Name)) setIcons.set(g.Name, g.Icon);
  const sets = await readJson('echo-sets.json');
  for (const s of sets) {
    const file = `assets/sets/${slugify(s.name)}.webp`;
    const ok = await saveImage(fixUrl(setIcons.get(s.name)), join(ROOT, 'webapp', file), { width: 72, height: 72, quality: 85 });
    s.icon = ok ? file : null;
    if (!ok) console.warn('  нет значка сета:', s.name);
  }
  await writeJson('echo-sets.json', sets);

  const meta = await readJson('meta.json').catch(() => ({}));
  meta.syncedAt = new Date().toISOString();
  await writeJson('meta.json', meta);
  console.log(`Готово: ${chars.length} персонажей, ${Object.keys(weapons).length} оружий, ${Object.keys(echoes).length} эхо.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
