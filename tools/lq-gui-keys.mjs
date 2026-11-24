#!/usr/bin/env node
/*
 * Keeps the Chinese labels of the control panels from breaking the courses.
 *
 * A control panel is told which member of an object it should draw:
 *
 *     gui.add(params, 'enableFog')
 *
 * The second argument is the *name of a member*, not a piece of text.  When
 * the translation turns that name into Chinese the panel no longer finds the
 * member and the course stops with
 *
 *     Object "[object Object]" has no property "启用雾"
 *
 * This walk finds those calls, renames the member of the object to the
 * Chinese label and rewrites the places that read the member.  The panel
 * then shows the Chinese label and the course keeps working.
 *
 *   node tools/lq-gui-keys.mjs --roots mirror
 *   node tools/lq-gui-keys.mjs --roots mirror --check
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ROOTS = arg('roots', 'mirror').split(',').map((s) => s.trim());
const CHECK = args.includes('--check');

const CN = /[㐀-鿿]/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/* The object literal that a name belongs to, with its braces matched. */
function objectOf(text, name) {
  const found = text.match(new RegExp(`(?:var\\s+)?${name}\\s*=\\s*\\{`));
  if (!found) return null;
  const open = text.indexOf('{', found.index);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return { start: open, end: i, body: text.slice(open, i + 1) };
    }
  }
  return null;
}

/*
 * The call is written in two ways: `gui.add(object, 'name')` and the
 * obfuscated `folder['add']( object, 'name' )`.  Both are found here.
 */
const CALL = /(?:\.add\(|]\s*\()\s*([A-Za-z_$][\w$]*)\s*,\s*'([^']*)'/g;

let touched = 0;
let problems = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    let text = fs.readFileSync(file, 'utf8');
    const original = text;
    const calls = [];
    CALL.lastIndex = 0;
    let m;
    while ((m = CALL.exec(text)) !== null) {
      const [, object, label] = m;
      if (!CN.test(label)) continue;
      calls.push({ object, label, index: m.index, length: m[0].length });
    }
    if (!calls.length) continue;

    for (const call of calls) {
      const holder = objectOf(text, call.object);
      if (!holder) continue;
      /* The member has to be there under some other name. */
      const members = [...holder.body.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map((x) => x[1]);
      const used = new Set(
        [...text.matchAll(new RegExp(`\\b${call.object}\\.([A-Za-z_$][\\w$]*)`, 'g'))].map((x) => x[1])
      );
      const candidates = members.filter((mem) => used.has(mem));
      if (candidates.length !== 1) continue;
      const member = candidates[0];

      if (CHECK) {
        console.log(`${file}: ${call.object}.${member} -> '${call.label}'`);
        problems += 1;
        continue;
      }

      /* The member of the object carries the Chinese label from now on. */
      const memberAt = holder.body.indexOf(member);
      const quoted = `'${call.label}'`;
      const body =
        holder.body.slice(0, memberAt) +
        quoted +
        holder.body.slice(memberAt + member.length);
      text = text.slice(0, holder.start) + body + text.slice(holder.end + 1);

      /* And every place that reads the member reads the Chinese name. */
      text = text.replace(
        new RegExp(`\\b${call.object}\\.${member}\\b`, 'g'),
        `${call.object}[${quoted}]`
      );

      touched += 1;
      console.log(`${file}: ${call.object}.${member} -> ${quoted}`);
    }

    if (!CHECK && text !== original) fs.writeFileSync(file, text);
  }
}

console.log(CHECK ? `found ${problems} panel name(s)` : `repaired ${touched} panel name(s)`);
