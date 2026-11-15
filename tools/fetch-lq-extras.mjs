/*
 * A few pieces are named inside a body in a way the general scan cannot
 * reach: the MediaPipe engine folder is written out of small pieces at run
 * time, and some services hide behind escaped markup.  Fetch those by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const get = async (url) => {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 90000);
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
};

const put = (id, host, file, buffer) => {
  const target = path.join(CW, `${id}.assets`, '_ext', host, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
  console.log(`${String(buffer.length).padStart(9)}  ${id}  ${host}/${file}`);
};

/* The MediaPipe engine that sits next to every version of the bundle. */
const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

for (const id of ['afe-10', 'afe-11']) {
  const body = path.join(CW, `${id}.html`);
  if (!fs.existsSync(body)) continue;
  const text = fs.readFileSync(body, 'utf8');
  const version = (text.match(/@mediapipe\/tasks-vision@[\d.]+/) || [])[0];
  if (!version) continue;
  for (const file of WASM_FILES) {
    const target = path.join(CW, `${id}.assets`, '_ext', 'cdn.jsdelivr.net', 'npm', version, 'wasm', file);
    if (fs.existsSync(target)) continue;
    const buffer = await get(`https://unpkg.com/${version}/wasm/${file}`);
    if (!buffer) {
      console.log(`  MISS ${id} ${version}/wasm/${file}`);
      continue;
    }
    put(id, 'cdn.jsdelivr.net', `npm/${version}/wasm/${file}`, buffer);
  }
}

/* A helper service that a few works call. */
const METIS = [
  ['afe-398', 'metis-misc/zgLDUdmazTYc0B4K6Cor.js'],
  ['afe-398', 'metis-misc/cnObWiSohGePYbyhB6LlQ.js'],
  ['afe-399', 'metis-misc/zgLDUdmazTYc0B4K6Cor.js'],
  ['afe-399', 'metis-misc/cnObWiSohGePYbyhB6LlQ.js'],
  ['afe-399', 'metis-misc/zZZY40t7WJC7UdQCPACm.js'],
  ['afe-657', 'metis-misc/zgLDUdmazTYc0B4K6Cor.js'],
  ['afe-658', 'metis-misc/zgLDUdmazTYc0B4K6Cor.js'],
  ['afe-398', 'metis-lectio/uxPOvzX0E3VvOxDn9ynBJE.png'],
  ['afe-399', 'metis-lectio/uxPOvzX0E3VvOxDn9ynBJE.png'],
];

for (const [id, file] of METIS) {
  const target = path.join(CW, `${id}.assets`, '_ext', 'metis-online.fbcontent.cn', file);
  if (fs.existsSync(target)) continue;
  const buffer = await get(`https://metis-online.fbcontent.cn/${file}`);
  if (!buffer) {
    console.log(`  MISS ${id} ${file}`);
    continue;
  }
  put(id, 'metis-online.fbcontent.cn', file, buffer);
}
