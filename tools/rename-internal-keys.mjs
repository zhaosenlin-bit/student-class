#!/usr/bin/env node
/*
 * The works that were mirrored still carry the name of the house they
 * came from inside their own bookkeeping: a schema of a saved session,
 * a key of a chapter, a name of a protocol.  A learner never reads any
 * of it, but the library is ours and it should not carry somebody
 * else's name around.
 *
 * These names are contracts: the work writes one half and the page that
 * hosts it writes the other.  Both halves are renamed in one go, so the
 * handshake still works.
 *
 *   node tools/rename-internal-keys.mjs          # write
 *   node tools/rename-internal-keys.mjs --check  # only report
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const NAMES = [
  'turing-reviewed-runtime/v1',
  'turing-music-backup/v1',
  'turing.course.runtime.v1',
  'turing.longMarch.save.v1',
  'turing.longMarch.playback.v1',
  'turing-pk180-banks-v1',
  'turing-pk180-banks',
  'turing-long-march-save-v1',
  'turing.longMarch',
  'turing.reviewed',
  'turing.music',
];

const to = (name) => name.replace(/turing/g, 'leqixiang');

/* The globals the works hang on their own window. */
const GLOBALS = [
  ['TuringCourseLinks', 'LeqixiangCourseLinks'],
  ['TuringPlacement', 'LeqixiangPlacement'],
  ['TuringPointsWallet', 'LeqixiangPointsWallet'],
  ['TURING', 'LEQIXIANG'],
];

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(?:html?|js|mjs|css|json)$/i.test(e.name)) {
      /* A mirrored library from a public CDN is left exactly as it is. */
      if (full.split(path.sep).includes('_ext')) continue;
      out.push(full);
    }
  }
  return out;
};

/* The mirror of the works, and the shell that hosts them. */
const roots = [
  path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware'),
  path.join(ROOT, 'mirror', 'xbjiaoyu', 'courseware'),
  path.join(ROOT, 'mirror', 'leqixiang', 'site'),
];

let changed = 0;
let hits = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8');
    if (!/turing/i.test(text)) continue;
    let out = text;
    for (const name of NAMES) out = out.split(name).join(to(name));
    for (const [from, into] of GLOBALS) out = out.split(from).join(into);
    /* Any other shape of the same name, such as a variable name. */
    out = out.replace(/\bturing(?=[./_-])/gi, 'leqixiang');
    if (out === text) continue;
    changed++;
    const count = (text.match(/turing/gi) || []).length;
    hits += count;
    console.log(`${path.relative(ROOT, file).replace(/\\/g, '/')}  ${count}`);
    if (!CHECK) fs.writeFileSync(file, out, 'utf8');
  }
}

console.log(
  `${CHECK ? '（检查模式）' : ''}改了 ${changed} 个文件，${hits} 处旧名`
);
