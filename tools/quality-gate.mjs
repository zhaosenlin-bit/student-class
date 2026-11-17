#!/usr/bin/env node
/*
 * The quality gate.
 *
 * The library is read by Chinese teachers, so a course has to earn its
 * place.  There are two ways to fail that:
 *
 *   1. It does not open.  A page that paints nothing, offers nothing to
 *      move and holds nothing to read is not a course, and a course
 *      that is broken cannot be previewed or downloaded.
 *
 *   2. It is a sheet of paper, not a course.  An English worksheet that
 *      asks for a number in a box, with a picture of the exercise in it,
 *      is not interactive courseware.  It is not kept, whatever
 *      language it is in.  A simulation that happens to be written in
 *      English is a different thing, and it is kept.
 *
 * Chinese courses are held to the first rule only; they are what the
 * library is for.  English courses are held to both.
 *
 *   node tools/quality-gate.mjs            # write the report and the decisions
 *   node tools/quality-gate.mjs --apply    # also take the dropped courses out
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const CATALOG = path.join(LQ, 'catalog.json');
const AUDIT = path.join(ROOT, 'recon', 'scratch', 'lq-quality-audit.json');
const REPORT = path.join(ROOT, 'recon', 'scratch', 'lq-quality-gate.json');
const DECISIONS = path.join(LQ, 'quality-decisions.json');

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const products = catalog.products;
const audit = fs.existsSync(AUDIT) ? JSON.parse(fs.readFileSync(AUDIT, 'utf8')) : { results: [] };
const audited = new Map((audit.results || []).map((r) => [r.id, r]));

/* --------------------------------------------------------- static read -- */

