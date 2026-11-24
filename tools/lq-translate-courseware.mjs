/*
 * Turn the lessons that are still in English into Chinese ones.
 *
 * The work is done in three steps so that a mistake can always be
 * found and undone:
 *
 *   --extract    list the wording a reader would see
 *   --translate  ask for the Chinese wording and keep it in a cache
 *   --apply      put the Chinese back into the lessons
 *
 * Only wording is touched.  The program around it keeps working the
 * way it did.
 *
 *   node tools/lq-translate-courseware.mjs --extract
 *   node tools/lq-translate-courseware.mjs --translate --conc 3
 *   node tools/lq-translate-courseware.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { chat } from './lq-relay.mjs';
import { checkScripts } from './lq-script-check.mjs';
import { readLiteral, writeLiteral } from './lq-literal.mjs';

const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const EXTRACT = has('--extract');
const TRANSLATE = has('--translate');
const APPLY = has('--apply');
const CONC = Number(arg('conc', 3));
const MODEL = arg('model', 'gpt-5.6');
const CACHE = arg('cache', 'work/lq-translations.json');

const ROOTS = [
  'mirror/lab-virtual/courseware',
  'mirror/lab-course/courseware',
  'mirror/lab-reaction/courseware',
  'mirror/lab-explore/courseware'
];

/* ------------------------------------------------------------------ */
/*  What counts as English                                             */
/* ------------------------------------------------------------------ */

/* Chinese writing, and the marks that go with it. */
const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/;

