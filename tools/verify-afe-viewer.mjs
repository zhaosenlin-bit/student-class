#!/usr/bin/env node
/*
 * Install a stub courseware for one 图灵智赋 program, open its detail modal
 * and press "立即使用", then report which requests the viewer actually made.
 * That pins down the exact /api/program-file handshake the shell expects.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = 'C:/kaifa/xiaobai-class';
const NODE = 'C:/kaifa/xiaobai-class/tools/node24/node-v24.22.3-win-x64/node.exe';
const REA = 'C:/Users/Administrator/AppData/Roaming/npm/node_modules/rea-agents/scripts/rea.mjs';
const SLOT_DIR = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const PROGRAM_ID = process.argv[2] || '13';
const TITLE = process.argv[3] || 'AR';

const stub = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>本地课件 ${PROGRAM_ID}</title>
<style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;display:grid;
place-items:center;height:100vh;margin:0}main{text-align:center}
h1{font-size:32px}#n{font-size:64px;font-weight:700}</style></head>
<body><main><h1>本地课件已加载 ✓</h1><div id="n">${PROGRAM_ID}</div>
<p>来自 mirror/aifunengjiaoyu/courseware/${PROGRAM_ID}.html</p></main>
<script>document.getElementById('n').dataset.ready='1';</script></body></html>`;

fs.mkdirSync(SLOT_DIR, { recursive: true });
const slot = path.join(SLOT_DIR, `${PROGRAM_ID}.html`);
fs.writeFileSync(slot, stub);

const scenario = {
  browser: {
    mode: 'launch',
    executable_path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  },
  start_url: { url: 'http://localhost:4174/#browse' },
  actions: [
    { step_id: 'settle', action: 'wait_for_timeout', duration_ms: 3000 },
    {
      step_id: 'open-card',
      action: 'click',
      locator: { kind: 'css', selector: `text=${TITLE} >> nth=0` },
      timeout_ms: 15000,
    },
    { step_id: 'wait-modal', action: 'wait_for_timeout', duration_ms: 2000 },
    {
      step_id: 'use',
      action: 'click',
      locator: { kind: 'css', selector: 'button.detail-use-btn' },
      timeout_ms: 15000,
    },
    { step_id: 'after-use', action: 'wait_for_timeout', duration_ms: 6000 },
  ],
  capture: {
    at_end: ['url', 'screenshot'],
    events: ['console', 'page-errors', 'network'],
  },
  command_timeout_ms: 60000,
};

const file = path.join(ROOT, 'recon', `scenario-afe-viewer-${PROGRAM_ID}.json`);
fs.writeFileSync(file, JSON.stringify(scenario, null, 2));
const out = path.join(ROOT, 'recon', 'captures', `afe-viewer-${PROGRAM_ID}.json`);

try {
  const r = await run(NODE, [REA, 'capture-browser-scenario', file, '--json'], {
    cwd: ROOT,
    maxBuffer: 256 * 1024 * 1024,
  });
  fs.writeFileSync(out, r.stdout);
} catch (e) {
  fs.writeFileSync(out, e.stdout || String(e));
} finally {
  fs.unlinkSync(slot);
}

const capture = JSON.parse(fs.readFileSync(out, 'utf8'));
if (capture.error) {
  console.log('capture error:', JSON.stringify(capture).slice(0, 300));
  process.exit(0);
}
const result = capture.normalized_result;
for (const s of result.steps) {
  console.log(`STEP ${s.step_id.padEnd(12)} ${s.status}${s.error ? ' ' + JSON.stringify(s.error).slice(0, 200) : ''}`);
}
const req = new Map();
for (const e of result.events.items) {
  if (e.kind === 'request') req.set(e.transaction_id, e.url?.url || e.url);
}
for (const e of result.events.items) {
  if (e.kind === 'response' && /program-file|trials|premium/.test(req.get(e.transaction_id) || ''))
    console.log(`  HTTP ${e.status} ${req.get(e.transaction_id)}`);
  if (e.kind === 'request-failed' && /program-file|trials/.test(e.url?.url || ''))
    console.log(`  FAIL ${e.url.url} ${e.failure}`);
  if (e.kind === 'console' && e.level === 'error') console.log(`  console-error ${e.text}`);
}
const shot = result.steps[result.steps.length - 1].artifacts.screenshot;
if (shot && shot.state === 'captured') {
  const png = path.join(ROOT, 'recon', 'captures', `local-afe-viewer-${PROGRAM_ID}.png`);
  fs.writeFileSync(png, Buffer.from(shot.value.data_base64, 'base64'));
  console.log('screenshot ->', png);
}
