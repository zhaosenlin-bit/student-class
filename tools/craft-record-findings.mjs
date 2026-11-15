#!/usr/bin/env node
// Write the brief and the settled findings into the craft-anything project so
// its report has something to say. Findings must cite evidence that exists.
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
  xbTriage: 'ev_d0bc8c725d47e731ded50ecaa5877e12a79d04bca695440e5bd6137121f8f30a',
  xbMapOne: 'ev_fa8b639f9ca87a1da2505fb3ecbbc9f63d2fb970b2e2b46efe6f890e58694f64',
  xbMapAll: 'ev_7db1cb3f09bc8ef83eaf4ef0d81d70700fa260455b464e9d62bb2b22435e9d01',
  xbMatch: 'ev_c9b2d4bf9cf1c30e41ce95da2ab2faed484dedbd1eabd670d5deb35ec3a8ec22',
  afeTriage: 'ev_2ff969dd2b83c5765e903321aadc19f1aff7de260255b0ec9d3f9493c3018f7c',
  afeMapOne: 'ev_8ea2b996627f62bd56eec75fb229657158ec5f49289258619f651d454988503e',
  afeMapAll: 'ev_325181d1a08ff1cb45891f34b7a5a08092441860d0610ac2c779779ed3e2b9aa',
  afeMatch: 'ev_d5d26bb9c6cd608f62cf5bef28e808ad57cae0bc168244e80ec93c31081b09da',
};

const brief = run([
  'core_brief_write',
  '--question',
  'What does the front-end of xbjiaoyu.com and aifunengjiaoyu.com call, and what must a local server answer so both sites stay usable offline with the original code?',
  '--purpose',
  'Interoperability: serve the mirrored front-end byte-for-byte and shim only the APIs it actually calls, so the local copy behaves like the live one.',
  '--targets',
  JSON.stringify([
    'https://xbjiaoyu.com/#catalog',
    'https://aifunengjiaoyu.com/',
    path.join(ROOT, 'mirror', 'xbjiaoyu', 'assets'),
    path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'assets'),
  ]),
  '--constraints',
  JSON.stringify([
    'No payment or unlock path: paid courseware stays unavailable locally.',
    'Front-end code is reused byte-for-byte; only the API layer is written from scratch.',
    'Everything must work with the network disconnected.',
  ]),
  '--done-when',
  'Every literal endpoint the bundles call is answered locally with the same status the live site gives, the 53 小白教育 courseware files and the 12 图灵智赋 programme pages open, and no page requests anything off this machine.',
]);
console.log('brief:', JSON.stringify(brief).slice(0, 200));

const findings = [
  {
    statement:
      '小白教育\'s front-end calls only four literal API paths, and the only one the classroom itself needs is POST /api/classroom/release; everything else is static. The 550-course catalogue and the 53 playable courseware documents are therefore front-end data, not server data.',
    evidence: [E.xbMapOne, E.xbMapAll, E.xbTriage],
    confidence: 'observed',
  },
  {
    statement:
      '图灵智赋\'s front-end is far more talkative: 61 literal API paths covering the programme catalogue (/api/programs and friends), ratings, trials, inquiries, 长征 playback (/api/programs/{id}/long-march-playback/{action}), 图小灵 materials (/tuxiaoling/api/materials) and creator uploads. Those are exactly the endpoints the local server has to answer.',
    evidence: [E.afeMapOne, E.afeMapAll, E.afeTriage],
    confidence: 'observed',
  },
  {
    statement:
      'The mirror is faithful: hashing the bytes the browser actually received in a REA browser capture gives the same digest as craft-anything\'s static module for all 30 小白教育 modules and all 21 图灵智赋 modules that the browse page loads, so the files served locally are the files the live site publishes.',
    evidence: [E.xbMatch, E.afeMatch, E.xbMapAll, E.afeMapAll],
    confidence: 'derived',
  },
  {
    statement:
      'Four 图灵智赋 modules were not seen running on the browse page (admin-large/runtime/public-lease.mjs, the two long-march host shims and vendor/html2canvas.min.js); html2canvas is loaded on demand when a user exports an image, and the other three belong to admin and playback paths the guest page never opens.',
    evidence: [E.afeMatch],
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
