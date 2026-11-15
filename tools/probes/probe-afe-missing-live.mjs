#!/usr/bin/env node
/* Why are these five works refused? Print every answer the live site gives. */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const auth = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': UA, Referer: `${ORIGIN}/` };

const works = JSON.parse(fs.readFileSync('mirror/aifunengjiaoyu/programs-all.json', 'utf8'));
const ids = process.argv.slice(2).map(Number).filter(Boolean);

for (const id of ids) {
  const meta = works.find((w) => w.id === id);
  console.log(`\n===== ${id} ${meta?.title || ''}`);
  console.log(
    '  meta:',
    JSON.stringify({
      type: meta?.type,
      reviewed: meta?.reviewed,
      published: meta?.published,
      price: meta?.price,
      status: meta?.status,
      access: meta?.access,
      visible: meta?.visible,
      free: meta?.free,
    })
  );
  for (const [label, url, init] of [
    ['access-token', `${ORIGIN}/api/programs/${id}/access-token`, {}],
    ['program', `${ORIGIN}/api/program-file/${id}`, {}],
    ['body', `${ORIGIN}/api/program-file/${id}/body`, {}],
    ['reviewed-session', `${ORIGIN}/api/programs/${id}/reviewed-course-session`, { method: 'POST', body: '{}' }],
  ]) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...auth, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      });
      const text = await res.text();
      console.log(`  ${label}: ${res.status} ${text.slice(0, 200).replace(/\s+/g, ' ')}`);
    } catch (e) {
      console.log(`  ${label}: ERROR ${e.message}`);
    }
  }
}
