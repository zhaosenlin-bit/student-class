/* Look through every open tab for a chapter session that is still stored. */
import { connect, sleep } from './cdp2.mjs';

const browser = await connect(9222);
const targets = await browser.raw('Target.getTargets', {});
for (const t of targets.targetInfos) {
  console.log(`${t.type} ${t.url?.slice(0, 90)}`);
}

for (const t of targets.targetInfos.filter((t) => t.type === 'page')) {
  const attached = [...browser.sessions.entries()].find(
    ([, s]) => s.targetInfo.targetId === t.targetId
  );
  if (!attached) {
    console.log('\n(not attached)', t.url?.slice(0, 70));
    continue;
  }
  const [sid] = attached;
  try {
    const found = await browser.evaluateIn(
      sid,
      `(() => {
        const out = {};
        for (const k of Object.keys(sessionStorage)) {
          if (/turing/.test(k)) out[k] = sessionStorage.getItem(k);
        }
        for (const k of Object.keys(localStorage)) {
          if (/turing|reviewed/.test(k)) out['L:' + k] = String(localStorage.getItem(k)).slice(0, 60);
        }
        return out;
      })()`
    );
    if (Object.keys(found).length) console.log('\n' + t.url?.slice(0, 70), JSON.stringify(found));
  } catch (e) {
    console.log('\nread failed', t.url?.slice(0, 60), e.message);
  }
}
await browser.close();
