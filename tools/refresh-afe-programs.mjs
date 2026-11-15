#!/usr/bin/env node
/*
 * Refresh the mirrored 图灵智赋 programme list from the live payload.
 *
 * Two things drift on the live site: the "uses" counter ticks up with every
 * visit, and prices change when the author edits them.  The media URLs are
 * rewritten back to the local /prod/uploads/... tree so the browser never
 * leaves the machine.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs.json');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const localise = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/https:\/\/static\.aifunengjiaoyu\.com\//g, '/');
};

const res = await fetch(`${ORIGIN}/api/programs`, {
  headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
});
if (!res.ok) throw new Error(`/api/programs -> ${res.status}`);
const live = await res.json();

const file = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const byId = new Map((file.programs || file).map((p) => [String(p.id), p]));

let changed = 0;
for (const p of live.programs || []) {
  const target = byId.get(String(p.id));
  if (!target) continue;
  for (const key of ['price', 'uses', 'clicks', 'rating', 'status', 'video_url', 'updated_at']) {
    if (p[key] !== undefined && target[key] !== p[key]) {
      target[key] = localise(p[key]);
      changed++;
    }
  }
  /* The description images are a JSON string inside a string. */
  if (p.desc_images && p.desc_images !== target.desc_images) {
    target.desc_images = localise(p.desc_images);
    changed++;
  }
  if (p.admin_note_images && p.admin_note_images !== target.admin_note_images) {
    target.admin_note_images = localise(p.admin_note_images);
    changed++;
  }
}

fs.writeFileSync(FILE, JSON.stringify(file, null, 2), 'utf8');
console.log(`refreshed ${changed} fields in ${path.relative(ROOT, FILE)}`);
for (const p of file.programs || file) {
  console.log(`  ${String(p.id).padStart(5)}  ¥${String(p.price).padEnd(6)} used ${p.uses}`);
}
