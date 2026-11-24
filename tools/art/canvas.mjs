/*
 * 一个够用的小画布：能把颜色画上去，最后存成 png。
 *
 * 课件里有几张图在原站上已经没有了，浏览器里只会裂开。这里自己画
 * 一张顶上，画的都是我们自己的东西，不带任何别家的标志。
 */
import zlib from 'node:zlib';

export class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Float64Array(w * h * 3);
    this.alpha = new Float64Array(w * h);
  }
  blend(x, y, r, g, b, a = 1) {
    if (a > 1) a = 1;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = y * this.w + x;
    const old = this.alpha[i];
    const out = old * (1 - a) + a;
    this.px[i * 3] = (this.px[i * 3] * old * (1 - a) + r * a) / (out || 1);
    this.px[i * 3 + 1] = (this.px[i * 3 + 1] * old * (1 - a) + g * a) / (out || 1);
    this.px[i * 3 + 2] = (this.px[i * 3 + 2] * old * (1 - a) + b * a) / (out || 1);
    this.alpha[i] = out;
  }
  verticalGradient(stops) {
    for (let y = 0; y < this.h; y++) {
      const t = this.h === 1 ? 0 : y / (this.h - 1);
      const c = sample(stops, t);
      for (let x = 0; x < this.w; x++) this.blend(x, y, c[0], c[1], c[2], 1);
    }
  }
  radial(cx, cy, radius, color, strength = 1, falloff = 2) {
    for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(this.h - 1, Math.ceil(cy + radius)); y++) {
      for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(this.w - 1, Math.ceil(cx + radius)); x++) {
        const d = Math.hypot(x - cx, y - cy) / radius;
        if (d >= 1) continue;
        this.blend(x, y, color[0], color[1], color[2], Math.pow(1 - d, falloff) * strength);
      }
    }
  }
  ellipse(cx, cy, rx, ry, color, a = 1, angle = 0) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const span = Math.max(rx, ry) + 2;
    for (let y = Math.max(0, Math.floor(cy - span)); y <= Math.min(this.h - 1, Math.ceil(cy + span)); y++) {
      for (let x = Math.max(0, Math.floor(cx - span)); x <= Math.min(this.w - 1, Math.ceil(cx + span)); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const u = (dx * cos + dy * sin) / rx;
        const v = (-dx * sin + dy * cos) / ry;
        const d = u * u + v * v;
        if (d > 1) continue;
        const edge = Math.min(1, (1 - Math.sqrt(d)) * 6);
        this.blend(x, y, color[0], color[1], color[2], a * edge);
      }
    }
  }
  ring(cx, cy, r, thickness, color, a = 1, squash = 1) {
    const outer = r + thickness + 2;
    for (let y = Math.max(0, Math.floor(cy - outer)); y <= Math.min(this.h - 1, Math.ceil(cy + outer)); y++) {
      for (let x = Math.max(0, Math.floor(cx - outer)); x <= Math.min(this.w - 1, Math.ceil(cx + outer)); x++) {
        const dx = (x - cx) / r;
        const dy = (y - cy) / (r * squash);
        const k = 1 - Math.abs(Math.hypot(dx, dy) - 1) / (thickness / r);
        if (k <= 0) continue;
        this.blend(x, y, color[0], color[1], color[2], a * Math.min(1, k * 1.6));
      }
    }
  }
  rect(x0, y0, w, h, color, a = 1, radius = 0) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x0 + w); x++) {
        if (radius > 0) {
          const dx = Math.min(x - x0, x0 + w - 1 - x);
          const dy = Math.min(y - y0, y0 + h - 1 - y);
          if (dx < radius && dy < radius && Math.hypot(radius - dx, radius - dy) > radius) continue;
        }
        this.blend(x, y, color[0], color[1], color[2], a);
      }
    }
  }
  /*
   * A filled polygon.  People, clothes and furniture are drawn with
   * this, because a shape like that cannot be made out of boxes.
   */
  poly(points, color, a = 1) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const y0 = Math.max(0, Math.floor(minY));
    const y1 = Math.min(this.h - 1, Math.ceil(maxY));
    for (let y = y0; y <= y1; y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const q = points[(i + 1) % points.length];
        if (p[1] === q[1]) continue;
        if (y + 0.5 < Math.min(p[1], q[1]) || y + 0.5 >= Math.max(p[1], q[1])) continue;
        const t = (y + 0.5 - p[1]) / (q[1] - p[1]);
        xs.push(p[0] + t * (q[0] - p[0]));
      }
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const from = Math.max(0, Math.ceil(xs[i] - 0.5));
        const to = Math.min(this.w - 1, Math.floor(xs[i + 1] - 0.5));
        for (let x = from; x <= to; x++) this.blend(x, y, color[0], color[1], color[2], a);
      }
    }
  }
  /* A line of a given thickness, drawn as a chain of small boxes. */
  line(points, width, color, a = 1) {
    const half = width / 2;
    for (let i = 0; i + 1 < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        this.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, half, half, color, a);
      }
    }
  }
  grain(amount, seed = 1) {
    let s = seed >>> 0;
    for (let i = 0; i < this.px.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const n = ((s >>> 16) / 65536 - 0.5) * amount;
      this.px[i] += n;
    }
  }
  vignette(strength = 0.35) {
    const cx = this.w / 2;
    const cy = this.h / 2;
    const max = Math.hypot(cx, cy);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const d = Math.hypot(x - cx, y - cy) / max;
        const k = 1 - strength * Math.pow(d, 2.2);
        const i = (y * this.w + x) * 3;
        this.px[i] *= k;
        this.px[i + 1] *= k;
        this.px[i + 2] *= k;
      }
    }
  }
  toPNG() {
    const raw = Buffer.alloc(this.h * (this.w * 4 + 1));
    let o = 0;
    for (let y = 0; y < this.h; y++) {
      raw[o++] = 0;
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        raw[o++] = Math.round(Math.max(0, Math.min(255, this.px[i * 3])));
        raw[o++] = Math.round(Math.max(0, Math.min(255, this.px[i * 3 + 1])));
        raw[o++] = Math.round(Math.max(0, Math.min(255, this.px[i * 3 + 2])));
        raw[o++] = Math.round(clamp(this.alpha[i]) * 255);
      }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

const clamp = (v) => Math.max(0, Math.min(1, v));

function sample(stops, t) {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const k = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
      return [
        a[1][0] + (b[1][0] - a[1][0]) * k,
        a[1][1] + (b[1][1] - a[1][1]) * k,
        a[1][2] + (b[1][2] - a[1][2]) * k,
      ];
    }
  }
  return stops[stops.length - 1][1];
}

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

