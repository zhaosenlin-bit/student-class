#!/usr/bin/env node
/*
 * Makes a lesson safe when it reaches for an element the page does not
 * have.
 *
 * Some mirrored lessons were cut from a larger program: the page kept
 * the drawing code and the answer sheet, but the answer sheet's own
 * frame never came with it.  The leftover code then asks for a name
 * that is not on the page, and the lesson stops with
 *
 *     Cannot read properties of null (reading 'style')
 *
 * the moment a student presses a button.
 *
 * This walk finds every such name and wraps the use of it in a guard,
 * so the lesson keeps going instead of throwing.  A name that is not
 * on the page and cannot be guarded is reported and left alone.
 *
 *   node tools/lq-safe-el.mjs --roots mirror
 *   node tools/lq-safe-el.mjs --roots mirror --dry
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ROOTS = arg('roots', 'mirror').split(',').map((s) => s.trim());
const DRY = args.includes('--dry');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const HAVE = /\sid\s*=\s*['"]([^'"]+)['"]/g;
const ASK = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;

/*
 * A lesson that builds its own page can name an element that only comes
 * into being when the page is built.  Those names are not missing, and
 * they are left alone.
 */
const BUILDS = [/createElement\(/, /insertAdjacentHTML\(/];

/* A name that is already behind a test needs no guard. */
const GUARDED = new RegExp(`getElementById\\(\\s*['"][^'"]+['"]\\s*\\)\\s*&&\\s*$`);

let changed = 0;
let reported = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const original = fs.readFileSync(file, 'utf8');
    const have = new Set([...original.matchAll(HAVE)].map((m) => m[1]));
    const asked = new Set([...original.matchAll(ASK)].map((m) => m[1]));
    if (!asked.size) continue;
    if (BUILDS.some((b) => b.test(original))) continue;

    const missing = [...asked].filter((id) => !have.has(id));
    if (!missing.length) continue;

    let text = original;
    const notes = [];

    for (const id of missing) {
      const call = `document.getElementById("${id}")`;
      const esc = call.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      /* A style write or a value read can be guarded on the spot. */
      const pattern = new RegExp(
        `${esc}\\s*\\.\\s*(style\\.[A-Za-z]+|value\\b|innerHTML|textContent)`,
        'g'
      );
      let hit = 0;
      text = text.replace(pattern, (whole, what) => {
        hit++;
        const prop = what.replace(/\s+/g, '');
        const spare =
          prop.startsWith('style')
            ? '{style:{}}'
            : prop === 'value'
              ? '{value:""}'
              : `{${prop}:""}`;
        return `(${call}||${spare}).${prop}`;
      });
      if (hit) notes.push(`${id} (${hit})`);

      /*
       * Any other use of the name cannot be guarded without knowing what
       * the lesson meant, so it is reported and left for a human.
       */
      const left = [
        ...text.matchAll(new RegExp(`${esc}\\s*\\.\\s*([A-Za-z_$][\\w$]*)`, 'g')),
      ]
        .map((m) => m[1])
        .filter(
          (prop) => !['style', 'value', 'innerHTML', 'textContent'].includes(prop)
        );
      for (const prop of new Set(left)) {
        reported++;
        console.log(`  ! ${file}: ${id} is used as .${prop}, which is not guarded`);
      }
    }

    if (text !== original) {
      changed++;
      if (!DRY) fs.writeFileSync(file, text, 'utf8');
      console.log(`${DRY ? 'would change' : 'guarded'} ${file}: ${notes.join(', ')}`);
    }
  }
}

console.log(`\n${changed} file(s) ${DRY ? 'would change' : 'changed'}${reported ? `, ${reported} to look at` : ''}`);
