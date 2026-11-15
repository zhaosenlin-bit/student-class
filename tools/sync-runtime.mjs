#!/usr/bin/env node
/*
 * Give every chapter course the whole host-side runtime.
 *
 * The runtime of a chapter course is a set of small modules that the
 * platform hands out per course.  Some of them are only shipped with a
 * course that happens to be complete, and a course whose folder misses
 * one of them cannot talk to its own chapter pages.  The modules are
 * byte for byte the same in every course, so a missing one is copied
 * from a course that has it.
 *
 *   node tools/sync-runtime.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const SRC = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');

/* The modules the host side of the handshake needs. */
const NEEDED = ['reviewed-session.mjs', 'local-store.mjs'];

const courses = fs
  .readdirSync(CW)
  .filter((n) => n.endsWith('.assets'))
  .filter((n) => fs.existsSync(path.join(CW, n, '_course_runtime', 'adapter.json')));

/* Find a course that has each module. */
const donor = new Map();
for (const name of courses) {
  for (const file of NEEDED) {
    const from = path.join(CW, name, '_course_runtime', file);
    if (!donor.has(file) && fs.existsSync(from) && fs.statSync(from).size > 0) {
      donor.set(file, from);
    }
  }
}

for (const file of NEEDED) {
  if (!donor.has(file)) console.log(`没有任何课程带着 ${file}`);
}

let copied = 0;
for (const name of courses) {
  const dir = path.join(CW, name, '_course_runtime');
  for (const file of NEEDED) {
    const target = path.join(dir, file);
    if (fs.existsSync(target) && fs.statSync(target).size > 0) continue;
    const from = donor.get(file);
    if (!from) continue;
    fs.copyFileSync(from, target);
    copied++;
    console.log(`${name}  补上 ${file}`);
  }
}

/* Keep the source mirror in step. */
for (const name of courses) {
  const dir = path.join(CW, name, '_course_runtime');
  /* The source mirror keeps the plain number; the built one prefixes it. */
  const srcName = name.replace(/^afe-/, '');
  const srcDir = path.join(SRC, srcName, '_course_runtime');
  for (const file of NEEDED) {
    const from = path.join(dir, file);
    const to = path.join(srcDir, file);
    if (!fs.existsSync(from)) continue;
    if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

console.log(`\n${courses.length} 门章节课，补齐 ${copied} 个运行时模块`);
