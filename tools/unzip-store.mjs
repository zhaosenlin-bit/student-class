/* Unpacks the store-only zip the local server hands out. */
import fs from 'node:fs';
import path from 'node:path';

const zipFile = process.argv[2];
const outDir = process.argv[3] || 'recon/scratch/dl-test';
fs.rmSync(outDir, { recursive: true, force: true });

const buf = fs.readFileSync(zipFile);
let offset = 0;
let count = 0;
while (offset + 4 <= buf.length && buf.readUInt32LE(offset) === 0x04034b50) {
  const method = buf.readUInt16LE(offset + 8);
  const size = buf.readUInt32LE(offset + 18);
  const nameLen = buf.readUInt16LE(offset + 26);
  const extraLen = buf.readUInt16LE(offset + 28);
  const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
  const start = offset + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + size);
  if (method !== 0) throw new Error('compressed entry ' + name);
  const out = path.join(outDir, name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data);
  count++;
  offset = start + size;
}
console.log('extracted', count, 'entries to', outDir);
