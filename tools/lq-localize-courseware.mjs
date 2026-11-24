/*
 * Put the Chinese wording into the courseware.
 *
 * Three things happen here:
 *
 *   - the words a reader sees are replaced with their Chinese wording;
 *   - the language of the page is declared as Chinese;
 *   - the name of the site that published the lesson is taken out of
 *     the page's own description of itself.
 *
 * Only the words are touched.  The program around them is left exactly
 * as it was, so a lesson keeps behaving the way it did.
 *
 *   node tools/lq-localize-courseware.mjs --dict file.json [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeFileSafe } from './lq-file.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const DICT_FILE = arg('dict', 'tools/lq-dictionary.json');
const DRY = has('dry');

const FAMILIES = {
  lab: 'mirror/lab-course/courseware',
  'lab-virtual': 'mirror/lab-virtual/courseware',
  'lab-reaction': 'mirror/lab-reaction/courseware',
  'lab-explore': 'mirror/lab-explore/courseware',
};

/* More than one file may hold the wording; they are read in order. */
const DICT_FILES = DICT_FILE.split(';').filter(Boolean);
const dict = {};
for (const f of DICT_FILES) {
  if (!fs.existsSync(f)) continue;
  Object.assign(dict, JSON.parse(fs.readFileSync(f, 'utf8')));
}

/* The long wording, matched inside a longer line. */
const phrases = Object.keys(dict)
  .filter((k) => k.length >= 12)
  .sort((a, b) => b.length - a.length);
/* The short wording, matched on its own. */
const words = new Map(
  Object.keys(dict)
    .filter((k) => k.length < 12)
    .map((k) => [k, dict[k]])
);

/* A single word in a script is often a name; these are the safe ones. */
const SAFE_IN_CODE = new Set([
  'Reset', 'Pause', 'Play', 'Start', 'Stop', 'Begin', 'End', 'Next',
  'Previous', 'Back', 'Forward', 'Close', 'Open', 'Submit', 'Check',
  'Apply', 'Done', 'Save', 'Cancel', 'Continue', 'Skip', 'Home', 'Info',
]);

let changedFiles = 0;
let changedWords = 0;

const translateLine = (line) => {
  let out = line;
  for (const p of phrases) {
    if (!out.includes(p)) continue;
    /*
     * A wording is only replaced where it stands on its own, so that
     * a word inside a longer word is never broken apart.
     */
    let res = '';
    let i = 0;
    let n = 0;
    while (i < out.length) {
      const at = out.indexOf(p, i);
      if (at < 0) {
        res += out.slice(i);
        break;
      }
      const before = at > 0 ? out[at - 1] : '';
      const after = out[at + p.length] || '';
      const stuck = /[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after);
      res += out.slice(i, at);
      res += stuck ? p : dict[p];
      if (!stuck) n++;
      i = at + p.length;
    }
    out = res;
    changedWords += n;
  }
  const trimmed = out.trim();
  if (words.has(trimmed)) {
    changedWords += 1;
    /* The space around the wording is kept exactly as it was. */
    const at = out.indexOf(trimmed);
    const lead = out.slice(0, at);
    const tail = out.slice(at + trimmed.length);
    return lead + words.get(trimmed) + tail;
  }
  return out;
};

