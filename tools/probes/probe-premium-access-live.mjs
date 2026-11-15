#!/usr/bin/env node
/* What does /api/premium/access actually hand back, per course? */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();

const res = await fetch(`${ORIGIN}/api/premium/access`, {
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Origin: ORIGIN,
    'X-Premium-Catalogue-Intent': 'cataloguing',
  },
});
const json = await res.json();
console.log('status', res.status);
console.log('top keys:', Object.keys(json).join(', '));

const rawCourses = json.courses;
const keys = Object.keys(rawCourses);
console.log('courses keys sample:', keys.slice(0, 5).join(', '));
for (const k of keys.slice(0, 3)) {
  console.log(`  ${k} ->`, JSON.stringify(rawCourses[k]));
}
const withSample = keys.filter((k) => rawCourses[k].sampleAvailable);
console.log('sampleAvailable count:', withSample.length);
console.log('sampleAvailable ids:', withSample.join(','));
const noSample = keys.filter((k) => !rawCourses[k].sampleAvailable);
console.log('not-available count:', noSample.length);
console.log('  sample entry:', noSample[0], JSON.stringify(rawCourses[noSample[0]]));
const allowed = keys.filter((k) => rawCourses[k].allowed);
console.log('allowed:true count:', allowed.length, allowed.join(','));
const reasons = {};
for (const k of keys) {
  const r = String(rawCourses[k].reason);
  reasons[r] = (reasons[r] || 0) + 1;
}
console.log('reason histogram:', JSON.stringify(reasons));
console.log('direct flag histogram:', JSON.stringify(
  keys.reduce((a, k) => {
    a[String(rawCourses[k].direct)] = (a[String(rawCourses[k].direct)] || 0) + 1;
    return a;
  }, {})
));

const raw = json.courses || json.access || json.items || {};
const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();
console.log('rows', Array.isArray(rows) ? rows.length : typeof rows);
if (!Array.isArray(rows)) {
  console.log('courses shape:', JSON.stringify(raw).slice(0, 1200));
} else if (rows.length) {
  console.log('row keys:', Object.keys(rows[0]).join(', '));
  const free = rows.filter((r) => r.freeSample);
  const paid = rows.filter((r) => !r.freeSample);
  console.log('free', free.length, 'paid', paid.length);
  console.log('free sample:', JSON.stringify(free[0], null, 1));
  console.log('paid sample:', JSON.stringify(paid[0], null, 1));
  /* Any paid course that still carries a sample allowance? */
  const withSample = paid.filter((r) => r.sampleRemaining > 0 || r.sampleAvailable);
  console.log('paid with sample allowance:', withSample.length, withSample.slice(0, 5).map((r) => r.programId));
}
for (const key of Object.keys(json)) {
  if (key === 'courses' || key === 'access' || key === 'items') continue;
  console.log(key, '=', JSON.stringify(json[key]).slice(0, 400));
}
