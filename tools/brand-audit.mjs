#!/usr/bin/env node
/*
 * Brand audit.
 *
 * The library belongs to Leqixiang.  A learner must never meet somebody
 * else's badge, somebody else's "powered by", or a link that walks off to
 * another site -- and the page must not phone anybody's server either.
 *
 * What the law asks for stays: the copyright line and the name of the
 * author live in the NOTICE files and in the comments of the work itself.
 * This tool tells the two apart, so the difference is a decision and not
 * an accident.
 *
 *   node tools/brand-audit.mjs            # report
 *   node tools/brand-audit.mjs --verbose  # also list the offending lines
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');

/* The names that must not show up in front of a learner. */
const BRANDS = [
  ['3JCN', /3\s*J\s*C\s*N\b/gi],
  ['3j.cn', /3j\.cn/gi],
  ['PhET', /\bphet\b/gi],
  ['phet.colorado.edu', /phet\.colorado\.edu/gi],
  ['Aviary', /\baviary\b/gi],
  ['小学学科网', /小学学科网/g],
  ['学科网', /学科网/g],
  ['课本网', /课本网/g],
  ['学科晓', /学科晓/g],
  ['szxuexiao', /szxuexiao/gi],
  ['学乐', /学乐(?!园)/g],
  ['图灵', /图灵/g],
  ['图小灵', /图小灵/g],
  ['Turing', /\bturing\b/gi],
  ['小白', /小白(?!教育)/g],
  ['小白教育', /小白教育/g],
  ['飞象老师', /飞象老师/g],
  ['feixianglaoshi', /feixianglaoshi/gi],
  ['Y(^|ue)xiang', /yuexiang/gi],
];

/* Words that carry the name without meaning to. */
const ALLOWED = [/公子小白/g, /小白在莒/g];

/*
 * A script is read by the browser and not by a reader, but a module
 * that writes HTML strings is read by both: the string it writes ends
 * up on the screen.  So the names that carry a house are looked for in
 * the scripts as well.
 *
 * The names that also live in the address of a course -- phet-, aviary-,
 * lab- and the rest -- are internal handles, not badges, and a script
 * that mentions one of them says nothing to a reader.
 */
const BRANDS_IN_CODE = [
  ['图灵', /图灵/g],
  ['图小灵', /图小灵/g],
  ['小白教育', /小白教育/g],
  ['学乐', /学乐(?!园)/g],
  ['学科网', /学科网/g],
  ['课本网', /课本网/g],
  ['学科晓', /学科晓/g],
  ['3j.cn', /3j\.cn/gi],
  ['new3jcn.com', /new3jcn\.com/gi],
  ['thephysicsaviary.com', /thephysicsaviary\.com/gi],
  ['phet.colorado.edu', /phet\.colorado\.edu/gi],
  ['aifunengjiaoyu', /aifunengjiaoyu/gi],
  ['xbjiaoyu', /xbjiaoyu/gi],
];

/*
 * The pages that write the names down on purpose: the page of
 * licences and of names of this library.  The law asks for the names
 * to be there, so they are there.
 */
const ATTRIBUTION_PAGES = [/[\\/]site[\\/]license\.html$/];

/* Domains that must not be contacted while the lesson runs. */
const HOSTS = [
  /https?:\/\/(?:www\.)?3j\.cn/gi,
  /https?:\/\/phet\.colorado\.edu/gi,
  /https?:\/\/phet\.simuconsult\.com/gi,
  /https?:\/\/cdn\.jsdelivr\.net\/npm\/@phetsims/gi,
  /https?:\/\/www\.xxkx\.com/gi,
  /https?:\/\/(?:www\.|images\.|appsj\.|keben\.|zxkeben\.)?szxuexiao\.com/gi,
  /https?:\/\/[a-z0-9.-]*\.aviary\.com/gi,
  /https?:\/\/www\.googletagmanager\.com/gi,
  /https?:\/\/www\.google-analytics\.com/gi,
];

