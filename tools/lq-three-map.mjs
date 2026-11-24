#!/usr/bin/env node
/*
 * The name of three.js, and where it is.
 *
 * An add-on of three.js asks for three.js by its plain name:
 *
 *     import { Vector3 } from 'three';
 *
 * A browser cannot find a name like that on its own.  The page has
 * to say which file the name stands for, and it says so in an import
 * map.  A lesson that has none never starts its drawing.
 *
 * So the map is written for the lessons that need it, and the name
 * is pointed at the very copy of three.js the lesson itself uses, so
 * that there is one copy and not two.
 *
 *   node tools/lq-three-map.mjs --check --roots mirror
 *   node tools/lq-three-map.mjs --fix   --roots mirror
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkScripts } from './lq-script-check.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes('--' + name);

const ROOTS = arg('roots', 'mirror').split(',').filter(Boolean);

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
        if (n.isDirectory()) {
          if (/\.assets$/.test(n.name)) continue;
          stack.push(full);
        } else if (n.name.endsWith('.html')) out.push(full.split(path.sep).join('/'));
      }
    }
  }
  return out;
};

/* The modules a page brings in. */
const SPEC = /^[ \t]*(?:import|export)\s[\s\S]{0,240}?from\s*['"]([^'"\n]{1,200})['"]/gm;
const BARE = /^[ \t]*import\s*['"]([^'"\n]{1,200})['"]/gm;

const moduleOf = (text) => {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    if (!/type\s*=\s*["']module["']/.test(m[1])) continue;
    out.push({ at: m.index, body: m[2] });
  }
  return out;
};

const MAP = `<script type="importmap">
{
  "imports": {
    "three": "@THREE@"
  }
}
</script>
`;

/*
 * The build of three.js that is written as a module hands out its parts by
 * name and has no default.  A lesson that asks for it by default gets
 *
 *     The requested module 'three.module.js' does not provide an export
 *     named 'default'
 *
 * so the lesson asks for the whole build as a namespace instead.
 */
const DEFAULT_IMPORT = /import\s+([A-Za-z_$][\w$]*)\s+from\s*(['"])([^'"]*three\.module\.js)\2/g;

let touched = 0;
const skipped = [];

for (const file of pages(ROOTS)) {
  let text = fs.readFileSync(file, 'utf8');
  let out = text.replace(DEFAULT_IMPORT, 'import * as $1 from $2$3$2');
  if (out !== text) {
    touched++;
    console.log(`${file}\n  three.js is taken as a whole`);
    if (has('fix')) fs.writeFileSync(file, out, 'utf8');
    text = out;
  }
  const modules = moduleOf(text);
  if (!modules.length) continue;

  const specs = [];
  for (const m of modules) {
    for (const s of [...m.body.matchAll(SPEC), ...m.body.matchAll(BARE)]) specs.push(s[1]);
  }

  /* An add-on asks for three.js by its plain name. */
  const wantsPlain = specs.some((s) => s === 'three');
  const bringsAddon = specs.some((s) => /examples\/jsm\//.test(s));
  if (!wantsPlain && !bringsAddon) continue;
  if (/<script[^>]+type\s*=\s*["']importmap["']/i.test(text)) continue;

  /* The copy of three.js the lesson itself uses. */
  const core = specs.find((s) => /(^|\/)three(\.module)?\.js$/.test(s) && !s.startsWith('/api/'));
  if (!core) {
    skipped.push(`${file}  (no copy of three.js of its own)`);
    continue;
  }

  out = text;
  /* A lesson that takes the old build cannot be a module. */
  let theCore = core;
  if (/three\.js$/.test(core) && !/three\.module\.js$/.test(core)) {
    theCore = core.replace(/three\.js$/, 'three.module.js');
    out = out.split("'" + core + "'").join("'" + theCore + "'");
    out = out.split('"' + core + '"').join('"' + theCore + '"');
  }

  const map = MAP.replace('@THREE@', theCore);
  const first = modules[0].at;
  out = out.slice(0, first) + map + out.slice(first);

  const sound = checkScripts(out);
  if (!sound.ok) {
    skipped.push(`${file}  (${sound.error})`);
    continue;
  }
  touched++;
  console.log(`${file}\n  three.js is ${theCore}`);
  if (has('fix')) fs.writeFileSync(file, out, 'utf8');
}

console.log(`\n${has('fix') ? 'wrote' : 'would write'} ${touched} import maps`);
for (const s of skipped) console.log('  left alone:', s);
