import { connect, sleep } from './cdpx.mjs';

const id = process.argv[2] || 'afe-754';
const p = await connect(9222);
await p.goto(`http://localhost:4173/#course/${id}`);
await sleep(1500);
const clicked = await p.evaluate(`(() => {
  window.__msgs = [];
  window.addEventListener('message', (e) => {
    window.__msgs.push({
      type: e.data && e.data.type,
      origin: e.origin,
      nonce: e.data && e.data.nonce,
      keys: e.data && e.data.keys && e.data.keys.length,
      same: e.source === (document.querySelector('#lesson-frame iframe') || {}).contentWindow,
    });
  });
  const b = [...document.querySelectorAll('button')].find((x) => /在线使用/.test(x.innerText || ''));
  if (b) b.click();
  return !!b;
})()`);
console.log('clicked:', clicked);
await sleep(9000);
const logs = p.events
  .filter((e) => e.method === 'Runtime.consoleAPICalled')
  .map((e) => (e.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
console.log('console:', JSON.stringify(logs.slice(0, 20)));
const out = await p.evaluate(`(() => {
  const f = document.querySelector('#lesson-frame iframe');
  return {
    msgs: window.__msgs,
    sandbox: f ? f.getAttribute('sandbox') : null,
    src: f ? f.getAttribute('src') : null,
    connected: f ? f.isConnected : null,
  };
})()`);
console.log(JSON.stringify(out, null, 1));
await p.close();
