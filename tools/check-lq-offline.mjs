/*
 * The real test of "下载下来就能用": take the zip the site hands out,
 * unpack it, cut the browser's network, and open it from disk.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const OUT = path.resolve('recon/scratch/offline');

/* A minimal zip reader: the archive is written by server/server.mjs. */
function readZip(buffer) {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip');
  const count = buffer.readUInt16LE(eocd + 10);
  let off = buffer.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(off) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(off + 10);
    const compressedSize = buffer.readUInt32LE(off + 20);
    const nameLen = buffer.readUInt16LE(off + 28);
    const extraLen = buffer.readUInt16LE(off + 30);
    const commentLen = buffer.readUInt16LE(off + 32);
    const localOff = buffer.readUInt32LE(off + 42);
    const name = buffer.slice(off + 46, off + 46 + nameLen).toString('utf8');
    /* the local header repeats the name and extra fields */
    const lNameLen = buffer.readUInt16LE(localOff + 26);
    const lExtraLen = buffer.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = buffer.slice(start, start + compressedSize);
    out.push({
      name,
      data: method === 0 ? raw : zlib.inflateRawSync(raw),
    });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const ids = (process.argv[2] || 'afe-754,mirror,lens').split(',').map((s) => s.trim());
fs.mkdirSync(OUT, { recursive: true });

const browser = await connect(CDP);
const results = [];

for (const id of ids) {
  let entries;
  const res = await fetch(`http://127.0.0.1:${PORT}/api/downloads/file/${id}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.slice(0, 2).toString() !== 'PK') {
    /* 小白教育的课件是单文件 html，直接给。 */
    const dir = path.join(OUT, id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const htmlName = `${id}.html`;
    fs.writeFileSync(path.join(dir, htmlName), buffer);
    entries = [{ name: htmlName, data: buffer }];
  } else {
    entries = readZip(buffer);
  }
  const dir = path.join(OUT, id);
  for (const e of entries) {
    const target = path.join(dir, e.name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, e.data);
  }
  const html = entries.find((e) => e.name.endsWith('.html'));
  const url = 'file:///' + path.join(dir, html.name).replace(/\\/g, '/');

  /* Cut the network before opening: what renders now has to be on disk. */
  await browser.raw('Network.enable', {}, browser.pageSession);
  await browser.raw('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  }, browser.pageSession);
  const mark = browser.events.length;
  await browser.goto(url);
  await sleep(9000);
  const probe = await browser.evaluate(`(() => ({
    title: document.title,
    canvases: document.querySelectorAll('canvas').length,
    bodyLen: document.body ? document.body.innerHTML.length : 0,
    text: (document.body ? document.body.innerText : '').replace(/\\s+/g, ' ').slice(0, 160),
    imgs: document.querySelectorAll('img').length,
    badImgs: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
  }))()`);
  const failed = [
    ...new Set(
      browser.events
        .slice(mark)
        .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
        .map((e) => `${e.params.response.status} ${e.params.response.url.slice(0, 110)}`)
    ),
  ];
  await browser.raw('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  }, browser.pageSession);
  const ok = probe.canvases > 0 || probe.bodyLen > 800;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${id}  条目=${entries.length} 画布=${probe.canvases} ` +
      `body=${probe.bodyLen} 图=${probe.imgs}/坏${probe.badImgs} 断网失败请求=${failed.length}`
  );
  if (failed.length) for (const f of failed.slice(0, 6)) console.log('     ', f);
  console.log('     ', probe.text);
  await browser.shot(`recon/scratch/lq-offline-${id}.png`);
  results.push({ id, ok, entries: entries.length, probe, failed });
}

await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n断网可用 ${results.length - bad.length}/${results.length}`);
fs.writeFileSync('recon/scratch/lq-offline-report.json', JSON.stringify(results, null, 1));
