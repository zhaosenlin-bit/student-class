import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || 'mirror';
const p = await connect(9222);
await p.goto(`http://localhost:4173/#course/${id}`);
console.log('after goto ->', await p.evaluate('location.href').catch((e) => 'ERR ' + e.message));
await sleep(1500);
console.log('clicked ->', await p.evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /在线使用/.test(x.innerText || ''));
  if (b) b.click();
  return !!b;
})()`).catch((e) => 'ERR ' + e.message));
await sleep(7000);

console.log('page session', p.pageSession);
console.log('sessions', p.sessions.size);
for (const [sid, s] of p.sessions) {
  if (s.targetInfo.type !== 'page' && s.targetInfo.type !== 'browser_ui') {
    console.log('  ', sid, s.targetInfo.type, String(s.targetInfo.url).slice(0, 70), 'parent', s.parent);
  }
}
console.log('frame events:');
for (const e of p.events) {
  if (e.method === 'Page.frameAttached') console.log('  frameAttached', e.params.frameId, e.sessionId);
  if (e.method === 'Page.frameNavigated') console.log('  frameNavigated', e.params.frame?.url?.slice(0, 70), e.sessionId);
}
console.log('contexts', p.contexts.size);
for (const [, c] of p.contexts) {
  let url = '?';
  try {
    url = await p.evaluate(`location.href`, c.contextId, c.sessionId);
  } catch (e) {
    url = 'ERR ' + e.message.slice(0, 60);
  }
  console.log(' ctx', c.contextId, 'sid', String(c.sessionId).slice(0, 10), 'default', c.isDefault, '->', String(url).slice(0, 90));
}
for (const [sid, s] of p.sessions) {
  console.log(' session', sid, s.targetInfo.type, s.targetInfo.url.slice(0, 80));
}
console.log('contexts', p.contexts.size);
for (const [cid, c] of p.contexts) {
  let url = '?';
  try {
    url = await p.evaluate(`location.href`, cid, c.sessionId);
  } catch (e) {
    url = 'ERR ' + e.message.slice(0, 60);
  }
  console.log(' ctx', cid, 'sid', c.sessionId, 'default', c.isDefault, '->', String(url).slice(0, 90));
}
await p.close();
