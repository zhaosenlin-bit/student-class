import fs from 'node:fs';

const id = process.argv[2] || 'afe-754';
const t = fs.readFileSync(`mirror/leqixiang/courseware/${id}.html`, 'utf8');
const keep = process.argv.slice(3);
if (!keep.length) {
  // Print every tag that can pull in a resource.
  const tags = [...t.matchAll(/<(script|iframe|link|img|source|video|audio)[^>]*>/gi)].map((m) =>
    m[0].replace(/\s+/g, ' ').slice(0, 220)
  );
  console.log(tags.join('\n'));
  console.log('\n--- fetch / import usage ---');
  const calls = [...t.matchAll(/(fetch\(|import\(|importScripts\(|new Worker\(|XMLHttpRequest)[^\n]{0,160}/g)].map((m) =>
    m[0].replace(/\s+/g, ' ').slice(0, 180)
  );
  console.log([...new Set(calls)].join('\n'));
} else {
  for (const k of keep) {
    const i = t.indexOf(k);
    console.log(`\n=== ${k} @${i}`);
    if (i >= 0) console.log(t.slice(Math.max(0, i - 400), i + 1400));
  }
}
