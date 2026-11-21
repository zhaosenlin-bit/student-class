#!/usr/bin/env node
/*
 * Take a course off the disk as well as out of the catalogue.
 *
 * A course that is not in the catalogue is already invisible; this also
 * removes its body and its material from the build folder and from the
 * source mirror, so a later build does not bring it back.
 *
 *   node tools/remove-lq-course-files.mjs afe-398 afe-399
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ids = process.argv.slice(2).filter((a) => /^afe-?\d+$/.test(a) || /^\d+$/.test(a));
if (!ids.length) {
  console.log("用法：node tools/remove-lq-course-files.mjs afe-398 afe-399");
  process.exit(0);
}

let bytes = 0;
const rm = (target) => {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) rm(path.join(target, entry));
    bytes += stat.size;
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`- ${path.relative(ROOT, target)}/`);
  } else {
    bytes += stat.size;
    fs.rmSync(target, { force: true });
    console.log(`- ${path.relative(ROOT, target)}`);
  }
};

for (const raw of ids) {
  const id = raw.startsWith("afe-") ? raw.slice(4) : raw;
  rm(path.join(ROOT, "mirror", "leqixiang", "courseware", `afe-${id}.html`));
  rm(path.join(ROOT, "mirror", "leqixiang", "courseware", `afe-${id}.assets`));
  rm(path.join(ROOT, "mirror", "aifunengjiaoyu", "courseware", `${id}.html`));
  rm(path.join(ROOT, "mirror", "aifunengjiaoyu", "courseware", `${id}.assets`));
}

console.log(`\n清掉 ${(bytes / 1048576).toFixed(1)} MB`);
