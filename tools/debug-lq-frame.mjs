import { connect, sleep } from './cdpx.mjs';

const id = process.argv[2] || 'afe-754';
const p = await connect(9222);
await p.goto(`http://localhost:4173/#course/${id}`);
await sleep(1500);
await p.evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /在线使用/.test(x.innerText || ''));
  if (b) b.click();
  return !!b;
})()`);
await sleep(Number(process.env.LQ_WAIT || 12000));

for (const [frameId, ctx] of p.contexts) {
  if (!ctx.auxData?.isDefault) continue;
  let probe;
  try {
    probe = await p.evaluate(
      `(() => ({
         url: location.href,
         origin: location.origin,
         html: document.documentElement.innerHTML.slice(0, 700),
         len: document.documentElement.innerHTML.length,
         hasResume: typeof window.__longMarchResumeSave,
       }))()`,
      ctx.id
    );
  } catch (e) {
    continue;
  }
  console.log('--- frame', frameId, JSON.stringify(probe, null, 1));
}
const logs = p.events
  .filter((e) => e.method === 'Runtime.consoleAPICalled')
  .map((e) => (e.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160));
console.log('console:', JSON.stringify(logs.slice(0, 12), null, 1));
const failed = p.events
  .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
  .map((e) => e.params.response.status + ' ' + e.params.response.url);
console.log('failed:', JSON.stringify([...new Set(failed)].slice(0, 20), null, 1));
const exceptions = p.events
  .filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => (e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || '').slice(0, 220));
console.log('exceptions:', JSON.stringify(exceptions.slice(0, 10), null, 1));
await p.shot(`recon/scratch/lq-dbg-${id}.png`);
await p.close();
