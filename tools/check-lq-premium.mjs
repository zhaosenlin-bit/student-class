#!/usr/bin/env node
/* Do the 精品课 bodies open and download from the local server? */
import fs from 'node:fs';

const ORIGIN = 'http://localhost:4173';
const cat = JSON.parse(fs.readFileSync('mirror/aifunengjiaoyu/premium/catalogue.json', 'utf8'));
const free = cat.courses.filter((c) => c.freeSample);

let bad = 0;
for (const c of free) {
  const id = 'afe-' + c.programId;
  const res = await fetch(ORIGIN + '/courseware/' + id);
  const html = await res.text();
  const base = (html.match(/<base[^>]*href="([^"]+)"/) || [])[1] || '(none)';
  const ok = res.ok && html.length > 5000 && !html.includes('window.location.replace');
  if (!ok) bad++;
  const line =
    (ok ? 'ok   ' : 'BAD  ') +
    id +
    ' ' +
    res.status +
    ' ' +
    String(html.length).padStart(7) +
    'B  ' +
    base.slice(0, 46).padEnd(48) +
    ' ' +
    String(c.title).slice(0, 16);
  console.log(line);
}
console.log(bad ? bad + ' bodies did not answer' : 'all 精品课 bodies answer');

/* The download hands over a zip for the 图灵 family. */
for (const id of ['afe-846', 'afe-890', 'afe-1335']) {
  const prepared = await fetch(ORIGIN + '/api/downloads/prepare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'studio',
      Origin: ORIGIN,
    },
    body: JSON.stringify({ productId: id, confirmSelection: true }),
  });
  const info = await prepared.json();
  const file = await fetch(ORIGIN + info.url);
  const buf = Buffer.from(await file.arrayBuffer());
  console.log(
    'zip ' +
      id +
      ': prepare=' +
      prepared.status +
      ' file=' +
      file.status +
      ' ' +
      buf.length +
      'B magic=' +
      buf.slice(0, 2).toString() +
      ' name=' +
      info.filename
  );
}
