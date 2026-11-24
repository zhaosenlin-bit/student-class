/*
 * Put the Chinese wording into the words a program builds for a reader.
 *
 * Most of the wording in a lesson sits between the tags, and the courseware
 * tool takes care of that.  Some of it sits inside a string in a script,
 * for instance the sentence a page shows when a number is too large.  Those
 * words are collected here, translated, and put back.
 *
 * The strings that are part of the program rather than part of the wording
 * are left alone: names, paths, pieces of style, and anything that carries
 * a placeholder.
 *
 *   node tools/lq-translate-script-strings.mjs --extract --out file.json
 *   node tools/lq-translate-script-strings.mjs --translate --conc 4
 *   node tools/lq-translate-script-strings.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkScripts, checkProgram } from './lq-script-check.mjs';
import { readLiteral, writeLiteral } from './lq-literal.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(name);

const EXTRACT = has('--extract');
const TRANSLATE = has('--translate');
const APPLY = has('--apply');
const CONC = Number(arg('conc', 3));
const BATCH = Number(arg('batch', 15));
const CACHE = arg('cache', 'work/lq-script-strings.json');

const FAMILIES = [
  'mirror/studio/courseware',
  'mirror/lab-course/courseware',
  'mirror/lab-virtual/courseware',
  'mirror/lab-reaction/courseware',
  'mirror/lab-explore/courseware',
  'mirror/lab-physics/courseware',
  'mirror/lab-process/courseware',
  'mirror/game-block/courseware',
];

/*
 * The folders that are read may be given on the command line, so that
 * the library itself and the mirrors it was made from are each done
 * in their own turn.
 */
