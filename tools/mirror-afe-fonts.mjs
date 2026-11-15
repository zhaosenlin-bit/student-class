#!/usr/bin/env node
/*
 * Mirror the Google Fonts stylesheet the 图灵智赋 shell pulls in
 * (Noto Serif SC) so the local copy needs no internet at all.
 *
 * The stylesheet is one big @font-face list; every face points at a
 * fonts.gstatic.com subset file.  We keep the CSS byte-for-byte apart
 * from rewriting those URLs to /fonts/<file>.woff2, then download the
 * subsets the CSS actually references.
 */
import fs from 'node:fs';
import path from 'node:path';

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap';
const ROOT = 'C:/kaifa/xiaobai-class';
const OUT_DIR = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'assets', 'fonts');
const CSS_FILE = path.join(OUT_DIR, 'noto-serif-sc.css');

// A modern desktop UA is what makes Google serve woff2 subsets.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

fs.mkdirSync(OUT_DIR, { recursive: true });

const res = await fetch(CSS_URL, { headers: { 'User-Agent': UA } });
if (!res.ok) throw new Error(`google fonts css: ${res.status}`);
let css = await res.text();

const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com[^)]+/g) || [])];
console.log(`css ${css.length} bytes, ${urls.length} font files`);

// Some faces carry a ?kit=... query; strip it and keep a filesystem-safe name.
const fileName = (url) =>
  decodeURIComponent(url.split('?')[0].split('/').pop()).replace(/[^\w.-]/g, '_');

let done = 0;
for (const url of urls) {
  const name = fileName(url);
  const dest = path.join(OUT_DIR, name);
  if (fs.existsSync(dest)) {
    done++;
    continue;
  }
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) {
    console.warn(`  skip ${name}: ${r.status}`);
    continue;
  }
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  done++;
  if (done % 20 === 0) console.log(`  ${done}/${urls.length}`);
}

for (const url of urls) {
  const name = fileName(url);
  css = css.split(url).join(`/fonts/${name}`);
}
fs.writeFileSync(CSS_FILE, css, 'utf8');

const kept = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.woff2'));
console.log(`wrote ${CSS_FILE}`);
console.log(`downloaded ${kept.length} woff2 subsets`);
