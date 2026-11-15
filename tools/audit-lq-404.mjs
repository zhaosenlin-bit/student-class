/*
 * Collect every 404 the acceptance run recorded and say, per course,
 * which file is missing and where it should live locally.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const dir = path.join(ROOT, 'recon', 'scratch');

const map = new Map();
const other = new Map();
const rows = [];
/* Only the report of the latest full run — the sliced ones are history. */
const reports = process.argv[2]
  ? [process.argv[2]]
  : fs
      .readdirSync(dir)
      .filter((x) => /^lq-batch-report.*\.json$/.test(x))
      .sort(
        (a, b) =>
          fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs
      )
      .slice(0, 1);
for (const f of reports) {
  const list = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  rows.push(...list);
  for (const row of list) {
    for (const line of row.failed || []) {
      const m = /^(\d{3}) (\S+)/.exec(line);
      if (!m) continue;
      const [, code, url] = m;
      const pm = /^\/api\/program-assets\/([^/]+)\/(.+)$/.exec(url);
      if (pm) {
        const [, localId, rel] = pm;
        if (!map.has(localId)) map.set(localId, new Set());
        map.get(localId).add(`${code} ${rel}`);
      } else {
        if (!other.has(url)) other.set(url, new Set());
        other.get(url).add(row.id);
      }
    }
  }
}

console.log(`报告行数 ${rows.length}，有 404 的课件 ${map.size} 门，其他路径 ${other.size} 条`);
let total = 0;
for (const [id, rels] of [...map].sort()) {
  const arr = [...rels];
  total += arr.length;
  console.log(`\n${id}  (${arr.length})`);
  for (const r of arr) console.log('   ', r);
}
console.log(`\n合计 ${total} 条 program-assets 缺失`);

if (other.size) {
  console.log('\n其他路径的 404：');
  for (const [url, ids] of other) console.log('  ', url, '←', [...ids].join(','));
}

/* Which of them are already on disk? */
const cwDirs = [
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
  path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware'),
];
const onDisk = (id, rel) => {
  const clean = rel.split('?')[0];
  for (const d of cwDirs) {
    for (const cand of [path.join(d, `${id}.assets`, clean), path.join(d, id, clean)]) {
      if (fs.existsSync(cand) && fs.statSync(cand).size > 0) return cand;
    }
  }
  return null;
};
let present = 0;
let absent = 0;
const absentList = [];
for (const [id, rels] of map) {
  for (const r of rels) {
    const rel = r.replace(/^\d{3} /, '');
    if (onDisk(id, rel)) present++;
    else {
      absent++;
      absentList.push(`${id}  ${rel}`);
    }
  }
}
console.log(`\n本地已有 ${present}，本地确实没有 ${absent}`);
fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'lq-404-audit.json'),
  JSON.stringify({ byCourse: Object.fromEntries([...map].map(([k, v]) => [k, [...v]])), absent: absentList }, null, 1)
);
