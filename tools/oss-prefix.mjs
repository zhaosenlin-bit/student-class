#!/usr/bin/env node
/*
 * 看桶里的东西，把不要的前缀清掉，把一个前缀原样挪到另一个名字下面。
 *
 * 账号从环境变量或者配置文件里读，配置文件不进仓库：
 *   OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
 * 或者  --config work/oss.txt
 *
 *   node tools/oss-prefix.mjs list  leqixiang-courseware/
 *   node tools/oss-prefix.mjs top                       桶里有哪些目录
 *   node tools/oss-prefix.mjs rm    leqixiang-old/      清掉一个前缀
 *   node tools/oss-prefix.mjs copy leqixiang/ leqixiang-courseware/
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FLAGS_WITH_VALUE = ['--region', '--bucket', '--config', '--conc'];
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
/* 位置上的那几个词：第一个是要做的事，后面是它要的地址。 */
const positional = args.filter(
  (a, i) => !a.startsWith('--') && !FLAGS_WITH_VALUE.includes(args[i - 1])
);

export const REGION = arg('region', process.env.OSS_REGION || 'oss-cn-hangzhou');
export let BUCKET = arg('bucket', process.env.OSS_BUCKET || '');
export let HOST = '';

function readConfig(file) {
  const out = {};
  if (!file || !fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const cfg = readConfig(arg('config', path.join(HERE, '..', 'work', 'oss.txt')));
const AK = process.env.OSS_ACCESS_KEY_ID || cfg.OSS_ACCESS_KEY_ID || '';
const SK = process.env.OSS_ACCESS_KEY_SECRET || cfg.OSS_ACCESS_KEY_SECRET || '';
/* 桶名也可以写在配置文件里，命令行不用再写一遍。 */
if (!BUCKET && cfg.OSS_BUCKET) BUCKET = cfg.OSS_BUCKET;
HOST = `${BUCKET}.${REGION}.aliyuncs.com`;

export function sign(method, key, headers = {}, sub = '') {
  const date = new Date().toUTCString();
  const ossHeaders = Object.keys(headers)
    .filter((h) => h.toLowerCase().startsWith('x-oss-'))
    .map((h) => [h.toLowerCase(), String(headers[h]).trim()])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const canonical = ossHeaders.map(([k, v]) => `${k}:${v}\n`).join('');
  const stringToSign = [method, '', '', date, canonical + `/${BUCKET}/${key}${sub}`].join('\n');
  const signature = crypto.createHmac('sha1', SK).update(stringToSign, 'utf8').digest('base64');
  return { Date: date, ...headers, Authorization: `OSS ${AK}:${signature}` };
}

/* 桶里的清单接口说的是 xml，一页一页地要。 */
export async function listObjects(prefix, delimiter = '') {
  const items = [];
  let token = null;
  for (;;) {
    const url = new URL(`https://${HOST}/`);
    url.searchParams.set('prefix', prefix);
    url.searchParams.set('max-keys', '1000');
    url.searchParams.set('list-type', '2');
    if (delimiter) url.searchParams.set('delimiter', delimiter);
    if (token) url.searchParams.set('continuation-token', token);
    const sub = token ? `?continuation-token=${encodeURIComponent(token)}` : '';
    const res = await fetch(url, { headers: sign('GET', '', {}, sub) });
    const raw = await res.text();
    if (!raw.includes('<ListBucketResult>')) {
      throw new Error('列清单失败：' + res.status + ' ' + raw.slice(0, 200));
    }
    /*
     * 每一项照着 <Contents> 分开看，名字、大小、校验值各归各的。
     * 校验值（ETag）是一整份上传的 MD5，和本地算出来的对得上，
     * 就说明桶里的这份和本地一模一样。
     */
    for (const block of raw.split('<Contents>').slice(1)) {
      const key = /<Key>([\s\S]*?)<\/Key>/.exec(block);
      const size = /<Size>(\d+)<\/Size>/.exec(block);
      const etag = /<ETag>"?([0-9a-fA-F]+)"?<\/ETag>/.exec(block);
      if (!key || !size) continue;
      items.push({ Key: key[1], Size: Number(size[1]), ETag: etag ? etag[1].toLowerCase() : '' });
    }
    if (!/<IsTruncated>true<\/IsTruncated>/.test(raw)) break;
    const next = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(raw);
    if (!next) break;
    token = next[1];
  }
  return items;
}

export async function deleteObject(key) {
  const url = `https://${HOST}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, { method: 'DELETE', headers: sign('DELETE', key) });
  return res.status;
}

export async function copyObject(fromKey, toKey) {
  const source = `/${BUCKET}/${fromKey}`.split('/').map(encodeURIComponent).join('/');
  const url = `https://${HOST}/${toKey.split('/').map(encodeURIComponent).join('/')}`;
  const headers = { 'x-oss-copy-source': source };
  const res = await fetch(url, { method: 'PUT', headers: sign('PUT', toKey, headers) });
  return res.status;
}

/* ------------------------------------------------------------ 用起来 --- */

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!AK || !SK) {
    console.error('没有找到对象存储的账号。给 --config 指向一个配置文件，或者设好环境变量。');
    process.exit(1);
  }
  if (!BUCKET) {
    console.error('没有指定桶名。加 --bucket <名字>。');
    process.exit(1);
  }

  const mode = positional[0] || 'list';
  const a = positional[1] || '';
  const b = positional[2] || '';
  const conc = Number(arg('conc', '12'));

  if (mode === 'top') {
    const url = new URL(`https://${HOST}/`);
    url.searchParams.set('delimiter', '/');
    url.searchParams.set('max-keys', '1000');
    const res = await fetch(url, { headers: sign('GET', '') });
    const raw = await res.text();
    console.log('桶里的目录：');
    for (const m of raw.matchAll(/<Prefix>([\s\S]*?)<\/Prefix>/g)) console.log('  ' + m[1]);
  } else if (mode === 'list') {
    const items = await listObjects(a);
    const bytes = items.reduce((s, i) => s + i.Size, 0);
    console.log(`前缀 ${a}：${items.length} 个文件，${(bytes / 1048576).toFixed(1)} MB`);
  } else if (mode === 'rm') {
    const items = await listObjects(a);
    console.log(`要清掉 ${items.length} 个文件`);
    let done = 0;
    let index = 0;
    await Promise.all(
      Array.from({ length: conc }, async () => {
        for (;;) {
          const i = index++;
          if (i >= items.length) return;
          const st = await deleteObject(items[i].Key);
          if (st !== 204) console.error('删不掉：' + st + ' ' + items[i].Key);
          done++;
          if (done % 500 === 0) console.log(`  ${done}/${items.length}`);
        }
      })
    );
    console.log(`清掉 ${done} 个文件`);
  } else if (mode === 'copy') {
    const items = await listObjects(a);
    console.log(`要搬 ${items.length} 个文件：${a} -> ${b}`);
    let done = 0;
    let failed = 0;
    let index = 0;
    await Promise.all(
      Array.from({ length: conc }, async () => {
        for (;;) {
          const i = index++;
          if (i >= items.length) return;
          const from = items[i].Key;
          const to = b + from.slice(a.length);
          const st = await copyObject(from, to);
          if (st !== 200) {
            failed++;
            console.error('搬不动：' + st + ' ' + to);
          }
          done++;
          if (done % 500 === 0) console.log(`  ${done}/${items.length}`);
        }
      })
    );
    console.log(`搬完 ${done} 个文件，失败 ${failed} 个`);
  } else {
    console.error('用法：list <前缀> | top | rm <前缀> | copy <前缀> <新前缀>');
    process.exit(1);
  }
}