/*
 * The addresses the server keeps a copy of.  A lesson that names one
 * of them is naming a file that sits on this disk: the server points
 * every such address at the local copy before it hands the page out,
 * and the archive writer does the same for the copy that travels.
 * They are not trips to another site, so they are counted apart.
 */
const MIRRORED = (() => {
  const server = fs.readFileSync(path.join(ROOT, 'server', 'server.mjs'), 'utf8');
  const block = /const LQ_EXT_HOSTS = \[([\s\S]*?)\];/.exec(server);
  const hosts = new Set();
  if (!block) return hosts;
  for (const m of block[1].matchAll(/'(https?:\/\/[^']+)'/g)) {
    const url = new URL(m[1]);
    hosts.add(url.host);
  }
  return hosts;
})();

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(html?|js|mjs|css|json|svg|txt|md)$/i.test(e.name)) out.push(full);
  }
  return out;
};

/* What a learner can actually read: no comments, no source of a script. */
const visibleText = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

const targets = [];
for (const dir of [
  path.join(ROOT, 'mirror', 'leqixiang', 'site'),
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
]) {
  walk(dir, targets);
}

const findings = [];
for (const file of targets) {
  const raw = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  /* The page of names is where the names are written down. */
  if (ATTRIBUTION_PAGES.some((re) => re.test(rel))) continue;
  const text = visibleText(raw);
  for (const [name, re] of BRANDS) {
    re.lastIndex = 0;
    let body = text;
    for (const allowed of ALLOWED) body = body.replace(allowed, ' ');
    re.lastIndex = 0;
    const hits = body.match(re);
    if (hits?.length) {
      /* A script is code, not something a learner reads on the page. */
      const kind = /\.(?:js|mjs)$/i.test(file) ? 'code' : 'visible';
      findings.push({ rel, kind, name, n: hits.length });
      if (VERBOSE) {
        const lines = text
          .split(/\s{2,}|\n/)
          .filter((l) => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(l))
          .slice(0, 4);
        for (const l of lines) console.log(`      ${l.trim().slice(0, 160)}`);
      }
    }
  }
  /*
   * A module that writes HTML strings is read by the reader as well as
   * by the browser, so the names of a house are looked for in the
   * scripts too.  The handles that name a course -- phet-, aviary-,
   * lab- and the rest -- are internal and are not names a reader ever
   * meets, so they are not part of this list.
   */
  if (/\.(?:js|mjs)$/i.test(file)) {
    for (const [name, re] of BRANDS_IN_CODE) {
      re.lastIndex = 0;
      const hits = raw.match(re);
      if (!hits?.length) continue;
      findings.push({ rel, kind: 'code-visible', name, n: hits.length });
      if (VERBOSE) {
        const lines = raw
          .split('\n')
          .filter((l) => re.test(l))
          .slice(0, 4);
        for (const l of lines) console.log(`      ${l.trim().slice(0, 160)}`);
      }
    }
  }
  for (const re of HOSTS) {
    re.lastIndex = 0;
    const hits = raw.match(re);
    if (hits?.length) {
      /*
       * An address the server keeps a copy of is a local file: the
       * server points it at the copy that sits on this disk before the
       * page is handed out.  It is a local address wearing a foreign
       * name, not a trip to another site.
       */
      const foreign = hits.filter((hit) => {
        const at = /^https?:\/\/([^/]+)/.exec(hit);
        return !at || !MIRRORED.has(at[1]);
      });
      if (!foreign.length) continue;
      /*
       * A mention inside a comment is a note about the licence; a
       * mention outside one is something the page actually asks for.
       */
      const withoutComments = raw.replace(/<!--[\s\S]*?-->/g, ' ');
      re.lastIndex = 0;
      const live = withoutComments.match(re);
      /*
       * An address that is asked for — in a tag or in a call — is a
       * request.  An address that is only written down inside a piece
       * of data is a note.
       */
      let asked = 0;
      for (const m of withoutComments.matchAll(re)) {
        const at = /^https?:\/\/([^/]+)/.exec(m[0]);
        if (at && MIRRORED.has(at[1])) continue;
        const around = withoutComments.slice(
          Math.max(0, m.index - 60),
          m.index + m[0].length + 20
        );
        if (
          /(?:src|href|data-src|poster|action)\s*=\s*["']?[^"']*$/i.test(
            around.slice(0, 60)
          ) ||
          /\b(?:fetch|importScripts|import|open)\s*\(\s*["'][^"']*$/i.test(
            around.slice(0, 60)
          )
        ) {
          asked++;
        }
      }
      findings.push({
        rel,
        kind: asked ? 'host' : 'note',
        name: re.source,
        n: asked || foreign.length,
      });
      if (VERBOSE) {
        const lines = raw.split('\n').filter((l) => re.test(l)).slice(0, 3);
        for (const l of lines) console.log(`      ${l.trim().slice(0, 160)}`);
      }
    }
  }
}

/*
 * The catalogue is the directory a learner reads: its title, its
 * description and the name on the card are printed on the page.  A
 * sweep of the files alone never looked inside it, so a name that sat
 * in the data was one click away from being read.  These are the
 * fields the interface shows; the ids, the paths and the attribution
 * columns stay as they are — they are the inner names of the works.
 */
{
  const file = path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json');
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const read = [];
    for (const p of data.products || []) {
      const put = (value) => {
        if (typeof value === 'string' && value.trim()) read.push(value);
      };
      put(p.title);
      put(p.tagline);
      put(p.description);
      put(p.subject);
      put(p.kind);
      put(p.format);
      put(p.device);
      put(p.creatorName);
      for (const s of p.stages || []) put(s);
      for (const f of p.features || []) put(f);
      for (const m of p.modules || []) {
        put(m.title);
        put(m.description);
      }
      for (const t of p.taxonomy || []) {
        put(t.domain);
        put(t.chapter);
        for (const topic of t.topics || []) put(topic);
      }
    }
    for (const [name, re] of BRANDS) {
      re.lastIndex = 0;
      const hits = read.filter((text) => {
        re.lastIndex = 0;
        return re.test(text);
      });
      if (hits.length) {
        findings.push({
          rel: 'mirror/leqixiang/catalog.json',
          kind: 'visible',
          name,
          n: hits.length,
          sample: hits.slice(0, 3),
        });
      }
    }
  }
}

