import { connect, sleep } from './cdp2.mjs';
const b = await connect(Number(process.env.CDP_PORT || 9226));
const mark = b.events.length;
await b.goto('http://localhost:4173/#catalog');
await sleep(6000);
const errs = b.events.slice(mark).filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&e.params.type==='error'));
console.log('errors:', errs.slice(0,6).map(e=>JSON.stringify(e.params).slice(0,400)).join('\n'));
console.log('main html head:', String(await b.evaluate(`document.querySelector('#main')?.innerHTML?.slice(0,600)`)));
