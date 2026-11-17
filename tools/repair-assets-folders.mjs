#!/usr/bin/env node
/*
 * The doubled asset folders.
 *
 * While the library was mirrored, the files a lesson loads from a
 * public library were written into a folder whose name was built by
 * adding ".assets" to a name that already ended in ".assets".  The
 * result was "1302.assets.assets" beside "1302.assets", and the build
 * — which reads "<lesson>.assets" — never saw them.  Two hundred and
 * fifty lessons therefore went into the library without the
 * libraries they load, and the repository carried a second copy of
 * everything that was there twice.
 *
 * This puts the odd folder back where it belongs: the files that are
 * missing are copied over, the files that are already there are
 * checked byte for byte, and only then is the double removed.
 *
 *   node tools/repair-assets-folders.mjs           # repair
 *   node tools/repair-assets-folders.mjs --check   # only report
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const MIRRORS = ['aifunengjiaoyu', 'xbjiaoyu'];

const hash = (file) =>
  crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');

const listFiles = (dir, rel = '', out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) listFiles(f, r, out);
    else out.push(r);
  }
  return out;
};

let renamed = 0;
let copied = 0;
let same = 0;
let bytes = 0;

for (const mirror of MIRRORS) {
  const folder = path.join(ROOT, 'mirror', mirror, 'courseware');
  if (!fs.existsSync(folder)) continue;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('.assets.assets')) continue;
    const odd = path.join(folder, entry.name);
    const twin = path.join(folder, entry.name.replace(/\.assets\.assets$/, '.assets'));

    if (!fs.existsSync(twin)) {
      /* The whole folder was doubled — it is the only copy. */
      if (!CHECK) fs.renameSync(odd, twin);
      renamed++;
      continue;
    }

    /* Files that are only in the odd folder are copied over. */
    for (const rel of listFiles(odd)) {
      const from = path.join(odd, rel);
      const to = path.join(twin, rel);
      if (!fs.existsSync(to)) {
        if (!CHECK) {
          fs.mkdirSync(path.dirname(to), { recursive: true });
          fs.copyFileSync(from, to);
        }
        copied++;
        bytes += fs.statSync(from).size;
        continue;
      }
      if (fs.statSync(from).size !== fs.statSync(to).size) {
        if (!CHECK) {
          fs.mkdirSync(path.dirname(to), { recursive: true });
          fs.copyFileSync(from, to);
        }
        copied++;
        bytes += fs.statSync(from).size;
        continue;
      }
      same++;
    }

    /* The double is only dropped when every one of its files is
       accounted for on the other side, byte for byte. */
    if (!CHECK) {
      let identical = true;
      for (const rel of listFiles(odd)) {
        const from = path.join(odd, rel);
        const to = path.join(twin, rel);
        if (!fs.existsSync(to) || hash(from) !== hash(to)) {
          identical = false;
          break;
        }
      }
      if (identical) fs.rmSync(odd, { recursive: true, force: true });
      else console.log('  有文件对不上，先留着：' + path.relative(ROOT, odd));
    }
  }
}

console.log(CHECK ? '（检查模式，没有写入）' : '');
console.log(`整个文件夹都叫错了名字的：${renamed} 门`);
console.log(`补进正确位置的文件：${copied} 份（${(bytes / 1048576).toFixed(1)} MB）`);
console.log(`本来就一模一样的：${same} 份`);
