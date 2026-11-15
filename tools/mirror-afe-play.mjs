#!/usr/bin/env node
/*
 * Mirror the /play/<id> standalone player pages.  Each one is server-rendered
 * for a single program (pid, title, runtime flags baked in) and loads the
 * courseware through /api/programs/<id>/access-token.
 */
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://aifunengjiaoyu.com';
const ROOT = 'C:/kaifa/xiaobai-class/mirror/aifunengjiaoyu';
const OUT = path.join(ROOT, 'play');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const catalogue = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'programs.json'), 'utf8')
);

fs.mkdirSync(OUT, { recursive: true });

for (const program of catalogue.programs || []) {
  const id = program.id;
  const res = await fetch(`${ORIGIN}/play/${id}`, {
    headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
  });
  if (!res.ok) {
    console.log(`[${res.status}] /play/${id}`);
    continue;
  }
  const html = await res.text();
  const file = path.join(OUT, `${id}.html`);
  fs.writeFileSync(file, html, 'utf8');
  const flags = ['isCameraRuntime', 'isReviewedPublic', 'isLongMarch', 'isExternal']
    .map((f) => {
      const m = new RegExp(`var ${f} = (true|false)`).exec(html);
      return `${f}=${m ? m[1] : '?'}`;
    })
    .join(' ');
  console.log(`[200] /play/${id} ${html.length}b  ${flags}`);
}

