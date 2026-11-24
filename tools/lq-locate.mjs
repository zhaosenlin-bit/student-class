/*
 * Finding where a piece of wording is written.
 *
 * A page is read in two ways at once: the way it is written, with
 * its tags, and the way it is read, with the tags taken away.  The
 * second way is what a reader sees, and the first way is what the
 * program runs.  A piece of wording that a reader sees can be
 * looked up in the second way and then written back in the first.

 * Every character of the plain reading keeps the place in the file
 * it came from, so a piece of wording can be put back exactly where
 * it was found.
 */

/* The characters that are written as a name in the file. */
export const ENTITIES = {
  nbsp: '\u00a0',
  ensp: '\u2002',
  emsp: '\u2003',
  thinsp: '\u2009',
  zwnj: '\u200c',
  zwj: '\u200d',
  shy: '\u00ad',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  deg: '\u00b0',
  times: '\u00d7',
  divide: '\u00f7',
  minus: '\u2212',
  plusmn: '\u00b1',
  middot: '\u00b7',
  bull: '\u2022',
  larr: '\u2190',
  rarr: '\u2192',
  uarr: '\u2191',
  darr: '\u2193',
  harr: '\u2194',
  ne: '\u2260',
  le: '\u2264',
  ge: '\u2265',
  alpha: '\u03b1',
  beta: '\u03b2',
  gamma: '\u03b3',
  delta: '\u03b4',
  theta: '\u03b8',
  lambda: '\u03bb',
  mu: '\u03bc',
  pi: '\u03c0',
  sigma: '\u03c3',
  phi: '\u03c6',
  omega: '\u03c9',
  Omega: '\u03a9',
  infin: '\u221e',
  radic: '\u221a',
  sub2: '\u00b2',
  sup2: '\u00b2',
  sup3: '\u00b3',
  sup1: '\u00b9',
  Prime: '\u2032',
  prime: '\u2032',
  Prime2: '\u2033',
  frac12: '\u00bd',
  frac14: '\u00bc',
  frac34: '\u00be',
  frac13: '\u2153',
  frac23: '\u2154',
  sdot: '\u22c5',
  dot: '\u02d9',
  prop: '\u221d',
  rArr: '\u21d2',
  lArr: '\u21d0',
  uArr: '\u21d1',
  dArr: '\u21d3',
  hArr: '\u21d4',
  asymp: '\u2248',
  equiv: '\u2261',
  sum: '\u2211',
  prod: '\u220f',
  int: '\u222b',
  part: '\u2202',
  nabla: '\u2207',
  forall: '\u2200',
  exist: '\u2203',
  empty: '\u2205',
  cap: '\u2229',
  cup: '\u222a',
  sub: '\u2282',
  sube: '\u2286',
  sup: '\u2283',
  supe: '\u2287',
  oline: '\u203e',
  frasl: '\u2044',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
  euro: '\u20ac',
  pound: '\u00a3',
  yen: '\u00a5',
  cent: '\u00a2',
  sect: '\u00a7',
  para: '\u00b6',
  dagger: '\u2020',
  permil: '\u2030',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  sbquo: '\u201a',
  bdquo: '\u201e',
  laquo: '\u00ab',
  raquo: '\u00bb',
  lsaquo: '\u2039',
  rsaquo: '\u203a',
  spades: '\u2660',
  clubs: '\u2663',
  hearts: '\u2665',
  diams: '\u2666',
  Alpha: '\u0391',
  Beta: '\u0392',
  Gamma: '\u0393',
  Delta: '\u0394',
  Epsilon: '\u0395',
  Zeta: '\u0396',
  Eta: '\u0397',
  Theta: '\u0398',
  Iota: '\u0399',
  Kappa: '\u039a',
  Lambda: '\u039b',
  Mu: '\u039c',
  Nu: '\u039d',
  Xi: '\u039e',
  Omicron: '\u039f',
  Pi: '\u03a0',
  Rho: '\u03a1',
  Sigma: '\u03a3',
  Tau: '\u03a4',
  Upsilon: '\u03a5',
  Phi: '\u03a6',
  Chi: '\u03a7',
  Psi: '\u03a8',
  Omega: '\u03a9',
  epsilon: '\u03b5',
  epsiv: '\u03b5',
  varepsilon: '\u03b5',
  zeta: '\u03b6',
  eta: '\u03b7',
  vartheta: '\u03d1',
  iota: '\u03b9',
  kappa: '\u03ba',
  nu: '\u03bd',
  xi: '\u03be',
  omicron: '\u03bf',
  varpi: '\u03d6',
  rho: '\u03c1',
  varsigma: '\u03c2',
  tau: '\u03c4',
  upsilon: '\u03c5',
  varphi: '\u03d5',
  chi: '\u03c7',
  psi: '\u03c8',
  omega: '\u03c9'
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
 * The names that stand for a character are turned into the character
 * itself, so that a piece of wording taken from a page can be looked
 * for in a page.  A piece of wording that was written in the file
 * with "&nbsp;" in it is read as the space it stands for.
 */
export function decode(s) {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    const ch = ENTITIES[body];
    return ch === undefined ? whole : ch;
  });
}

