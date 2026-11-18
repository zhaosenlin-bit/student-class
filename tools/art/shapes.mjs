/*
 * 我们自己画的那几张图。
 *
 * 样子都是照着原来那张图的用途来的：背景是山河，标记是爪印和
 * 小圆点，按钮是加减号。里面不出现任何别家的名字。
 */
import { Canvas, makeNoise, fbm } from './canvas.mjs';

/* 清朝晚期那门课的山河底图：旧纸、远山、近坡，压在透明地形底下。 */
export const inkPanorama = (w, h) => {
  const c = new Canvas(w, h);
  c.verticalGradient([
    [0, [198, 182, 148]],
    [0.34, [214, 197, 160]],
    [0.58, [188, 170, 133]],
    [1, [126, 113, 88]],
  ]);
  c.radial(w * 0.68, h * 0.3, h * 0.5, [246, 231, 190], 0.5, 2.2);
  c.radial(w * 0.2, h * 0.14, h * 0.34, [222, 205, 168], 0.28, 2);
  const noise = makeNoise(20241118);
  const layers = [
    { y: 0.5, amp: 0.1, color: [156, 146, 122], a: 0.55, freq: 1.6 },
    { y: 0.6, amp: 0.13, color: [126, 117, 96], a: 0.62, freq: 2.1 },
    { y: 0.7, amp: 0.15, color: [95, 89, 73], a: 0.7, freq: 2.7 },
    { y: 0.81, amp: 0.16, color: [66, 63, 53], a: 0.78, freq: 3.4 },
    { y: 0.92, amp: 0.12, color: [44, 43, 37], a: 0.86, freq: 4.2 },
  ];
  for (const layer of layers) {
    const base = h * layer.y;
    const amp = h * layer.amp;
    for (let x = 0; x < w; x++) {
      const n = fbm(noise, (x / w) * layer.freq, layer.freq * 3.1, 5);
      const top = base - (n - 0.5) * 2 * amp - amp * 0.35;
      for (let y = Math.max(0, Math.floor(top)); y < h; y++) {
        const fade = Math.max(0, 1 - (y - top) / (h * 0.24));
        c.blend(x, y, layer.color[0], layer.color[1], layer.color[2], layer.a * (0.35 + 0.65 * fade));
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    c.rect(0, h * (0.63 + i * 0.055), w, Math.max(1, h * 0.004), [226, 214, 184], 0.16);
  }
  c.grain(9, 77);
  c.vignette(0.42);
  return c;
};

/* 爪印，给物理实验那几页当标记。 */
export const pawMark = (size, color) => {
  const c = new Canvas(size, size);
  c.ellipse(size * 0.5, size * 0.66, size * 0.24, size * 0.2, color, 1);
  const toes = [
    [0.28, 0.42, 0.115],
    [0.44, 0.3, 0.115],
    [0.63, 0.31, 0.115],
    [0.78, 0.45, 0.105],
  ];
  for (const [x, y, r] of toes) {
    c.ellipse(size * x, size * y, size * r, size * r * 1.15, color, 1, (x - 0.5) * 0.5);
  }
  c.ellipse(size * 0.42, size * 0.58, size * 0.07, size * 0.05, [255, 255, 255], 0.28);
  return c;
};

/* 列表前面的小圆点。 */
export const dotMark = (size, color) => {
  const c = new Canvas(size, size);
  c.ellipse(size / 2, size / 2, size * 0.34, size * 0.34, color, 1);
  return c;
};

/* 原子轨道的样子，给实验手册那一组页面当标识。 */
export const labEmblem = (w, h) => {
  const c = new Canvas(w, h);
  const ink = [74, 62, 92];
  const gold = [200, 152, 58];
  const cx = w * 0.26;
  const cy = h * 0.5;
  const r = Math.min(h * 0.36, w * 0.2);
  c.ellipse(cx, cy, r, r * 0.34, ink, 0.85);
  c.ellipse(cx, cy, r * 0.34, r, ink, 0.85);
  c.ellipse(cx, cy, r, r * 0.34, ink, 0.85, Math.PI / 3);
  c.ellipse(cx, cy, r * 0.34, r, ink, 0.85, Math.PI / 3);
  c.ellipse(cx, cy, r * 0.14, r * 0.14, gold, 1);
  for (let x = Math.round(w * 0.5); x < w - 2; x++) {
    const t = (x - w * 0.5) / (w * 0.46);
    const y = cy + Math.sin(t * Math.PI * 3.2) * h * 0.2 * (1 - t * 0.55);
    const dot = Math.max(1, w * 0.009);
    c.ellipse(x, y, dot, dot, gold, 0.9);
  }
  return c;
};

/* 声音、影像、图画三种小标记。 */
export const mediaMark = (kind, size, color) => {
  const c = new Canvas(size, size);
  const s = size;
  if (kind === 'audio') {
    c.rect(s * 0.16, s * 0.36, s * 0.16, s * 0.28, color, 1, s * 0.03);
    c.ellipse(s * 0.62, s * 0.5, s * 0.2, s * 0.28, color, 1);
    c.ellipse(s * 0.62, s * 0.5, s * 0.09, s * 0.14, [255, 255, 255], 0.5);
  } else if (kind === 'video') {
    c.rect(s * 0.14, s * 0.22, s * 0.72, s * 0.56, color, 1, s * 0.06);
    for (let i = 1; i < 3; i++) {
      c.rect(s * 0.14, s * (0.22 + i * 0.1867) - s * 0.035, s * 0.72, s * 0.035, [255, 255, 255], 0.35);
    }
    c.ellipse(s * 0.5, s * 0.5, s * 0.14, s * 0.14, [255, 255, 255], 0.85);
  } else {
    c.rect(s * 0.14, s * 0.2, s * 0.72, s * 0.6, color, 1, s * 0.06);
    c.ellipse(s * 0.38, s * 0.42, s * 0.09, s * 0.09, [255, 255, 255], 0.9);
    c.ellipse(s * 0.62, s * 0.6, s * 0.15, s * 0.15, [255, 255, 255], 0.6);
  }
  return c;
};

/* 展开和收起的加减号。 */
export const zoomMark = (kind, size, color) => {
  const c = new Canvas(size, size);
  const s = size;
  c.ellipse(s / 2, s / 2, s * 0.46, s * 0.46, color, 1);
  c.ellipse(s / 2, s / 2, s * 0.36, s * 0.36, [255, 255, 255], 0.16);
  const bar = s * 0.3;
  const thick = Math.max(1, s * 0.07);
  c.rect(s / 2 - bar / 2, s / 2 - thick / 2, bar, thick, [255, 255, 255], 1, thick / 2);
  if (kind === 'plus') {
    c.rect(s / 2 - thick / 2, s / 2 - bar / 2, thick, bar, [255, 255, 255], 1, thick / 2);
  }
  return c;
};

/* 视频封面：夜色里的一段织锦纹样。 */
export const brocadePoster = (w, h) => {
  const c = new Canvas(w, h);
  c.verticalGradient([
    [0, [30, 28, 24]],
    [0.5, [46, 40, 31]],
    [1, [22, 21, 18]],
  ]);
  c.radial(w * 0.5, h * 0.44, h * 0.55, [190, 146, 70], 0.35, 2.4);
  const noise = makeNoise(31415);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(noise, (x / w) * 7, (y / h) * 5, 4);
      const k = Math.max(0, n - 0.55) * 1.5;
      if (k > 0) c.blend(x, y, 214, 176, 96, Math.min(0.35, k));
    }
  }
  const stepY = Math.max(12, Math.round(h / 26));
  const stepX = Math.max(12, Math.round(w / 20));
  for (let y = -h; y < h * 2; y += stepY) {
    const off = ((y / stepY) | 0) % 2 ? Math.round(w / 40) : 0;
    for (let x = -w; x < w * 2; x += stepX) {
      c.ellipse(x + off, y, Math.max(1.2, w / 400), Math.max(1.2, w / 400), [226, 196, 128], 0.16);
    }
  }
  c.grain(7, 5);
  c.vignette(0.5);
  return c;
};
