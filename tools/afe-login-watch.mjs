#!/usr/bin/env node
/*
 * Keep the 图灵智赋 WeChat login QR fresh and wait for the scan.
 *
 * WeChat's showqrcode tickets expire after a couple of minutes, so the
 * modal is reopened on a timer; the browser window stays in front so the
 * code can be scanned whenever.  As soon as the site hands out a bearer
 * token it is written to recon/scratch/afe-token.txt and the loop stops.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'recon', 'scratch', 'afe-token.txt');
const SHOT = path.join(ROOT, 'recon', 'scratch', 'afe-qr.png');
const REFRESH_MS = Number(process.env.REFRESH_MS || 70000);

const page = await connect(9222, 'aifunengjiaoyu.com');

async function openLogin() {
  await page.evaluate(`(() => {
    const closers = [...document.querySelectorAll('button,[role=button],.close,.modal-close')]
      .filter(e => (e.innerText || '').trim() === '✕' || (e.getAttribute('aria-label')||'') === 'close');
    for (const c of closers) { try { c.click(); } catch(e){} }
  })()`);
  await new Promise((r) => setTimeout(r, 1200));

  const box = await page.evaluate(`(() => {
    const btn = [...document.querySelectorAll('button,a')]
      .find(e => (e.textContent || '').replace(/\\s+/g, '') === '登录/注册');
    if (!btn) return null;
    btn.scrollIntoView({ block: 'center' });
    const r = btn.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`);
  if (!box) return null;
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', {
      type,
      x: box.x,
      y: box.y,
      button: 'left',
      clickCount: 1,
    });
  }
  await new Promise((r) => setTimeout(r, 3000));
  return true;
}

async function saveQr() {
  const rect = await page.evaluate(`(() => {
    const el = [...document.querySelectorAll('img')]
      .find(e => e.offsetParent !== null && e.naturalWidth >= 100 && e.naturalWidth <= 600 && /showqrc/.test(e.src || ''));
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height), src: el.src };
  })()`);
  if (!rect) return null;
  const shot = await page.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 3 },
    captureBeyondViewport: false,
  });
  fs.writeFileSync(SHOT, Buffer.from(shot.data, 'base64'));
  return rect.src;
}

const deadline = Date.now() + Number(process.env.MAX_MS || 3600000);
let ticket = null;

while (Date.now() < deadline) {
  try {
    const token = await page.evaluate("localStorage.getItem('aiedu_token')");
    if (token && !token.startsWith('local-')) {
      fs.writeFileSync(OUT, token);
      const user = await page.evaluate("localStorage.getItem('aiedu_user')");
      console.log('token saved ->', OUT);
      console.log('user:', user);
      page.close();
      process.exit(0);
    }

    await openLogin();
    const src = await saveQr();
    if (src && src !== ticket) {
      ticket = src;
      console.log(`[${new Date().toLocaleTimeString()}] new QR -> ${SHOT}`);
    }
  } catch (error) {
    console.log('retry after error:', String(error).slice(0, 120));
  }
  await new Promise((r) => setTimeout(r, REFRESH_MS));
}

console.log('gave up waiting for the scan');
page.close();
process.exit(1);
