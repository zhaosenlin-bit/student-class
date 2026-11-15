/*
 * Which controls in the shell are wired to nothing.
 *
 * The published shell carried buttons for the parts that were removed
 * (the scene settings of the old home page, the account button). A
 * button that does nothing is worse than no button, so this lists them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'mirror', 'leqixiang', 'site');

const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const scripts = fs
  .readdirSync(SITE)
  .filter((f) => f.endsWith('.js'))
  .map((f) => fs.readFileSync(path.join(SITE, f), 'utf8'))
  .join('\n');

const ids = [...html.matchAll(/<button[^>]*id="([a-z0-9-]+)"/g)].map((m) => m[1]);
for (const id of ids) {
  const used =
    scripts.includes(`#${id}`) || scripts.includes(`'${id}'`) || scripts.includes(`"${id}"`);
  console.log(`${used ? 'ok  ' : 'DEAD'}  #${id}`);
}

const dataActions = [...new Set([...html.matchAll(/data-action="([a-z-]+)"/g)].map((m) => m[1]))];
for (const action of dataActions) {
  const used = scripts.includes(`'${action}'`) || scripts.includes(`"${action}"`);
  console.log(`${used ? 'ok  ' : 'DEAD'}  data-action="${action}"`);
}
