/*
 * A very small Chrome DevTools Protocol client built on Node's global
 * WebSocket.  No dependencies, so it runs with the bundled Node 24.
 */

export async function connect(port = 9222, urlMatch = null) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const pages = list.filter((t) => t.type === 'page');
  const page = urlMatch
    ? pages.find((t) => (t.url || '').includes(urlMatch))
    : pages[0];
  if (!page) throw new Error('no page target on port ' + port);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let seq = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
      if (events.length > 400) events.shift();
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error('timeout: ' + method));
        }
      }, 30000);
    });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'evaluate failed');
    }
    return res.result.value;
  };

  return { send, evaluate, events, close: () => ws.close() };
}

export async function screenshot(page, file) {
  const fs = await import('node:fs');
  const res = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(res.data, 'base64'));
  return file;
}
