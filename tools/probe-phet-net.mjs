import fs from 'node:fs';
import { connect, sleep } from './cdpx.mjs';

const url = process.argv[2];
const port = Number(process.argv[3] || 9222);
const wait = Number(process.argv[4] || 9000);

const p = await connect(port);
const reqs = [];
const failed = [];
const logs = [];
p.on((m) => {
  if (m.method === 'Network.requestWillBeSent') reqs.push(m.params.request.url);
  if (m.method === 'Network.loadingFailed') failed.push(m.params.errorText + ' ' + (m.params.requestId || ''));
  if (m.method === 'Network.responseReceived') {
    const s = m.params.response.status;
    if (s >= 400) failed.push(s + ' ' + m.params.response.url);
  }
  if (m.method === 'Runtime.consoleAPICalled' && /error/i.test(m.params.type)) {
    logs.push(m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 200));
  }
  if (m.method === 'Runtime.exceptionThrown') {
    logs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || '').slice(0, 200));
  }
});

await p.goto(url);
await sleep(wait);

const probe = await p.evaluate(`(() => ({
  title: document.title,
  canvases: [...document.querySelectorAll('canvas')].map(c => c.width + 'x' + c.height),
  nodes: document.querySelectorAll('*').length,
  text: (document.body ? document.body.innerText : '').replace(/\\s+/g,' ').trim().slice(0, 200),
}))()`).catch((e) => ({ error: e.message }));

await p.shot('recon/scratch/phet-upstream.png');
await p.close();

const out = { url, probe, reqs: [...new Set(reqs)], failed, logs: logs.slice(0, 12) };
fs.writeFileSync('recon/scratch/phet-net.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2).slice(0, 4000));
