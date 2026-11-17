#!/usr/bin/env node
/*
 * Ask the platform for a course's lease and try a list of file names under
 * it.  When a course asks for "nezha.png" but the platform only keeps
 * "nezha.jpg", this is the tool that tells the two apart.
 *
 *   node tools/probe-afe-asset-names.mjs 180 nezha.png nezha.jpg
 *   node tools/probe-afe-asset-names.mjs 196 duke_mao.glb
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const tokenName = args.includes('--token')
  ? args[args.indexOf('--token') + 1]
  : 'afe-token.txt';
const programId = Number(args.find((a) => /^\d+$/.test(a)) || 0);
const names = args.filter((a) => /\.[a-z0-9]+$/i.test(a) && !a.startsWith('--'));
if (!programId) {
  console.log('用法: node tools/probe-afe-asset-names.mjs <课程号> <文件名...> [--token 文件]');
  process.exit(1);
}

const TOKEN = fs.readFileSync(path.join(SCRATCH, tokenName), 'utf8').trim();
const HEADERS = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${TOKEN}`,
};

const access = await fetch(`${ORIGIN}/api/programs/${programId}/access-token`, {
  headers: HEADERS,
});
const accessJson = await access.json().catch(() => null);
console.log(`#${programId} access-token ${access.status}`);
if (!accessJson || !accessJson.token) {
  console.log('  没有拿到令牌:', JSON.stringify(accessJson).slice(0, 200));
  process.exit(1);
}

const body = await fetch(
  `${ORIGIN}/api/program-file/${programId}?token=${encodeURIComponent(accessJson.token)}`,
  { headers: HEADERS }
);
const text = await body.text();
let base = (text.match(/<base[^>]*href=["']([^"']+)["']/i) || [])[1];

/* The platform answers with a "loading" page that jumps to the real body. */
if (!base) {
  const jump = (text.match(/window\.location\.replace\(["']([^"']+)["']/i) || [])[1];
  if (jump) {
    const real = await fetch(ORIGIN + jump, { headers: HEADERS });
    const realText = await real.text();
    base = (realText.match(/<base[^>]*href=["']([^"']+)["']/i) || [])[1];
    console.log(`  跟随跳转 ${real.status}，base ${base || '(仍没有 base 标签)'}`);
  } else {
    console.log('  正文开头:', text.slice(0, 400).replace(/\s+/g, ' '));
  }
}

for (const name of names) {
  const tail = name.split('/').map(encodeURIComponent).join('/');
  const prefix = base
    ? base.startsWith('http')
      ? base.replace(/\/+$/, '')
      : ORIGIN + base.replace(/\/+$/, '')
    : `${ORIGIN}/api/program-assets/${programId}`;
  const urls = [`${prefix}/${tail}`];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` } });
      const type = res.headers.get('content-type') || '';
      const len = res.headers.get('content-length') || '?';
      console.log(`  ${res.status} ${String(len).padStart(10)} ${type.padEnd(24)} ${name}`);
    } catch (err) {
      console.log(`  ERR ${name}: ${err.message}`);
    }
  }
}