const englishWords = (s) => s.match(/[A-Za-z][A-Za-z'’-]*/g) || [];

const isEnglish = (s) => {
  if (!s || CJK.test(s)) return false;
  const words = englishWords(s);
  if (!words.length) return false;
  const core = s.replace(/\s+/g, '');
  if (core.length < 3) return false;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters / core.length < 0.55) return false;
  return true;
};

/* A single word is only English if it is a label and not a name. */
const isLabel = (s) => {
  const t = s.trim();
  if (!/^[A-Za-z][A-Za-z '-]{1,28}$/.test(t)) return false;
  if (/_/.test(t)) return false;
  if (/[a-z][A-Z]/.test(t)) return false;
  return true;
};

/*
 * A symbol like m/s or kg is not a sentence.  A word of three or more
 * letters in a row is a word, so anything shorter than that is left
 * alone.
 */
const looksLikeSymbol = (s) => {
  if (/\s/.test(s)) return false;
  if (!/^[A-Za-z0-9^*/.()+-]+$/.test(s)) return false;
  if (/[A-Za-z]{3,}/.test(s)) return false;
  return true;
};

/*
 * Words that a program uses as a value.  Changing them would change
 * what the program does, so they are left exactly as they are.
 */
const MUST_STAY = new Set(
  ('auto manual none hidden visible block inline inline-block absolute relative static fixed ' +
    'inherit initial unset revert solid dashed dotted groove ridge outset inset ' +
    'center left right top bottom middle baseline stretch nowrap normal pointer default ' +
    'scroll clip ellipsis pre pre-wrap pre-line break-word wrap ' +
    'true false null undefined NaN Infinity object function string number boolean symbol ' +
    'GET POST PUT DELETE HEAD OPTIONS PATCH json text html css javascript utf-8 ' +
    'button submit reset checkbox radio select option input text email password ' +
    'keydown keyup keypress mousedown mouseup mousemove click dblclick focus blur ' +
    'load error resize scroll change submit change focusin focusout selectstart')
    .split(' ')
);

/* The rules of the page are not wording. */
const isPolicy = (tag) => /http-equiv\s*=\s*["']?content-security-policy/i.test(tag);

/*
 * Some wording carries small pieces of markup in the middle of it.
 * The markup is kept, and only the words around it are translated.
 */
const chunks = (s) => {
  const out = [];
  const parts = s.split(/(<[^>]+>)/g);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith('<')) {
      out.push({ tag: true, text: p });
      continue;
    }
    /*
     * Wording that is already in Chinese is kept as it is.  The
     * English that stands beside it is worded on its own, so that it
     * can be translated without touching the Chinese.
     */
    let i = 0;
    while (i < p.length) {
      const chinese = CJK.test(p[i]);
      let j = i;
      while (j < p.length && CJK.test(p[j]) === chinese) j++;
      out.push({ tag: false, text: p.slice(i, j) });
      i = j;
    }
  }
  return out;
};

/*
 * A string inside the script may be a label the reader sees, or it
 * may be a name the program works with. Only the first kind may be
 * changed, so we look only where a string is put on the screen.
 */
/*
 * A string, written the way a program writes one.
 *
 * A quote that stands for itself, such as the one in "can't", does
 * not end the string, so the two characters that stand for it are
 * taken as one thing.
 */
const STR = String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`;
const DISPLAY_CONTEXT = new RegExp(
  `(?:` +
    [
      `\\.(?:html|text|val|append|prepend|after|before)\\(\\s*${STR}`,
      `(?:innerHTML|outerHTML)\\s*=\\s*${STR}`,
      `document\\.title\\s*=\\s*${STR}`,
      `\\.attr\\(\\s*(?:"|')(?:title|alt|placeholder)(?:"|')\\s*,\\s*${STR}`,
      `setAttribute\\(\\s*(?:"|')(?:title|alt)(?:"|')\\s*,\\s*${STR}`,
      `(?:alert|confirm|prompt)\\(\\s*${STR}`,
      `WriteText\\([^,()]+,[^,()]+,\\s*${STR}`
    ].join('|') +
    `)`,
  'g'
);

/* ------------------------------------------------------------------ */
/*  Reading a page                                                     */
/* ------------------------------------------------------------------ */

/*
 * A tag.  The name has to look like a name, so that a comparison
 * such as a<b in a program is not mistaken for the start of a tag.
 * A quoted value may hold a ">" of its own.
 */
const TAG =
  /<!--[\s\S]*?-->|<![^>]*>|<\?[^>]*>|<\/?([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^<>"'])*)>/g;

/* The parts of the page that hold code, and not wording. */
const CODE_BLOCK =
  /<(script|style)(?=[\s/>])((?:"[^"]*"|'[^']*'|[^<>"'])*)>([\s\S]*?)<\/\1\s*>/gi;
const SCRIPT_BLOCK =
  /<script(?=[\s/>])((?:"[^"]*"|'[^']*'|[^<>"'])*)>([\s\S]*?)<\/script\s*>/gi;
const STYLE_BLOCK =
  /<style(?=[\s/>])((?:"[^"]*"|'[^']*'|[^<>"'])*)>([\s\S]*?)<\/style\s*>/gi;

/* Split the page into the parts that matter. */
function readPage(html) {
  const scriptRanges = [];
  const styleRanges = [];
  for (const m of html.matchAll(CODE_BLOCK)) {
    const range = [m.index, m.index + m[0].length];
    if (m[1].toLowerCase() === 'script') scriptRanges.push(range);
    else styleRanges.push(range);
  }
  return { scriptRanges, styleRanges };
}

/*
 * The text that sits between the tags of the page.  The places are
 * given as they are in the page itself, so that a piece can be put
 * back without touching anything around it.
 */
/* The elements that never hold anything inside them. */
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr'
]);

/* The elements that start a new line of wording. */
const BLOCK = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre',
  'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]);

function htmlText(html, ranges) {
  const out = [];
  /*
   * Walk the page in the stretches that hold wording.  The code
   * blocks are stepped over as a whole, so that nothing inside them
   * can be mistaken for wording.
   */
  const gaps = [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  let from = 0;
  for (const [a, b] of sorted) {
    if (a > from) gaps.push([from, a]);
    from = Math.max(from, b);
  }
  if (from < html.length) gaps.push([from, html.length]);

  const stack = [];          /* the elements that are open */
  const texts = [];          /* the wording, in the order it appears */
  let nextId = 1;
  let broken = false;        /* a new line of wording has begun */

  const addText = (start, end) => {
    const value = html.slice(start, end);
    const piece = {
      kind: 'text',
      start,
      end,
      value,
      gap: broken
    };
    out.push(piece);
    texts.push(piece);
    broken = false;
  };

  for (const [start, stop] of gaps) {
    let i = start;
    while (i < stop) {
      TAG.lastIndex = i;
      const m = TAG.exec(html);
      if (!m || m.index >= stop) {
        if (i < stop) addText(i, stop);
        break;
      }
      if (m.index > i) {
        addText(i, m.index);
      }
      const tagStart = m.index;
      const tagEnd = m.index + m[0].length;
      const tag = m[0];
      const name = (m[1] || '').toLowerCase();

      /* Keep track of the element the wording sits in. */
      if (name) {
        if (BLOCK.has(name)) broken = true;
        if (tag[1] === '/') {
          for (let k = stack.length - 1; k >= 0; k--) {
            if (stack[k].name === name) {
              stack.length = k;
              break;
            }
          }
        } else if (!tag.endsWith('/>') && !VOID.has(name)) {
          stack.push({ name, id: nextId++ });
        }
      }

      const attr =
        /\b(alt|title|aria-label|placeholder|content)="([^"]*)"/.exec(tag);
      /* Only the description of the page is wording; the rest is rules. */
      const worthIt =
        attr &&
        (attr[1] !== 'content' ||
          /name\s*=\s*["']description["']|property\s*=\s*["']og:description["']/i.test(tag));
      if (worthIt && !(attr[1] === 'content' && isPolicy(tag))) {
        /* Where the wording itself sits inside the tag. */
        const at = tag.indexOf(attr[0]);
        const vStart = tagStart + at + attr[0].indexOf(attr[2]);
        out.push({
          kind: 'attr',
          start: tagStart,
          end: tagEnd,
          vStart,
          vEnd: vStart + attr[2].length,
          value: attr[2],
          attr: attr[1],
          gap: broken
        });
      }
      i = tagEnd;
    }
  }

  /*
   * A piece that runs on from wording that is already in Chinese is
   * only a part of that wording, and is left exactly as it is.  A
   * piece that stands on its own is wording of its own.
   */
  for (let k = 0; k < texts.length; k++) {
    const piece = texts[k];
    const before = k > 0 && !piece.gap ? texts[k - 1] : null;
    const after =
      k + 1 < texts.length && !texts[k + 1].gap ? texts[k + 1] : null;
    piece.nearCjk =
      (before && CJK.test(before.value)) || (after && CJK.test(after.value));
  }
  return { out };
}

/* The wording inside the script that the program compares against. */
function comparedStrings(script) {
  const out = new Set();
  const patterns = [
    /==\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g,
    /!=\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g,
    /case\s+("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')\s*:/g,
    /\.(?:indexOf|includes|startsWith|endsWith)\s*\(\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g,
    /(?:getElementById|querySelector|querySelectorAll)\s*\(\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g
  ];
  for (const p of patterns) {
    for (const m of script.matchAll(p)) out.add(m[1].slice(1, -1));
  }
  return out;
}

/* The names the page gives to its own parts. */
function reservedNames(html) {
  const out = new Set();
  for (const m of html.matchAll(/\b(?:id|class|name|data-[\w-]+)="([^"]*)"/g)) {
    out.add(m[1]);
    for (const part of m[1].split(/\s+/)) out.add(part);
  }
  for (const m of html.matchAll(STYLE_BLOCK)) {
    for (const s of m[2].matchAll(/["']([^"']+)["']/g)) out.add(s[1]);
  }
  for (const m of html.matchAll(SCRIPT_BLOCK)) {
    for (const s of comparedStrings(m[2])) out.add(s);
  }
  return out;
}

/* The language bundle the page carries inside itself. */
function readDataBundle(html) {
  const m = /var\s+DATA\s*=\s*/.exec(html);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 0;
  let end = -1;
  let inStr = null;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") inStr = c;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) return null;
  const text = html.slice(start, end);
  try {
    return { start, end, json: JSON.parse(text) };
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Collecting                                                          */
/* ------------------------------------------------------------------ */

const files = [];
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const f of fs.readdirSync(root)) {
    if (f.endsWith('.html')) files.push(path.join(root, f));
  }
}

/* One file at a time, for a check on a single lesson. */
const only = arg('only', '');
const picked = only
  ? files.filter((f) => f.replace(/\\/g, '/').includes(only.replace(/\\/g, '/')))
  : files;

const units = new Map(); /* source wording -> null */
const note = (s, nearCjk) => {
  if (nearCjk) return;
  for (const c of chunks(s)) {
    if (c.tag) continue;
    const w = c.text.replace(/\s+/g, ' ').trim();
    if (!w) continue;
    if (!isEnglish(w)) continue;
    if (looksLikeSymbol(w)) continue;
    if (MUST_STAY.has(w.toLowerCase())) continue;
    if (w.length > 2000) continue;
    if (!units.has(w)) units.set(w, null);
  }
};

let dataBundles = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const { scriptRanges, styleRanges } = readPage(html);

  /* The words between the tags. */
  const { out } = htmlText(html, [...scriptRanges, ...styleRanges]);
  for (const piece of out) {
    note(piece.value, piece.nearCjk);
  }

  /* The language bundle. */
  const bundle = readDataBundle(html);
  if (bundle) {
    dataBundles++;
    /* Only the English half is ever shown, so only it is translated. */
    const walk = (node) => {
      if (typeof node === 'string') note(node);
      else if (node && typeof node === 'object') {
        for (const v of Object.values(node)) walk(v);
      }
    };
    for (const langs of Object.values(bundle.json)) {
      if (langs && typeof langs === 'object' && langs.en) walk(langs.en);
    }
  }

  /* The strings inside the script, where they are safe to change. */
  const reserved = reservedNames(html);
  for (const m of html.matchAll(SCRIPT_BLOCK)) {
    const body = m[2];
    for (const s of body.matchAll(DISPLAY_CONTEXT)) {
      /* Each branch has its own copy of the string group. */
      const hit = s.slice(1).find((g) => g !== undefined);
      if (hit === undefined) continue;
      const raw = hit.slice(1, -1);
      if (!raw) continue;
      if (/^(https?:|\/\/|\/|#|\.|data:)/.test(raw)) continue;
      if (reserved.has(raw)) continue;
      if (!isEnglish(raw)) continue;
      const words = englishWords(raw);
      if (words.length < 2 && !isLabel(raw)) continue;
      note(raw);
    }
  }
}

console.log(`files ${files.length}, language bundles ${dataBundles}`);
console.log(`distinct pieces of wording ${units.size}`);

if (EXTRACT) {
  const list = [...units.keys()];
  fs.writeFileSync(arg('out', 'work/lq-units.json'), JSON.stringify(list, null, 1));
  const chars = list.reduce((s, x) => s + x.length, 0);
  console.log(`total characters ${chars}`);
  for (const s of list.slice(0, 25)) console.log('  ' + s.slice(0, 120));
}

if (TRANSLATE) {
  let cache = {};
  if (fs.existsSync(CACHE)) cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  let todo = [...units.keys()].filter((s) => !cache[s]);
  const limit = Number(arg('limit', 0));
  if (limit) todo = todo.slice(0, limit);
  console.log(`to translate ${todo.length}, already known ${units.size - todo.length}`);

  const queue = todo.slice();
  let done = 0;
  let failed = 0;

  const worker = async () => {
    while (queue.length) {
      const batch = queue.splice(0, 20);
      /* The wording is read before it is sent, so that no escape remains. */
      const payload = batch
        .map((s, i) => `${i}\t${readLiteral(s).replace(/\n/g, ' ')}`)
        .join('\n');
      let out = '';
      try {
        out = await chat(
          [
            {
              role: 'system',
              content:
                '你是物理课堂课件的中文译者。下面每一行是课件里读者会看到的英文文本，' +
                '行首的数字是编号。请逐行翻译成简体中文，术语准确、简洁自然，' +
                '保留数字、单位、公式和专有名词，不要添加解释，不要合并或拆分行。' +
                '严格按 "<编号>\\t<译文>" 的格式输出，一行一条，条数必须与输入一致。'
            },
            { role: 'user', content: payload }
          ],
          MODEL,
          0.1
        );
      } catch (e) {
        failed += batch.length;
        console.log(`  batch failed: ${e.message.slice(0, 90)}`);
        continue;
      }
      const got = new Map();
      for (const line of out.split(/\r?\n/)) {
        const m = /^\s*(\d+)\s*[:.)]?\s*(.+)$/.exec(line);
        if (!m) continue;
        const i = Number(m[1]);
        if (!(i >= 0 && i < batch.length)) continue;
        const zh = m[2].trim();
        if (!zh) continue;
        got.set(i, zh);
      }
      for (const [i, zh] of got) cache[batch[i]] = zh;
      done += got.size;
      failed += batch.length - got.size;
      if (done % 120 < 12) {
        fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
        console.log(`  ${done} done, ${queue.length} left`);
      }
    }
  };

  await Promise.all(
    Array.from({ length: CONC }, async () => {
      await worker();
    })
  );
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  console.log(`translated ${done}, failed ${failed}, cache ${Object.keys(cache).length}`);
}

if (APPLY) {
  const cache = fs.existsSync(CACHE)
    ? JSON.parse(fs.readFileSync(CACHE, 'utf8'))
    : {};

  /* Put the Chinese back, keeping the markup and the spacing. */
  const put = (value, allow) => {
    if (allow === false) return { text: value, hit: 0 };
    let hit = 0;
    let out = '';
    for (const c of chunks(value)) {
      if (c.tag) {
        out += c.text;
        continue;
      }
      const lead = c.text.slice(0, c.text.length - c.text.trimStart().length);
      const tail = c.text.slice(c.text.trimEnd().length);
      const key = c.text.replace(/\s+/g, ' ').trim();
        const zh = MUST_STAY.has(key.toLowerCase()) ? null : cache[key];
      if (zh) {
        out += lead + zh + tail;
        hit++;
      } else {
        out += c.text;
      }
    }
    return { text: out, hit };
  };

  let changed = 0;
  let words = 0;
let kept = 0;
  for (const file of picked) {
    let html = fs.readFileSync(file, 'utf8');
    const before = html;

    /* The language bundle: keep the shape, put Chinese in it. */
    const bundle = readDataBundle(html);
    if (bundle) {
      const zh = {};
      const walk = (node, pathParts) => {
        if (typeof node === 'string') {
          const t = cache[node];
          if (t) zh[pathParts.join('.')] = t;
          return;
        }
        if (node && typeof node === 'object') {
          for (const [k, v] of Object.entries(node)) walk(v, [...pathParts, k]);
        }
      };
      walk(bundle.json, []);
      const out = {};
      for (const [fileKey, langs] of Object.entries(bundle.json)) {
        if (!langs || typeof langs !== 'object' || !langs.en) continue;
        const base = `${fileKey}.en`;
        const pick = (node, prefix) => {
          if (typeof node === 'string') return put(node).text;
          if (node && typeof node === 'object') {
            const o = {};
            for (const [k, v] of Object.entries(node)) o[k] = pick(v, `${prefix}.${k}`);
            return o;
          }
          return node;
        };
        out[fileKey] = { en: pick(langs.en, base) };
      }
      if (Object.keys(out).length) {
        html =
          html.slice(0, bundle.start) +
          JSON.stringify(out) +
          html.slice(bundle.end);
        words++;
      }
    }

    /* The words between the tags and the wording in the attributes. */
    /* The labels the program puts on the screen. */
    const reserved = reservedNames(html);
    html = html.replace(SCRIPT_BLOCK, (block) =>
      block.replace(DISPLAY_CONTEXT, (...args) => {
        const m = args[0];
        /* The last two arguments are the offset and the whole string. */
        const hit = args.slice(1, -2).find((g) => g !== undefined);
        if (hit === undefined) return m;
        const raw = hit.slice(1, -1);
        if (!raw || !isEnglish(raw)) return m;
        const key = raw.replace(/\s+/g, ' ').trim();
        if (MUST_STAY.has(key.toLowerCase())) return m;
        if (reserved.has(raw)) return m;
        const zh = cache[key];
        if (!zh) return m;
        const q = hit[0];
        /* The wording is read and written so that it keeps its meaning. */
        const esc = writeLiteral(readLiteral(zh), q);
        words++;
        return m.replace(hit, q + esc + q);
      })
    );

    /* The words between the tags and the wording in the attributes. */
    const { scriptRanges, styleRanges } = readPage(html);
    const { out: pieces } = htmlText(html, [...scriptRanges, ...styleRanges]);

    let result = '';
    let cursor = 0;
    for (const piece of pieces) {
      if (piece.kind === 'attr') {
        result += html.slice(cursor, piece.vStart);
        const r = put(piece.value, !piece.nearCjk);
        result += r.text;
        words += r.hit;
        cursor = piece.vEnd;
      } else {
        result += html.slice(cursor, piece.start);
        const r = put(piece.value, !piece.nearCjk);
        result += r.text;
        words += r.hit;
        cursor = piece.end;
      }
    }
    result += html.slice(cursor);
    html = result;

    if (html !== before) {
      /*
       * A lesson whose scripts no longer read well is not written out.
       * The wording is better left in English than the lesson is left
       * broken.
       */
      const sound = checkScripts(html);
      if (!sound.ok) {
        kept++;
        console.log(`kept ${file}: ${sound.error}`);
        continue;
      }
      fs.writeFileSync(file, html);
      changed++;
    }
  }
  console.log(
    `changed ${changed} files, ${words} pieces of wording, kept ${kept} files as they were`
  );
}
