/* Lists every image inside the courseware frame that failed to decode. */
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
         imgs: [...document.querySelectorAll('img')].map((i) => ({
           src: (i.currentSrc || i.src || '').split('/').slice(-2).join('/'),
           ok: i.complete && i.naturalWidth > 0,
         })),
       }))()`,
      ctx.id
    );
  } catch {
    continue;
  }
  if (!probe.url.includes('/courseware/')) continue;
  console.log(probe.url);
  for (const i of probe.imgs) if (!i.ok) console.log('  BAD ', i.src);
  console.log('  total imgs', probe.imgs.length);
}
await p.close();
