#!/usr/bin/env node
/*
 * A look at the shape of The Physics Aviary before anything is mirrored.
 *
 * Every list on that site is produced by the same form: a POST to a find.php
 * that answers with the programs of one kind.  This script asks each of
 * those lists the same empty question and writes down what came back, so
 * the mirror knows how many programs there are and where they live.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const HOST = 'https://thephysicsaviary.com';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126 Safari/537.36';

const LISTS = [
  ['labs', '/Physics/Programs/Labs/find.php'],
  ['games', '/Physics/Programs/Games/find.php'],
  ['tools', '/Physics/Programs/Tools/find.php'],
  ['homework', '/Physics/APPrograms/find.php'],
];

const post = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'user-agent': UA,
      'content-type': 'application/x-www-form-urlencoded',
      referer: `${HOST}/Physics/index.php`,
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) return '';
  return res.text();
};

const parseList = (html) => {
  const out = [];
  const re =
    /class\s*=\s*"ProgramTitle"\s+onClick\s*=\s*'location\.href\s*=\s*"([^"]+)"'\s*>([^<]*)</g;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1].trim();
    const title = m[2].trim();
    if (!href.startsWith('/')) continue;
    out.push({ href, title });
  }
  return out;
};

fs.mkdirSync(SCRATCH, { recursive: true });
const summary = {};

for (const [name, url] of LISTS) {
  const html = await post(HOST + url, {
    ProgramName: '',
    ProgramType: '0',
    AvailableLanguages: 'en',
    UnitID: '0',
    ClassID: '0',
    KeyWords: '',
  });
  const items = parseList(html);
  summary[name] = items;
  fs.writeFileSync(path.join(SCRATCH, `aviary-list-${name}.json`), JSON.stringify(items, null, 2));
  const folders = new Set(items.map((i) => i.href.replace(/\/$/, '').split('/').pop()));
  console.log(`${name}: ${items.length} entries, ${folders.size} distinct folders`);
}

const all = Object.values(summary).flat();
const seen = new Map();
for (const i of all) {
  const key = i.href.replace(/\/$/, '');
  if (!seen.has(key)) seen.set(key, i);
}
console.log(`total unique program folders: ${seen.size}`);
fs.writeFileSync(path.join(SCRATCH, 'aviary-lists.json'), JSON.stringify(summary, null, 2));

/* The subject pages list the same programs by topic; they are worth a look
   because they name the unit a program belongs to. */
for (const page of ['/Physics/Curriculum/AP1/index.php', '/Physics/Curriculum/AP2/index.php', '/Physics/Curriculum/HonorsPhysics/index.php']) {
  const res = await fetch(HOST + page, { headers: { 'user-agent': UA } });
  const html = await res.text();
  const links = [...html.matchAll(/location\.href\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
  console.log(`${page}: ${res.status}, ${links.length} program links`);
  fs.writeFileSync(path.join(SCRATCH, `aviary-page${page.replace(/[^\w]+/g, '_')}.html`), html);
}
