/*
 * The web fonts that come with the mirrored bodies live on a font service.
 * Every course asks for the same hundred-odd subsets, so they are fetched
 * once into a shared folder and the style sheet is pointed at the local
 * copy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
/* The shared folder sits outside the courseware folder, which the build
   step empties before it fills it again. */
const SHARED = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const Gstatic = /https:\/\/fonts\.gstatic\.com\/l\/font\?kit=([A-Za-z0-9_\-]+)([^"'\s)]*)/g;

/* The style sheets that ask for fonts. */
const sheets = [];
for (const name of fs.readdirSync(CW).filter((n) => n.endsWith('.assets'))) {
  const file = path.join(CW, name, '_ext', 'fonts.googleapis.com', 'css2');
  if (fs.existsSync(file)) sheets.push(file);
}
console.log('style sheets:', sheets.length);

const kits = new Map();
for (const file of sheets) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(Gstatic)) kits.set(m[1], m[0]);
}
console.log('font files wanted:', kits.size);

const get = async (url) => {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 60000);
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: 'https://fonts.googleapis.com/' },
      signal: ctl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
};

const dir = path.join(SHARED, 'fonts.gstatic.com', 'l', 'font');
fs.mkdirSync(dir, { recursive: true });

let fetched = 0;
let failed = 0;
for (const [kit, url] of kits) {
  const target = path.join(dir, `${kit}.woff2`);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) continue;
  const buffer = await get(url);
  if (!buffer) {
    failed++;
    console.log('  MISS', kit);
    continue;
  }
  fs.writeFileSync(target, buffer);
  fetched++;
}
console.log(`fetched ${fetched}, failed ${failed}`);

/* Point every style sheet at the local copy. */
let touched = 0;
for (const file of sheets) {
  const text = fs.readFileSync(file, 'utf8');
  const local = text.replace(Gstatic, (m, kit) => `../fonts.gstatic.com/l/font/${kit}.woff2`);
  if (local !== text) {
    fs.writeFileSync(file, local);
    touched++;
  }
}
console.log('style sheets rewritten:', touched);