export const makeNoise = (seed) => {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const size = 512;
  const table = new Float64Array(size * size);
  for (let i = 0; i < table.length; i++) table[i] = rand();
  const at = (x, y) =>
    table[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
};

export const fbm = (noise, x, y, octaves = 5) => {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq) * amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
};

/* 三维的值噪声：贴到球面上不会有接缝。 */
export const makeNoise3 = (seed) => {
  const hash = (x, y, z) => {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 971) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const fz = smooth(z - z0);
    const lerp = (a, b, t) => a + (b - a) * t;
    const c00 = lerp(hash(x0, y0, z0), hash(x0 + 1, y0, z0), fx);
    const c10 = lerp(hash(x0, y0 + 1, z0), hash(x0 + 1, y0 + 1, z0), fx);
    const c01 = lerp(hash(x0, y0, z0 + 1), hash(x0 + 1, y0, z0 + 1), fx);
    const c11 = lerp(hash(x0, y0 + 1, z0 + 1), hash(x0 + 1, y0 + 1, z0 + 1), fx);
    return lerp(lerp(c00, c10, fy), lerp(c01, c11, fy), fz);
  };
};

export const fbm3 = (noise, x, y, z, octaves = 6) => {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq, z * freq) * amp;
    freq *= 2.07;
    amp *= 0.5;
  }
  return sum;
};
