#!/usr/bin/env node
/* Show the requests a REA capture made, with their status codes. */
import fs from 'node:fs';

const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');
let json;
try {
  json = JSON.parse(raw);
} catch {
  json = JSON.parse(raw.slice(raw.indexOf('{')));
}
const items = (json.normalized_result || json).events?.items || [];

const flatten = (value) => {
  const out = [];
  const walk = (v, depth) => {
    if (!v || typeof v !== 'object' || depth > 4) return;
    for (const [k, val] of Object.entries(v)) {
      if (k === 'url' || k === 'status' || k === 'method') {
        out.push(`${k}=${typeof val === 'object' ? JSON.stringify(val) : val}`);
      }
      walk(val, depth + 1);
    }
  };
  walk(value, 0);
  return out;
};

for (const e of items) {
  if (e.kind !== 'response') continue;
  const parts = flatten(e);
  const status = parts.find((p) => p.startsWith('status='));
  const url = parts.find((p) => p.startsWith('url='));
  console.log(`${String(status ?? '?').padEnd(12)} ${String(url ?? '?').slice(0, 100)}`);
}
