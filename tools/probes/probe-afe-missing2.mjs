/* Absolute references in a base-tag document resolve against the origin.
   Try that form as well. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ASSET_HOST = 'https://play.aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const id = process.argv[2];
const html = fs.readFileSync(path.join(CW, `${id}.html`), 'utf8');
const assetRoot = html.match(/<base[^>]*href="([^"]+)"/i)?.[1];
const lease = assetRoot?.match(/\/t\/([^/]+)\//)?.[1];

const names = [
  'models/vr_game_ready_hands.glb',
  'images/circulation_v2_base.png',
  'data/circulation_v2_paths_draft.json',
  'overlays/circulation_v2_routes_overlay.svg',
  'draco_decoder.js',
  'draco_wasm_wrapper.js',
  'draco_decoder.wasm',
  'wasm/hand_landmarker.task',
  'models/heart.glb',
  'images/circulation-base.png',
];

for (const name of names) {
  const forms = [
    ['origin', `${ASSET_HOST}/${name}`],
    ['lease', `${ASSET_HOST}/api/program-assets/${id}/t/${lease}/${name}`],
    ['pkg', `${ASSET_HOST}/api/program-assets/${id}/t/${lease}/package/${name}`],
    ['base', `${ASSET_HOST}${assetRoot}${name}`],
  ];
  const results = [];
  for (const [label, url] of forms) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    results.push(`${label}=${res.status}/${res.headers.get('content-length')}`);
  }
  console.log(`  ${name}\n     ${results.join('  ')}`);
}
