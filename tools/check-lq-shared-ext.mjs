#!/usr/bin/env node
/*
 * Is the shared folder of public files whole?
 *
 * The lessons load scripts, stylesheets and pictures from content
 * delivery networks.  Those files are kept once in a shared folder, and
 * the server hands them out from there.  A folder is left over when no
 * lesson asks for it any more — but a folder that a lesson still asks for
 * must stay, or the lesson loses half of itself.
 *
 * This says which host folders the lessons still name and which folders
 * are left over, so the build's tidying can be checked without running
 * the whole build.
 *
 *   node tools/check-lq-shared-ext.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const BODIES = path.join(LQ, 'courseware');
const SHARED = path.join(LQ, '_shared-ext');
const SOURCE = path.join(ROOT, 'mirror', '3jcn', 'shared');

const hosts = fs
  .readdirSync(SHARED, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

/*
 * Some lessons build the address while the page runs — the address of an
 * avatar, for one, is put together out of pieces that only read as a name
 * once they are joined.  So the name of the host is looked for anywhere in
 * the lesson, not only in a written-out address.
 */
const asked = new Set();
for (const entry of fs.readdirSync(BODIES, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const text = fs.readFileSync(path.join(BODIES, entry.name), 'utf8');
  for (const host of hosts) {
    if (text.includes(host)) asked.add(host);
  }
}

const inSource = (name) => fs.existsSync(path.join(SOURCE, name));

const kept = hosts.filter((h) => inSource(h) || asked.has(h));
const leftOver = hosts.filter((h) => !inSource(h) && !asked.has(h));

console.log(`shared folders on disk : ${hosts.length}`);
console.log(`asked for by a lesson  : ${asked.size}`);
console.log(`kept by the build      : ${kept.length}`);
console.log(`left over, may go     : ${leftOver.length}`);
if (leftOver.length) console.log('  ' + leftOver.join('\n  '));

/*
 * Every host folder that a lesson names has to be there with something in
 * it, or the lesson asks for a file that is not on this machine.
 */
const empty = [];
for (const host of hosts) {
  const dir = path.join(SHARED, host);
  const count = fs
    .readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile()).length;
  if (!count) empty.push(host);
}
if (empty.length) {
  console.log('\nempty folders: ' + empty.join(', '));
  process.exit(1);
}
console.log('\n绿灯：every folder the lessons ask for is here, and none of them is empty.');
