#!/usr/bin/env node
/*
 * 图灵智赋 WeChat login, driven straight through the site's own API.
 *
 *   GET  /api/get-qrcode     -> { url, scene, reportToken }
 *   POST /api/auth/check-scan { scene } -> { success, user, token }
 *
 * The QR image is written to recon/scratch/afe-qr.png; the bearer token
 * is written to recon/scratch/afe-token.txt as soon as the scan lands.
 * The code refreshes every minute, because WeChat's showqrcode tickets
 * expire quickly.
 *
 * Usage:  node tools/afe-login-api.mjs [--seconds 3600]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QR = path.join(ROOT, 'recon', 'scratch', 'afe-qr.png');
const TOKEN = path.join(ROOT, 'recon', 'scratch', 'afe-token.txt');
const USER = path.join(ROOT, 'recon', 'scratch', 'afe-user.json');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const seconds = Number(
  args[args.indexOf('--seconds') + 1] || args[0] || 3600
);

const HEADERS = {
  'User-Agent': UA,
  'Content-Type': 'application/json',
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
};

fs.mkdirSync(path.dirname(QR), { recursive: true });

async function getQr() {
  const res = await fetch(`${ORIGIN}/api/get-qrcode`, { headers: HEADERS });
  if (!res.ok) throw new Error(`get-qrcode -> ${res.status}`);
  return res.json();
}

async function saveQr(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`qr image -> ${res.status}`);
  fs.writeFileSync(QR, Buffer.from(await res.arrayBuffer()));
}

async function checkScan(scene) {
  const res = await fetch(`${ORIGIN}/api/auth/check-scan`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ scene }),
  });
  if (!res.ok) return null;
  return res.json();
}

const deadline = Date.now() + seconds * 1000;
let scene = null;
let qrUrl = null;
let lastQr = 0;

console.log('scan the QR with WeChat — code is refreshed every minute');

while (Date.now() < deadline) {
  try {
    if (!scene || Date.now() - lastQr > 55000) {
      const qr = await getQr();
      if (!qr.success) throw new Error('get-qrcode refused');
      scene = qr.scene;
      qrUrl = qr.url;
      lastQr = Date.now();
      await saveQr(qrUrl);
      console.log(`[${new Date().toLocaleTimeString()}] QR ready -> ${QR}`);
    }

    const res = await checkScan(scene);
    if (res && res.success && res.token) {
      fs.writeFileSync(TOKEN, res.token);
      fs.writeFileSync(USER, JSON.stringify(res.user || {}, null, 2));
      console.log('token saved ->', TOKEN);
      console.log('user:', JSON.stringify(res.user || {}));
      process.exit(0);
    }
    if (res && res.msg) console.log('  ', res.msg);
  } catch (error) {
    console.log('retry:', String(error.message || error).slice(0, 120));
  }
  await new Promise((r) => setTimeout(r, 2000));
}

console.log('gave up waiting for the scan');
process.exit(1);
