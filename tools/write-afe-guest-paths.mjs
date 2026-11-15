#!/usr/bin/env node
// Pull the list of guest endpoints straight out of the server source, so the
// body-level comparison always covers exactly what the server declares.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(ROOT, 'server', 'server.mjs'), 'utf8');
const block = server.slice(server.indexOf('const guest = {'));
const paths = [
  ...new Set([...block.matchAll(/'(\/api\/[a-z0-9/_-]+)'\s*:/g)].map((m) => m[1])),
];
const out = path.join(ROOT, 'recon', 'afe-guest-paths.json');
fs.writeFileSync(out, JSON.stringify(paths, null, 2));
console.log(paths.length, 'guest endpoints ->', path.relative(ROOT, out));
