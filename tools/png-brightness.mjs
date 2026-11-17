/*
 * How bright is a picture?
 *
 * A simulation carries two marks in its corner: one drawn to be read on
 * a dark screen, one drawn to be read on a light one, and the
 * simulation picks whichever suits the screen it is drawn on.  So the
 * mark of this library has to be picked the same way -- the light one
 * for a dark screen, the dark one for a light screen -- or the corner
 * of a light simulation ends up blank.
 *
 * To tell the two apart, the picture is read here: the header says how
 * big it is, and the pixels are unpacked far enough to know how bright
 * the ink is.
 */
import zlib from 'node:zlib';

/* The pixels of a picture, unpacked. */
const unpack = (buf) => {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  let p = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let ctype = 0;
  let interlace = 0;
  const idat = [];
  let plte = null;
  let trns = null;
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      ctype = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!w || !h || depth !== 8 || interlace !== 0) return null;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!channels) return null;

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[rp++];
    const row = raw.subarray(rp, rp + stride);
    rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p0 = a + b - c;
        const pa = Math.abs(p0 - a);
        const pb = Math.abs(p0 - b);
        const pc = Math.abs(p0 - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }
  return { w, h, ctype, channels, px: out, plte, trns };
};

/**
 * The average brightness of the ink of a picture, 0 to 255.
 *
 * The transparent parts of the picture are left out: a mark drawn on
 * nothing has no brightness of its own.
 *
 * @param {Buffer} buf the picture
 * @returns {number|null} the brightness, or null when the picture is
 *   not one this reader knows how to open
 */
export const brightness = (buf) => {
  const png = unpack(buf);
  if (!png) return null;
  const { w, h, ctype, channels, px, plte, trns } = png;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    const at = i * channels;
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 255;
    if (ctype === 3) {
      const idx = px[at];
      r = plte[idx * 3];
      g = plte[idx * 3 + 1];
      b = plte[idx * 3 + 2];
      if (trns && idx < trns.length) a = trns[idx];
    } else if (channels >= 3) {
      r = px[at];
      g = px[at + 1];
      b = px[at + 2];
      if (channels === 4) a = px[at + 3];
    } else {
      r = g = b = px[at];
      if (channels === 2) a = px[at + 1];
    }
    if (a < 128) continue;
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    n++;
  }
  return n ? sum / n : null;
};

/**
 * The size of a picture, read from its header.
 *
 * @param {Buffer} buf the picture
 * @returns {{w:number,h:number}|null} the size, or null
 */
export const size = (buf) => {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
};

export default brightness;
