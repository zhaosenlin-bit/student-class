#!/usr/bin/env node
/*
 * Looks for broken JavaScript inside the courseware.
 *
 * A page whose script has a syntax error still shows its text, so it
 * looks fine at a glance; the part that was supposed to draw or to
 * react simply never runs.  This walks every course body, takes out
 * the scripts that are written inline and asks Node whether they can
 * be read at all.
 *
 *   node tools/check-lq-syntax.mjs [--dir mirror/leqixiang/courseware]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DIR = path.resolve(ROOT, arg('dir', 'mirror/leqixiang/courseware'));
const OUT = arg('out', 'recon/scratch/lq-syntax.json');

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.html'))
  .map((f) => path.join(DIR, f));

const report = [];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
    (m) => !/type\s*=\s*["']?(module|importmap|application\/json)/i.test(m[1] || '')
  );
  const broken = [];
  scripts.forEach((m, i) => {
    const code = m[2];
    if (!code.trim()) return;
    try {
      new vm.Script(code, { filename: `${path.basename(file)}#${i}` });
    } catch (e) {
      broken.push({ index: i, error: String(e.message).slice(0, 160) });
    }
  });
  if (broken.length) report.push({ id: path.basename(file, '.html'), broken });
}

fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify({ checked: files.length, report }, null, 1));
console.log(`检查了 ${files.length} 份课件，${report.length} 份里有读不懂的脚本`);
for (const r of report.slice(0, 20)) {
  console.log(`  ${r.id}: ${r.broken[0].error}`);
}
