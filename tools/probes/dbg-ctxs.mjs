import { connect, sleep } from './cdpx.mjs';

const id = process.argv[2] || 'mirror';
const p = await connect(9222);
await p.goto(`http://localhost:4173/#course/${id}`);
await sleep(1500);
await p.evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /在线使用/.test(x.innerText || ''));
  if (b) b.click();
  return !!b;
})()`);
await sleep(7000);
console.log('contexts:', p.contexts.size);
for (const [key, ctx] of p.contexts) {
  console.log(' key', String(key).slice(0, 12), 'id', ctx.id, 'isDefault', ctx.auxData?.isDefault, 'origin', ctx.origin, 'name', ctx.name);
  try {
    const v = await p.evaluate(`(() => ({url: location.href, len: document.body ? document.body.innerHTML.length : 0}))()`, ctx.id);
    console.log('   ->', JSON.stringify(v));
  } catch (e) {
    console.log('   !! ', e.message.slice(0, 200));
  }
}
await p.close();