const isWordChar = (c) => /[A-Za-z0-9_]/.test(c);

/*
 * Whether the wording stands on its own where it is written.
 *
 * The reading of a page joins one piece of text to the next, so a
 * word may end the first piece and begin the second.  The question
 * "is this a word of its own" is therefore asked of the file itself,
 * where the two pieces are still apart.
 */
function standsAlone(html, start, end, phrase) {
  const words = decode(phrase).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return false;
  const first = words[0][0];
  const last = words[words.length - 1].slice(-1);
  if (isWordChar(first)) {
    const before = start > 0 ? html[start - 1] : '';
    if (isWordChar(before)) return false;
  }
  if (isWordChar(last)) {
    const after = end < html.length ? html[end] : '';
    if (isWordChar(after)) return false;
  }
  return true;
}

/* The end of a tag, taking a quoted value into account. */
function tagEnd(html, at) {
  /* A comment may hold any sign at all, a quote among them. */
  if (html.startsWith('<!--', at)) {
    const end = html.indexOf('-->', at + 4);
    return end < 0 ? html.length : end + 2;
  }
  let i = at + 1;
  let quote = null;
  while (i < html.length) {
    const c = html[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '>') {
      return i;
    }
    i++;
  }
  return html.length;
}

/*
 * The page as a reader reads it, and the place in the file every
 * character of it came from.
 *
 * The reading is kept in stretches rather than one character at a
 * time: ordinary text stands for the same stretch of the file, and
 * only the characters that are written as a name break the rule.  A
 * page of a few megabytes is read in a moment this way.
 */
export function plainMap(html) {
  const parts = [];
  const runs = [];
  const code = [];
  let plainLen = 0;
  let i = 0;
  let state = 'text';
  const lower = html.toLowerCase();

  /* A stretch of text that stands for the same stretch of the file. */
  const direct = (fileStart, len) => {
    if (!len) return;
    runs.push({ plainStart: plainLen, plainLen: len, fileStart, direct: true });
    parts.push(html.slice(fileStart, fileStart + len));
    plainLen += len;
  };

  /* A stretch of text in which some characters are written as a name. */
  const named = (from, to) => {
    let at = from;
    while (at < to) {
      const amp = html.indexOf('&', at);
      if (amp < 0 || amp >= to) break;
      const m = /^&(#x?[0-9a-f]+|[a-z]+);/i.exec(html.slice(amp, to));
      if (!m) {
      /* A sign that is only a sign, such as the "&" in "A & B".
         The words before it still belong to the reading. */
      direct(at, amp - at + 1);
      at = amp + 1;
        continue;
      }
      const body = m[1];
      let ch = null;
      if (body[0] === '#') {
        const code =
          body[1] === 'x' || body[1] === 'X'
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1), 10);
        if (Number.isFinite(code)) ch = String.fromCodePoint(code);
      } else {
        ch = ENTITIES[body] ?? null;
      }
      if (ch === null) {
        /* A name that is not in the table.  The sign and the words
           before it still belong to the reading. */
        direct(at, amp - at + 1);
        at = amp + 1;
        continue;
      }
      direct(at, amp - at);
      /* One character of the reading, one place in the file.  The rest
         of the name in the file stands for the same character and is
         passed over, so that the two keep step with one another. */
      runs.push({
        plainStart: plainLen,
        plainLen: ch.length,
        fileStart: amp,
        fileLen: m[0].length,
        direct: false
      });
      parts.push(ch);
      plainLen += ch.length;
      at = amp + m[0].length;
    }
    direct(at, to - at);
  };

  while (i < html.length) {
    if (state === 'text') {
      const lt = html.indexOf('<', i);
      if (lt < 0) {
        named(i, html.length);
        break;
      }
      named(i, lt);
      const gt = tagEnd(html, lt);
      const tag = html.slice(lt, gt + 1);
      const open = /^<\s*(script|style)\b/i.exec(tag);
      if (open) {
        state = open[1].toLowerCase();
      }
      i = gt + 1;
      continue;
    }
    /* Inside a program or a style the words are read as they are. */
    const close = lower.indexOf('</' + state, i);
    if (close < 0) {
      code.push([i, html.length]);
      direct(i, html.length - i);
      break;
    }
    code.push([i, close]);
    direct(i, close - i);
    const gt = html.indexOf('>', close);
    i = gt < 0 ? html.length : gt + 1;
    state = 'text';
  }

  return { plain: parts.join(''), runs, code };
}

/* The place in the file a character of the reading came from. */
function placeOf(runs, pos) {
  let lo = 0;
  let hi = runs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = runs[mid];
    if (pos < r.plainStart) hi = mid - 1;
    else if (pos >= r.plainStart + r.plainLen) lo = mid + 1;
    else {
      return r.direct ? r.fileStart + (pos - r.plainStart) : r.fileStart;
    }
  }
  return undefined;
}

/* The reading of the page, with the names of characters turned into the
   characters they stand for. */
