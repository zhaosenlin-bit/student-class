#!/usr/bin/env node
/*
 * Enumerate every work the search endpoint can reach and compare the list
 * with the one /api/programs hands out.
 *
 *   node tools/enumerate-afe-works.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync(path.join(SCRATCH, 'afe-token.txt'), 'utf8').trim();
const HEADERS = { 'User-Agent': UA, Referer: `${ORIGIN}/`, Authorization: `Bearer ${TOKEN}` };

/* Single characters cover most titles; the two-character probes fill the gaps. */
const CHARS = [
  ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
  ...'一二十三四五六七八九十百千万个的了在与和及或',
  ...'力电光热声波热学化学生物地理历史数学语文英语音乐美术',
  ...'实验探究演示互动课件动画模型三维立体课堂教程',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
];

const found = new Map();
let calls = 0;

async function search(q) {
  calls++;
  const res = await fetch(`${ORIGIN}/api/programs/search?q=${encodeURIComponent(q)}`, {
    headers: HEADERS,
  });
  if (!res.ok) return;
  const json = await res.json().catch(() => null);
  for (const p of json?.programs || []) {
    if (p && p.id !== undefined) found.set(String(p.id), p);
  }
}

for (const c of CHARS) {
  await search(c);
  await new Promise((r) => setTimeout(r, 120));
}
/* Two-character probes reach titles no single character finds. */
for (const c of '的一是在不了有和人与这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接不知较将组称计设她历断路条品死身商果报离主'.split('')) {
  await search(c);
  await new Promise((r) => setTimeout(r, 90));
}

const listed = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json'), 'utf8')
);
const listedIds = new Set(listed.map((p) => String(p.id)));

console.log(`搜索 ${calls} 次，命中 ${found.size} 门作品`);
console.log(`/api/programs 列出 ${listedIds.size} 门`);
const extra = [...found.keys()].filter((id) => !listedIds.has(id));
const gone = [...listedIds].filter((id) => !found.has(id));
console.log('只在搜索里出现的:', extra.length, extra.join(','));
console.log('只在 /api/programs 里的:', gone.length, gone.slice(0, 30).join(','));

if (extra.length) {
  console.log('\n新作品:');
  for (const id of extra) {
    const p = found.get(id);
    console.log(' ', id, p.title, '|', p.subject, '|', p.price, '|', p.created_at);
  }
}

fs.writeFileSync(
  path.join(SCRATCH, 'search-found.json'),
  JSON.stringify([...found.values()], null, 1)
);

