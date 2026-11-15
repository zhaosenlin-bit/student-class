/* The frame already loaded the course. Read those responses out. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdp2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2] || '1016';
const browser = await connect(9222);
browser.events.length = 0;
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(10000);

const responses = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .filter((e) => /reviewed-course-assets/.test(e.params.response.url))
  .map((e) => ({
    url: e.params.response.url,
    requestId: e.params.requestId,
    sessionId: e.sessionId,
    status: e.params.response.status,
    mime: e.params.response.mimeType,
  }));
console.log('course responses:', responses.length);

let ok = 0;
let failed = 0;
for (const r of responses) {
  try {
    const body = await browser.raw('Network.getResponseBody', { requestId: r.requestId }, r.sessionId);
    console.log(`  ${r.status} ${body.base64Encoded ? 'b64' : 'text'} len=${body.body.length} ${r.url.slice(-70)}`);
    ok++;
  } catch (e) {
    console.log(`  ${r.status} FAIL ${e.message.slice(0, 60)} ${r.url.slice(-60)}`);
    failed++;
  }
}
console.log(`read ${ok}, failed ${failed}`);
await browser.close();
