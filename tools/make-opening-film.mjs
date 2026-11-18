#!/usr/bin/env node
/*
 * 给《中国近代史》那门课做一段自己的片头动画。
 *
 * 原站的片头视频没有了，课件里只剩一个空的播放器和一个裂开的封面。
 * 这里一帧一帧地画出来，再交给 ffmpeg 压成 mp4，顺手把封面和最后
 * 那一帧也存成 jpg。画面是我们自己画的。
 *
 *   node tools/make-opening-film.mjs
 *   node tools/make-opening-film.mjs --reuse <临时目录>   # 画过的帧直接拿来压
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openingFrame } from './art/film.mjs';

const LQ = 'mirror/leqixiang/courseware/afe-1016.assets/assets/opening';
/* 同一门课在另一份镜像里也有一份，两边都要放上。 */
const AFE = 'mirror/aifunengjiaoyu/courseware/1016.assets/assets/opening';
const W = 1280;
const H = 720;
const FPS = 24;
const SECONDS = 6;
const FRAMES = FPS * SECONDS;

const reuseAt = process.argv.indexOf('--reuse');
const tmp =
  reuseAt >= 0 && process.argv[reuseAt + 1]
    ? process.argv[reuseAt + 1]
    : fs.mkdtempSync(path.join(os.tmpdir(), 'lq-film-'));
console.log('临时目录', tmp);

const already = fs.existsSync(path.join(tmp, `f${String(FRAMES - 1).padStart(4, '0')}.png`));
if (already) {
  console.log('帧已经画好了，直接拿来用');
} else {
  for (let i = 0; i < FRAMES; i++) {
    const t = i / (FRAMES - 1);
    const canvas = openingFrame(W, H, t);
    fs.writeFileSync(path.join(tmp, `f${String(i).padStart(4, '0')}.png`), canvas.toPNG());
    if (i % 24 === 0) console.log('  帧', i, '/', FRAMES);
  }
  console.log('画完了', FRAMES, '帧');
}

const video = path.join(LQ, '序章CG动画.mp4');
const run = (args) => {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  return r.status === 0;
};

const ok = run([
  '-framerate', String(FPS),
  '-i', path.join(tmp, 'f%04d.png'),
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '22',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  video,
]);
if (!ok) {
  console.log('压片失败');
  process.exit(1);
}
console.log('写了', video, (fs.statSync(video).size / 1024).toFixed(0) + 'KB');

/* 另一份镜像里也放一份，两边都能打开。 */
fs.mkdirSync(AFE, { recursive: true });
for (const name of ['序章CG动画.mp4', 'first.jpg', 'map-handoff.jpg']) {
  const from = path.join(LQ, name);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(AFE, name));
    console.log('另一份镜像也放了', name);
  }
}

/* 封面：把第一帧存成 jpg。 */
run(['-i', path.join(tmp, 'f0000.png'), '-frames:v', '1', '-q:v', '4', path.join(LQ, 'first.jpg')]);
/* 最后那一帧：画卷摊开，接进山川地图。 */
run([
  '-i',
  path.join(tmp, `f${String(FRAMES - 1).padStart(4, '0')}.png`),
  '-frames:v',
  '1',
  '-q:v',
  '4',
  path.join(LQ, 'map-handoff.jpg'),
]);

for (const name of ['first.jpg', 'map-handoff.jpg']) {
  const f = path.join(LQ, name);
  console.log(name, fs.existsSync(f) ? (fs.statSync(f).size / 1024).toFixed(0) + 'KB' : '没有');
}

if (reuseAt < 0) fs.rmSync(tmp, { recursive: true, force: true });
console.log('收工');
