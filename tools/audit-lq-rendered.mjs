#!/usr/bin/env node
/*
 * What a reader really sees, and where the page really goes.
 *
 * The static audits read the files on disk.  That is not the same
 * thing: a page may print a name that lives inside a script, a frame
 * may pull a banner out of a file the reader never opens by hand, and
 * a lesson may quietly ask somebody else's server for the rest of
 * itself.  This tool opens the delivered library in a browser and
 * reads the two things that matter -- the text on the glass, and the
 * list of hosts the page touches.
 *
 *   node tools/audit-lq-rendered.mjs                 # the default walk
 *   LQ_ROUTES="#catalog,#course/afe-846" node ...    # a chosen walk
 *   node tools/audit-lq-rendered.mjs --verbose       # show the lines
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdp2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const VERBOSE = process.argv.includes('--verbose');

/* A name that must not stand in front of a reader of this library. */
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
  ['图灵', /图灵/g],
  ['Turing', /\bturing\b/gi],
  ['小白', /小白(?!教育)/g],
  ['yuexiang', /yuexiang/gi],
  ['aifunengjiaoyu', /aifunengjiaoyu/gi],
  ['xbjiaoyu', /xbjiaoyu/gi],
  ['3jcn', /\b3jcn\b/gi],
  ['new3jcn', /new3jcn/gi],
  ['labsims', /labsims/gi],
  ['blocklygames', /blocklygames/gi],
  ['tongjiang', /童将|tongjiang/gi],
  ['openlab', /\bopenlab\b/gi],
];

