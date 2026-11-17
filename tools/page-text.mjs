#!/usr/bin/env node
/*
 * Read one page of a running Chrome.
 *
 *   node tools/page-text.mjs --port 9222 --match play/1387
 *   node tools/page-text.mjs --port 9222 --match 4173 --script "document.title"
 */
const args = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const port = Number(arg('port', '9222'));
const match = arg('match', '');
const script = arg(
  'script',
  `({url: location.href, title: document.title, status: document.getElementById('play-status')?.textContent||'', hint: document.getElementById('hint')?.textContent||'', frames: [...document.querySelectorAll('iframe')].map(f=>f.src)})`
);

const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = list.find((t) => t.type === 'page' && t.url.includes(match));
if (!target) {
  console.log('没有匹配的页面');
  console.log(list.filter((t) => t.type === 'page').map((t) => '  ' + t.url).join('\n'));
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});

const result = await new Promise((resolve, reject) => {
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id === 1) {
      if (m.error) reject(new Error(m.error.message));
      else resolve(m.result?.result?.value);
    }
  });
  ws.send(
    JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: script, returnByValue: true, awaitPromise: true },
    })
  );
});

console.log(JSON.stringify(result, null, 1));
ws.close();

