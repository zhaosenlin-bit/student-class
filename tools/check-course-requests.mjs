#!/usr/bin/env node
/*
 * What does a lesson ask for, and does it get it?
 *
 * A lesson can look perfect on the screen and still be missing a
 * picture: the picture is asked for, the answer never comes, and the
 * page shows an empty frame.  The only way to know is to watch the
 * requests the lesson makes and see which ones failed.
 *
 * This opens a lesson, watches every request and every message the
 * page writes to the console, and writes down what did not arrive.
 *
 *   node tools/check-course-requests.mjs --base http://127.0.0.1:4180 --id lq-596
 */
import { connect, sleep } from './cdpx.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = arg('base', 'http://127.0.0.1:4180').replace(/\/+$/, '');
const ID = arg('id', '');
const CDP = Number(arg('cdp', 9333));
const WAIT = Number(arg('wait', 9000));

if (!ID) {
  console.error('要用 --id 指明一门课件。');
  process.exit(1);
}

/* The network has to be watched, so this one is not quiet. */
const browser = await connect(CDP, null, { quiet: false });
const failed = [];
const errors = [];
const asked = new Set();

browser.on((m) => {
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    asked.add(r.url);
    if (r.status >= 400) failed.push(`${r.status} ${r.url}`);
  }
  if (m.method === 'Network.loadingFailed') {
    failed.push(`失败 ${m.params.errorText} ${m.params.type}`);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    const text = (m.params.args || [])
      .map((a) => (a.value !== undefined ? a.value : a.description || ''))
      .join(' ')
      .trim();
    if (text) errors.push(text);
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails || {};
    errors.push(d.text || (d.exception && d.exception.description) || '未知错误');
  }
});

await browser.goto(`${BASE}/courseware/${encodeURIComponent(ID)}/index.html`);
await sleep(WAIT);

const picture = await browser.evaluate(`(() => {
  const imgs = [...document.querySelectorAll('img')];
  const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
  return {
    title: document.title,
    nodes: document.querySelectorAll('*').length,
    images: imgs.length,
    broken,
    canvases: document.querySelectorAll('canvas').length,
  };
})()`);

console.log(`${ID}  ${BASE}/courseware/${ID}/index.html`);
console.log(`  标题      ${picture.title}`);
console.log(`  节点      ${picture.nodes}`);
console.log(`  图片      ${picture.images} 张，裂开的 ${picture.broken.length} 张`);
console.log(`  画布      ${picture.canvases} 个`);
for (const b of picture.broken) console.log(`    裂开  ${b}`);
console.log(`  请求      ${asked.size} 个`);
if (args.includes('--list')) {
  for (const u of [...asked].sort()) console.log(`    ${u}`);
}
console.log(`  失败      ${failed.length} 个`);
for (const f of failed) console.log(`    ${f}`);
console.log(`  报错      ${errors.length} 条`);
for (const e of errors) console.log(`    ${e}`);

const bad = failed.length + errors.length + picture.broken.length;
console.log('');
console.log(bad ? '有问题。' : '没问题：所有东西都取到了。');
process.exit(bad ? 1 : 0);
