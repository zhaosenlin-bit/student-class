#!/usr/bin/env node
/*
 * 复核线上那三道权限门到底怎么回。
 *
 * 每门课都问三件事：
 *   1. 这个账号有没有这门课的访问令牌
 *   2. 能不能取到课件正文
 *   3. 能不能启动播放
 *
 * 只用账号自己那点正常权限，不去碰任何绕过手段；这里只是把服务器
 * 真实的回话原样记下来，好让人知道缺的是什么。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const tokenFile = path.join(ROOT, 'recon', 'scratch', 'afe-token.txt');
const TOKEN = fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '';
const HEADERS = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': UA, Referer: `${ORIGIN}/` };

async function get(url, extra = {}) {
  try {
    const res = await fetch(url, { headers: { ...HEADERS, ...extra } });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* 非 JSON */
    }
    return { status: res.status, text, json };
  } catch (e) {
    return { status: 0, text: String(e.message), json: null };
  }
}

async function probe(label, programId) {
  const access = await get(`${ORIGIN}/api/programs/${programId}/access-token`);
  const body = await get(`${ORIGIN}/api/program-file/${programId}`);
  const launch = await get(`${ORIGIN}/api/premium/playback/launch`, {
    'Content-Type': 'application/json',
    'X-Requested-With': 'studio',
    Origin: ORIGIN,
  });
  const brief = (r) => {
    const j = r.json;
    if (j) {
      const pick = j.msg || j.reason || j.error || j.status || '';
      return `${r.status} ${String(pick).slice(0, 60)}`;
    }
    return `${r.status} ${r.text.replace(/\s+/g, ' ').slice(0, 60)}`;
  };
  console.log(`${label} (program ${programId})`);
  console.log(`   access-token : ${brief(access)}`);
  console.log(`   program-file : ${brief(body)}`);
  console.log(`   launch       : ${brief(launch)}`);

  /* 顺着站点自己的跳转，一直走到真正的正文。 */
  let url = `${ORIGIN}/api/program-file/${programId}`;
  for (let hop = 0; hop < 5; hop++) {
    const res = await get(url);
    const next = res.text.match(/window\.location\.replace\(\s*["']([^"']+)["']\s*\)/);
    if (next) {
      url = next[1].startsWith('http') ? next[1] : ORIGIN + next[1];
      console.log(`   hop ${hop + 1}      : ${res.status} -> ${url.replace(ORIGIN, '').slice(0, 70)}`);
      continue;
    }
    const base = res.text.match(/<base[^>]*href="([^"]+)"/i);
    console.log(`   正文         : ${res.status} ${res.text.length}B base=${base ? base[1] : '(无)'}`);
    if (!base && res.status >= 400) {
      console.log(`   正文原话     : ${res.text.replace(/\s+/g, ' ').slice(0, 120)}`);
    }
    break;
  }
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.log('用法：node tools/probe-lq-gates.mjs <programId...>');
  process.exit(0);
}
for (const id of ids) await probe('probe', id);
