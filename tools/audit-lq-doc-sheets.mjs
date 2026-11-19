#!/usr/bin/env node
/*
 * Find the pages that are a sheet of paper rather than a course.
 *
 * Some of the pages that came in with the library are not lessons.  They
 * are a banner, a diagram and a button that downloads a worksheet; there
 * is nothing to move and nothing to answer.  A reader who opens one of
 * them finds a download and nothing else, which is the one thing this
 * library is not meant to be.
 *
 * This reads the body of every course in the catalogue and reports the
 * ones whose whole interactive surface is a document download.
 *
 *   node tools/audit-lq-doc-sheets.mjs
 *   node tools/audit-lq-doc-sheets.mjs --json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const args = process.argv.slice(2);

const catalog = JSON.parse(fs.readFileSync(path.join(LQ, 'catalog.json'), 'utf8'));

/* Where a course body can be found, in the order the server looks. */
const sources = [
  { dir: path.join(LQ, 'courseware'), prefix: '' },
  { dir: path.join(ROOT, 'mirror', '3jcn', 'courseware'), prefix: 'lab-' },
  { dir: path.join(ROOT, 'mirror', 'aviary', 'courseware'), prefix: '' },
  { dir: path.join(ROOT, 'mirror', 'phet', 'courseware'), prefix: '' },
  { dir: path.join(ROOT, 'mirror', 'labsims', 'courseware'), prefix: '' },
  { dir: path.join(ROOT, 'mirror', 'tongjiang', 'courseware'), prefix: '' },
  { dir: path.join(ROOT, 'mirror', 'openlab', 'courseware'), prefix: '' },
];

function bodyFile(id) {
  for (const { dir, prefix } of sources) {
    if (prefix && !id.startsWith(prefix)) continue;
    const file = path.join(dir, `${prefix ? id.slice(prefix.length) : id}.html`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

/* A link that hands over a document rather than a lesson. */
const DOC = /\.(pdf|docx?|pptx?|zip|csv|xlsx?)\b/i;

const rows = [];
for (const p of catalog.products) {
  if (!p.localInstalled) continue;
  const file = bodyFile(p.id);
  if (!file) {
    rows.push({ id: p.id, title: p.title, source: p.source, verdict: 'no-body' });
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const body = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  /* Anything the reader can move, turn or choose. */
  const sliders = (body.match(/<input[^>]*type\s*=\s*["']?range/gi) || []).length;
  const canvases = (body.match(/<canvas/gi) || []).length;
  const buttons = (body.match(/<button/gi) || []).length;
  const selects = (body.match(/<select/gi) || []).length;
  const textInputs = (body.match(/<input[^>]*type\s*=\s*["']?text/gi) || []).length;
  const onclicks = (html.match(/onclick\s*=/gi) || []).length;
  const listeners = (html.match(/addEventListener\s*\(/g) || []).length;

  /* Document downloads, in links and in scripted jumps. */
  const docLinks = (html.match(new RegExp(DOC.source, 'gi')) || []).length;

  const interactive =
    sliders + canvases + selects + textInputs + Math.min(onclicks, 20) + Math.min(listeners, 20);
  const verdict =
    docLinks > 0 && interactive === 0 && text.length < 4000
      ? 'doc-sheet'
      : interactive === 0 && text.length < 200
        ? 'thin'
        : 'ok';

  rows.push({
    id: p.id,
    title: p.title,
    source: p.source,
    verdict,
    docLinks,
    sliders,
    canvases,
    buttons,
    selects,
    textInputs,
    onclicks,
    listeners,
    textLen: text.length,
  });
}

const flagged = rows.filter((r) => r.verdict !== 'ok');
const bySource = {};
for (const r of rows) {
  bySource[r.source || '?'] = bySource[r.source || '?'] || { total: 0, flagged: 0 };
  bySource[r.source || '?'].total += 1;
  if (r.verdict !== 'ok') bySource[r.source || '?'].flagged += 1;
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ rows, flagged }, null, 1));
} else {
  console.log(`看了 ${rows.length} 门课，其中 ${flagged.length} 门像一张纸而不是一门课。`);
  console.log(bySource);
  for (const r of flagged) {
    console.log(
      `  ${r.verdict.padEnd(10)} ${r.id.padEnd(38)} ${String(r.title || '').slice(0, 28).padEnd(30)} doc=${r.docLinks} canvas=${r.canvases} range=${r.sliders} btn=${r.buttons} txt=${r.textLen}`,
    );
  }
}
