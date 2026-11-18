#!/usr/bin/env node
/*
 * 《简爱》那门课缺的那几幅插图。
 *
 * 原站上那几张画已经没有了，课件里留着地址，浏览器里只会裂开。
 * 这里在浏览器里画六张：读信、园中、阁楼、帘后、重逢、婚礼。
 * 尺寸跟课件里已有的那些画一样，画面是我们自己的。
 *
 *   node tools/make-scene-plates.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect } from './cdpx.mjs';

const CDP = Number(process.env.LQ_CDP_PORT || 9226);

/* 同一门课存了两份，两边都要放上。 */
const ROOTS = [
  'mirror/leqixiang/courseware/afe-842.assets/assets',
  'mirror/aifunengjiaoyu/courseware/842.assets/assets',
];

const PLATES = [
  ['chapter06/jane_inheritance_letter.png', 'inheritanceLetter'],
  ['chapter06/thornfield_proposal_garden.png', 'proposalGarden'],
  ['chapter07/attic_revelation.png', 'atticRevelation'],
  ['chapter07/bertha_mason.png', 'berthaMason'],
  ['chapter07/ferndean_reunion.png', 'ferndeanReunion'],
  ['chapter07/wedding_interruption.png', 'weddingInterruption'],
];

const code = fs.readFileSync('tools/art/plates.js', 'utf8');
const browser = await connect(CDP);
await browser.goto('about:blank');
await browser.evaluate(code);

let n = 0;
for (const [rel, key] of PLATES) {
  const url = await browser.evaluate(`window.__drawPlate(${JSON.stringify(key)}, ${n + 1})`);
  const png = Buffer.from(String(url).split(',')[1], 'base64');
  for (const root of ROOTS) {
    const dest = path.join(root, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, png);
  }
  console.log('画了', rel, (png.length / 1024).toFixed(0) + 'KB');
  n++;
}

await browser.close();
console.log('一共 ' + n + ' 幅');
