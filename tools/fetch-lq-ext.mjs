#!/usr/bin/env node
/*
 * Fetch a named list of public files into the shared library folder.
 *
 * A few course bodies ask for a file only at run time — the MediaPipe
 * hand tracker names its data files from a callback, so no scan of the
 * document ever finds them.  They are listed here by hand and mirrored
 * once, for every course to share.
 *
 *   node tools\fetch-lq-ext.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHARED = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/';

const WANTED = [
  `${MEDIAPIPE}hand_landmark_lite.tflite`,
  `${MEDIAPIPE}hands.binarypb`,
  `${MEDIAPIPE}hands_solution_packed_assets_loader.js`,
  `${MEDIAPIPE}hands_solution_simd_wasm_bin.js`,
  `${MEDIAPIPE}hands_solution_wasm_bin.js`,
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_atmos_2048.jpg',
  'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  'https://unpkg.com/three-globe/example/img/earth-night.jpg',
  'https://unpkg.com/three-globe/example/img/earth-clouds.png',
  'https://unpkg.com/three-globe/example/img/earth-topology.png',
  'https://unpkg.com/three-globe/example/img/earth-water.png',
  'https://unpkg.com/three-globe/example/img/earth-day.jpg',
  'https://unpkg.com/@mediapipe/hands/hand_landmark_full.tflite',
  'https://unpkg.com/@mediapipe/hands/hands.binarypb',
  'https://unpkg.com/@mediapipe/hands/hands_solution_packed_assets.data',
  `${MEDIAPIPE}hands_solution_packed_assets.data`,
  `${MEDIAPIPE}hands_solution_simd_wasm_bin.wasm`,
  'https://unpkg.com/@mediapipe/hands/hands_solution_simd_wasm_bin.wasm',
];

const fetchBuffer = async (url, tries = 3) => {
  for (let i = 0; i < tries; i++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 90000);
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*' },
        signal: ctl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return { error: `HTTP ${res.status}` };
      return { data: Buffer.from(await res.arrayBuffer()) };
    } catch (e) {
      if (i === tries - 1) return { error: e.message };
    }
  }
  return { error: 'unknown' };
};

/* The same file is served by more than one public mirror. */
const ALTERNATES = (url) => {
  const u = new URL(url);
  const list = [];
  if (u.host === 'cdn.jsdelivr.net') {
    if (u.pathname.startsWith('/npm/')) {
      list.push(`https://unpkg.com/${u.pathname.slice('/npm/'.length)}`);
    } else if (u.pathname.startsWith('/gh/')) {
      const rest = u.pathname.slice('/gh/'.length);
      /* The version sits on the repository name: mrdoob/three.js@r160/… */
      const [owner, repoSpec, ...tail] = rest.split('/');
      const [repo, version] = repoSpec.split('@');
      const tag = version ? `@${version}` : '';
      list.push(`https://gcore.jsdelivr.net/gh/${owner}/${repo}${tag}/${tail.join('/')}`);
      list.push(`https://testingcf.jsdelivr.net/gh/${owner}/${repo}${tag}/${tail.join('/')}`);
    }
  }
  return list;
};

let ok = 0;
const failed = [];
for (const url of WANTED) {
  const u = new URL(url);
  const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  const target = path.join(SHARED, u.host, rel);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.log(`已有 ${u.host}/${rel}`);
    continue;
  }
  const { data, error } = await fetchBuffer(url);
  if (!data) {
    let got = null;
    for (const alt of ALTERNATES(url)) {
      const r = await fetchBuffer(alt);
      if (r.data) {
        console.log(`改用 ${alt}`);
        got = r.data;
        break;
      }
    }
    if (!got) {
      console.log(`失败 ${u.host}/${rel}  ${error}`);
      failed.push(url);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, got);
    console.log(`下载 ${u.host}/${rel}  ${(got.length / 1024).toFixed(0)}KB`);
    ok++;
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
  console.log(`下载 ${u.host}/${rel}  ${(data.length / 1024).toFixed(0)}KB`);
  ok++;
}
console.log(`\n新增 ${ok} 个，失败 ${failed.length} 个`);
if (failed.length) console.log(failed.join('\n'));

/*
 * The same library is asked for under two spellings — with and without
 * the version, on two different hosts.  One copy is enough, so it is
 * placed under the names the course bodies use.
 */
const COPY = [
  [
    'unpkg.com/@mediapipe/hands',
    'cdn.jsdelivr.net/npm/@mediapipe/hands',
  ],
];
for (const [from, to] of COPY) {
  const fromDir = path.join(SHARED, from);
  const toDir = path.join(SHARED, to);
  if (!fs.existsSync(fromDir)) continue;
  for (const name of fs.readdirSync(fromDir)) {
    const src = path.join(fromDir, name);
    const dst = path.join(toDir, name);
    if (!fs.statSync(src).isFile()) continue;
    if (fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(src).size) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    console.log(`复制 ${from}/${name} -> ${to}/${name}`);
  }
}
