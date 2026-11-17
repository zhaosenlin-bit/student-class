#!/usr/bin/env node
/*
 * Compare the live catalogues of both source sites with the ones we already
 * hold locally, and report whatever has appeared since the last pull.
 *
 *   GET https://aifunengjiaoyu.com/api/programs           -> 442 作品
 *   GET https://aifunengjiaoyu.com/api/premium/catalogue  -> 480 精品课
 *   GET https://xbjiaoyu.com/api/catalog                   -> 550 资源
 *
 *   node tools/diff-catalogues.mjs
 *   node tools/diff-catalogues.mjs --save     # 把线上结果存回本地
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu');
const XB = path.join(ROOT, 'mirror', 'xbjiaoyu');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const SAVE = process.argv.includes('--save');
const TOKEN_FILE = path.join(ROOT, 'recon', 'scratch', 'afe-token.txt');
const TOKEN = fs.existsSync(TOKEN_FILE)
  ? fs.readFileSync(TOKEN_FILE, 'utf8').trim()
  : '';
const AUTH = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

async function get(url, headers = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: new URL(url).origin + '/', ...headers },
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text };
  } catch (e) {
    return { status: 0, json: null, text: String(e) };
  }
}

function idsOf(list, key = 'id') {
  const out = new Set();
  for (const item of list) {
    const v = item?.[key];
    if (v !== undefined && v !== null) out.add(String(v));
  }
  return out;
}

/* ---------------------------------------------------------- 作品 */
{
  const local = JSON.parse(fs.readFileSync(path.join(AFE, 'programs-all.json'), 'utf8'));
  const live = await get('https://aifunengjiaoyu.com/api/programs', AUTH);
  const programs = live.json?.programs || [];
  console.log(`\n== 图灵智赋 /api/programs ==  线上 ${programs.length} 本地 ${local.length}`);
  if (SAVE && programs.length) {
    fs.writeFileSync(path.join(AFE, 'programs-all.json'), JSON.stringify(programs, null, 1));
    console.log('   已写回 programs-all.json');
  }
  const a = idsOf(programs);
  const b = idsOf(local);
  const added = [...a].filter((x) => !b.has(x));
  const gone = [...b].filter((x) => !a.has(x));
  console.log('   新增:', added.length, added.slice(0, 40).join(','));
  console.log('   下线:', gone.length, gone.slice(0, 40).join(','));
}

/* ---------------------------------------------------------- 精品课 */
{
  const localFile = path.join(AFE, 'premium', 'catalogue.json');
  const localFileJson = fs.existsSync(localFile)
    ? JSON.parse(fs.readFileSync(localFile, 'utf8'))
    : { courses: [] };
  const local = localFileJson.courses || [];
  const live = await get('https://aifunengjiaoyu.com/api/premium/catalogue', AUTH);
  const list = live.json?.courses || live.json?.items || live.json?.catalogue || [];
  console.log(
    `\n== 图灵智赋 /api/premium/catalogue ==  线上 ${list.length} 本地 ${local.length}` +
      ` (status ${live.status})`
  );
  if (SAVE && list.length) {
    fs.mkdirSync(path.dirname(localFile), { recursive: true });
    fs.writeFileSync(localFile, JSON.stringify(live.json, null, 1));
    console.log('   已写回 premium/catalogue.json');
  }
  const a = idsOf(list, 'id');
  const b = idsOf(local, 'id');
  const added = [...a].filter((x) => !b.has(x));
  const gone = [...b].filter((x) => !a.has(x));
  console.log('   新增:', added.length, added.slice(0, 40).join(','));
  console.log('   下线:', gone.length, gone.slice(0, 40).join(','));
  const sample = list.find((x) => x?.id);
  if (sample) console.log('   字段:', Object.keys(sample).join(','));
}

/* ---------------------------------------------------------- 小白教育 */
{
  const local = JSON.parse(fs.readFileSync(path.join(XB, 'catalog.json'), 'utf8'));
  const live = await get('https://xbjiaoyu.com/api/catalog');
  const list = live.json?.products || [];
  console.log(`\n== 小白教育 /api/catalog ==  线上 ${list.length} 本地 ${local.products.length}`);
  if (SAVE && list.length) {
    fs.writeFileSync(path.join(XB, 'catalog.json'), JSON.stringify(live.json, null, 1));
    console.log('   已写回 catalog.json');
  }
  const a = idsOf(list, 'id');
  const b = idsOf(local.products, 'id');
  const added = [...a].filter((x) => !b.has(x));
  const gone = [...b].filter((x) => !a.has(x));
  console.log('   新增:', added.length, added.slice(0, 40).join(','));
  console.log('   下线:', gone.length, gone.slice(0, 40).join(','));
  const free = list.filter((x) => x?.mode === 'free');
  console.log(`   其中免费 ${free.length} 门`);
  const localFree = local.products.filter((x) => x?.mode === 'free');
  const localFreeIds = idsOf(localFree, 'id');
  const newFree = free.filter((x) => !localFreeIds.has(String(x.id)));
  console.log('   免费里新增的:', newFree.length, newFree.map((x) => x.id).slice(0, 40).join(','));
}

