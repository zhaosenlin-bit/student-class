#!/usr/bin/env node
// Feed craft-anything's js_runtime_code_match with what REA saw running.
// Static side: the saved js_app_map evidence for each site's bundle.
// Runtime side: script URLs + sha256 taken from the bytes the browser received.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = JSON.parse(readFileSync(path.join(ROOT, 'recon', 'runtime-scripts.json'), 'utf8'));

const STATIC = {
  xbjiaoyu: 'ev_7db1cb3f09bc8ef83eaf4ef0d81d70700fa260455b464e9d62bb2b22435e9d01',
  aifunengjiaoyu: 'ev_325181d1a08ff1cb45891f34b7a5a08092441860d0610ac2c779779ed3e2b9aa',
};

for (const [site, evidenceId] of Object.entries(STATIC)) {
  const scripts = runtime[site] ?? [];
  const params = {
    static_evidence: [
      { evidence: { kind: 'saved', evidence_id: evidenceId }, role: 'application' },
    ],
    runtime_scripts: scripts.map((s) => ({ url: s.url, sha256: s.sha256 })),
  };
  const out = path.join(ROOT, 'recon', `craft-runtime-match-${site}.params.json`);
  writeFileSync(out, JSON.stringify(params, null, 2));
  console.log(out);
}
