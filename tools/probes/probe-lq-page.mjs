import { connect, sleep } from './cdpx.mjs';

const url = process.argv[2] || 'http://localhost:4173/#course/afe-466';
const p = await connect(9222);
await p.goto(url);
await sleep(2500);
const info = await p.evaluate(`(() => {
  const m = document.querySelector('#main');
  return {
    mainLen: m ? m.innerHTML.length : -1,
    mainText: m ? m.innerText.replace(/\\s+/g,' ').slice(0, 700) : null,
    hasTrial: !!document.querySelector('[data-action="trial"]'),
    actions: [...document.querySelectorAll('[data-action]')].map(e => e.dataset.action + ':' + (e.innerText||'').trim().slice(0,12)),
  };
})()`);
console.log(JSON.stringify(info, null, 1));
const errs = p.events.filter((e) => e.method === 'Runtime.exceptionThrown' || e.method === 'Log.entryAdded');
errs.slice(0, 20).forEach((e) => {
  const txt = e.params?.exceptionDetails?.exception?.description || e.params?.exceptionDetails?.text || e.params?.entry?.text || '';
  console.log('ERR>', txt.replace(/\s+/g, ' ').slice(0, 300));
});
await p.shot('recon/scratch/lq-probe.png');
await p.close();