/* The words between the tags. */
function localizeHtml(text) {
  /*
   * A tag has to look like a tag, so that a comparison such as a<b
   * in a program is not mistaken for the start of one.  A quoted
   * value may hold a ">" of its own.
   */
  const TAG =
    /<!--[\s\S]*?-->|<![^>]*>|<\?[^>]*>|<\/?([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^<>"'])*)>/g;
  let out = '';
  let i = 0;
  while (i < text.length) {
    TAG.lastIndex = i;
    const m = TAG.exec(text);
    if (!m) {
      out += translateLine(text.slice(i));
      break;
    }
    out += translateLine(text.slice(i, m.index));
    const tag = m[0];
    /* The wording an attribute carries is wording the reader sees. */
    out += tag.replace(
      /(\b(?:alt|title|aria-label|placeholder|value)=")([^"]*)(")/g,
      (m2, a, v, b) => a + translateLine(v) + b
    );
    i = m.index + tag.length;
  }
  return out;
}

/* The words inside a string in a script. */
function localizeScript(text) {
  /* A word that also names a style or an element must stay as it is. */
  const reserved = new Set();
  for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const s of m[1].matchAll(/["']([^"']+)["']/g)) reserved.add(s[1]);
  }
  for (const m of text.matchAll(/\b(?:id|class|name|data-[\w-]+)="([^"]*)"/g)) {
    reserved.add(m[1]);
    for (const part of m[1].split(/\s+/)) reserved.add(part);
  }
  return text.replace(
    /<script([^>]*)>([\s\S]*?)<\/script>/gi,
    (m, attrs, body) => {
      /* The structured data of the page is handled on its own. */
      if (/ld\+json/i.test(attrs)) return m;
      const out = body.replace(
        /('((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/g,
        (lit, s1, s2, s3) => {
          const raw = s1 ?? s2 ?? s3;
          if (raw === undefined) return lit;
          const val = raw
            .replace(/\\n/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\(['"`\\])/g, '$1');
          /* A link, a path or a name that the page relies on. */
          if (/^(https?:|\/\/|\/|#|\.)/.test(val)) return lit;
          if (reserved.has(val)) return lit;
          if (!/[\u3400-\u9fff]/.test(val) && !/[A-Za-z]{2,}/.test(val)) return lit;
          const single = !/\s/.test(val);
          if (single && !SAFE_IN_CODE.has(val)) return lit;
          const zh = translateLine(val);
          if (zh === val) return lit;
          changedWords += 1;
          /* Put the Chinese back with the same quoting. */
          const q = lit[0];
          const esc = zh
            .replace(/\\/g, '\\\\')
            .replace(new RegExp(q, 'g'), '\\' + q)
            .replace(/\n/g, '\\n');
          return q + esc + q;
        }
      );
      return `<script${attrs}>${out}</script>`;
    }
  );
}

/* The page's own description of itself. */
function scrubSelf(text) {
  let out = text.replace(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    `<script type="application/ld+json">{"@context":"http://schema.org","@type":"LearningResource","name":"乐启享互动课件","publisher":{"@type":"Organization","name":"乐启享机器人"}}</script>`
  );
  out = out.replace(
    /(<meta[^>]+(?:name|property)=["'](?:twitter:title|og:title)["'][^>]*content=)(["'])([\s\S]*?)\2/gi,
    (m, head, q) => `${head}${q}乐启享互动课件${q}`
  );
  return out;
}

for (const [family, dir] of Object.entries(FAMILIES)) {
  const only = arg('only', '');
  if (only) {
    /* One file at a time, for a check on a single lesson. */
    for (const file of only.split(';')) {
      const before = fs.readFileSync(file, 'utf8');
      let after = scrubSelf(before);
      after = localizeHtml(after);
      after = localizeScript(after);
      after = after.replace(/<html[^>]*\slang="(en|en-US|en-GB)"/i, (m) =>
        m.replace(/lang="[^"]*"/, 'lang="zh-CN"')
      );
      if (after === before) continue;
      changedFiles++;
      await writeFileSafe(file, after);
    }
    console.log(`\n${DRY ? 'would change' : 'changed'} ${changedFiles} files, ${changedWords} words`);
    process.exit(0);
  }
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.html')) continue;
    const file = path.join(dir, f);
    const before = fs.readFileSync(file, 'utf8');
    let after = scrubSelf(before);
    after = localizeHtml(after);
    after = localizeScript(after);
    /* The page says what language it is in. */
    after = after.replace(/<html[^>]*\slang="(en|en-US|en-GB)"/i, (m) =>
      m.replace(/lang="[^"]*"/, 'lang="zh-CN"')
    );
    if (after === before) continue;
    changedFiles++;
    if (!DRY) await writeFileSafe(file, after);
  }
  console.log(`${family}: done`);
}

console.log(`\n${DRY ? 'would change' : 'changed'} ${changedFiles} files, ${changedWords} words`);
