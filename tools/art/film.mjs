/*
 * 《中国近代史》那门课片头动画的每一帧。
 *
 * 原站的片头视频已经没有了，只剩一个空的播放器。这里自己画一段：
 * 旧纸铺开，水墨的远山从雾里升起来，海岸线落笔，最后摊成一张
 * 山川地图。全部是我们自己的画面，不照搬任何一部现成的片子。
 */
import { Canvas, makeNoise, fbm } from './canvas.mjs';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/* 一片薄薄的墨云。 */
const cloud = (c, cx, cy, rx, ry, color, alpha) => {
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    const dx = (k - 0.5) * 2 * rx;
    const dy = Math.sin(k * Math.PI * 1.6) * ry * 0.32;
    c.ellipse(
      cx + dx,
      cy + dy,
      rx * 0.34,
      ry * (0.6 + 0.4 * Math.sin(k * Math.PI)),
      color,
      alpha
    );
  }
};

/* 一层山脊：高度随进度长出来。 */
const ridge = (c, noise, baseY, amp, color, alpha, freq, grow, seed) => {
  const w = c.w;
  for (let x = 0; x < w; x++) {
    const n = fbm(noise, (x / w) * freq + seed, freq * 2.7, 5);
    const full = baseY - (n - 0.5) * 2 * amp - amp * 0.3;
    const top = full * grow + baseY * (1 - grow);
    for (let y = Math.max(0, Math.floor(top)); y < c.h; y++) {
      const fade = Math.max(0, 1 - (y - top) / (c.h * 0.22));
      c.blend(x, y, color[0], color[1], color[2], alpha * (0.3 + 0.7 * fade));
    }
  }
};

/* 一笔从左到右慢慢走出来的海岸线。 */
const coast = (c, noise, y, color, progress, alpha) => {
  const w = c.w;
  const reach = w * clamp01(progress);
  for (let x = 0; x < reach; x++) {
    const n = fbm(noise, (x / w) * 4.2, 8.3, 4);
    const yy = y + (n - 0.5) * c.h * 0.05;
    for (let d = 0; d < Math.max(2, c.h * 0.006); d++) {
      c.blend(x, Math.floor(yy) + d, color[0], color[1], color[2], alpha * (1 - d / (c.h * 0.007)));
    }
  }
};

/* 一条帆船的影子。 */
const ship = (c, x, y, size, alpha) => {
  const s = size;
  c.poly(
    [
      [x - 0.5 * s, y],
      [x + 0.5 * s, y],
      [x + 0.34 * s, y + 0.16 * s],
      [x - 0.34 * s, y + 0.16 * s],
    ],
    [38, 30, 26],
    alpha
  );
  c.rect(x - 0.02 * s, y - 0.72 * s, 0.04 * s, 0.72 * s, [38, 30, 26], alpha);
  c.poly(
    [
      [x + 0.02 * s, y - 0.7 * s],
      [x + 0.02 * s, y - 0.16 * s],
      [x + 0.34 * s, y - 0.16 * s],
    ],
    [44, 34, 28],
    alpha * 0.92
  );
  c.poly(
    [
      [x - 0.02 * s, y - 0.7 * s],
      [x - 0.02 * s, y - 0.24 * s],
      [x - 0.26 * s, y - 0.24 * s],
    ],
    [44, 34, 28],
    alpha * 0.88
  );
};

/*
 * 某一帧。t 从 0 到 1。
 */
