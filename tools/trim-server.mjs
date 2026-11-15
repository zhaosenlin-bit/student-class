#!/usr/bin/env node
/*
 * One library, one port.
 *
 * The tree still carried the two comparison servers: the 小白教育
 * catalogue on its own, and the 图灵智赋 site as it was published. Both
 * were switched off by default, but their handlers, their profiles and
 * their ports were still in the file, which meant two ways for the
 * library to be served and no way to tell which one was live.
 *
 * This removes them. It is a mechanical edit, so it checks its own work:
 * the file has to parse, and nothing that the live port uses may be
 * touched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'server', 'server.mjs');

let src = fs.readFileSync(FILE, 'utf8');
const before = src.length;

const cut = (from, to, label) => {
  const start = src.indexOf(from);
  if (start < 0) throw new Error(`trim-server: ${label} not found`);
  const end = to ? src.indexOf(to, start) : src.length;
  if (end < 0) throw new Error(`trim-server: ${label} has no end`);
  src = src.slice(0, start) + src.slice(end);
};

/*
 * The 图灵智赋 section of the file: its state, its helpers and its
 * request handler. The shared helpers above it (rewriteCoursewareUrls,
 * patchLqBody) belong to the live port and stay.
 */
const SECTION = '/* ------------------------------------------------------------------ *\n * 图灵智赋 (aifunengjiaoyu.com)';
const sectionStart = src.indexOf(SECTION);
if (sectionStart < 0) throw new Error('trim-server: the section was not found');
const anchor = src.indexOf('const XB_PORT = Number(process.env.XB_PORT || 4173);');
if (anchor < 0) throw new Error('trim-server: the port block was not found');
const separator = src.lastIndexOf('/* ------------------------------------------------------------------ */', anchor);
if (separator < 0 || separator < sectionStart) {
  throw new Error('trim-server: the separator was not found');
}
src = src.slice(0, sectionStart) + src.slice(separator);

/* The two extra ports and the note about them. */
const portsBefore = src.slice(
  src.indexOf('const XB_PORT = Number('),
  src.indexOf('const XB_PORT = Number(') + 700
);
const portsAfter = portsBefore.replace(
  /\/\*[\s\S]*?\*\/\nconst AFE_PORT = Number\(process\.env\.AFE_PORT \|\| 0\);\n/,
  ''
)
  .replace('const XB_REF_PORT = Number(process.env.XB_REF_PORT || 0);\n', '');
src = src.replace(portsBefore, portsAfter);

/* The second profile, which only the second port used. */
cut(
  'const xbProfile = makeProfile({',
  'const xbServer = http.createServer((req, res) => {',
  'the second profile'
);

/* The two servers that were never started, and the two listeners. */
cut(
  'const xbRefServer = http.createServer((req, res) => {',
  'xbServer.listen(XB_PORT',
  'the extra servers'
);
const listeners = src.indexOf('if (XB_REF_PORT > 0) {');
if (listeners < 0) throw new Error('trim-server: the extra listeners were not found');
const listenEnd = src.indexOf('\n}\n', src.indexOf('afeServer.listen(AFE_PORT'));
if (listenEnd < 0) throw new Error('trim-server: the extra listeners have no end');
src = src.slice(0, listeners) + src.slice(listenEnd + 3);

/* Nothing that the live port needs may go with them. */
const keep = [
  'function rewriteCoursewareUrls(',
  'function patchLqBody(',
  'function loadXb(',
  'async function handleXb(',
  'async function handleXbApi(',
  'const lqProfile = makeProfile({',
  'xbServer.listen(XB_PORT',
];
for (const name of keep) {
  if (!src.includes(name)) throw new Error('trim-server: lost ' + name);
}
const gone = [
  'handleAfe',
  'afeServer',
  'xbRefServer',
  'xbProfile',
  'AFE_PORT',
  'XB_REF_PORT',
  'loadAfe',
  'afePremiumLeases',
];
for (const name of gone) {
  if (src.includes(name)) throw new Error('trim-server: ' + name + ' is still there');
}

fs.writeFileSync(FILE, src);
console.log(`server/server.mjs: ${before} -> ${src.length} bytes`);
