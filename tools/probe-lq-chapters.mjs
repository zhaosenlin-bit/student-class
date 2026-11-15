/*
 * Open a chapter course, switch to another chapter and look at the result.
 *
 *   node tools/probe-lq-chapters.mjs afe-1360 "北京" 12000
 */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || 'afe-1360';
const chapter = process.argv[3] || '';
const wait = Number(process.argv[4] || 12000);

const browser = await connect(9222);
await browser.goto(`http://localhost:4173/courseware/${id}?local=1`);
await sleep(2500);

if (chapter) {
  const picked = await browser.evaluate(`(() => {
    const select = document.getElementById('chapter');
    if (!select) return 'no select';
    const option = [...select.options].find(o => o.textContent.includes(${JSON.stringify(chapter)}));
    if (!option) return 'no option';
    select.value = option.value;
    select.dispatchEvent(new Event('change'));
    return option.value;
  })()`);
  console.log('picked:', picked);
}

await sleep(wait);
const out = await browser.evaluate(`(() => {
  const frame = document.getElementById('frame');
  const doc = frame && frame.contentDocument;
  return {
    frameSrc: frame ? frame.getAttribute('src') : null,
    innerLen: doc && doc.body ? doc.body.innerHTML.length : 0,
    adapter: doc && doc.body ? doc.body.dataset.courseAdapterState : null,
    notice: doc ? [...doc.querySelectorAll('aside[role="status"]')].map(n => ({hidden: n.hidden, text: n.innerText.replace(/\\s+/g,' ').slice(0,120)})) : [],
    loading: doc ? (doc.querySelector('#loading') || {}).textContent : null,
    canvas: doc ? [...doc.querySelectorAll('canvas')].map(c => c.width + 'x' + c.height) : [],
  };
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.shot(`recon/scratch/chapter-${id}-${chapter || 'home'}.png`);
await browser.close();
