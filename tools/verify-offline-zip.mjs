/* Opens a downloaded courseware copy straight from disk, the way a teacher
   would after unzipping it. */
import path from 'node:path';
import { connect, sleep } from './cdpx.mjs';

const file = process.argv[2] || 'recon/scratch/dl-test/afe-754.html';
const url = 'file:///' + path.resolve(file).replace(/\\/g, '/');
const p = await connect(9222);
await p.goto(url);
await sleep(7000);

const probe = await p.evaluate(`(() => ({
  url: location.href,
  title: document.title,
  canvases: document.querySelectorAll('canvas').length,
  bodyLen: document.body ? document.body.innerHTML.length : 0,
  text: (document.body ? document.body.innerText : '').replace(/\\s+/g, ' ').slice(0, 220),
}))()`);
console.log(JSON.stringify(probe, null, 1));
const failed = [
  ...new Set(
    p.events
      .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
      .map((e) => `${e.params.response.status} ${e.params.response.url.slice(0, 120)}`)
  ),
];
console.log('failed:', JSON.stringify(failed.slice(0, 10), null, 1));
const errs = p.events
  .filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => (e.params.exceptionDetails?.exception?.description || '').replace(/\s+/g, ' ').slice(0, 180));
console.log('errors:', JSON.stringify(errs.slice(0, 5), null, 1));
await p.shot('recon/scratch/lq-offline-zip.png');
await p.close();
