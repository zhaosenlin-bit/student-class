#!/usr/bin/env node
/*
 * Open each requested 小白教育 course locally and confirm the lesson UI
 * rendered (the courseware stays blocked unless the classroom handshake with
 * the local shell succeeds).
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = 'C:/kaifa/xiaobai-class';
const ids = process.argv.slice(2);
const NODE = 'C:/kaifa/xiaobai-class/tools/node24/node-v24.22.3-win-x64/node.exe';
const REA = 'C:/Users/Administrator/AppData/Roaming/npm/node_modules/rea-agents/scripts/rea.mjs';
// Heavier lessons build their scene lazily, so the settle time is tunable.
const SETTLE = Number(process.env.SETTLE_MS || 5000);

for (const id of ids) {
  const scenario = {
    browser: {
      mode: 'launch',
      executable_path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
    },
    start_url: { url: `http://localhost:4173/#play/${id}` },
    actions: [
      { step_id: 'settle', 'action': 'wait_for_timeout', duration_ms: SETTLE },
    ],
    capture: {
      at_end: ['url', 'screenshot', 'accessibility'],
      events: ['console', 'page-errors'],
    },
    command_timeout_ms: 60000,
  };
  const file = path.join(ROOT, 'recon', `scenario-play-${id}.json`);
  fs.writeFileSync(file, JSON.stringify(scenario, null, 2));

  const out = path.join(ROOT, 'recon', 'captures', `play-${id}.json`);
  await run(NODE, [REA, 'capture-browser-scenario', file, '--json'], {
    cwd: ROOT,
    maxBuffer: 256 * 1024 * 1024,
  }).then(
    (r) => fs.writeFileSync(out, r.stdout),
    (e) => fs.writeFileSync(out, e.stdout || String(e))
  );

  let capture;
  try {
    capture = JSON.parse(fs.readFileSync(out, 'utf8'));
  } catch {
    console.log(`${id.padEnd(30)} CAPTURE OUTPUT NOT JSON`);
    continue;
  }
  if (capture.error) {
    console.log(`${id.padEnd(30)} CAPTURE ERROR`);
    continue;
  }
  const result = capture.normalized_result;
  const last = result.steps[result.steps.length - 1];
  const shot = last.artifacts.screenshot;
  if (shot && shot.state === 'captured') {
    fs.writeFileSync(
      path.join(ROOT, 'recon', 'captures', `play-${id}.png`),
      Buffer.from(shot.value.data_base64, 'base64')
    );
  }
  const errors = (result.events.items || [])
    .filter((e) => e.kind === 'page-error' || (e.kind === 'console' && e.level === 'error'))
    .map((e) => e.message || e.text);
  console.log(`${id.padEnd(30)} ${errors.length ? 'ERRORS: ' + errors.join(' | ') : 'clean'}`);
}
