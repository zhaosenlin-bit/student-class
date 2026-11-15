/* Fetch a course as a zip and look inside it. */
import fs from 'node:fs';
import zlib from 'node:zlib';

const PORT = Number(process.env.LQ_PORT || 4173);

/* Read the names out of the zip's central directory. */
const namesOf = (buffer) => {
  const names = [];
  for (let i = 0; i < buffer.length - 46; i++) {
    if (buffer.readUInt32LE(i) !== 0x02014b50) continue;
    const nameLen = buffer.readUInt16LE(i + 28);
    names.push(buffer.slice(i + 46, i + 46 + nameLen).toString('utf8'));
  }
  return names;
};

for (const id of process.argv.slice(2)) {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/downloads/file/${id}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const isZip = buffer.slice(0, 2).toString() === 'PK';
  console.log(`${res.status} ${String(buffer.length).padStart(9)}  zip=${isZip}  ${id}`);
  if (!isZip) continue;

  const list = namesOf(buffer);
  console.log('   entries:', list.length);
  for (const n of list) console.log('      ', n);
}