export function plainText(html) {
  const { plain, runs, code } = plainMap(html);
  return {
    plain,
    code,
    at: (pos) => placeOf(runs, pos),
    end: (pos) => {
      const r = runs.find(
        (x) => pos >= x.plainStart && pos < x.plainStart + x.plainLen
      );
      if (!r) return undefined;
      return r.direct
        ? r.fileStart + (pos - r.plainStart) + 1
        : r.fileStart + (r.fileLen ?? 1);
    }
  };
}

/*
 * Find a piece of wording in the page.
 *
 * The piece is looked for in the reading of the page, and the place
 * in the file is given back.  The place is only given when the
 * wording stands on its own in the file, with no tag inside it, so
 * that the writing back keeps the page whole.
 */
/*
 * A place where a piece of wording is written, ready to look up many
 * pieces in the same page.  The reading of the page is worked out once
 * and then used for every lookup, which matters on the long pages.
 */
export function reader(html) {
  const view = plainText(html);
  return (phrase) => find(html, view, phrase);
}

export function locate(html, phrase) {
  return find(html, plainText(html), phrase);
}

/*
 * Every place a piece of wording stands in a page.  The places are
 * given from the last to the first, so that a page can be written
 * back one piece at a time without the places moving underfoot.
 */
export function allPlaces(html, phrase) {
  const view = plainText(html);
  const plain = view.plain;
  const words = decode(phrase).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return [];
  const loose = words.map(escapeRe).join('\\s+');
  const re = new RegExp(loose, 'gi');
  const hits = [];
  let m;
  while ((m = re.exec(plain)) !== null) {
    const from = m.index;
    const to = from + m[0].length;
    const start = view.at(from);
    const end = view.end(to - 1);
    if (start !== undefined && end !== undefined) {
      const piece = html.slice(start, end);
      /* A tag inside the wording would be lost by a plain writing back. */
      if (piece.includes('<')) continue;
      /* A word inside a longer word is not a word of its own. */
      if (!standsAlone(html, start, end, phrase)) continue;
      /* The name of a part of the page is not wording. */
      const before = html.slice(Math.max(0, start - 40), start);
      if (/\b(?:id|class|name|data-[\w-]+|for|src|href)\s*=\s*["']$/.test(before)) {
        continue;
      }
      hits.push({
        start,
        end,
        exact: piece,
        code: inCode(view.code, start),
        whole: isWhole(html, start, end)
      });
    }
    if (m[0].length === 0) re.lastIndex++;
  }
  return hits.reverse();
}

/* Whether a place in the file stands inside a program or a style. */
export function inCode(ranges, at) {
  return ranges.some(([a, b]) => at >= a && at < b);
}

/*
 * Whether a place is a whole stretch of text on the page, with a tag
 * at each end.  Only such a place is wording that stands on its own;
 * a word in the middle of a longer sentence is part of that sentence
 * and is not written into on its own.
 */
function isWhole(html, start, end) {
  let i = start - 1;
  while (i >= 0 && /\s/.test(html[i])) i--;
  const left = i < 0 ? '' : html[i];
  let j = end;
  while (j < html.length && /\s/.test(html[j])) j++;
  const right = j >= html.length ? '' : html[j];
  /* The wording of an element, standing between its tags. */
  if (left === '>' && right === '<') return true;
  /* The wording of a whole string in the program, standing between its
     quotes. */
  if ((left === '"' || left === "'") && (right === '"' || right === "'")) return true;
  return false;
}

function find(html, view, phrase) {
  const words = decode(phrase).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return null;
  const loose = words.map(escapeRe).join('\\s+');
  const re = new RegExp(loose, 'gi');
  let m;
  while ((m = re.exec(view.plain)) !== null) {
    const from = m.index;
    const to = from + m[0].length;
    const start = view.at(from);
    const end = view.end(to - 1);
    if (start === undefined || end === undefined) continue;

    /* A tag inside the wording would be lost by a plain writing back. */
    const piece = html.slice(start, end);
    if (piece.includes('<')) continue;
    /* A word inside a longer word is not a word of its own. */
    if (!standsAlone(html, start, end, phrase)) continue;
    /* The name of a part of the page is not wording. */
    const before = html.slice(Math.max(0, start - 40), start);
    if (/\b(?:id|class|name|data-[\w-]+|for|src|href)\s*=\s*["']$/.test(before)) {
      continue;
    }
    return { start, end, exact: piece };
  }
  return null;
}

/* The place of a name that the page looks a part up by. */
export function reservedNames(html) {
  const out = new Set();
  for (const m of html.matchAll(/\b(?:id|class|name|data-[\w-]+)\s*=\s*"([^"]*)"/g)) {
    out.add(m[1]);
    for (const part of m[1].split(/\s+/)) if (part) out.add(part);
  }
  for (const m of html.matchAll(/\b(?:id|class|name|data-[\w-]+)\s*=\s*'([^']*)'/g)) {
    out.add(m[1]);
    for (const part of m[1].split(/\s+/)) if (part) out.add(part);
  }
  return out;
}