const bodyOf = (id) => {
  const file = path.join(LQ, 'courseware', `${id}.html`);
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8');
  const body = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  const count = (re) => (body.match(re) || []).length;
  return {
    file,
    html,
    bytes: fs.statSync(file).size,
    textInputs: count(/<input[^>]*type\s*=\s*["']?text/gi),
    ranges: count(/<input[^>]*type\s*=\s*["']?range/gi),
    buttons: count(/<button/gi),
    selects: count(/<select/gi),
    imgs: count(/<img/gi),
    text: body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
};

/* --------------------------------------------------------- the measures -- */

const cjkRatio = (cjk, latin) => {
  const total = cjk + latin;
  if (!total) return 0;
  return cjk / total;
};

const languageOf = (m, p) => {
  /*
   * The language of the course is the language of the course itself.
   * A page that draws its words into a canvas has no text to read, and
   * then the catalogue is asked instead - the Chinese title of a Chinese
   * simulation is Chinese even though the words are drawn.
   */
  if (m.cjk + m.latin > 0) {
    return cjkRatio(m.cjk, m.latin) >= 0.12 ? 'zh' : 'en';
  }
  const stat = `${p.title || ''} ${p.tagline || ''} ${p.description || ''} ${(p.features || []).join(' ')}`;
  const scjk = (stat.match(/[\u3400-\u9fff]/g) || []).length;
  const slatin = (stat.match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  if (scjk + slatin === 0) return 'unknown';
  return cjkRatio(scjk, slatin) >= 0.12 ? 'zh' : 'en';
};

/* Does the page give the learner anything at all? */
const opens = (m) =>
  m.painted > 0 ||
  m.nodes >= 25 ||
  m.textLen >= 80 ||
  (m.controls || 0) >= 3 ||
  (m.media || 0) >= 2;

/*
 * A sheet of paper: it asks for an answer to be typed in, and it offers
 * nothing to move.  A simulation may ask for a number too - the answer
 * is a result of the simulation - so the test also asks whether there
 * is anything to operate.
 */
const isWorksheet = (p, s, m) => {
  if (s.textInputs < 1) return false;
  const nothingToMove = s.ranges === 0 && m.sliders === 0 && s.buttons + s.selects <= 4;
  if (!nothingToMove) return false;
  if (m.textLen < 150) return false;
  /* The upstream catalogue calls these exercises; they are exercises. */
  if (p.source === 'aviary' && p.kind === '课业练习') return true;
  /* A page of help text for a worksheet is not a course either. */
  if (/^Help page for\b/i.test(s.text)) return true;
  return false;
};

/* ------------------------------------------------------------ the gate -- */

const report = [];
const drop = {};
const keep = [];

for (const p of products) {
  if (!p.localInstalled) continue;
  const a = audited.get(p.id);
  const body = bodyOf(p.id);
  const row = {
    id: p.id,
    title: p.title,
    source: p.source,
    kind: p.kind,
    lang: 'unknown',
    decision: 'keep',
    reason: '',
  };

  if (!a || !a.probe || !body) {
    drop[p.id] = '本地文件缺失或未体检';
    row.decision = 'drop';
    row.reason = drop[p.id];
    report.push(row);
    continue;
  }

  const m = a.probe;
  row.lang = languageOf(m, p);
  row.painted = m.painted;
  row.controls = m.controls;
  row.sliders = m.sliders;
  row.textLen = m.textLen;
  row.errors = (a.errors || []).length;
  row.failed = (a.failed || []).length;
  row.offsite = (a.offsite || []).length;

  /*
   * The notice "请从乐启享课件库重新打开" is written on the page that
   * holds a course in a frame; the course itself is inside that frame,
   * so the notice alone is not a reason to drop anything.
   */
  const guard =
    m.painted === 0 &&
    m.nodes < 40 &&
    /内容仅在授权平台运行|未授权的运行环境|请从乐启享课件库重新打开/.test(m.head || '');

  let decision = 'keep';
  let reason = '';

  if (guard) {
    decision = 'drop';
    reason = '页面只剩引导语，无法直接使用';
  } else if (!opens(m)) {
    decision = 'drop';
    reason = '页面打开后没有内容';
  } else if (isWorksheet(p, body, m)) {
    decision = 'drop';
    reason = '是练习题而不是可交互的课件';
  }

  row.decision = decision;
  row.reason = reason;
  report.push(row);
  if (decision === 'drop') drop[p.id] = reason;
  else keep.push(row);
}

fs.writeFileSync(REPORT, JSON.stringify({ report, drop, keep }, null, 1));

const bySource = new Map();
for (const r of report) {
  const key = `${r.source || '?'} · ${r.lang || '?'}`;
  const cur = bySource.get(key) || { total: 0, keep: 0, drop: 0 };
  cur.total++;
  if (r.decision === 'keep') cur.keep++;
  else cur.drop++;
  bySource.set(key, cur);
}

console.log('来源 / 语言                 数量   保留   剔除');
for (const [key, v] of [...bySource].sort()) {
  console.log(
    `${key.padEnd(26)} ${String(v.total).padStart(4)} ${String(v.keep).padStart(6)} ${String(
      v.drop
    ).padStart(6)}`
  );
}
console.log(`\n合计 ${report.length} 门：保留 ${keep.length}，剔除 ${Object.keys(drop).length}`);

const reasons = new Map();
for (const r of report.filter((x) => x.decision === 'drop')) {
  reasons.set(r.reason, (reasons.get(r.reason) || 0) + 1);
}
console.log('\n剔除理由：');
for (const [k, v] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${v}\t${k}`);

fs.writeFileSync(
  DECISIONS,
  JSON.stringify(
    {
      note: '乐启享课件库的质检结论：被剔除的课程不进目录，也不留在本地。',
      at: new Date().toISOString(),
      drop,
    },
    null,
    1
  )
);
console.log(`\n结论写入 ${path.relative(ROOT, DECISIONS)}`);

if (!APPLY) {
  console.log('（加 --apply 才会把被剔除的课程从目录和磁盘上清掉）');
  process.exit(0);
}

/* --------------------------------------------------------------- apply -- */

const removed = { files: 0, dirs: 0, bytes: 0 };
const rmFile = (file) => {
  if (!fs.existsSync(file)) return;
  let size = 0;
  try {
    size = fs.statSync(file).size;
  } catch {
    size = 0;
  }
  fs.rmSync(file, { force: true });
  removed.files++;
  removed.bytes += size;
};

/* Every mirror that holds a copy of the body has to let it go too. */
const SOURCES = [
  ['aviary', 'aviary-'],
  ['3jcn', 'lab-'],
  ['labsims', 'labsims-'],
  ['openlab', 'openlab-'],
  ['tongjiang', 'tongjiang-'],
  ['phet', 'phet-'],
  ['blocklygames', 'blocklygames-'],
];

for (const id of Object.keys(drop)) {
  rmFile(path.join(LQ, 'courseware', `${id}.html`));
  const assets = path.join(LQ, 'courseware', `${id}.assets`);
  if (fs.existsSync(assets)) {
    removed.bytes += dirSize(assets);
    fs.rmSync(assets, { recursive: true, force: true });
    removed.dirs++;
  }
  for (const [src, prefix] of SOURCES) {
    if (!id.startsWith(prefix)) continue;
    const slug = id.slice(prefix.length);
    const dir = path.join(ROOT, 'mirror', src, 'courseware');
    rmFile(path.join(dir, `${slug}.html`));
    /* A few pages of the source kept their own prefix in the name. */
    if (src === '3jcn') rmFile(path.join(dir, `3jcn-${slug}.html`));
    const srcAssets = path.join(dir, `${slug}.assets`);
    if (fs.existsSync(srcAssets)) {
      removed.bytes += dirSize(srcAssets);
      fs.rmSync(srcAssets, { recursive: true, force: true });
      removed.dirs++;
    }
    if (src === '3jcn') {
      const altAssets = path.join(dir, `3jcn-${slug}.assets`);
      if (fs.existsSync(altAssets)) {
        removed.bytes += dirSize(altAssets);
        fs.rmSync(altAssets, { recursive: true, force: true });
        removed.dirs++;
      }
    }
  }
}

console.log(
  `\n已清掉 ${removed.files} 个文件、${removed.dirs} 个素材目录，` +
    `${(removed.bytes / 1048576).toFixed(1)} MB`
);

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(full);
    else {
      try {
        total += fs.statSync(full).size;
      } catch {
        /* A file that vanished on its own does not count. */
      }
    }
  }
  return total;
}
