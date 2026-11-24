/*
 * 班级"神兽"成长系统要用的小图。
 *
 * 五种元素，木、星、雷、水、火；七个阶段，从蛋到终极。每一张都是
 * 我们自己画的，方位角像素，不带任何别家的东西。
 */
import { Canvas } from './canvas.mjs';

const KINDS = {
  wood: { body: [76, 154, 90], light: [143, 214, 148], dark: [42, 104, 60] },
  star: { body: [240, 180, 41], light: [255, 224, 138], dark: [176, 116, 12] },
  thunder: { body: [61, 111, 214], light: [159, 192, 255], dark: [34, 68, 145] },
  water: { body: [47, 154, 168], light: [143, 224, 232], dark: [26, 106, 122] },
  fire: { body: [226, 98, 47], light: [255, 176, 102], dark: [156, 56, 22] },
};

const STAGES = ['egg', 'baby', 'growth', 'mature', 'complete', 'phantom', 'ultimate'];

const SCALE = {
  egg: 0.72,
  baby: 0.66,
  growth: 0.8,
  mature: 0.9,
  complete: 0.9,
  phantom: 0.9,
  ultimate: 0.95,
};

export const petSprite = (kind, stage, size) => {
  const c = new Canvas(size, size);
  const k = KINDS[kind] || KINDS.wood;
  const s = size;
  const scale = SCALE[stage] || 0.85;
  const cx = s * 0.5;
  const cy = s * 0.58;

  c.radial(cx, cy + s * 0.2, s * 0.42, k.light, stage === 'ultimate' ? 0.45 : 0.2, 2);

  if (stage === 'egg') {
    c.ellipse(cx, cy, s * 0.24, s * 0.3, k.body, 1);
    c.ellipse(cx - s * 0.06, cy - s * 0.1, s * 0.08, s * 0.12, k.light, 0.5);
    for (let i = 0; i < 3; i++) {
      c.ellipse(cx, cy - s * 0.12 + i * s * 0.1, s * 0.2, s * 0.022, k.dark, 0.75);
    }
    c.ellipse(cx - s * 0.07, cy - s * 0.02, s * 0.035, s * 0.045, [255, 255, 255], 1);
    c.ellipse(cx + s * 0.07, cy - s * 0.02, s * 0.035, s * 0.045, [255, 255, 255], 1);
    c.ellipse(cx - s * 0.06, cy - s * 0.01, s * 0.018, s * 0.024, [40, 34, 30], 1);
    c.ellipse(cx + s * 0.08, cy - s * 0.01, s * 0.018, s * 0.024, [40, 34, 30], 1);
    return c;
  }

  const bodyR = s * 0.21 * scale;
  const headR = s * 0.17 * scale;
  const headY = cy - s * 0.19 * scale;

  c.ellipse(cx - headR * 0.75, headY - headR * 0.55, headR * 0.42, headR * 0.6, k.body, 1, -0.5);
  c.ellipse(cx + headR * 0.75, headY - headR * 0.55, headR * 0.42, headR * 0.6, k.body, 1, 0.5);
  c.ellipse(cx, cy, bodyR, bodyR * 1.05, k.body, 1);
  c.ellipse(cx - bodyR * 0.35, cy - bodyR * 0.3, bodyR * 0.45, bodyR * 0.35, k.light, 0.45);
  c.ellipse(cx, headY, headR, headR * 0.95, k.body, 1);
  c.ellipse(cx - headR * 0.3, headY - headR * 0.35, headR * 0.45, headR * 0.3, k.light, 0.4);

  const eye = headR * 0.26;
  c.ellipse(cx - headR * 0.38, headY + headR * 0.05, eye, eye * 1.15, [255, 255, 255], 1);
  c.ellipse(cx + headR * 0.38, headY + headR * 0.05, eye, eye * 1.15, [255, 255, 255], 1);
  c.ellipse(cx - headR * 0.36, headY + headR * 0.08, eye * 0.55, eye * 0.62, [42, 36, 32], 1);
  c.ellipse(cx + headR * 0.4, headY + headR * 0.08, eye * 0.55, eye * 0.62, [42, 36, 32], 1);
  c.ellipse(cx - headR * 0.62, headY + headR * 0.34, headR * 0.18, headR * 0.11, [244, 150, 150], 0.5);
  c.ellipse(cx + headR * 0.62, headY + headR * 0.34, headR * 0.18, headR * 0.11, [244, 150, 150], 0.5);
  c.ellipse(cx, headY + headR * 0.36, headR * 0.13, headR * 0.1, [70, 46, 44], 0.85);

  if (stage !== 'egg' && stage !== 'baby') {
    c.ellipse(cx + headR * 0.1, headY - headR * 1.05, headR * 0.5, headR * 0.22, k.light, 1, -0.6);
  }
  if (stage === 'mature' || stage === 'complete' || stage === 'ultimate') {
    c.ellipse(cx - bodyR * 1.0, cy - bodyR * 0.15, bodyR * 0.45, bodyR * 0.22, k.light, 0.85, 0.6);
    c.ellipse(cx + bodyR * 1.0, cy - bodyR * 0.15, bodyR * 0.45, bodyR * 0.22, k.light, 0.85, -0.6);
  }
  if (stage === 'complete') {
    const top = headY - headR * 1.05;
    c.rect(cx - headR * 0.5, top, headR, headR * 0.28, [235, 196, 92], 1, headR * 0.05);
    for (let i = 0; i < 3; i++) {
      c.ellipse(cx - headR * 0.4 + i * headR * 0.4, top - headR * 0.05, headR * 0.14, headR * 0.18, [235, 196, 92], 1);
    }
  }
  if (stage === 'ultimate') {
    c.ring(cx, cy, s * 0.4, s * 0.035, [245, 214, 120], 0.75);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.ellipse(cx + Math.cos(a) * s * 0.4, cy + Math.sin(a) * s * 0.4, s * 0.018, s * 0.018, [255, 236, 170], 0.85);
    }
  }
  if (stage === 'phantom') {
    for (let i = 0; i < 3; i++) {
      c.ellipse(cx - bodyR * 0.5 + i * bodyR * 0.5, cy + bodyR * 0.85, bodyR * 0.3, bodyR * 0.18, k.light, 0.4);
    }
  }
  return c;
};

export const PET_KINDS = Object.keys(KINDS);
export const PET_STAGES = STAGES;
