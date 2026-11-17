#!/usr/bin/env node
/*
 * PhET publishes a separate build of every simulation per translated
 * language, and a build only exists once the translators are done with
 * that simulation.  The local copy has 106 Chinese simulations; this asks
 * the upstream catalogue for every simulation and then checks, one by
 * one, whether a Chinese build has appeared since.
 *
 *   node tools/audit-phet-zh.mjs
 *   node tools/audit-phet-zh.mjs --missing     # only what we do not have
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'https://phet.colorado.edu';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const OUT = path.join(ROOT, 'recon', 'scratch', 'phet-zh-audit.json');

const meta = await (
  await fetch(`${HOST}/services/metadata/1.3/simulations?format=json&type=html&summary`, {
    headers: { 'user-agent': UA },
  })
).json();

const sims = (meta.projects || []).flatMap((p) =>
  (p.simulations || []).map((s) => ({
    slug: s.name,
    project: p.name,
    title: (s.title || '').replace(/<[^>]+>/g, ''),
    subject: s.subject || '',
  }))
);
const have = new Set(
  JSON.parse(
    fs.readFileSync(path.join(ROOT, 'mirror', 'phet', 'catalog.json'), 'utf8')
  ).map((c) => c.slug)
);

console.log(`catalogue lists ${sims.length} simulations`);

const CONC = 8;
const queue = [...sims];
const results = [];

async function worker() {
  while (queue.length) {
    const s = queue.shift();
    const url = `${HOST}/sims/${s.project}/latest/${s.slug}_zh_CN.html`;
    let zh = false;
    try {
      const r = await fetch(url, { method: 'HEAD', headers: { 'user-agent': UA } });
      zh = r.ok;
    } catch {
      zh = false;
    }
    results.push({
      slug: s.slug,
      project: s.project,
      title: s.title,
      subject: s.subject,
      zh,
      have: have.has(s.slug),
    });
  }
}

await Promise.all(Array.from({ length: CONC }, worker));
results.sort((a, b) => a.slug.localeCompare(b.slug));

const zh = results.filter((r) => r.zh);
const missing = zh.filter((r) => !r.have);
const extra = results.filter((r) => r.have && !r.zh);

console.log(`\nwith a Chinese build: ${zh.length}`);
console.log(`we already have:       ${zh.filter((r) => r.have).length}`);
console.log(`missing:               ${missing.length}`);
console.log(`we hold without zh_CN: ${extra.length}`);
if (missing.length) console.log('\nmissing:\n  ' + missing.map((m) => m.slug).join('\n  '));
if (extra.length) console.log('\nextra:\n  ' + extra.map((m) => m.slug).join('\n  '));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ results, missing, extra }, null, 1));
console.log(`\nreport -> ${path.relative(ROOT, OUT)}`);
