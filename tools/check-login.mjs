/*
 * 看看那个已经打开的浏览器里有没有登录成功留下的凭据。
 *
 *   node tools/check-login.mjs 9228
 */
import { connect } from './cdp2.mjs';

const port = Number(process.argv[2] || 9228);
const browser = await connect(port);
const list = await browser.raw('Target.getTargets', {});
for (const t of list.targetInfos) {
  if (t.type !== 'page') continue;
  console.log('页面：' + t.title + '  ' + t.url);
}
const out = await browser.evaluate(`(() => {
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = String(localStorage.getItem(k)).slice(0, 120); }
  const ss = {};
  for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); ss[k] = String(sessionStorage.getItem(k)).slice(0, 120); }
  const ck = document.cookie;
  return { url: location.href, ls, ss, ck, body: (document.body.innerText || '').slice(0, 300) };
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close();
