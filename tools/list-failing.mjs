/*
 * 把一门课件里所有打不开的地址都列出来，不只列头几个。
 *
 *   node tools/list-failing.mjs afe-506 afe-1016
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = 4173;
const browser = await connect(9226);
await browser.raw('Network.enable', {}, browser.pageSession);

for (const id of process.argv.slice(2)) {
  await browser.goto(`http://localhost:${PORT}/courseware/${id}?local=1`);
  await sleep(Number(process.env.WAIT || 4000));
  const seen = new Map();
  for (const e of browser.events.splice(0)) {
    if (e.method === 'Network.responseReceived' && e.params.response.status >= 400) {
      seen.set(e.params.response.url, e.params.response.status);
    }
    if (e.method === 'Network.loadingFailed') {
      seen.set(e.params.requestId + ' ' + e.params.errorText, 0);
    }
  }
  console.log('=== ' + id + '  ' + seen.size + ' 个打不开');
  for (const [u, s] of seen) console.log('   ' + s + '  ' + u);
}
await browser.close();
