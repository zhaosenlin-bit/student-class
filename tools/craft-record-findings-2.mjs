#!/usr/bin/env node
// Second batch of findings for the craft-anything project: what the static
// graph says about the front-end's own request signing, and what the two
// probes established about the live site's answers.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'craft-anything', 'target', 'release', 'craft-anything-cli.exe');
const PROJECT = path.join(ROOT, 'recon', 'craft');

const run = (args) => {
  const r = spawnSync(CLI, ['--deep', '--project', PROJECT, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status !== 0) throw new Error(`${args[0]} failed: ${out}`);
  try {
    return JSON.parse(out);
  } catch {
    return { raw: out };
  }
};

const E = {
  xbMapAll: 'ev_7db1cb3f09bc8ef83eaf4ef0d81d70700fa260455b464e9d62bb2b22435e9d01',
  afeMapAll: 'ev_325181d1a08ff1cb45891f34b7a5a08092441860d0610ac2c779779ed3e2b9aa',
  xbMatch: 'ev_c9b2d4bf9cf1c30e41ce95da2ab2faed484dedbd1eabd670d5deb35ec3a8ec22',
  afeMatch: 'ev_d5d26bb9c6cd608f62cf5bef28e808ad57cae0bc168244e80ec93c31081b09da',
};

const findings = [
  {
    statement:
      'The 小白教育 shell signs every POST with X-Requested-With: studio (the string sits next to the classroom endpoints in app.js), and the live server refuses a POST that arrives without a matching Origin — that guard is why a POST answered by the live site is 403 请求来源不匹配 rather than a route result.',
    evidence: [E.xbMapAll],
    confidence: 'observed',
  },
  {
    statement:
      'The live 图灵智赋 server answers any path it does not know — including a known route called with the wrong method — with Express\'s own "Cannot GET /path" HTML page rather than JSON, so the front-end\'s response.json() throws online exactly as it does on the local replica.',
    evidence: [E.afeMapAll, E.afeMatch],
    confidence: 'observed',
  },
];

for (const f of findings) {
  const r = run([
    'core_finding_record',
    '--statement',
    f.statement,
    '--evidence-ids',
    JSON.stringify(f.evidence),
    '--confidence',
    f.confidence,
  ]);
  console.log('finding:', JSON.stringify(r).slice(0, 160));
}
