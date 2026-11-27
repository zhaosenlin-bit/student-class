#!/usr/bin/env node
/*
 * 把对象存储上的课件库按网站的样子发出来。
 *
 * 线上是 nginx 转发到对象存储（deploy/nginx-oss.conf）。这里做的是
 * 同一件事，作用有两个：
 *
 *   一是本地能照着线上的样子检查——目录页给首页文件，地址不改写；
 *   二是这个桶开了「强制下载」，回来的每个对象都带着
 *   Content-Disposition: attachment，浏览器会把它当文件下载而不是
 *   打开成网页。转发的时候把这个头去掉，网页才是网页。
 *
 *   node tools/serve-oss.mjs --prefix leqixiang --mount /leqixiang --port 4181
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FLAGS_WITH_VALUE = ['--region', '--bucket', '--config', '--prefix', '--mount', '--port'];
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const REGION = arg('region', process.env.OSS_REGION || 'oss-cn-hangzhou');
const BUCKET = arg('bucket', process.env.OSS_BUCKET || '');
const PREFIX = String(arg('prefix', '')).replace(/^\/+|\/+$/g, '');
const MOUNT = '/' + String(arg('mount', '/')).replace(/^\/+|\/+$/g, '');
const PORT = Number(arg('port', 4181));

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
const BUCKET_NAME = BUCKET || cfg.OSS_BUCKET || '';
const REG = REGION || cfg.OSS_REGION || 'oss-cn-hangzhou';
if (!BUCKET_NAME) {
  console.error('没有桶名。请给 --bucket <名字>，或者写在配置文件里。');
  process.exit(1);
}
const HOST = `${BUCKET_NAME}.${REG}.aliyuncs.com`;

/* 有些请求要原样转过去：断点续传、缓存校验。 */
const PASS_THROUGH = ['range', 'if-none-match', 'if-modified-since'];

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel === MOUNT) rel += '/';
    if (!rel.startsWith(MOUNT)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    let rest = rel.slice(MOUNT.length).replace(/^\/+/, '');
    /* 目录页：对象存储没有目录首页，直接给首页文件。 */
    if (!rest || rest.endsWith('/')) rest += 'index.html';
    const key = (PREFIX ? PREFIX + '/' : '') + rest;

    const headers = {};
    for (const h of PASS_THROUGH) {
      if (req.headers[h]) headers[h] = req.headers[h];
    }
    const upstream = await fetch(`https://${HOST}/${key.split('/').map(encodeURIComponent).join('/')}`, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers,
    });
    const out = {};
    for (const [k, v] of upstream.headers) {
      if (k === 'content-disposition') continue;
      if (k === 'x-oss-force-download') continue;
      /* The body is put together here, so the lengths from upstream do not apply. */
      if (k === 'transfer-encoding') continue;
      if (k === 'content-length' && req.method === 'HEAD') continue;
      if (k === 'content-length') continue;
      /* The body is read as it is, so it is not compressed any more. */
      if (k === 'content-encoding') continue;
      out[k] = v;
    }
    res.writeHead(upstream.status, out);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('bad gateway: ' + String(e.message || e));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`课件库（对象存储）：http://127.0.0.1:${PORT}${MOUNT}/`);
  console.log(`桶 ${BUCKET_NAME}，前缀 ${PREFIX ? PREFIX + '/' : '(根)'}`);
});
