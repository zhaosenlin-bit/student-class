/*
 * The course files are served to the frame under a session address that
 * only that frame may read. The address changes per session, so the
 * answer is to let the browser do the reading and take the bytes from
 * the response it already received.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdp2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2] || '1016';
const browser = await connect(9222);

/* Network events of every attached target, including frames that attach
   later, are kept. Turn the domain on wherever a target shows up. */
const turned = new Set();
const turn = async (sid) => {
  if (turned.has(sid)) return;
  turned.add(sid);
  await browser.raw('Network.enable', {}, sid).catch(() => {});
};
await turn(browser.pageSession);

const watch = setInterval(() => {
  for (const sid of browser.sessions.keys()) turn(sid);
}, 400);

browser.events.length = 0;
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(12000);
clearInterval(watch);

const responses = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .filter((e) => /reviewed-course-assets/.test(e.params.response.url))
  .map((e) => ({
    url: e.params.response.url,
    requestId: e.params.requestId,
    sessionId: e.sessionId,
    status: e.params.response.status,
  }));
console.log('course responses:', responses.length);
const bySession = new Map();
for (const r of responses) {
  if (!bySession.has(r.sessionId)) bySession.set(r.sessionId, []);
  bySession.get(r.sessionId).push(r);
}
for (const [sid, list] of bySession) {
  console.log(`  session ${sid.slice(0, 10)}: ${list.length}`);
}

let ok = 0;
for (const r of responses) {
  try {
    const body = await browser.raw('Network.getResponseBody', { requestId: r.requestId }, r.sessionId);
    console.log(`  ${r.status} len=${body.body.length} ${r.url.slice(-80)}`);
    ok++;
  } catch (e) {
    console.log(`  ${r.status} read-fail ${e.message.slice(0, 50)}`);
  }
}
console.log('read ok:', ok);

await browser.close();
