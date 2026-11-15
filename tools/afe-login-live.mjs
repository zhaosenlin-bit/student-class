#!/usr/bin/env node
/*
 * A login watcher that keeps the QR in front of the reader.
 *
 * WeChat's showqrcode ticket lives for about a minute, so the code is
 * re-issued every twenty seconds and written to two files: the raw image
 * and a text file that carries the scene the image belongs to.
 *
 * A reader who scans a code that has just been replaced must still be
 * caught, so the watcher keeps the last few scenes and asks about all of
 * them, one per tick.  The picture on disk is always the newest one;
 * every older picture that was on the screen for the last few minutes is
 * still watched.
 *
 *   node tools/afe-login-live.mjs --seconds 3600
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const QR = path.join(SCRATCH, 'afe-qr.png');
const SCENE = path.join(SCRATCH, 'afe-scene.txt');
const TOKEN = path.join(SCRATCH, 'afe-token.txt');
const USER = path.join(SCRATCH, 'afe-user.json');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const seconds = Number(args[args.indexOf('--seconds') + 1] || args[0] || 3600);
const REFRESH = 20000;
/* How many of the recent codes stay watched. */
const KEEP = 12;

const HEADERS = {
  'User-Agent': UA,
  'Content-Type': 'application/json',
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
};

fs.mkdirSync(SCRATCH, { recursive: true });

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
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const deadline = Date.now() + seconds * 1000;
let scenes = [];
let lastQr = 0;
let cursor = 0;

console.log(`[${new Date().toLocaleTimeString()}] watching for a scan`);

while (Date.now() < deadline) {
  try {
    if (!scenes.length || Date.now() - lastQr > REFRESH) {
      const qr = await getQr();
      if (!qr.success) throw new Error('get-qrcode refused');
      lastQr = Date.now();
      await saveQr(qr.url);
      fs.writeFileSync(SCENE, String(qr.scene));
      scenes = [qr.scene, ...scenes.filter((s) => s !== qr.scene)].slice(0, KEEP);
      console.log(`[${new Date().toLocaleTimeString()}] fresh code -> ${QR}`);
    }
    /* One scene per tick, so a code that was replaced a minute ago is
       still looked at every few seconds. */
    const scene = scenes[cursor % scenes.length];
    cursor += 1;
    const res = await checkScan(scene);
    if (res && res.success && res.token) {
      fs.writeFileSync(TOKEN, res.token);
      fs.writeFileSync(USER, JSON.stringify(res.user || {}, null, 2));
      console.log(`[${new Date().toLocaleTimeString()}] token saved -> ${TOKEN}`);
      console.log('user:', JSON.stringify(res.user || {}));
      process.exit(0);
    }
  } catch (error) {
    console.log('retry:', String(error.message || error).slice(0, 120));
  }
  await new Promise((r) => setTimeout(r, 1500));
}

console.log('gave up waiting for the scan');
process.exit(1);