const DIRS = arg('dirs', '')
  ? arg('dirs', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : FAMILIES;

/*
 * A lesson is not always one file.  The questions, the names and the
 * wording of a lesson often live in a folder of its own, beside the
 * page:  <id>.assets/*.js
 *
 * Those files are read as well.  The libraries of a lesson are left
 * alone: they are not ours, and they are not wording.
 */
const ASSET_SKIP =
  /(\.min\.js$|(^|\/)vendor\/|cdnjs|jsdelivr|unpkg|(^|\/)three\.|\.map$)/i;

function assetFiles() {
  const out = [];
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.assets')) continue;
      const root = path.join(dir, name);
      const walk = (d) => {
        let list;
        try {
          list = fs.readdirSync(d, { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of list) {
          const full = path.join(d, e.name);
          if (e.isDirectory()) walk(full);
          else if (e.isFile() && /\.(js|mjs)$/i.test(e.name)) {
            const rel = path.relative(root, full).split(path.sep).join('/');
            if (ASSET_SKIP.test(rel)) continue;
            out.push(full);
          }
        }
      };
      walk(root);
    }
  }
  return out;
}

/*
 * A single word is only put into Chinese where the lessons keep their
 * wording in a table of their own.  In the larger programs the same kind
 * of word is the name of a part of the program, and changing it would
 * break the program.
 */
const SINGLE_FAMILIES = ['mirror/lab-reaction/courseware', 'mirror/lab-explore/courseware'];

/* Whether the file being read is one of those families. */
const isSingleFamily = () =>
  currentKind !== 'js' &&
  SINGLE_FAMILIES.some((d) => currentFile.replace(/\\/g, '/').startsWith(d));

/* The file being read at the moment. */
let currentFile = '';
let currentKind = 'html';
let currentTags = [];

/*
 * The places where a program writes markup.  A word inside a tag is
 * the name of a style or a part of the program, not wording.
 */
function tagRanges(body) {
  const out = [];
  const re = /<\/?[a-zA-Z][^<>]*>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

const insideTag = (index) =>
  currentTags.some(([a, b]) => index >= a && index < b);

/*
 * A word that is given to a style is the name of a style.  "className"
 * and "style" are the places where this happens in a program.
 */
const isStyleName = (body, index) => {
  const before = body.slice(Math.max(0, index - 160), index);
  /* The name of a style, with only the writing of the program
     between it and the word. */
  const re = /\b(?:className|class|style)\s*=/g;
  let last = null;
  let m;
  while ((m = re.exec(before)) !== null) last = m;
  if (!last) return false;
  const tail = before.slice(last.index + last[0].length);
  return !/[;{}]/.test(tail);
};

/* Whether a piece of wording may be given a Chinese. */
const mayWording = (body, index) =>
  !insideTag(index) && !isStyleName(body, index);

/* Words that are the name of something in the program, not wording. */
const CODE_WORDS = new Set([
  'text', 'button', 'div', 'span', 'canvas', 'input', 'label', 'option',
  'select', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'ul', 'ol', 'li',
  'p', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img',
  'font', 'style', 'script', 'head', 'body', 'html', 'title', 'meta',
  'true', 'false', 'null', 'undefined', 'function', 'return', 'const',
  'var', 'let', 'new', 'this', 'window', 'document', 'element', 'class',
]);

/*
 * The name of the field a piece of wording sits in.  A word that is
 * written in one of these fields is shown to the reader, even when it
 * is a single word.
 */
const DISPLAY_KEYS = new Set([
  'name', 'names', 'label', 'labels', 'title', 'subtitle', 'heading',
  'desc', 'description', 'text', 'caption', 'hint', 'word', 'words',
  'note', 'message', 'tooltip', 'placeholder', 'summary', 'body',
  'content', 'tagline', 'tip', 'full', 'solWord', 'deposit',
  'info', 'detail', 'details'
]);

/* Strings that belong to the program. */
const NOT_WORDING = [
  /^(https?|mailto|data|file|about|blob|chrome|ftp):/i,
  /^\s*#/,
  /^\s*[.\/]/,
  /\$\{/,
  /%[sdif]/,
  /\{[0-9]+\}/,
  /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//,
  /^[a-zA-Z0-9_.\-#]+$/,
  /^[a-zA-Z]+-[a-zA-Z0-9-]+$/,
  /^[a-zA-Z]+\.[a-zA-Z0-9_.]+$/,
];

/* The names a library puts in front of its own words. */
const LIBRARY =
  /^(THREE|TWEEN|GSAP|PHYSICS|Matter|RAPIER|Pixi|BABYLON|CANNON|Ammo|Howler|WebGL|SkinnedMesh|Skeleton|BufferGeometry|Texture|ShaderMaterial|Object3D|PropertyBinding|Controls|ColorManagement|AnimationClip|Three)/;

/* The marks of a line of a program. */
const CODE_MARKER =
  /(=>|===|!==|\+\+|--|&&|\|\||\bfunction\b|\bnew [A-Z]|\bvar\b|\blet\b|\bconst\b|\brequire\(|\bimport\s|[a-zA-Z_$][\w$]*\s*=|RegExp)/;

const hasCjk = (s) => /[\u3400-\u9fff]/.test(s);

/* Words that are common enough to show that a text is written backwards. */
const COMMON = new Set([
  'the', 'and', 'of', 'to', 'in', 'is', 'a', 'for', 'on', 'with', 'that',
  'this', 'are', 'you', 'not', 'can', 'all', 'one', 'two', 'from', 'by',
  'at', 'as', 'it', 'be', 'was', 'or', 'an', 'angle', 'vector', 'vectors',
  'direction', 'general', 'opposite', 'native', 'value', 'point', 'line',
  'mass', 'speed', 'zero', 'net', 'negative', 'positive', 'left', 'right',
  'up', 'down', 'horizontal', 'vertical', 'magnitude', 'frequency',
  'energy', 'force', 'weight', 'velocity', 'acceleration', 'distance',
  'object', 'body', 'ball', 'box', 'wheel', 'spring', 'pendulum', 'wave',
  'sound', 'light', 'heat', 'electric', 'magnetic', 'field', 'charge',
  'current', 'voltage', 'resistance', 'capacitor', 'inductor', 'battery',
  'resistor', 'reflection', 'refraction', 'spectrum', 'color', 'colour',
  'perpendicular', 'parallel', 'triangle', 'circle', 'radius'
]);

/* How many common words a piece of text holds. */
const commonScore = (t) => {
  let n = 0;
  for (const w of t.toLowerCase().split(/[^a-z]+/)) if (COMMON.has(w)) n++;
  return n;
};

/* Some words are written backwards on purpose and must be left alone. */
const looksBackwards = (value) => {
  const t = value.trim();
  if (t.length < 8) return false;
  const reversed = [...t].reverse().join('');
  return commonScore(reversed) > commonScore(t);
};

/*
 * A piece of text a reader could see: a short sentence in English.
 *
 * The test is deliberately strict.  A word that carries a number, a
 * letter or a symbol next to it is a name in the program, and the
 * apostrophe inside a word in a comment is not a string at all.
 */
function isProse(value, single = false) {
  const t = value.trim();
  if (!t) return false;
  if (!single && !/\s/.test(t)) return false;
  if (single && !/\s/.test(t)) {
    /* A single word is only wording when it is a word and not a name. */
    if (!/^[A-Za-z][A-Za-z-]{1,20}$/.test(t)) return false;
    /* A word written in the middle style is the name of a thing. */
    if (/^[a-z][A-Za-z]*[A-Z]/.test(t)) return false;
    /* A sign of an element and a short abbreviation are left as they are. */
    if (/^[A-Z][a-z]?$/.test(t)) return false;
    if (/^[A-Z]{2,3}$/.test(t)) return false;
    if (!/[aeiouAEIOU]/.test(t)) return false;
    if (CODE_WORDS.has(t.toLowerCase())) return false;
    if (/^(https?|mailto|data|file|about|blob|chrome|ftp):/i.test(t)) return false;
    return true;
  }
  if (!/[A-Za-z]{3,}/.test(t)) return false;
  if (hasCjk(t)) return false;
  if (CODE_WORDS.has(t.toLowerCase())) return false;
  /*
   * A row of small words is the name of a style ("flex items-center
   * gap-2") or a word of a library, not something a reader reads.  A
   * row that holds a word of ordinary English is a sentence, and is
   * given a Chinese.
   */
  if (/^[a-z0-9]+(?:[ \t]+[a-z0-9]+)+$/.test(t) && commonScore(t) === 0) {
    return false;
  }
  /* A piece of markup or an address is not wording. */
  if (/[<>]/.test(t)) return false;
  if (/https?:\/\//i.test(t)) return false;
  if (LIBRARY.test(t)) return false;
  if (CODE_MARKER.test(t)) return false;
  for (const re of NOT_WORDING) if (re.test(t)) return false;
  if (/[{};]/.test(t)) return false;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  const rest = t.replace(/[A-Za-z0-9\s.,:;!?()[\]/'"+\-=<>%&#*_~^|@$]/g, '');
  if (letters < 4) return false;
  if (letters / (letters + rest.length) < 0.8) return false;
  /* Every word must look like a word, so a stray quote is not read as one. */
  const words = t.split(/\s+/);
  if (words.length < 2) return false;
  for (const w of words) {
    const clean = w.replace(/[^A-Za-z]/g, '');
    if (clean.length < 2) return false;
    if (!/[aeiouAEIOU]/.test(clean)) return false;
  }
  if (looksBackwards(t)) return false;
  return true;
}

/*
 * The field a word is written in, when the word is the value of a
 * field.  The name of the field is read from just before it.
 */
function displayField(body, index) {
  let i = index - 1;
  while (i >= 0 && /\s/.test(body[i])) i--;
  if (i < 0 || body[i] !== ':') return '';
  i--;
  let end = i + 1;
  while (i >= 0 && /[\w$]/.test(body[i])) i--;
  const key = body.slice(i + 1, end);
  return DISPLAY_KEYS.has(key) ? key : '';
}

/* The tag and the text of a piece of markup. */
const TAG = /<\/?[a-zA-Z][^<>]*>/g;

/* Split a piece of markup into the tags and the words around them. */
function pieces(value) {
  const out = [];
  let last = 0;
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(value)) !== null) {
    if (m.index > last) out.push({ tag: false, text: value.slice(last, m.index) });
    out.push({ tag: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < value.length) out.push({ tag: false, text: value.slice(last) });
  return out;
}

/* The way a string is written is read without changing it. */
const LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;

/*
 * A quote that sits inside a word, the way an apostrophe does, is not the
 * beginning of a string and is passed over.
 */
function isLiteralStart(body, index) {
  if (index <= 0) return true;
  return !/[A-Za-z0-9_$]/.test(body[index - 1]);
}

/* A word the page writes backwards for the reader is left alone. */
function isReversedWord(body, index, length) {
  const after = body.slice(index + length, index + length + 60);
  return /\.reverse\s*\(/.test(after);
}

/* The words of a string that a reader could see. */
function wordingPartsIn(body, index, value) {
  if (!mayWording(body, index)) return [];
  const field = isSingleFamily() ? displayField(body, index) : '';
  const out = [];
  for (const p of pieces(value)) {
    if (p.tag) continue;
    const t = p.text.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (SKIP.has(t)) continue;
    if (isProse(t, Boolean(field))) out.push(t);
  }
  return out;
}

/* Put the Chinese back into a string, keeping the markup in place. */
function translateLiteral(value, map, single = false) {
  let n = 0;
  const out = pieces(value)
    .map((p) => {
      if (p.tag) return p.text;
      const key = p.text.replace(/\s+/g, ' ').trim();
      const zh = map.get(key);
      if (!zh) return p.text;
      /* A single word is only changed where it is shown to the reader. */
      if (!single && !/\s/.test(key)) return p.text;
      n++;
      const lead = p.text.slice(0, p.text.length - p.text.trimStart().length);
      const tail = p.text.slice(p.text.trimEnd().length);
      return lead + zh + tail;
    })
    .join('');
  return { out, n };
}

/*
 * Walk a script and put the Chinese into the strings that carry wording.
 */
function rewriteBody(body, map, names) {
  let n = 0;
  const out = body.replace(LITERAL, (whole, a, b, c, at) => {
    const raw = a ?? b ?? c ?? '';
    if (!isLiteralStart(body, at)) return whole;
    if (isReversedWord(body, at, whole.length)) return whole;
    if (!mayWording(body, at)) return whole;
    const value = readLiteral(raw);
    if (names.has(value.trim())) return whole;
    const field = isSingleFamily() ? displayField(body, at) : '';
    const r = translateLiteral(value, map, Boolean(field));
    if (!r.n) return whole;
    n += r.n;
    return whole[0] + writeLiteral(r.out, whole[0]) + whole[whole.length - 1];
  });
  return { out, n };
}

/* The files that hold a lesson. */
function courseFiles() {
  const files = [];
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.html')) continue;
      files.push(path.join(dir, f));
    }
  }
  return files;
}

/*
 * Every file that holds wording, and the programs in it.  A page has
 * its programs inside it; a folder of materials has one program of
 * its own.
 */
function units() {
  const out = [];
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    const html = [];
    const names = new Set();
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.html')) continue;
      const file = path.join(dir, f);
      const text = fs.readFileSync(file, 'utf8');
      const own = attributeNames(text);
      for (const n of own) names.add(n);
      html.push({ file, kind: 'html', text, names: own });
    }
    out.push(...html);
    /* The folder of materials that stands beside the pages. */
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.assets')) continue;
      const root = path.join(dir, name);
      const walk = (d) => {
        let list;
        try {
          list = fs.readdirSync(d, { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of list) {
          const full = path.join(d, e.name);
          if (e.isDirectory()) walk(full);
          else if (e.isFile() && /\.(js|mjs)$/i.test(e.name)) {
            const rel = path.relative(root, full).split(path.sep).join('/');
            if (ASSET_SKIP.test(rel)) continue;
            out.push({
              file: full,
              kind: 'js',
              text: fs.readFileSync(full, 'utf8'),
              names
            });
          }
        }
      };
      walk(root);
    }
  }
  return out;
}

/* The programs of a file. */
function bodiesOf(unit) {
  if (unit.kind === 'js') return [unit.text];
  const scripts = unit.text.match(/<script[\s\S]*?<\/script>/gi) || [];
  return scripts.map((b) =>
    b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')
  );
}

/*
 * The name of a thing in the page is written down in an attribute, and
 * the program looks the thing up by that name.  Such a name is part of
 * the program and is never a wording, so it is left as it is.
 */
function attributeNames(html) {
  const names = new Set();
  const re = /\b(?:id|class|name|data-[\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const value = m[2] ?? m[3] ?? '';
    for (const part of value.split(/\s+/)) if (part) names.add(part);
  }
  return names;
}

/*
 * A word may be used as the name of a thing in a table, and the page then
 * looks it up by that name.  When the table and the page that reads it are
 * in the same file, the Chinese can be put in both places and all is well.
 * When they are in different files, the two would no longer match, so such
 * a word is left as it is.
 */
function survey() {
  const keyFiles = new Map();
  const lookupFiles = new Map();
  for (const unit of units()) {
    currentFile = unit.file;
    currentKind = unit.kind;
    for (const body of bodiesOf(unit)) {
      currentTags = tagRanges(body);
      LITERAL.lastIndex = 0;
      let m;
      while ((m = LITERAL.exec(body)) !== null) {
        const raw = m[1] ?? m[2] ?? '';
        if (!/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(raw)) continue;
        const after = body.slice(m.index + m[0].length, m.index + m[0].length + 40).trimStart();
        const table = after.startsWith(':') ? keyFiles : lookupFiles;
        if (!table.has(raw)) table.set(raw, new Set());
        table.get(raw).add(unit.file);
      }
    }
  }
  const skip = new Set();
  for (const [s, kf] of keyFiles) {
    const lf = lookupFiles.get(s);
    if (!lf) continue;
    for (const k of kf) {
      for (const l of lf) {
        if (k !== l) {
          skip.add(s);
          break;
        }
      }
    }
  }
  return skip;
}

const SKIP = survey();

if (EXTRACT) {
  const found = new Map();
  for (const unit of units()) {
    currentFile = unit.file;
    for (const body of bodiesOf(unit)) {
      currentTags = tagRanges(body);
      LITERAL.lastIndex = 0;
      let m;
      while ((m = LITERAL.exec(body)) !== null) {
        if (!isLiteralStart(body, m.index)) continue;
        if (isReversedWord(body, m.index, m[0].length)) continue;
        const value = readLiteral(m[1] ?? m[2] ?? m[3] ?? '');
        if (unit.names.has(value.trim())) continue;
        for (const w of wordingPartsIn(body, m.index, value)) {
          if (!found.has(w)) found.set(w, unit.file);
        }
      }
    }
  }
  const list = [...found.keys()];
  fs.writeFileSync(arg('out', 'work/lq-script-units.json'), JSON.stringify(list, null, 1));
  console.log(`strings ${list.length}`);
}

if (TRANSLATE) {
  let cache = {};
  if (fs.existsSync(CACHE)) cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const outFile = arg('out', 'work/lq-script-units.json');
  const list = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : [];
  const todo = list.filter((s) => !cache[s]);
  console.log(`to translate ${todo.length}, already known ${list.length - todo.length}`);

  const { chat } = await import('./lq-relay.mjs');
  const queue = todo.slice();
  let done = 0;
  let failed = 0;
  const worker = async () => {
    while (queue.length) {
      const batch = queue.splice(0, BATCH);
      const payload = batch.map((s, i) => `${i}\t${s.replace(/\n/g, ' ')}`).join('\n');
      let out = '';
      try {
        out = await chat(
          [
            {
              role: 'system',
              content:
                '你是物理课堂课件的中文译者。下面每行是课件里读者会看到的英文文本，行首数字是编号。' +
                '请逐行翻译成简体中文，术语准确、简洁自然，保留数字、单位、公式和专有名词，' +
                '不要添加解释，不要合并或拆分行。严格按 "<编号>\\t<译文>" 输出，条数必须与输入一致。'
            },
            { role: 'user', content: payload }
          ],
          arg('model', 'gpt-5.6'),
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
      if (done % 90 < 15) {
        fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
        console.log(`  ${done} done, ${queue.length} left`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONC }, () => worker()));
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  console.log(`translated ${done}, failed ${failed}, cache ${Object.keys(cache).length}`);
}

if (APPLY) {
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  const map = new Map(Object.entries(cache));
  let changedFiles = 0;
  let changedStrings = 0;
  let keptFiles = 0;
  for (const unit of units()) {
    const file = unit.file;
    currentFile = file;
    currentKind = unit.kind;
    const text = unit.text;
    const names = unit.names;
    let n = 0;
    let out;
    if (unit.kind === 'js') {
      currentTags = tagRanges(text);
      const r = rewriteBody(text, map, names);
      n = r.n;
      out = r.out;
    } else {
      out = text.replace(/<script[\s\S]*?<\/script>/gi, (block) => {
        const body = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
        currentTags = tagRanges(body);
        const r = rewriteBody(body, map, names);
        n += r.n;
        if (!r.n) return block;
        return block.replace(body, () => r.out);
      });
    }
    if (!n) continue;
    /*
     * A lesson whose scripts no longer read well is not written out.
     * The wording is better left in English than the lesson is left
     * broken.
     */
    const sound =
      unit.kind === 'js' ? checkProgram(out) : checkScripts(out);
    if (!sound.ok) {
      keptFiles++;
      console.log(`kept ${file}: ${sound.error}`);
      continue;
    }
    fs.writeFileSync(file, out);
    changedFiles++;
    changedStrings += n;
  }
  console.log(
    `changed ${changedFiles} files, ${changedStrings} strings, kept ${keptFiles} files as they were`
  );
}
