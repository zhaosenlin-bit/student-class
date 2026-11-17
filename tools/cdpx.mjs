import fs from 'node:fs';

/*
 * A small CDP client that keeps one browser connection and can open tabs,
 * watch the network, and evaluate JavaScript inside child frames.
 */

export async function connect(port = 9222, urlMatch) {
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const bws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    bws.addEventListener('open', res, { once: true });
    bws.addEventListener('error', rej, { once: true });
  });
  let bseq = 0;
  const bcall = (m, pr = {}) =>
    new Promise((rs, rj) => {
      const id = ++bseq;
      const on = (e) => {
        const x = JSON.parse(e.data);
        if (x.id === id) {
          bws.removeEventListener('message', on);
          x.error ? rj(new Error(x.error.message)) : rs(x.result);
        }
      };
      bws.addEventListener('message', on);
      bws.send(JSON.stringify({ id, method: m, params: pr }));
    });

  const created = await bcall('Target.createTarget', { url: 'about:blank' });
  bws.close();
  await new Promise((r) => setTimeout(r, 400));
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find((t) => t.id === created.targetId);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  let seq = 0;
  const pending = new Map();
  const events = [];
  const listeners = new Set();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    } else if (m.method) {
      events.push(m);
      for (const fn of listeners) fn(m);
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
          reject(new Error('timeout ' + method));
        }
      }, 60000);
    });

  const contexts = new Map(); // frameId -> {id, url}
  listeners.add((m) => {
    if (m.method === 'Runtime.executionContextCreated') {
      const c = m.params.context;
      contexts.set(c.auxData?.frameId || c.id, c);
    }
    if (m.method === 'Runtime.executionContextDestroyed') {
      for (const [k, v] of contexts) if (v.id === m.params.executionContextId) contexts.delete(k);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  /*
   * Some of the courseware watches for an open debugger: it runs a
   * `debugger` statement on a timer, and a statement like that stops the
   * page dead the moment a debugger is attached — the course freezes and
   * the tab stops answering.  A teacher opens the course, not a debugger,
   * so the pauses are skipped here and the page keeps running.
   */
  try {
    await send('Debugger.enable');
    await send('Debugger.setSkipAllPauses', { skip: true });
  } catch {
    /* Not every build of Chrome allows it; the page still opens. */
  }

  const evaluate = async (expr, ctxId) => {
    const r = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
      ...(ctxId ? { contextId: ctxId } : {}),
    });
    if (r.exceptionDetails) {
      throw new Error(
        r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'eval failed'
      );
    }
    return r.result.value;
  };

  const goto = async (url) => {
    await send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 1200));
  };

  const shot = async (file, opts = {}) => {
    const s = await send('Page.captureScreenshot', { format: 'png', ...opts });
    fs.writeFileSync(file, Buffer.from(s.data, 'base64'));
    return file;
  };

  const close = async () => {
    try {
      await send('Target.closeTarget', { targetId: target.id });
    } catch {}
    try {
      ws.close();
    } catch {}
  };

  return {
    send,
    evaluate,
    goto,
    shot,
    close,
    events,
    contexts,
    on: (fn) => listeners.add(fn),
    targetId: target.id,
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
