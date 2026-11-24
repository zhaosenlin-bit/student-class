#!/usr/bin/env node
/*
 * Sensitive information in front of a reader.
 *
 * The library belongs to 乐启享 and nobody else, so nothing of another
 * house may show through: not a badge, not a phone number, not a
 * mailbox, not a group chat, not a filing number.  The attribution
 * that the licence asks for is a name in a NOTICE file; a customer
 * service number in the middle of a lesson is not attribution, it is
 * somebody else's business left standing in our front room.
 *
 *   node tools/audit-lq-sensitive.mjs            # report
 *   node tools/audit-lq-sensitive.mjs --verbose  # show the lines
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');

const RULES = [
  /*
   * A number inside a file name is a hash, not a telephone number, so
   * the rule asks for a word boundary on both sides.  Without it every
   * cover called "b017b74d18533067124e350d…" was a false alarm.
   */
  ['手机号', /(?<![\w.-])1[3-9]\d{9}(?![\w.-])/g],
  ['邮箱', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ['微信号', /微信(?:号|群|联系)?\s*[:：]?\s*[A-Za-z0-9_-]{5,}/g],
  ['QQ号', /\bQQ\s*[:：]?\s*\d{6,12}\b/g],
  ['备案号', /[\u4e00-\u9fa5]ICP备[\d-]+号(?:-\d+)?/g],
  ['统一社会信用代码', /统一社会信用代码\s*[:：]?\s*([0-9A-HJ-NPQRTUWXY]{18})/g],
  ['客服电话', /(?:客服|联系电话|服务热线|咨询热线)\s*[:：]?\s*[\d-]{7,}/g],
  ['身份证号', /身份证(?:号)?\s*[:：]?\s*(\d{17}[\dXx])/g],
];

/* Our own details are the point of the library; they stay. */
const OURS = [
  'codebn.cn',
  '鄂ICP备2025149404号-1',
];

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
    /* Only the pages a reader looks at. A data file full of numbers is
       not a phone number; it is a landscape. */
    else if (/\.html?$/i.test(e.name)) out.push(full);
  }
  return out;
};

/*
 * The shell is made of scripts, and a script writes the very same words
 * a page writes: the about dialog and the footer live in app.js, so a
 * sweep of the HTML alone never saw them.  The scripts of the shell are
 * therefore read as they stand.
 */
const shellScripts = (dir) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && /\.js$/i.test(e.name))
    .map((e) => path.join(dir, e.name));
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
const scripts = shellScripts(path.join(ROOT, 'mirror', 'leqixiang', 'site'));
const catalogue = path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json');

const findings = [];
for (const file of [...targets, ...scripts, catalogue]) {
  const raw = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  /* A script has no tags to strip: what it holds is what it may show. */
  const text = file.endsWith('.js') ? raw : visibleText(raw);
  for (const [name, re] of RULES) {
    re.lastIndex = 0;
    const hits = (text.match(re) || []).filter((h) => !OURS.includes(h));
    if (!hits.length) continue;
    findings.push({ rel, name, n: hits.length, sample: hits.slice(0, 3) });
    if (VERBOSE) {
      const lines = text
        .split(/\s{2,}|\n/)
        .filter((l) => re.test(l))
        .slice(0, 3);
      for (const l of lines) console.log(`      ${l.trim().slice(0, 150)}`);
    }
  }
}

console.log(`审计文件：${targets.length + scripts.length + 1}`);
if (!findings.length) {
  console.log('可见文案里的敏感信息：没有');
} else {
  console.log(`可见文案里的敏感信息：${findings.length} 处`);
  const byName = new Map();
  for (const f of findings) byName.set(f.name, (byName.get(f.name) || 0) + f.n);
  for (const [name, n] of [...byName].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name}: ${n}`);
    for (const f of findings.filter((x) => x.name === name).slice(0, 8)) {
      console.log(`    ${f.rel}  ×${f.n}  ${f.sample.join(' ')}`);
    }
  }
  process.exitCode = 1;
}
