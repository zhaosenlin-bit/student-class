import fs from 'node:fs';

/*
 * A small CDP client that keeps one browser connection and can open tabs,
 * watch the network, and evaluate JavaScript inside child frames.
 */

export async function connect(port = 9222, urlMatch, opts = {}) {
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
  /*
   * Watching the network adds a little work to every request the page
   * makes, and a few lessons take that as a sign that a debugger is
   * watching them and freeze themselves.  A quiet client leaves the
   * network alone, so those lessons open as they would for a teacher.
   */
  if (!opts.quiet) await send('Network.enable');
  /*
   * The cache is turned off on purpose.  A file that was changed on the
   * server keeps its old name, and a browser that has it in the cache
   * would go on using the old one — the check would then report on a
   * version of the lesson that nobody can see any more.  Every check
   * wants to look at what is really on the server now.
   */
  if (!opts.quiet) {
    try {
      await send('Network.setCacheDisabled', { cacheDisabled: true });
    } catch {
      /* An older build of Chrome does not know this one. */
    }
  }
  /*
   * Some of the courseware watches for an open debugger: it runs a
   * `debugger` statement on a timer, and a statement like that stops the
   * page dead the moment a debugger is attached — the course freezes and
   * the tab stops answering.  A teacher opens the course, not a debugger,
   * so the pauses are skipped here and the page keeps running.
   */
  if (!opts.quiet) {
    try {
      await send('Debugger.enable');
      await send('Debugger.setSkipAllPauses', { skip: true });
    } catch {
      /* Not every build of Chrome allows it; the page still opens. */
    }
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

/*
 * 给某个地址开权限（比如摄像头）。
 *
 * 有些课件要摄像头才能跑起来（手势、AR 一类的）。浏览器默认会把
 * 摄像头请求挂在「等用户点同意」上，课件就停在那里不动。检查的时候
 * 没有人来点，就只能先替它同意。
 *
 * 权限是按站点给的，得走浏览器那一层的连接，页面那一层不行。
 */
export async function grantPermissions(port, origin, permissions = ['camera']) {
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const bws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    bws.addEventListener('open', res, { once: true });
    bws.addEventListener('error', rej, { once: true });
  });
  const id = 1;
  bws.send(
    JSON.stringify({
      id,
      method: 'Browser.grantPermissions',
      params: { origin, permissions },
    })
  );
  await new Promise((res) => {
    const on = (e) => {
      const x = JSON.parse(e.data);
      if (x.id === id) {
        bws.removeEventListener('message', on);
        res(x);
      }
    };
    bws.addEventListener('message', on);
    setTimeout(res, 5000);
  });
  bws.close();
}
