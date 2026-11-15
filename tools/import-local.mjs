#!/usr/bin/env node
/*
 * 把手上已经有的课件文件接进本地库。
 *
 * 有几种文件会落到这个工具手上：
 *
 *   官方下载的课件包   在官网买了下载卡之后拿到的 HTML / zip
 *   自己服务器上的导出  你就是站点运营方时，从服务器上导出的正文目录
 *   别人发过来的课件    教研组里传下来的单份课件
 *
 * 脚本按文件名（或者正文里的 <title>）认出这是哪一门课，放到两个源镜像
 * 里该在的位置，然后重建合并站。源镜像里原来那份不会被删掉。
 *
 *   node tools\import-local.mjs <文件夹> [--dry-run] [--rebuild]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const XB = path.join(ROOT, 'mirror', 'xbjiaoyu', 'courseware');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');

const args = process.argv.slice(2);
const source = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const rebuild = args.includes('--rebuild');

if (!source) {
  console.error('用法：node tools\\import-local.mjs <文件夹> [--dry-run] [--rebuild]');
  process.exit(2);
}
const SRC = path.resolve(source);
if (!fs.existsSync(SRC) || !fs.statSync(SRC).isDirectory()) {
  console.error(`文件夹不存在：${SRC}`);
  process.exit(2);
}

/* ------------------------------------------------------------ 认课 */

const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));

const xbCatalog = readJson(path.join(ROOT, 'mirror', 'xbjiaoyu', 'catalog.json'));
const works = readJson(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json'));
const premium = readJson(
  path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'premium', 'catalogue.json')
);

/* 三本账：按 id 认，也按标题认（文件名被改过的时候靠标题）。 */
const byId = new Map();
const byTitle = new Map();
const add = (family, id, title) => {
  const key = String(id);
  byId.set(key, { family, id: key, title: title || '' });
  const t = String(title || '').trim();
  if (t && !byTitle.has(t)) byTitle.set(t, { family, id: key, title: t });
};

for (const p of xbCatalog.products || []) add('xb', p.id, p.title);
for (const w of works) add('work', w.id, w.title);
for (const c of premium.courses || []) add('premium', c.programId, c.title);

const familyName = {
  xb: '小白教育',
  work: '图灵智赋 · 作品',
  premium: '图灵智赋 · 精品课',
};
const familyDir = { xb: XB, work: AFE, premium: AFE };

/* ------------------------------------------------------------ 收料 */

const collected = [];
const walk = (dir, depth = 0) => {
  if (depth > 4) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    /* <id>.assets/ 里存的是这门课引用的第三方页面（mathworld、中学课本网……），
       它们是子资源，不是课程本身。收课的时候不看它们。 */
    if (entry.isDirectory()) {
      if (entry.name.endsWith('.assets')) continue;
      walk(p, depth + 1);
    }
    else if (entry.name.toLowerCase().endsWith('.html')) collected.push(p);
  }
};
walk(SRC);

if (!collected.length) {
  console.log('这个文件夹里没有 HTML 课件。');
  console.log('（zip 包请先解开，或者直接用解压命令跑：');
  console.log('  Expand-Archive 包.zip -DestinationPath 解开的目录）');
  process.exit(1);
}

const titleOf = (html) => {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : '';
};

const rows = [];
const unknown = [];

for (const file of collected) {
  const base = path.basename(file, path.extname(file));
  const bare = base.replace(/^afe[-_]/i, '');
  const html = read(file);
  const title = titleOf(html);

  /* A body that only redirects to the platform is not courseware. */
  if (html.length < 2000 && html.includes('window.location.replace("/api/program-file/')) {
    rows.push({ file, state: 'skip', why: '只是跳转壳，不是正文' });
    continue;
  }

  let entry = byId.get(base) || byId.get(bare);
  if (!entry && title) entry = byTitle.get(title);
  if (!entry) {
    /* 目录页不是课：正文很短、又没标题。 */
    if (!title && html.length < 6000) {
      rows.push({ file, state: 'skip', why: '是目录页，不是课件' });
      continue;
    }
    unknown.push({ file, base, title });
    continue;
  }

  const target = path.join(familyDir[entry.family], `${entry.id}.html`);
  const assets = path.join(path.dirname(file), `${bare}.assets`);
  const hasAssets = fs.existsSync(assets) && fs.statSync(assets).isDirectory();
  const already = fs.existsSync(target);

  if (!dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
    if (hasAssets) {
      copyTree(assets, path.join(familyDir[entry.family], `${entry.id}.assets`));
    }
  }
  rows.push({
    file,
    state: already ? 'updated' : 'added',
    why: '',
    family: familyName[entry.family],
    id: entry.id,
    title: entry.title || title,
    assets: hasAssets,
    target,
  });
}

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

/* ------------------------------------------------------------ 报告 */

const added = rows.filter((r) => r.state === 'added');
const updated = rows.filter((r) => r.state === 'updated');
const skipped = rows.filter((r) => r.state === 'skip');

console.log(`扫描到 ${collected.length} 个 HTML 课件文件`);
console.log(`新接进来 ${added.length} 门，覆盖 ${updated.length} 门，跳过 ${skipped.length} 个`);
if (added.length || updated.length) {
  console.log('');
  for (const r of [...added, ...updated]) {
    console.log(
      `  ${r.state === 'added' ? '+' : '~'} ${(r.family + ' ' + r.id).padEnd(24)} ${r.title}` +
        (r.assets ? '  +素材' : '')
    );
  }
}
for (const r of skipped) console.log(`  - ${path.basename(r.file)}  ${r.why}`);
if (unknown.length) {
  console.log('');
  console.log(`认不出来的 ${unknown.length} 个（文件名和标题都不在目录里）：`);
  for (const u of unknown.slice(0, 20)) {
    console.log(`  ? ${u.base}  ${u.title || '（正文里没有标题）'}`);
  }
  console.log('  把文件名改成课程 id（作品和精品课是数字，例：' + '1360.html）再跑一次即可。');
}

if (dryRun) {
  console.log('\n（--dry-run：没有写盘）');
  process.exit(0);
}

/* ------------------------------------------------------------ 重建 */

if (rebuild) {
  console.log('\n重建合并站…');
  await run(process.execPath, [path.join(ROOT, 'tools', 'build-leqixiang.mjs')]);
  console.log('重建完成。重启服务后生效：powershell -File tools\\restart-lq.ps1');
}

function run(cmd, cmdArgs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit' });
    child.on('close', (code) => resolve(code ?? 1));
  });
}
