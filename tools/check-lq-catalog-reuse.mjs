#!/usr/bin/env node
/*
 * Does the catalogue cost anything the second time?
 *
 * The catalogue is two hundred kilobytes of text, and every page waits
 * for it.  The server gives it a mark, so the browser can ask whether
 * the copy it kept is still the good one instead of taking the whole
 * thing again.  This opens the library twice and says how much was
 * actually carried the second time.
 *
 *   CDP_PORT=9226 node tools/check-lq-catalog-reuse.mjs
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9222);

const browser = await connect(CDP);

let round = 0;
const carried = async () => {
  round += 1;
  /*
   * A different address each time, so that the page really loads again
   * instead of only changing its hash.  The address of the catalogue is
   * the same both times, which is the point.
   */
  await browser.goto(`http://localhost:${PORT}/?r=${round}#catalog`);
  await sleep(4000);
  return browser.evaluate(`(() => {
    const entry = performance.getEntriesByType('resource').find((e) => e.name.includes('/api/catalog'));
    return entry ? { transfer: entry.transferSize, encoded: entry.encodedBodySize, duration: Math.round(entry.duration) } : null;
  })()`);
};

const first = await carried();
const second = await carried();

console.log(`第一次：${JSON.stringify(first)}`);
console.log(`第二次：${JSON.stringify(second)}`);
if (!first || !second) {
  console.log('没有量到目录接口');
  process.exit(1);
}
if (second.transfer >= second.encoded * 0.9 && second.transfer > 4096) {
  console.log('红灯：第二次还是把整个目录拉了一遍。');
  process.exit(1);
}
console.log('绿灯：第二次只问了一句“你手里那份还是新的吗”。');
await browser.close();
