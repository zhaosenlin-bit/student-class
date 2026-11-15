/*
 * The 长征 courseware asks for its map material at runtime, built from the
 * lease folder in the document body. Those paths never appear as literal
 * hrefs, so the reference scanner cannot see them. This pulls them by name.
 */
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const DIR = 'mirror/aifunengjiaoyu/courseware';
const ASSETS = path.join(DIR, '754.assets');

const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const body = fs.readFileSync(path.join(DIR, '754.html'), 'utf8');
const lease = body.match(/assetRoot":"([^"]+)"/)?.[1] || '';
if (!lease) throw new Error('no lease in the body');

const headers = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${token}`,
};

const wanted = [
  'courseware/archives-ruijin.json',
  'courseware/archives-yudu.json',
  'courseware/archives-xiangjiang.json',
  'courseware/archives-zunyi.json',
  'courseware/archives-chishui.json',
  'courseware/archives-jinshajiang.json',
  'courseware/archives-luding.json',
  'courseware/archives-snowgrass.json',
  'courseware/archives-final.json',
  'audio/map-background.mp3',
  'map/long-march-background-v1.png',
  'map/china/heightmap_rg_half.webp',
  'map/china/river_mask_national.png',
  'map/china/river_mask_longmarch.png',
  'map/waternormals.jpg',
  'sprites/red-army-flagbearer.webp',
  'sprites/red-army-soldier.webp',
  'sprites/red-army-officer.webp',
  'overlays/yudu-bridge.webp',
  'overlays/zunyi-site.webp',
  'overlays/luding-bridge.webp',
  'overlays/huining-gate.webp',
  'overlays/jinshajiang-bridge.webp',
  'overlays/snowgrass.webp',
  'overlays/chishui.webp',
  'overlays/xiangjiang.webp',
];

const ok = [];
const failed = [];

for (const rel of wanted) {
  const out = path.join(ASSETS, rel);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) {
    ok.push(rel);
    continue;
  }
  const url = ORIGIN + lease + rel;
  try {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error('status ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    ok.push(rel);
    console.log('ok  ', String(buf.length).padStart(9), rel);
  } catch (e) {
    failed.push(`${rel} (${e.message})`);
    console.log('FAIL', rel, e.message);
  }
  await new Promise((r) => setTimeout(r, 120));
}

console.log(`\n${ok.length} present, ${failed.length} unavailable`);
for (const f of failed) console.log('  missing upstream:', f);
