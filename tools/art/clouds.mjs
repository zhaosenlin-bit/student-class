/*
 * 地球的云层贴图。
 *
 * 云是照着球面算出来的，贴到地球上转一圈也不会有接缝。
 */
import { Canvas, makeNoise3, fbm3 } from './canvas.mjs';

export const cloudTexture = (w, h) => {
  const c = new Canvas(w, h);
  const noise = makeNoise3(9137);
  for (let y = 0; y < h; y++) {
    const theta = (y / h) * Math.PI - Math.PI / 2;
    const sy = Math.sin(theta);
    for (let x = 0; x < w; x++) {
      const phi = (x / w) * Math.PI * 2;
      const sx = sy * Math.sin(phi);
      const sz = sy * Math.cos(phi);
      const n = fbm3(noise, sx * 3.1, sy * 3.1, sz * 3.1, 6);
      const band = 0.5 + 0.22 * Math.cos(theta * 4);
      let a = (n - (0.46 - band * 0.06)) * 3.2;
      a = Math.max(0, Math.min(1, a));
      a = a * a * (3 - 2 * a);
      const shade = 236 + Math.round(n * 19);
      c.blend(x, y, shade, shade, Math.min(255, shade + 4), a * 1.7);
    }
  }
  return c;
};
