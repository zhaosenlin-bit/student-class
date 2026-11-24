#!/usr/bin/env node
/*
 * Reads the shell of the library the way the browser will.
 *
 * `node --check` on a .js file is a soft check: it accepts a file that
 * the browser would refuse to parse as a module.  The shell is a set of
 * modules, so every one of them is copied to a .mjs file and read
 * again, where the check is the strict one.
 *
 *   node tools/check-lq-site-syntax.mjs [--dir mirror/leqixiang/site]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DIR = path.resolve(ROOT, arg('dir', 'mirror/leqixiang/site'));

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.js')) out.push(full);
  }
  return out;
};

const files = walk(DIR);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'lq-site-syntax-'));
const broken = [];

for (const file of files) {
  const copy = path.join(scratch, path.relative(DIR, file).replace(/[\\/]/g, '__') + '.mjs');
  fs.writeFileSync(copy, fs.readFileSync(file, 'utf8'));
  try {
    execFileSync(process.execPath, ['--check', copy], { stdio: 'pipe' });
  } catch (e) {
    broken.push({
      file: path.relative(ROOT, file),
      error: String(e.stderr || e.message).split('\n').slice(0, 4).join(' ').slice(0, 220),
    });
  }
}

fs.rmSync(scratch, { recursive: true, force: true });

console.log(`检查了 ${files.length} 个页面脚本，${broken.length} 个读不懂`);
for (const b of broken) console.log(`  ${b.file}: ${b.error}`);
if (broken.length) process.exit(1);
