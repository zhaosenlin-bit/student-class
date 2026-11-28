#!/usr/bin/env node
/*
 * A few pieces of a course answer for themselves.
 *
 * The music laboratory hands its samples and its scores to the reader
 * through a fetch it puts in place of the browser's own.  It decides
 * whether a name is one of its own by looking at the way the name is
 * written: "audio/A0.mp3" is its own, "/audio/A0.mp3" is not.  On the
 * published site the names were written with the slash at the front,
 * because the platform answered for the root of the site.  A copy of
 * the library has no platform, so the slash at the front has to be
 * accepted as well — otherwise the piano asks the reader's own server
 * for its samples and hears nothing.
 *
 *   node tools/patch-course-runtime.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const DRY = args.includes('--dry');

const PATCHES = [
  {
    course: 'lq-1387',
    file: 'assets/_course_runtime/music-host.mjs',
    from:
      "const logical=raw.startsWith('/api/')||raw.startsWith('audio/')||raw.startsWith('midi/');",
    to:
      "const logical=raw.startsWith('/api/')||raw.startsWith('audio/')||raw.startsWith('/audio/')||raw.startsWith('midi/')||raw.startsWith('/midi/');",
    why: '样本与曲谱的名字前面带斜杠时，也要认得出来是自己家的东西',
  },
];

let done = 0;
for (const patch of PATCHES) {
  const file = path.join(ROOT, 'courseware', patch.course, patch.file);
  if (!fs.existsSync(file)) {
    console.log(`  ${patch.course}: 没有 ${patch.file}，跳过`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(patch.from)) {
    console.log(`  ${patch.course}: ${patch.file} 里已经没有了要改的那一句，跳过`);
    continue;
  }
  if (!DRY) {
    fs.writeFileSync(file, text.replace(patch.from, patch.to), 'utf8');
  }
  done++;
  console.log(`  ${patch.course}: ${patch.file} · ${patch.why}`);
}
console.log(`改好 ${done} 处。`);