const visible = findings.filter((f) => f.kind === 'visible');
const hosts = findings.filter((f) => f.kind === 'host');
const code = findings.filter((f) => f.kind === 'code');
const codeVisible = findings.filter((f) => f.kind === 'code-visible');
const notes = findings.filter((f) => f.kind === 'note');

const byName = new Map();
for (const f of visible) {
  const k = f.name;
  byName.set(k, (byName.get(k) || 0) + f.n);
}

console.log(`审计文件：${targets.length}`);
console.log(`可见文案里的别家品牌：${visible.length ? '有' : '没有'}`);
for (const [name, n] of [...byName].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${n}`);
  for (const f of visible.filter((x) => x.name === name).slice(0, 6)) {
    console.log(`    ${f.rel}  ×${f.n}`);
  }
}
console.log(`指向别家服务器的链接：${hosts.length ? '有' : '没有'}`);
for (const f of hosts.slice(0, 12)) console.log(`  ${f.rel}  ${f.name} ×${f.n}`);
console.log(`只写在许可声明里的署名：${notes.length ? '有' : '没有'}（按许可要求保留）`);
console.log(`脚本里的别家标识（不可见，仅记录）：${code.length ? '有' : '没有'}`);
for (const f of code.slice(0, 10)) console.log(`  ${f.rel}  ${f.name} ×${f.n}`);
console.log(
  `脚本里会写到屏幕上的别家品牌：${codeVisible.length ? '有' : '没有'}`
);
for (const f of codeVisible.slice(0, 12)) console.log(`  ${f.rel}  ${f.name} ×${f.n}`);

if (visible.length || hosts.length || codeVisible.length) process.exitCode = 1;
