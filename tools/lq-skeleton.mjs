/*
 * The shape of a lesson with its wording taken out.
 *
 * The wording a reader sees and the words the program uses for its
 * own parts are strings.  Take the words out and leave a mark where
 * each string stood, and two lessons that differ only in their
 * wording have the same shape.
 *
 * A block of script that does not read well holds no string that can
 * be trusted, so the whole block is taken out as one piece.  Two
 * lessons then have the same shape even when the data in such a
 * block was given a Chinese.
 */
import * as acorn from './vendor/acorn.mjs';
import { stringsOf } from './lq-js-strings.mjs';

const MARK = '\u00a4';

/* Whether a piece of program reads well. */
const readsWell = (body, asExpression = false) => {
  try {
    if (asExpression) {
      acorn.parseExpressionAt(body, 0, { ecmaVersion: 'latest' });
      return true;
    }
    acorn.parse(body, { ecmaVersion: 'latest', sourceType: 'script' });
    return true;
  } catch {
    try {
      acorn.parse(body, { ecmaVersion: 'latest', sourceType: 'module' });
      return true;
    } catch {
      return false;
    }
  }
};

/* The blocks of script a page holds. */
export const scriptBlocksOf = (text) => {
  const out = [];
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf('<script', i);
    if (at < 0) break;
    const open = text.indexOf('>', at);
    if (open < 0) break;
    const close = lower.indexOf('</script', open);
    const end = close < 0 ? text.length : close;
    out.push({ start: open + 1, end });
    i = close < 0 ? text.length : close + 8;
  }
  return out;
};

/*
 * The words of a page that stand between its tags.
 *
 * A page says things as well as holding a program, and those words
 * are part of the shape of the page: a page whose wording was given
 * a Chinese has a different shape from the older page, and the two
 * cannot be lined up without taking those words out as well.
 */
export const textRunsOf = (text) => {
  const out = [];
  const lower = text.toLowerCase();
  let i = 0;
  let start = 0;
  while (i < text.length) {
    if (text[i] !== '<') {
      i++;
      continue;
    }
    if (i > start) out.push({ start, end: i });
    if (text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      i = close < 0 ? text.length : close + 3;
      start = i;
      continue;
    }
    const open = text.indexOf('>', i);
    if (open < 0) break;
    const tag = lower.slice(i, open);
    let end = open + 1;
    if (/^<script\b/.test(tag) || /^<style\b/.test(tag) || /^<textarea\b/.test(tag)) {
      const close = lower.indexOf('</' + tag.slice(1).split(/\s/)[0], open);
      end = close < 0 ? text.length : close;
    }
    i = end;
    start = i;
  }
  if (start < text.length) out.push({ start, end: text.length });
  return out;
};

/*
 * The notes a program carries.
 *
 * A note is not a string, but it is wording, and when it was given a
 * Chinese the shape of the program changed with it.  So the notes are
 * taken out as well, and the two programs can still be lined up.
 */
export const commentRunsOf = (text, offset = 0) => {
  const from = offset;
  const out = [];
  const push = (block, body, start, end) => {
    out.push({ start: start + from, end: end + from, block, body });
  };
  const collect = (source, offset) => {
    try {
      acorn.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        onComment: (block, body, start, end) => push(block, body, start, end)
      });
    } catch {
      try {
        acorn.parse(source, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          onComment: (block, body, start, end) => push(block, body, start, end)
        });
      } catch {
        /* a program that does not read well carries no notes we can trust */
      }
    }
  };
  if (text.includes('</script')) {
    for (const block of scriptBlocksOf(text)) {
      collect(text.slice(block.start, block.end), block.start);
    }
  } else {
    collect(text, offset);
  }
  return out;
};

/*
 * The notes a page carries between its tags.
 *
 * A note between tags is not a program, so it is found by looking
 * for the marks that open and close it.
 */
export const markupCommentRunsOf = (text) => {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const at = text.indexOf('<!--', i);
    if (at < 0) break;
    const close = text.indexOf('-->', at + 4);
    const end = close < 0 ? text.length : close + 3;
    out.push({ start: at, end });
    i = end;
  }
  return out;
};

/*
 * The shape of a lesson.
 *
 * It says the shape itself, and for every mark of the shape the place
 * in the lesson where the string stood.
 */
export const skeletonOf = (text, kind, options = {}) => {
  const lits = stringsOf(text, kind);
  const regions = lits.map((l) => ({ start: l.start, end: l.end, lit: l }));

  if (kind === 'html') {
    for (const run of markupCommentRunsOf(text)) {
      regions.push({ start: run.start, end: run.end, lit: null });
    }
    for (const run of commentRunsOf(text)) {
      regions.push({ start: run.start, end: run.end, lit: null });
    }
    if (options.textNodes !== false) {
      for (const run of textRunsOf(text)) {
        const body = text.slice(run.start, run.end);
        if (!body.trim()) continue;
        regions.push({
          start: run.start,
          end: run.end,
          lit: {
            value: body,
            quote: '',
            raw: body,
            start: run.start,
            end: run.end,
            text: true
          }
        });
      }
    }
    for (const block of scriptBlocksOf(text)) {
      const body = text.slice(block.start, block.end);
      if (!body.trim()) continue;
      if (readsWell(body)) continue;
      regions.push({ start: block.start, end: block.end, lit: null });
    }
  } else if (kind === 'js') {
    for (const run of commentRunsOf(text)) {
      regions.push({ start: run.start, end: run.end, lit: null });
    }
  }

  regions.sort((a, b) => a.start - b.start);

  const shape = [];
  const where = [];
  const lit = [];
  let pos = 0;
  for (const r of regions) {
    if (r.start < pos) continue;
    for (let i = pos; i < r.start; i++) {
      shape.push(text[i]);
      where.push(i);
      lit.push(null);
    }
    shape.push(MARK);
    where.push(r.start);
    lit.push(r.lit);
    pos = r.end;
  }
  for (let i = pos; i < text.length; i++) {
    shape.push(text[i]);
    where.push(i);
    lit.push(null);
  }
  return { shape: shape.join(''), where, lit };
};

export default skeletonOf;
