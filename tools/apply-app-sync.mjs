#!/usr/bin/env node
/*
 * Put the "stay in step with the library" patch onto the shell that is
 * running right now, without rebuilding the whole site.
 *
 * The build writes the same words into the shell it produces; this tool
 * writes them into the shell on disk, so a running library picks the fix
 * up at once.  Both go through tools/lq-app-sync.mjs, so the two can
 * never say different things.
 *
 *   node tools/apply-app-sync.mjs
 *   node tools/apply-app-sync.mjs --check      # report only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchAppSync } from './lq-app-sync.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'mirror', 'leqixiang', 'site', 'app.js');

const check = process.argv.includes('--check');
const before = fs.readFileSync(TARGET, 'utf8');

if (before.includes('async function syncCatalog(){')) {
  console.log('the shell already carries the patch');
  process.exit(0);
}

const after = patchAppSync(before);
if (check) {
  console.log('the shell needs the patch');
  process.exit(0);
}

fs.writeFileSync(TARGET, after);
console.log('patched', path.relative(ROOT, TARGET));
