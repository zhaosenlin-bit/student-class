#!/usr/bin/env node
/*
 * Does the download work in a browser that has no server behind it?
 *
 * The button is pressed, the file is packed out of the files the
 * lesson is shown from, and the result is checked: it has to be an
 * archive, and the lesson has to be in it.
 *
 *   node tools/check-static-download.mjs --base http://127.0.0.1:4181 --id lq-180
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdpx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = arg('base', 'http://127.0.0.1:4181').replace(/\/+$/, '');
const ID = arg('id', '');
const CDP = Number(arg('cdp', 9333));

if (!ID) {
  console.error('要用 --id 指明一门课件。');
  process.exit(1);
}

const p = await connect(CDP);
let bad = false;
try {
  await p.goto(`${BASE}/`);
  await sleep(4000);

  const opened = await p.evaluate(`(() => {
    location.hash = '#course/${ID}';
    return location.hash;
  })()`);
  console.log('打开详情：', opened);
  await sleep(3000);

  const pressed = await p.evaluate(`(() => {
    const b = document.querySelector('[data-download-action="download"]');
    if (!b) return 'no button';
    b.click();
    return 'clicked';
  })()`);
  console.log('点下载：', pressed);

  let file = null;
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    file = await p
      .evaluate(`(() => {
        const a = document.querySelector('[data-download-save]');
        if (!a) return null;
        return { href: a.getAttribute('href'), name: a.getAttribute('download') };
      })()`)
      .catch(() => null);
    if (file) break;
  }
  console.log('下载地址：', JSON.stringify(file));

  if (!file || !String(file.href).startsWith('blob:')) {
    console.log('没有拿到下载地址');
    bad = true;
  } else {
    const check = await p.evaluate(`(async () => {
      const a = document.querySelector('[data-download-save]');
      const res = await fetch(a.getAttribute('href'));
      const buf = new Uint8Array(await res.arrayBuffer());
      const dv = new DataView(buf.buffer);
      if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
        const text = new TextDecoder().decode(buf.subarray(0, 400));
        return { kind: 'html', size: buf.length, head: text.replace(/\\s+/g, ' ').slice(0, 160) };
      }
      const names = [];
      let e = buf.length - 22;
      while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
      if (e < 0) return { error: 'not an archive', size: buf.length };
      const count = dv.getUint16(e + 10, true);
      let at = dv.getUint32(e + 16, true);
      for (let i = 0; i < count; i++) {
        const nameLen = dv.getUint16(at + 28, true);
        const extraLen = dv.getUint16(at + 30, true);
        const commentLen = dv.getUint16(at + 32, true);
        const size = dv.getUint32(at + 24, true);
        const name = new TextDecoder().decode(buf.subarray(at + 46, at + 46 + nameLen));
        names.push(name + ' (' + size + ')');
        at += 46 + nameLen + extraLen + commentLen;
      }
      return { size: buf.length, count, names: names.slice(0, 12) };
    })()`);
    console.log('打包结果：', JSON.stringify(check, null, 1));
    if (check.error || check.kind === 'html') bad = true;
    if (!check.names.some((n) => n.startsWith(`${ID}.html`) || n.startsWith('index.html'))) {
      console.log('打包里没有课件本身');
      bad = true;
    }
  }
} catch (error) {
  console.log('出错：', String(error.message || error));
  bad = true;
} finally {
  await p.close();
}

if (bad) process.exitCode = 1;
void ROOT;
