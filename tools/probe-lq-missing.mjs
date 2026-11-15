#!/usr/bin/env node
/*
 * Follow one course and report where a missing file was asked for.
 *
 *   node tools\probe-lq-missing.mjs afe-599
 */
import { connect, sleep } from './cdpx.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const id = process.argv[2];
const wait = Number(process.env.LQ_WAIT || 6000);

const p = await connect(9222);
const mark = p.events.length;
await p.goto(`http://localhost:${PORT}/courseware/${id}.html`);
await sleep(wait);

const seen = p.events.slice(mark).filter((e) => e.method === 'Network.requestWillBeSent');
const missing = new Set();
for (const e of p.events.slice(mark)) {
  if (e.method === 'Network.responseReceived' && e.params.response.status >= 400) {
    missing.add(e.params.response.url);
  }
}
for (const url of missing) {
  const req = seen.find((e) => e.params.request.url === url);
  console.log(`\n404 ${url}`);
  const ini = req?.params?.initiator || {};
  console.log(`   initiator: ${ini.type} ${(ini.url || '').slice(0, 140)}:${ini.lineNumber}`);
  const frame = req?.params?.frameId;
  if (frame) {
    const ctx = p.contexts.get(frame);
    console.log(`   frame: ${ctx?.url?.slice(0, 160)}`);
  }
}

const offsite = [
  ...new Set(
    seen.map((e) => e.params.request.url).filter((u) => !u.startsWith(`http://localhost:${PORT}`))
  ),
];
console.log('\n站外请求：');
for (const u of offsite) console.log(`   ${u.slice(0, 160)}`);

await p.close();
