/*
 * Collect the Chinese wording of a key from every Chinese build we
 * already have, so that the shared parts of a simulation do not have
 * to be written twice.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readStrings } from './lab-physics-strings.mjs';

const CW = path.resolve('mirror/lab-physics/courseware');

/* The wrap the Chinese builds put around their text. */
const LRE = '\u202a';
const PDF = '\u202c';
const RLE = '\u202b';

export const unwrap = (s) =>
  s.replace(new RegExp(`^${LRE}|${RLE}`), '').replace(new RegExp(`${PDF}$`), '');

const dict = new Map();
const conflicts = new Map();

for (const f of fs.readdirSync(CW)) {
  if (!f.endsWith('.html')) continue;
  const r = readStrings(path.join(CW, f));
  if (!r || !r.table || !r.table.zh_CN) continue;
  for (const [key, value] of Object.entries(r.table.zh_CN)) {
    const zh = unwrap(String(value));
    if (!zh || !/[\u3400-\u9fff]/.test(zh)) continue;
    if (dict.has(key) && dict.get(key) !== zh) {
      conflicts.set(key, (conflicts.get(key) || new Set()).add(zh));
    }
    dict.set(key, zh);
  }
}

if (process.argv[1] && process.argv[1].endsWith('lab-physics-glossary.mjs')) {
  const out = {};
  for (const [k, v] of [...dict].sort()) out[k] = v;
  fs.writeFileSync('work/lab-physics-glossary.json', JSON.stringify(out, null, 1));
  console.log('keys with Chinese wording:', dict.size);
  console.log('conflicts:', conflicts.size);
  for (const [k, set] of conflicts) console.log('  ', k, [...set].join(' / '));
}
