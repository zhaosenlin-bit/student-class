#!/usr/bin/env node
/*
 * 把我们补画的图写进课件。
 *
 * 有几张图在原站上已经没有了，浏览器里只会裂开；这里把新画的图放到
 * 它们原来的位置上，顺手把课件里引用的文件名改成新图的。
 *
 *   node tools/make-generated-art.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  inkPanorama,
  pawMark,
  dotMark,
  labEmblem,
  mediaMark,
  zoomMark,
  brocadePoster,
} from './art/shapes.mjs';
import { cloudTexture } from './art/clouds.mjs';
import { petSprite, PET_KINDS, PET_STAGES } from './art/pets.mjs';

const LQ = 'mirror/leqixiang/courseware';
const AFE = 'mirror/aifunengjiaoyu/courseware';
const PURPLE = [126, 78, 158];

const write = (rel, canvas) => {
  let n = 0;
  for (const root of [LQ, AFE]) {
    const dest = path.join(root, rel);
    /* 这一门课在本地没有就跳过；只有目录还不存在时才自己建。 */
    if (!fs.existsSync(path.join(root, rel.split('/')[0]))) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, canvas.toPNG());
    n++;
  }
  console.log((n ? '写了 ' : '跳过 ') + rel + '  ' + n + ' 份');
};

write('afe-1016.assets/assets/late-qing-background-v2.png', inkPanorama(1600, 900));

const lab = 'afe-969.assets/_ext/science.clemson.edu/physics/labs/labs/';
write(lab + 'pawpurple.png', pawMark(58, PURPLE));
write(lab + 'invertpawpurple.png', pawMark(58, [232, 226, 240]));
write(lab + 'dot.png', dotMark(8, PURPLE));
write(lab + 'cupol/dot.png', dotMark(8, PURPLE));
write(lab + 'cupol/invertpawpurple.png', pawMark(58, [232, 226, 240]));
write(lab + 'labmark.png', labEmblem(144, 41));
write(lab + 'audio.png', mediaMark('audio', 18, PURPLE));
write(lab + 'video.png', mediaMark('video', 18, PURPLE));
write(lab + 'image.png', mediaMark('image', 18, PURPLE));

write('blocklygames-pond-duck.assets/pond/docs/zippy-plus.png', zoomMark('plus', 28, [133, 65, 155]));
write('blocklygames-pond-duck.assets/pond/docs/zippy-minus.png', zoomMark('minus', 28, [133, 65, 155]));

write('afe-754.assets/scenes/ruijin/assets/video/ruijin-preview.png', brocadePoster(1280, 720));

/* 地球的云层：原站那张图没有了，这里自己画一张。 */
write('afe-191.assets/_ext/unpkg.com/three-globe/example/img/earth-clouds.png', cloudTexture(2048, 1024));
/* 同一张图放在共用库里，别的课件转地球时也能用上。 */
fs.mkdirSync(
  path.join('mirror', 'leqixiang', '_shared-ext', 'unpkg.com', 'three-globe', 'example', 'img'),
  { recursive: true }
);
fs.writeFileSync(
  path.join(
    'mirror',
    'leqixiang',
    '_shared-ext',
    'unpkg.com',
    'three-globe',
    'example',
    'img',
    'earth-clouds.png'
  ),
  cloudTexture(2048, 1024).toPNG()
);
console.log('写了共用库里的 earth-clouds.png');

/* 班级"神兽"的成长素材：五种元素，七个阶段。 */
for (const kind of PET_KINDS) {
  for (const stage of PET_STAGES) {
    write(`afe-506.assets/pet-assets/pet_${kind}_${stage}.png`, petSprite(kind, stage, 256));
  }
}

console.log('画完了');
