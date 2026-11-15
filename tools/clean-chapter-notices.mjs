#!/usr/bin/env node
/*
 * Take the stale status banner out of the chapter documents.
 *
 * The platform writes the runtime's own notice into the document it
 * sends, so a chapter that was captured while its session was broken
 * carries a banner that says the save was never confirmed.  The runtime
 * creates a fresh notice when it starts, so the captured one only ever
 * shows a message that is no longer true.
 *
 *   node tools/clean-chapter-notices.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIRRORS = [
  path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware'),
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
];

/* The notice the platform writes in: a fixed panel at the lower left. */
const NOTICE =
  /<aside[^>]*role="status"[^>]*style="[^"]*position:\s*fixed;\s*bottom:\s*12px[^"]*"[^>]*>[\s\S]*?<\/aside>/gi;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

for (const root of MIRRORS) {
  if (!fs.existsSync(root)) continue;
  for (const dir of fs.readdirSync(root).filter((n) => n.endsWith('.assets'))) {
    const full = path.join(root, dir);
    for (const file of walk(full)) {
      if (!/\.html?$/i.test(file)) continue;
      if (file.replace(/\\/g, '/').includes('/_course_runtime/')) continue;
      const html = fs.readFileSync(file, 'utf8');
      if (!NOTICE.test(html) && !html.includes('data-course-adapter-state="TIMEOUT"')) continue;
      NOTICE.lastIndex = 0;
      let out = html.replace(NOTICE, '');
      out = out.replace(/data-course-adapter-state="TIMEOUT"/g, 'data-course-adapter-state="initializing"');
      if (out === html) continue;
      fs.writeFileSync(file, out);
      console.log(`${path.relative(ROOT, file).replace(/\\/g, '/')}: 已清掉残留提示`);
    }
  }
}