export const openingFrame = (w, h, t) => {
  const c = new Canvas(w, h);
  const noise = makeNoise(1839);

  /* 旧纸 */
  c.verticalGradient([
    [0, [198, 181, 148]],
    [0.4, [226, 211, 180]],
    [0.62, [206, 190, 158]],
    [1, [172, 154, 124]],
  ]);
  c.radial(w * 0.62, h * 0.36, h * 0.8, [240, 228, 198], 0.55, 2.2);
  c.radial(w * 0.18, h * 0.14, h * 0.5, [226, 210, 176], 0.3, 2);

  /* 日头 */
  const sun = smooth((t - 0.1) / 0.2);
  if (sun > 0) {
    c.radial(w * 0.74, h * 0.2, h * 0.3, [244, 226, 186], 0.5 * sun, 2.4);
    c.ellipse(w * 0.74, h * 0.2, h * 0.075, h * 0.075, [246, 232, 196], 0.85 * sun);
  }

  /* 第一笔：一道墨迹慢慢扫过纸面 */
  const wash = smooth((t - 0.02) / 0.22);
  for (let x = 0; x < w * wash; x++) {
    const n = fbm(noise, (x / w) * 3.1, 1.7, 4);
    const band = h * (0.3 + n * 0.16);
    for (let y = Math.max(0, band - h * 0.12); y < Math.min(h, band + h * 0.12); y++) {
      const k = 1 - Math.abs(y - band) / (h * 0.12);
      c.blend(x, y, 92, 84, 68, 0.2 * k * wash);
    }
  }

  /* 云 */
  const cloudT = smooth((t - 0.08) / 0.25);
  if (cloudT > 0) {
    cloud(c, w * 0.26, h * 0.26, w * 0.2, h * 0.05, [150, 138, 116], 0.32 * cloudT);
    cloud(c, w * 0.66, h * 0.34, w * 0.16, h * 0.04, [160, 148, 124], 0.26 * cloudT);
  }

  /* 远山从雾里长出来 */
  const grow = smooth((t - 0.14) / 0.5);
  ridge(c, noise, h * 0.5, h * 0.16, [150, 138, 112], 0.6, 1.7, grow, 0.4);
  ridge(c, noise, h * 0.57, h * 0.19, [110, 101, 80], 0.66, 2.3, smooth((t - 0.22) / 0.5), 2.1);
  ridge(c, noise, h * 0.63, h * 0.2, [74, 69, 55], 0.72, 3.0, smooth((t - 0.3) / 0.5), 5.4);

  /* 海：一条条横向的水纹 */
  const seaT = smooth((t - 0.3) / 0.3);
  if (seaT > 0) {
    for (let i = 0; i < 46; i++) {
      const k = i / 45;
      const y = h * (0.66 + k * 0.32);
      const len = w * (0.14 + 0.5 * (((i * 7) % 5) / 5)) * (0.5 + 0.5 * Math.sin(i * 2.3));
      const x0 = (i * 137) % Math.max(1, w - len);
      const shade = 120 + ((i * 29) % 40);
      c.rect(x0, y, len, Math.max(1, h * 0.004), [shade - 30, shade - 22, shade - 10], 0.3 * seaT);
    }
    /* 海岸线 */
    coast(c, noise, h * 0.655, [52, 47, 38], smooth((t - 0.34) / 0.26), 0.8);
  }

  /* 船：横过海面 */
  const sail = smooth((t - 0.44) / 0.16);
  if (sail > 0) {
    const x = w * (0.1 + (t - 0.44) * 1.15);
    const y = h * 0.695;
    ship(c, x, y, h * 0.15, 0.8 * sail);
    c.rect(x - w * 0.16, y + h * 0.02, w * 0.13, Math.max(1, h * 0.005), [110, 100, 82], 0.4 * sail);
  }

  /* 飞鸟 */
  const birds = smooth((t - 0.36) / 0.2);
  if (birds > 0) {
    const spots = [
      [0.36, 0.22, 0.9],
      [0.42, 0.17, 0.75],
      [0.47, 0.25, 0.62],
      [0.55, 0.13, 0.55],
    ];
    for (const [bx, by, sc] of spots) {
      const x = w * bx;
      const y = h * by;
      const s = h * 0.018 * sc;
      c.line([[x - s, y], [x - s * 0.35, y - s * 0.5]], s * 0.45, [46, 40, 34], 0.55 * birds);
      c.line([[x - s * 0.35, y - s * 0.5], [x + s * 0.15, y - s * 0.1]], s * 0.45, [46, 40, 34], 0.55 * birds);
      c.line([[x + s * 0.15, y - s * 0.1], [x + s, y]], s * 0.45, [46, 40, 34], 0.55 * birds);
    }
  }

  /* 最后画面收拢成一幅完整的山川图 */
  const settle = smooth((t - 0.72) / 0.28);
  if (settle > 0) {
    c.rect(0, 0, w, h, [26, 22, 19], 0.42 * settle);
    c.radial(w * 0.5, h * 0.48, w * 0.74, [214, 195, 158], 0.55 * settle, 1.7);
    ridge(c, noise, h * 0.52, h * 0.15, [146, 134, 108], 0.5 * settle, 1.9, 1, 1.3);
    ridge(c, noise, h * 0.62, h * 0.18, [98, 90, 71], 0.55 * settle, 2.6, 1, 3.9);
    ridge(c, noise, h * 0.72, h * 0.15, [52, 49, 40], 0.6 * settle, 3.7, 1, 7.2);
    coast(c, noise, h * 0.66, [52, 47, 38], 1, 0.65 * settle);
    /* 画卷的边框 */
    const m = w * 0.045;
    c.line([[m, m], [w - m, m]], h * 0.006, [58, 48, 36], 0.6 * settle);
    c.line([[m, h - m], [w - m, h - m]], h * 0.006, [58, 48, 36], 0.6 * settle);
    c.line([[m, m], [m, h - m]], h * 0.006, [58, 48, 36], 0.6 * settle);
    c.line([[w - m, m], [w - m, h - m]], h * 0.006, [58, 48, 36], 0.6 * settle);
  }

  c.grain(6, 17);
  c.vignette(0.46);
  return c;
};

