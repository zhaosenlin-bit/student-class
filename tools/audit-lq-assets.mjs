#!/usr/bin/env node
/*
 * 审计本地课件：正文里引用的每个资源是否真的躺在磁盘上。
 * 这是"看起来能进、进去以后是白屏/缺模型"的真正原因。
 */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/leqixiang/courseware';
const files = fs.readdirSync(CW).filter((f) => f.endsWith('.html'));
const report = [];
let totalMissing = 0;

function resolveRef(fromDir, ref) {
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (/^(https?:)?\/\//i.test(clean) || clean.startsWith('data:') || clean.startsWith('blob:')) return null;
  if (/^(https?:)?\/\//i.test(clean)) return null;
  const base = path.basename(fromDir);
  /* <base href="..."> 形式 */
  const candidates = [];
  if (clean.startsWith('/')) {
    candidates.push(path.join(CW, clean.replace(/^\//, '')));
  } else {
    candidates.push(path.resolve(path.dirname(fromDir), clean));
    candidates.push(path.resolve(fromDir, clean));
    candidates.push(path.resolve(path.join(CW, base), clean));
  }
  return candidates;
}

/*
 * A lesson body is a program, and a program talks about files in
 * strings that are not addresses: "url(t)", "sound!TAMBO/beep.wav",
 * "{{placeholder}}".  Those are not missing files, and counting them
 * buries the ones that are.  So a reference has to look like a path
 * before it is looked for.
 */
const NOT_A_PATH = /[{}<>|\\^`\s()[\]=+;]/;
const looksLikeAPath = (ref) => {
  if (!ref) return false;
  if (/^\{\{.*\}\}$/.test(ref)) return false;
  if (ref.includes('!')) return false;
  if (NOT_A_PATH.test(ref)) return false;
  if (!ref.includes('/')) return /\.(glb|gltf|bin|ktx2|png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a|mp4|webm|json|wasm|woff2?|ttf|otf|css|html|js)$/i.test(ref);
  return true;
};

/* Addresses the library answers itself, not files that should be on disk. */
const SERVED_BY_THE_LIBRARY = [
  /^\/api\//,
  /^\/brand\//,
  /^\/images\//,
  /^\/courseware\//,
  /^\/license\.html$/,
  /^\/license\.json$/,
  /^\/favicon\.ico$/,
];

for (const f of files) {
  const full = path.join(CW, f);
  const html = fs.readFileSync(full, 'utf8');
  /* <base href> 决定相对路径的根 */
  const baseHref = (html.match(/<base[^>]+href=["']([^"']+)["']/i) || [])[1] || '';
  const baseDir = baseHref
    ? path.resolve(path.dirname(full), baseHref.replace(/^\//, '').replace(/\/$/, ''))
    : path.dirname(full);
  const refs = new Set();
  const patterns = [
    /(?:src|href|poster|data-src)\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    /["'`]([^"'`\s]+\.(?:glb|gltf|bin|ktx2|png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a|mp4|webm|json|wasm|woff2?|ttf|otf|css|html))["'`]/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) refs.add(m[1]);
  }
  const missing = [];
  for (const ref of refs) {
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith('data:') || ref.startsWith('blob:') || ref.startsWith('#')) continue;
    if (!looksLikeAPath(ref)) continue;
    if (SERVED_BY_THE_LIBRARY.some((re) => re.test(ref))) continue;
    const cands = resolveRef(baseDir, ref);
    if (!cands) continue;
    const ok = cands.some((c) => {
      try { return fs.existsSync(c) && fs.statSync(c).size > 0; } catch { return false; }
    });
    if (!ok) missing.push(ref);
  }
  if (missing.length) {
    totalMissing += missing.length;
    report.push({ id: f.replace(/\.html$/, ''), missing: [...new Set(missing)] });
  }
}

report.sort((a, b) => b.missing.length - a.missing.length);
console.log('课件总数', files.length, '有缺失引用的', report.length, '缺失引用总数', totalMissing);
for (const r of report.slice(0, 40)) {
  console.log(`  ${r.id} (${r.missing.length}): ${r.missing.slice(0, 8).join(', ')}`);
}
fs.writeFileSync('recon/scratch/lq-asset-audit.json', JSON.stringify(report, null, 1));
