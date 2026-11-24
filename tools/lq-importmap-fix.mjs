#!/usr/bin/env node
/*
 * Put the import map of a lesson back on the files it names.
 *
 * A lesson that draws with a library says where the library is:
 *
 *     <script type="importmap">
 *       { "imports": { "three": "./courseware/lq-603/.../three.module.js" } }
 *     </script>
 *
 * The library was saved under a different name than the one written
 * here, so the lesson looks for a file that is not there and the
 * drawing never starts.
 *
 * So the name is looked up against what is really on the disk: the
 * tail of the name is matched against the files of the lesson, and
 * the name is written as the path where the file was found.
 *
 *   node tools/lq-importmap-fix.mjs --check --roots mirror
 *   node tools/lq-importmap-fix.mjs --fix   --roots mirror
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes('--' + name);

const ROOTS = arg('roots', 'mirror').split(',').filter(Boolean);

/* The lesson a file belongs to, and the folder its files sit in. */
const lessonOf = (file) => {
  const at = file.indexOf('courseware/');
  if (at < 0) return null;
  const rest = file.slice(at + 'courseware/'.length);
  const slash = rest.indexOf('/');
  const head = slash < 0 ? rest : rest.slice(0, slash);
  return head.replace(/\.assets$/, '').replace(/\.html$/, '');
};

/* The folder that holds the files of a lesson. */
const filesOf = (file, lesson) => {
  const dir = path.dirname(file);
  const here = path.join(dir, `${lesson}.assets`);
  if (fs.existsSync(here)) return here;
  /* A lesson that came from another tree keeps its files beside it. */
  const parent = path.join(dir, 'courseware');
  if (fs.existsSync(parent)) {
    for (const name of fs.readdirSync(parent)) {
      if (name === `${lesson}.assets`) return path.join(parent, name);
    }
  }
  return null;
};

/* Every file of a lesson, as a path that starts at its folder. */
const listFiles = (root) => {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let names = [];
    try {
      names = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const n of names) {
      const full = path.join(dir, n.name);
      if (n.isDirectory()) stack.push(full);
      else out.push(full.slice(root.length + 1).split(path.sep).join('/'));
    }
  }
  return out;
};

/* Every page of the given folders. */
const pages = (roots) => {
  const out = [];
  for (const root of roots) {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let names = [];
      try {
        names = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const n of names) {
        const full = path.join(dir, n.name);
        if (n.isDirectory()) stack.push(full);
        else if (n.name.endsWith('.html')) out.push(full.split(path.sep).join('/'));
      }
    }
  }
  return out;
};

const files = pages(ROOTS);

let mended = 0;
let courses = 0;
const unfixed = [];

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const blocks = [...text.matchAll(/<script type="importmap">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) continue;
  const lesson = lessonOf(file);
  if (!lesson) continue;
  const folder = filesOf(file, lesson);
  if (!folder) continue;
  const onDisk = listFiles(folder);
  courses++;

  let out = text;
  let changed = false;

  for (const block of blocks) {
    const body = block[1];
    for (const m of body.matchAll(/"([^"]+)":\s*"([^"]+)"/g)) {
      const spec = m[2];
      if (!spec.startsWith('./') && !spec.startsWith('../')) continue;
      const wanted = spec.replace(/^\.\//, '');
      if (onDisk.includes(wanted)) continue;
      /*
       * The name is right except for one piece of it.  The tail of
       * the name is what names the file, so the file that has that
       * tail is the one the lesson meant.
       */
      const tail = wanted.split('/').slice(2).join('/');
      if (!tail) continue;
      const hits = onDisk.filter((p) => p.endsWith('/' + tail) || p === tail);
      if (hits.length !== 1) {
        if (hits.length > 1) unfixed.push(`${file}  ${spec}  (${hits.length} files have that tail)`);
        continue;
      }
      const fixed = './' + hits[0];
      out = out.replace('"' + spec + '"', '"' + fixed + '"');
      changed = true;
      console.log(`${file}\n  ${spec}\n  -> ${fixed}`);
    }
  }

  if (changed && out !== text) {
    mended++;
    if (has('fix')) fs.writeFileSync(file, out, 'utf8');
  }
}

console.log(
  `\n${has('fix') ? 'put back' : 'would put back'} ${mended} import maps in ${courses} lessons`
);
for (const u of unfixed) console.log(`  left alone: ${u}`);