/* A number or an address that is somebody else's business. */
const SENSITIVE = [
  ['手机号', /(?<![\w.-])1[3-9]\d{9}(?![\w.-])/g],
  ['邮箱', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ['客服电话', /(?:客服|联系电话|服务热线|咨询热线)\s*[:：]?\s*[\d-]{7,}/g],
  ['微信号', /微信(?:号|群|联系)?\s*[:：]?\s*[A-Za-z0-9_-]{5,}/g],
  ['QQ号', /\bQQ\s*[:：]?\s*\d{6,12}\b/g],
];

/* Ours.  Our own site is the one address the library may name. */
const OURS = ['codebn.cn', '乐启享', '鄂ICP备2025149404号-1'];

/* A route is a page of the shell. */
const DEFAULT_ROUTES = [
  '#works',
  '#catalog',
  '#course/afe-846',
  '#course/afe-754',
  '#course/phet-beers-law-lab',
  '#course/aviary-EstimatingGraduatedCylinderMS',
  '#course/labsims-cell-biology-neuron',
  '#course/lab-phyc240-two-lenses',
  '#course/openlab-simple-pendulum',
  '#course/tongjiang-haber-step',
  '#course/blocklygames-puzzle',
  '#course/measurement-motion',
];

const routes = (process.env.LQ_ROUTES || DEFAULT_ROUTES.join(',')).split(',').filter(Boolean);

const browser = await connect(CDP);
await browser.raw('Emulation.setDeviceMetricsOverride',
  { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false }, browser.pageSession);

/* Every host the page asked for, no matter which frame asked. */
const hosts = new Map();
const noteHost = (url) => {
  if (!url || !/^https?:/i.test(url)) return;
  let host;
  try {
    host = new URL(url).host;
  } catch {
    return;
  }
  hosts.set(host, (hosts.get(host) || 0) + 1);
};

/*
 * The text of the page and of every frame inside it.  A frame of the
 * same origin can be read from the top document; the courseware runs
 * in a frame of its own, so the walk has to go in.
 */
const READ_TEXT = [
  '(() => {',
  '  const out = [];',
  '  const seen = new Set();',
  '  const walk = (doc, depth) => {',
  '    if (!doc || depth > 4 || seen.has(doc)) return;',
  '    seen.add(doc);',
  '    out.push(doc.body ? (doc.body.innerText || "") : "");',
  '    const frames = doc.querySelectorAll("iframe,frame");',
  '    for (const f of frames) {',
  '      try { walk(f.contentDocument, depth + 1); } catch (e) {}',
  '    }',
  '  };',
  '  walk(document, 0);',
  '  return out.join("\\n");',
  '})()',
].join('\n');

/*
 * A simulation keeps its own menu, and the menu is only read after it
 * is opened.  So the walk opens it: the button in the corner of the
 * simulation is pressed, and the words that come out of it are read as
 * well.  A reader is going to press that button too.
 */
const OPEN_MENU = [
  '(() => {',
  '  const docs = [];',
  '  const seen = new Set();',
  '  const walk = (doc) => {',
  '    if (!doc || seen.has(doc)) return;',
  '    seen.add(doc);',
  '    docs.push(doc);',
  '    for (const f of doc.querySelectorAll("iframe,frame")) {',
  '      try { walk(f.contentDocument); } catch (e) {}',
  '    }',
  '  };',
  '  walk(document);',
  '  let pressed = 0;',
  '  for (const doc of docs) {',
  '    const buttons = [...doc.querySelectorAll("button,[role=button]")];',
  '    for (const b of buttons) {',
  '      const label = [b.getAttribute("aria-label"), b.getAttribute("title"), b.textContent]',
  '        .filter(Boolean).join(" ");',
  '      if (/菜单|Menu|关于|About/i.test(label) && !b.dataset.lqOpened) {',
  '        b.dataset.lqOpened = "1";',
  '        try { b.click(); pressed++; } catch (e) {}',
  '      }',
  '    }',
  '  }',
  '  return pressed;',
  '})()',
].join('\n');

const findings = [];

for (const route of routes) {
  const url = `http://localhost:${PORT}/${route}`;
  await browser.goto(url);
  await sleep(2600);

  let text = '';
  try {
    text = await browser.evaluate(READ_TEXT);
  } catch (e) {
    findings.push({ route, name: '读取失败', n: 1, sample: String(e.message).slice(0, 120) });
    continue;
  }

  const check = (name, re, hay) => {
    re.lastIndex = 0;
    const hits = (hay.match(re) || []).filter((h) => !OURS.some((o) => h.includes(o)));
    if (!hits.length) return;
    findings.push({ route, name, n: hits.length, sample: hits.slice(0, 3) });
    if (VERBOSE) {
      for (const line of hay.split('\n')) {
        re.lastIndex = 0;
        if (re.test(line)) console.log(`      ${line.trim().slice(0, 150)}`);
      }
    }
  };

  for (const [name, re] of BRANDS) check(name, re, text);
  for (const [name, re] of SENSITIVE) check(name, re, text);

  /* The words that only show up once a menu is opened. */
  let opened = 0;
  try {
    opened = Number(await browser.evaluate(OPEN_MENU)) || 0;
  } catch (e) {
    /* A page without a menu is not a problem. */
  }
  if (opened) {
    await sleep(1400);
    let more = '';
    try {
      more = await browser.evaluate(READ_TEXT);
    } catch (e) {
      more = '';
    }
    for (const [name, re] of BRANDS) check(name, re, more);
    for (const [name, re] of SENSITIVE) check(name, re, more);
  }

  const title = await browser.evaluate('document.title').catch(() => '');
  const chars = text.replace(/\s+/g, ' ').trim().length;
  console.log(`已读 ${route}  标题=${title}  可见文字=${chars} 字${opened ? `  打开菜单 ${opened} 处` : ''}`);
}

/* The hosts the walk touched. */
for (const ev of browser.events) {
  if (ev.method === 'Network.requestWillBeSent') noteHost(ev.params?.request?.url);
  if (ev.method === 'Network.webSocketCreated') noteHost(ev.params?.url);
}

const foreign = [...hosts.entries()].filter(([h]) =>
  !/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(h) && !/^codebn\.cn$/.test(h));

console.log('');
console.log(`走过 ${routes.length} 个页面`);
if (!findings.length) {
  console.log('渲染后的可见文字：没有别家品牌，没有敏感信息');
} else {
  console.log(`渲染后的可见文字：${findings.length} 处`);
  for (const f of findings) {
    console.log(`  ${f.route}  ${f.name} ×${f.n}  ${JSON.stringify(f.sample)}`);
  }
}
if (!foreign.length) {
  console.log('对外请求：没有，全部落在本机');
} else {
  console.log(`对外请求：${foreign.length} 个域名`);
  for (const [h, n] of foreign) console.log(`  ${h} ×${n}`);
}

await browser.close();
process.exit(findings.length || foreign.length ? 1 : 0);
