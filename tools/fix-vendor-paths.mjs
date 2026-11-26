#!/usr/bin/env node
/*
 * Puts back a few names that the packing moved.
 *
 * A good deal of the material is shared by many lessons, so it is
 * written down once, in one place, and the lessons are told where it
 * went.  Three of the modules that sit in the shared library point at
 * their neighbours with a name that was counted from the place they
 * used to live in; once they are put next to a lesson, that name
 * counts the wrong number of levels and lands nowhere.
 *
 * The table below says, for each of them, which name is wrong and
 * which name is right.  Nothing is guessed: every line was read off a
 * lesson and checked against the folder that holds the file.
 *
 *   node tools/fix-vendor-paths.mjs --root dist --dry
 *   node tools/fix-vendor-paths.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const ROOT = path.resolve(arg('root', 'dist'));
const DRY = args.includes('--dry');

/*
 * The three modules that are shared by several lessons, and the one
 * picture that one lesson reaches for from the shared folder.
 */
const RULES = [
  {
    files: [
      'courseware/game-block-turtle/assets/VolumetricFire.js',
      'courseware/game-block-turtle/assets/VolumetricFire4.js',
      'courseware/lq-657/assets/VolumetricFire.js',
      'courseware/lq-657/assets/VolumetricFire4.js',
      'courseware/lq-658/assets/VolumetricFire.js',
      'courseware/lq-658/assets/VolumetricFire4.js',
    ],
    from: '../jsm/three.module.js',
    to: '../../../shared/assets/jsm/three.module.js',
  },
  {
    files: [
      'courseware/lq-608/assets/courseware/c-zone/sodium-chloride-solution/src/scene.js',
    ],
    from: '../../../assets/courseware-prototypes/oxygen-preparation-lab-panorama-1912x823-v4.png',
    to: '../../../../../../../shared/assets/assets/courseware-prototypes/oxygen-preparation-lab-panorama-1912x823-v4.png',
  },
];

let patched = 0;
let missing = 0;

for (const rule of RULES) {
  for (const file of rule.files) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) {
      console.error('不在了：', file);
      missing++;
      continue;
    }
    const text = fs.readFileSync(abs, 'utf8');
    if (!text.includes(rule.from)) {
      console.error('名字不一样了：', file);
      missing++;
      continue;
    }
    if (text.includes(rule.to)) {
      console.log('已经对上了', file);
      continue;
    }
    if (!DRY) fs.writeFileSync(abs, text.split(rule.from).join(rule.to), 'utf8');
    console.log(`${DRY ? '会改' : '已改'} ${file}`);
    patched++;
  }
}

console.log(`${DRY ? '可以改' : '已改'} ${patched} 处，对不上的 ${missing} 处`);
process.exit(missing ? 1 : 0);
