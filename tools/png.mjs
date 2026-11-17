import zlib from 'node:zlib';

/*
 * A small PNG reader.  Chrome writes 8-bit non-interlaced images, so the
 * four filter types and the five colour types are all that is needed to
 * look at what was actually drawn.
 */
export function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  let palette = null;
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') palette = data;
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`png bit depth ${bitDepth} not supported`);
  if (interlace) throw new Error('interlaced png not supported');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`png colour type ${colorType} not supported`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + stride);
    rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      cur[x] = v;
    }
  }
  return { width, height, channels, data: out, palette, colorType };
}

/*
 * How much of the picture is not the single colour that fills the corner?
 * A blank course shows one flat colour; a course that draws something shows
 * several.
 */
export function pictureStats(png) {
  const { width, height, channels, data, palette, colorType } = png;
  const at = (x, y) => {
    const i = (y * width + x) * channels;
    if (colorType === 3) {
      const p = data[i] * 3;
      return [palette[p], palette[p + 1], palette[p + 2]];
    }
    if (channels === 1 || channels === 2) return [data[i], data[i], data[i]];
    return [data[i], data[i + 1], data[i + 2]];
  };
  const bg = at(0, 0);
  const key = (c) => (c[0] << 16) | (c[1] << 8) | c[2];
  const bgKey = key(bg);
  const colors = new Set();
  let off = 0;
  let total = 0;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 300));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const k = key(at(x, y));
      colors.add(k);
      total++;
      if (k !== bgKey) off++;
    }
  }
  return {
    width,
    height,
    colors: colors.size,
    offRatio: total ? off / total : 0,
    bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`,
  };
}

/* -------------------------------------------------------------- driver --- */
