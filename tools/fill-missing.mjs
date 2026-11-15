#!/usr/bin/env node
/*
 * 补齐本地库里还差着正文的课件。
 *
 * 本地库现在有三种缺口，三种缺口卡在三种地方：
 *
 *   精品课（447 门）  卡在 VIP 会员权益
 *   小白教育（497 门）卡在下载卡 / 会员
 *   作品（5 门）      卡在试看次数用完
 *
 * 这三道门都在站点那边，脚本动不了；它能做的是把状态查清楚，把门开了
 * 之后该拉的拉下来，然后把站点重建一遍。
 *
 *   node tools/fill-missing.mjs              只查状态，不动网络写盘
 *   node tools/fill-missing.mjs --pull       门开着就拉
 *   node tools/fill-missing.mjs --pull --rebuild   拉完重建本地站点
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const AFE_ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const wantPull = args.includes('--pull');
const wantRebuild = args.includes('--rebuild') || wantPull;

const catalogue = JSON.parse(fs.readFileSync(path.join(LQ, 'catalog.json'), 'utf8'));
const pending = catalogue.products.filter((p) => !p.localInstalled);

const groups = new Map();
for (const p of pending) {
  const key = p.localReason || '其它';
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(p);
}

console.log('本地库缺口');
console.log('------------');
for (const [reason, list] of groups) {
  console.log(`${reason}：${list.length} 门`);
}
console.log(`合计待补齐 ${pending.length} 门，本地可用 ${catalogue.products.length - pending.length} 门`);

/* -------------------------------------------------- 站点那边现在什么状态 */

const tokenPath = path.join(SCRATCH, 'afe-token.txt');
const bearer = fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, 'utf8').trim() : '';

async function afePost(pathname, body, headers = {}) {
  const res = await fetch(AFE_ORIGIN + pathname, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Referer: `${AFE_ORIGIN}/`,
      Origin: AFE_ORIGIN,
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 不是 JSON */
  }
  return { status: res.status, json, text };
}

async function afeGet(pathname) {
  const res = await fetch(AFE_ORIGIN + pathname, {
    headers: {
      'User-Agent': UA,
      Referer: `${AFE_ORIGIN}/`,
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 不是 JSON */
  }
  return { status: res.status, json, text };
}

const gates = [];

/* 作品：/api/programs/<id>/access-token */
const works = groups.get('线上试看额度已用尽') || [];
if (works.length) {
  const probe = await afeGet(`/api/programs/${works[0].originId}/access-token`);
  gates.push({
    name: '作品（试看额度用完的 5 门）',
    state: probe.json?.token ? 'open' : probe.json?.reason || `http ${probe.status}`,
    detail: probe.json?.token
      ? '账号又有试看额度了，可以直接拉。'
      : '账号对这几门的试看次数已经用完（3/3）。换一个微信号重新登录' +
        '（node tools\\afe-login.mjs）就能拿到一份新的试看额度，' +
        '或者在原站把它们买下来。',
    ids: works.map((p) => p.originId),
  });
}

/* 精品课：/api/premium/playback/launch */
const premium = groups.get('线上需 VIP 会员') || [];
if (premium.length) {
  const probe = await afePost(
    '/api/premium/playback/launch',
    { programId: premium[0].originId, useId: crypto.randomUUID() },
    { 'X-Premium-Catalogue-Intent': 'cataloguing' }
  );
  gates.push({
    name: `精品课（${premium.length} 门）`,
    state: probe.json?.token ? 'open' : probe.json?.error || `http ${probe.status}`,
    detail: probe.json?.token
      ? '账号已有 VIP 权益，整批可以拉。'
      : '账号没有 VIP 会员权益；在原站开通会员后重跑本脚本即可。',
    ids: premium.map((p) => p.originId),
  });
}

/* 小白教育：登录态 cookie */
const xb = groups.get('线上需购买下载卡') || [];
const xbCookiePath = path.join(SCRATCH, 'xb-cookie.txt');
if (xb.length) {
  gates.push({
    name: `小白教育（${xb.length} 门）`,
    state: fs.existsSync(xbCookiePath) ? 'cookie' : 'no-credential',
    detail: fs.existsSync(xbCookiePath)
      ? '已经有登录 cookie，可以拉。'
      : '需要一个在小白教育站登录后的 cookie：node tools\\xb-login-cookie.mjs',
    ids: [],
  });
}

console.log('\n站点权限');
console.log('--------');
for (const g of gates) {
  console.log(`${g.name}：${g.state}`);
  console.log(`   ${g.detail}`);
}

/* ------------------------------------------------------------------ 拉取 */

function run(script, scriptArgs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'tools', script), ...scriptArgs], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

if (wantPull) {
  const premiumOpen = gates.find((g) => g.name.startsWith('精品课'))?.state === 'open';
  const worksOpen = gates.find((g) => g.name.startsWith('作品'))?.state === 'open';
  const xbReady = gates.find((g) => g.name.startsWith('小白教育'))?.state === 'cookie';

  if (premiumOpen) {
    console.log('\n拉精品课…');
    await run('pull-afe-premium.mjs', ['--all', '--refresh']);
  }
  if (worksOpen) {
    const workIds = gates.find((g) => g.name.startsWith('作品'))?.ids || [];
    /* One of the five is a chapter course with its own delivery route. */
    const chapter = workIds.filter((id) => id === 841);
    const bulk = workIds.filter((id) => id !== 841);
    console.log('\n拉作品正文…');
    if (bulk.length) {
      await run('pull-afe-bulk.mjs', ['--ids', bulk.join(','), '--refresh']);
    }
    if (chapter.length) {
      await run('pull-afe-chapters.mjs', ['--ids', chapter.join(',')]);
    }
  }
  if (xbReady) {
    console.log('\n拉小白教育正文…');
    await run('pull-xb-courseware.mjs', [
      '--cookie',
      fs.readFileSync(xbCookiePath, 'utf8').trim(),
    ]);
  }
  if (!premiumOpen && !worksOpen && !xbReady) {
    console.log('\n没有可以现在拉的部分：上面三道门都还关着。');
  }
}

if (wantRebuild) {
  console.log('\n重建本地站点…');
  await run('build-leqixiang.mjs', []);
  console.log('重建完成。重启服务后生效：node server\\server.mjs');
}

