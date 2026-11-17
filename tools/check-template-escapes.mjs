/* Find template literals whose backslashes will be eaten.

   In a plain template literal a backslash only survives when it introduces
   one of the escapes the template syntax knows. Everything else loses it:
   `\s` becomes the letter s, `\d` becomes d, and `\|` becomes |. When the
   literal holds a regular expression that is later evaluated in a browser,
   the pattern silently changes meaning — `/\s+/g` turns into `/s+/g` and
   every "s" on the page is replaced by a space, while `/a\|b/` turns into
   `/a|b/` and starts matching something else entirely.

   String.raw keeps the backslash and is safe.

   Run: node tools/check-template-escapes.mjs          report only
        node tools/check-template-escapes.mjs --fix    repair in place
*/
import fs from 'node:fs';
import path from 'node:path';

const TOOLS = path.resolve('tools');
const FIX = process.argv.includes('--fix');

/* A backslash before one of these does not survive the template literal, so
   the character after it would end up standing alone. */
const LOST = new Set([
  's', 'd', 'w', 'b', 'S', 'D', 'W', // character classes and word boundary
  '.', '*', '+', '?', '^', '$', '(', ')', '[', ']', '{', '}', '|', '/', '-',
]);

/* Words after which a slash starts a regular expression rather than a
   division or a comment. */
const REGEX_AFTER = new Set([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%',
  '^', '~', '<', '>', '=>', '===', '!==', '==', '!=', '<=', '>=', '&&', '||',
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'do',
  'else', 'case', 'yield', 'await',
]);

const templates = [];

function skipString(source, i) {
  const quote = source[i];
  i += 1;
  while (i < source.length && source[i] !== quote) {
    if (source[i] === '\\') i += 1;
    i += 1;
  }
  return i + 1;
}

function skipRegex(source, i) {
  i += 1;
  let inClass = false;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;
    else if (ch === '/' && !inClass) break;
    else if (ch === '\n') break;
    i += 1;
  }
  i += 1;
  while (i < source.length && /[a-z]/.test(source[i])) i += 1;
  return i;
}

/* Read one template literal. Returns the index after its closing backtick and
   records the literal text of every chunk, with the offset it starts at. */
function readTemplate(source, start) {
  const chunks = [];
  let i = start + 1;
  let chunkStart = i;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '`') break;
    if (ch === '$' && source[i + 1] === '{') {
      chunks.push({ at: chunkStart, text: source.slice(chunkStart, i) });
      i = codeEnd(source, i + 2, true) + 1;
      chunkStart = i;
      continue;
    }
    i += 1;
  }
  chunks.push({ at: chunkStart, text: source.slice(chunkStart, i) });
  templates.push({
    start,
    chunks,
    raw: source.slice(Math.max(0, start - 10), start) === 'String.raw',
  });
  return i + 1;
}

/* Scan code until the end of the file, or — when stopAtBrace is set — until
   the closing brace of the block that was entered. */
function codeEnd(source, i, stopAtBrace) {
  let depth = 0;
  let last = '';
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      i = skipString(source, i);
      last = 'literal';
      continue;
    }
    if (ch === '`') {
      i = readTemplate(source, i);
      last = 'literal';
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    if (ch === '/' && (last === '' || REGEX_AFTER.has(last))) {
      i = skipRegex(source, i);
      last = 'literal';
      continue;
    }
    if (ch === '{') {
      depth += 1;
      i += 1;
      last = '{';
      continue;
    }
    if (ch === '}') {
      if (depth === 0 && stopAtBrace) return i;
      depth -= 1;
      i += 1;
      last = '}';
      continue;
    }
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    let word = ch;
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < source.length && /[A-Za-z0-9_$]/.test(source[j])) j += 1;
      word = source.slice(i, j);
      i = j;
    } else {
      i += 1;
      /* A slash is not swallowed here: it is the one character that can
         either continue an operator or start a regular expression. */
      while (i < source.length && /[=!<>+\-*%&|^]/.test(source[i])) {
        word += source[i];
        i += 1;
      }
    }
    last = word;
  }
  return i;
}

let findings = 0;
for (const name of fs.readdirSync(TOOLS).filter((f) => f.endsWith('.mjs'))) {
  const file = path.join(TOOLS, name);
  const original = fs.readFileSync(file, 'utf8');
  templates.length = 0;
  codeEnd(original, 0, false);
  let text = original;
  /* Later edits shift the earlier offsets, so repair from the back. */
  const repairs = [];

  for (const tpl of templates) {
    if (tpl.raw) continue;
    for (const chunk of tpl.chunks) {
      const body = chunk.text;
      for (let k = 0; k < body.length - 1; k += 1) {
        if (body[k] !== '\\') continue;
        /* Two backslashes already stand for one backslash, so they are fine. */
        if (body[k + 1] === '\\') {
          k += 1;
          continue;
        }
        if (!LOST.has(body[k + 1])) continue;
        repairs.push({ at: chunk.at + k, next: body[k + 1] });
      }
    }
  }
  if (!repairs.length) continue;

  for (const r of repairs.sort((a, b) => b.at - a.at)) {
    findings += 1;
    if (FIX) {
      text = text.slice(0, r.at) + '\\' + text.slice(r.at);
    } else {
      const line = original.slice(0, r.at).split('\n').length;
      console.log(`${name}:${line}  \\${r.next}`);
    }
  }
  if (FIX) fs.writeFileSync(file, text);
}

if (findings === 0) {
  console.log('模板字面量的反斜杠都对');
} else if (FIX) {
  console.log(`修了 ${findings} 处会被吃掉的反斜杠`);
} else {
  console.log(`有 ${findings} 处会被吃掉的反斜杠（加 --fix 可以自动修）`);
}
process.exit(findings ? 1 : 0);
