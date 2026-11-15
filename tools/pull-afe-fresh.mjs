#!/usr/bin/env node
/*
 * Take a fresh lease for a few works and pull what they point at.
 *
 * A saved body keeps the lease it was delivered under, and a lease is good
 * for about a day. Once it is stale the files it names cannot be fetched
 * any more, so the work is opened again for a new one and its references
 * are followed again. The bodies of the four works below ask for a handful
 * of files that were never mirrored: a model, a wasm binary, a handful of
 * modules.
 *
 *   node tools/pull-afe-fresh.mjs --ids 196,563,616,506
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const HEADERS = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': UA, Referer: `${ORIGIN}/` };

const args = process.argv.slice(2);
const ids = (
  args.includes('--ids') ? args[args.indexOf('--ids') + 1] : '196,563,616,506'
).split(',').map((s) => s.trim()).filter(Boolean);

let lastCall = 0;
async function pace(gap = 260) {
  const wait = lastCall + gap - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}
async function get(url, options = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await pace();
    try {
      const res = await fetch(url, { ...options, headers: { ...HEADERS, ...(options.headers || {}) } });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        continue;
      }
      return res;
    } catch {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  return null;
}

/* The body of a work asks for its files in a few ways. Collect them all. */
function refsOf(html) {
  const refs = new Set();
  const add = (value) => {
    if (!value) return;
    const clean = value.split('#')[0].split('?')[0].trim();
    if (!clean) return;
    if (/^(https?:)?\/\//i.test(clean) || clean.startsWith('data:')) return;
    if (clean.startsWith('/api/')) return;
    if (!/\.(js|mjs|css|json|png|jpe?g|gif|svg|webp|avif|glb|gltf|bin|wasm|mp3|mp4|wav|ogg|m4a|woff2?|ttf|otf|ktx2?|basis|html?)$/i.test(clean))
      return;
    refs.add(clean.replace(/^\.\//, '').replace(/^\//, ''));
  };
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) add(m[1]);
  for (const m of html.matchAll(/["'`](\/?[A-Za-z0-9_\-]+\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) add(m[1]);
  /* import ... from './x.js' and import('./x.js') */
  for (const m of html.matchAll(/from\s*["']([^"']+)["']/g)) add(m[1]);
  for (const m of html.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) add(m[1]);
  return [...refs];
}

async function freshBody(programId) {
  const page = await get(`${ORIGIN}/api/programs/${programId}`);
  if (!page) return { error: 'program page unreachable' };
  const text = await page.text();
  const next = text.match(/window\.location\.replace\(["']([^"']+)["']\)/)?.[1];
  if (!next) return { error: 'no body address in the program page' };
  const url = next.startsWith('http') ? next : ORIGIN + next;
  const res = await get(url);
  if (!res) return { error: 'body unreachable' };
  if (!res.ok) return { error: `body ${res.status}` };
  const html = await res.text();
  const base = html.match(/<base[^>]*href="([^"]+)"/i)?.[1] || null;
  return { html, base, url };
}

for (const id of ids) {
  const lease = await freshBody(id);
  if (lease.error) {
    console.log(`\n=== ${id}: ${lease.error}`);
    continue;
  }
  const base = lease.base || `/api/program-assets/${id}/`;
  console.log(`\n=== ${id}  base=${base}`);
  /* The body itself is refreshed, so its references are the current ones. */
  const bodyFile = path.join(CW, `${id}.html`);
  const old = fs.existsSync(bodyFile) ? fs.readFileSync(bodyFile, 'utf8') : '';
  if (old !== lease.html) {
    fs.writeFileSync(bodyFile, lease.html);
    console.log('  正文已更新（租约换新）');
  }
  const refs = refsOf(lease.html);
  console.log(`  正文引用 ${refs.length} 个文件`);
  const outDir = path.join(CW, `${id}.assets`);
  let got = 0;
  const missing = [];
  for (const rel of refs) {
    const target = path.join(outDir, rel);
    if (fs.existsSync(target) && fs.statSync(target).size > 0) continue;
    const bases = [base, `/api/program-assets/${id}/`, `/api/program-assets/${id}/_ext/`];
    let done = false;
    for (const b of bases) {
      if (done) break;
      const res = await get(ORIGIN + b.replace(/\/$/, '') + '/' + rel.split('/').map(encodeURIComponent).join('/'));
      if (!res || !res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) continue;
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
      got++;
      done = true;
      console.log(`  + ${rel}  (${(buf.length / 1024).toFixed(0)} KB)`);
    }
    if (!done) missing.push(rel);
  }
  console.log(`  新取 ${got} 个，仍缺 ${missing.length} 个`);
  for (const m of missing) console.log(`  - ${m}`);
}
