/* Find the strings in a lesson.
 *
 * A plain search for quotation marks is not enough: a mark inside a
 * regular expression or inside a comment is not a string, and a plain
 * search reads it as one.  That puts the reader out of step with the
 * program, and the strings that follow are counted wrong.
 *
 * So the program is read with a reader that knows JavaScript, and a
 * page is read for the values of its attributes and for the program
 * it holds.  Every string reported says where it stands, what
 * quotation mark holds it, and what it says.
 *
 * The reader of JavaScript is acorn, kept in tools/vendor.
 */
import * as acorn from './vendor/acorn.mjs';

/* The strings of a piece of JavaScript. */
const stringsOfJs = (text, from = 0, asExpression = false) => {
  const out = [];
  let ast;
  try {
    ast = asExpression
      ? acorn.parseExpressionAt(text, 0, { ecmaVersion: 'latest' })
      : acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch (e) {
    ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
  }
  const seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node.type === 'Literal' && typeof node.value === 'string') {
      if (!seen.has(node.start)) {
        seen.add(node.start);
        out.push({
          value: node.value,
          quote: text[node.start],
          raw: text.slice(node.start, node.end),
          start: node.start + from,
          end: node.end + from
        });
      }
      return;
    }
    if (node.type === 'TemplateElement') {
      const raw = text.slice(node.start, node.end);
      out.push({
        value: raw,
        quote: '`',
        raw,
        start: node.start + from,
        end: node.end + from,
        template: true
      });
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'type') {
        continue;
      }
      const value = node[key];
      if (value && typeof value === 'object') walk(value);
    }
  };
  walk(ast);
  out.sort((a, b) => a.start - b.start);
  return out;
};

/* The value of an attribute of a tag. */
const attributeValue = (text, i) => {
  const quote = text[i];
  let k = i + 1;
  while (k < text.length) {
    if (text[k] === quote) return { raw: text.slice(i, k + 1), end: k + 1 };
    k++;
  }
  return { raw: text.slice(i, k), end: k };
};

/* The strings of a page: the values of its attributes, and the program
 * it holds. */
const stringsOfHtml = (text) => {
  const out = [];
  let i = 0;
  const lower = text.toLowerCase();
  while (i < text.length) {
    const c = text[i];
    if (c !== '<') {
      i++;
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      i = close < 0 ? text.length : close + 3;
      continue;
    }
    if (lower.startsWith('<script', i)) {
      const open = text.indexOf('>', i);
      if (open < 0) break;
      const close = lower.indexOf('</script', open);
      const end = close < 0 ? text.length : close;
      try {
        for (const s of stringsOfJs(text.slice(open + 1, end), open + 1)) {
          out.push({ ...s, inScript: true });
        }
      } catch {
        /* a program that will not parse holds no strings we can trust */
      }
      i = close < 0 ? text.length : close;
      continue;
    }
    if (lower.startsWith('<style', i) || lower.startsWith('<textarea', i)) {
      const open = text.indexOf('>', i);
      const tag = lower.startsWith('<style', i) ? '</style' : '</textarea';
      const close = open < 0 ? -1 : lower.indexOf(tag, open);
      i = close < 0 ? text.length : close;
      continue;
    }
    /* A tag: the values of its attributes are strings. */
    let k = i + 1;
    while (k < text.length && text[k] !== '>') {
      const d = text[k];
      if (d === '"' || d === "'") {
        const s = attributeValue(text, k);
        out.push({
          value: s.raw.slice(1, -1),
          quote: d,
          raw: s.raw,
          start: k,
          end: s.end,
          inTag: true
        });
        k = s.end;
        continue;
      }
      k++;
    }
    i = k + 1;
  }
  out.sort((a, b) => a.start - b.start);
  return out;
};

/*
 * The strings of a lesson, and where they stand.
 *
 * A file of data is read as one expression, for the braces of a file
 * of data would otherwise read as the braces of a block of program.
 */
export const stringsOf = (text, kind) => {
  if (kind === 'html') return stringsOfHtml(text);
  if (kind === 'json') {
    try {
      return stringsOfJs(text, 0, true);
    } catch {
      try {
        return stringsOfJs(text, 0);
      } catch {
        return [];
      }
    }
  }
  return stringsOfJs(text);
};

export default stringsOf;
