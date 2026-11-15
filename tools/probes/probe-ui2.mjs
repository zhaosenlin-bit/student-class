import { connect, sleep } from './cdp2.mjs';
const b = await connect(Number(process.env.CDP_PORT || 9226));
await b.goto('http://localhost:4173/#catalog');
await sleep(4000);
console.log(JSON.stringify(await b.evaluate(`(() => ({
  hash: location.hash,
  main: !!document.querySelector('#main'),
  gallery: !!document.querySelector('.download-gallery-controls'),
  classes: [...new Set([...document.querySelectorAll('[class]')].map(e=>e.className).filter(c=>typeof c==='string'&&c.includes('download-')).flatMap(c=>c.split(' ')))].slice(0,40),
  buttons: [...document.querySelectorAll('button[data-action]')].map(b=>b.dataset.action+':'+b.textContent.trim().slice(0,10)).slice(0,25),
}))()`), null, 1));
