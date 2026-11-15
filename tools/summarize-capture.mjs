#!/usr/bin/env node
/*
 * Summarise one REA capture file: the final URL, console errors, and any
 * request that left the machine (a live-origin dependency).
 */
import fs from 'node:fs';

const file = process.argv[2];
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const result = raw.normalized_result || raw;
const steps = result.steps || [];
const last = steps[steps.length - 1] || {};

console.log(`file      ${file}`);
console.log(`url       ${last.artifacts?.url?.value ?? last.artifacts?.url ?? '?'}`);

const items = result.events?.items || [];
const errors = items.filter(
  (e) => e.kind === 'page-error' || (e.kind === 'console' && e.level === 'error')
);
console.log(`errors    ${errors.length}`);
for (const e of errors.slice(0, 8)) {
  console.log(`   ${(e.message || e.text || '').slice(0, 200)}`);
}

const net = items.filter((e) => e.kind === 'network' || e.kind === 'network-response');
const offsite = [];
for (const e of net) {
  const url = e.url || e.request?.url || e.response?.url || '';
  if (/^https?:\/\//i.test(url)) {
    const host = url.replace(/^https?:\/\//i, '').split('/')[0];
    if (!/^(localhost|127\.0\.0\.1)/i.test(host)) offsite.push(host);
  }
}
const uniq = [...new Set(offsite)];
console.log(`offsite   ${uniq.length ? uniq.join(', ') : 'none'}`);

const shot = last.artifacts?.screenshot;
if (shot?.state === 'captured') {
  const png = shot.value.data_base64;
  const out = file.replace(/\.json$/, '.png');
  fs.writeFileSync(out, Buffer.from(png, 'base64'));
  console.log(`screenshot ${out}`);
}
