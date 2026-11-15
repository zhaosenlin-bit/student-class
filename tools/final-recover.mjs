#!/usr/bin/env node
/*
 * Finish the library with a fresh account.
 *
 * The catalogue holds 1472 courses.  Everything that could be mirrored
 * with the first account is mirrored (523 of them).  The rest sit behind
 * two walls:
 *
 *   447 门 精品课          the platform answers premium_required
 *   497 份 小白教育课件     the platform answers "此课件请下载后使用"
 *
 * Those two walls are not about the account.  What the account does run
 * out of is the free trial quota: every course can be opened three times
 * per account, and the first account spent those three tries while the
 * library was being mirrored.  Five courses never got their body at all,
 * and ten more are missing a handful of images.
 *
 * So: sign in with a second account and this script takes the rest.
 *
 *   node tools\final-recover.mjs            # uses recon/scratch/afe-token.txt
 *   node tools\final-recover.mjs --dry-run  # only reports what is left
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN_FILE = path.join(ROOT, 'recon', 'scratch', 'afe-token.txt');
const dryRun = process.argv.includes('--dry-run');

const token = fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : '';
if (!token) {
  console.error('没有登录凭证：先扫码登录，让 recon/scratch/afe-token.txt 有内容。');
  process.exit(2);
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const AFE = 'https://aifunengjiaoyu.com';

const api = async (route) => {
  const r = await fetch(AFE + route, {
    headers: { 'User-Agent': UA, Referer: `${AFE}/`, Authorization: `Bearer ${token}` },
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
};

/* The courses whose body never arrived, and the ones whose images are missing. */
const MISSING_BODIES = [1360, 1016, 842, 841, 811];
const MISSING_ASSETS = [
  'afe-180', 'afe-196', 'afe-206', 'afe-469', 'afe-501',
  'afe-506', 'afe-563', 'afe-581', 'afe-616', 'afe-20',
];

console.log('一、先看这个账号的试看额度');
let ready = 0;
for (const id of [...MISSING_BODIES, ...MISSING_ASSETS.map((s) => Number(s.replace('afe-', '')))]) {
  const trials = await api(`/api/trials?program_id=${id}`);
  const access = await api(`/api/programs/${id}/access-token`);
  const state = access.json?.success ? '可取' : access.json?.reason || access.json?.msg || access.status;
  if (access.json?.success) ready += 1;
  console.log(`   ${String(id).padEnd(6)} 试看 ${trials.json?.used}/${trials.json?.total}   ${state}`);
}
console.log(`   可直接取回 ${ready} / ${MISSING_BODIES.length + MISSING_ASSETS.length}`);

if (dryRun) {
  console.log('\n（演练模式，没有下载任何东西）');
  process.exit(0);
}

if (!ready) {
  console.log('\n这个账号的试看额度已经用完，换一个微信号登录后重跑本脚本。');
  process.exit(1);
}

console.log('\n二、取回缺失的正文');
execFileSync(
  'node',
  [path.join(ROOT, 'tools', 'pull-afe-courseware.mjs'), '--token', token,
    '--ids', MISSING_BODIES.join(',')],
  { stdio: 'inherit', cwd: ROOT }
);

console.log('\n三、补回缺失的素材');
execFileSync(
  'node',
  [path.join(ROOT, 'tools', 'repair-lq-assets.mjs'), '--ids', MISSING_ASSETS.join(',')],
  { stdio: 'inherit', cwd: ROOT }
);

console.log('\n四、重建本地库');
execFileSync('node', [path.join(ROOT, 'tools', 'build-leqixiang.mjs')], { stdio: 'inherit', cwd: ROOT });
console.log('\n完成。');
