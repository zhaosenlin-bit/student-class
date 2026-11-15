import fs from 'node:fs';

/*
 * A CDP client that stays on the browser socket and auto-attaches to every
 * target it spawns. The 小白教育 courseware runs inside a sandboxed frame,
 * which Chrome puts in its own process; only an attached session can look
 * inside it.
 */
export async function connect(port = 9222) {
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  let seq = 0;
  const pending = new Map();
  const events = [];
  const sessions = new Map(); // sessionId -> { targetInfo }
  /* Context ids live in the renderer's own number space, so two sessions can
     hand out the same one. The pair is the real key. */
  const contexts = new Map(); // `${sessionId}:${contextId}` -> context

  const raw = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      const msg = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      ws.send(JSON.stringify(msg));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error('timeout ' + method));
        }
      }, 60000);
    });

  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      return;
    }
    if (!m.method) return;
    events.push(m);
    if (m.method === 'Target.attachedToTarget') {
      const { sessionId, targetInfo } = m.params;
      sessions.set(sessionId, { targetInfo, parent: m.sessionId });
      /* The frame is paused until these domains are on, so nothing is lost.
         A frame target has no Page domain, so each step has to stand on its
         own — and the frame must be released either way. */
      (async () => {
        await raw('Runtime.enable', {}, sessionId).catch(() => {});
        await raw('Page.enable', {}, sessionId).catch(() => {});
        await raw('Network.enable', {}, sessionId).catch(() => {});
        await raw('Runtime.runIfWaitingForDebugger', {}, sessionId).catch((e) => {
          if (process.env.CDP_DEBUG) console.log('resume failed', sessionId, e.message);
        });
      })();
    }
    if (m.method === 'Runtime.executionContextCreated') {
      const c = m.params.context;
      const key = `${m.sessionId}:${c.id}`;
      contexts.set(key, {
        sessionId: m.sessionId,
        contextId: c.id,
        url: c.origin || '',
        origin: c.origin,
        name: c.name,
        isDefault: c.auxData?.isDefault !== false,
        frameId: c.auxData?.frameId,
      });
    }
    if (m.method === 'Runtime.executionContextDestroyed') {
      for (const [key, c] of contexts) {
        if (c.contextId === m.params.executionContextId) contexts.delete(key);
      }
    }
    if (m.method === 'Target.detachedFromTarget') {
      sessions.delete(m.params.sessionId);
    }
  });

  await raw('Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: true,
    flatten: true,
  });

  const created = await raw('Target.createTarget', { url: 'about:blank' });
  /* A fresh target starts paused; the attach handler resumes it a moment
     later. Give that a moment, or the first navigation is swallowed. */
  await new Promise((r) => setTimeout(r, 700));
  const pageSession = [...sessions.entries()].find(
    ([, s]) => s.targetInfo.targetId === created.targetId
  )?.[0];
  if (!pageSession) throw new Error('page session not attached');

  /* The sandboxed courseware frame becomes its own target; it is only
     reachable through the page that owns it. */
  await raw(
    'Target.setAutoAttach',
    { autoAttach: true, waitForDebuggerOnStart: true, flatten: true },
    pageSession
  ).catch(() => {});

  const evaluate = async (expr, ctxId, sessionId) => {
    const r = await raw(
      'Runtime.evaluate',
      {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
        ...(ctxId ? { contextId: ctxId } : {}),
      },
      sessionId || pageSession
    );
    if (r.exceptionDetails) {
      throw new Error(
        r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'eval failed'
      );
    }
    return r.result.value;
  };

  const goto = async (url) => {
    await raw('Page.navigate', { url }, pageSession);
    await new Promise((r) => setTimeout(r, 1200));
    const want = url.split('#')[0];
    for (let i = 0; i < 4; i++) {
      let now = '';
      try {
        now = await evaluate('location.href');
      } catch {
        now = '';
      }
      if (now.startsWith(want)) return;
      await new Promise((r) => setTimeout(r, 700));
      await raw('Page.navigate', { url }, pageSession).catch(() => {});
      await new Promise((r) => setTimeout(r, 900));
    }
  };

  const shot = async (file, opts = {}) => {
    const s = await raw('Page.captureScreenshot', { format: 'png', ...opts }, pageSession);
    fs.writeFileSync(file, Buffer.from(s.data, 'base64'));
    return file;
  };

  const close = async () => {
    try {
      await raw('Target.closeTarget', { targetId: created.targetId });
    } catch {}
    try {
      ws.close();
    } catch {}
  };

  return {
    raw,
    evaluate,
    goto,
    shot,
    close,
    events,
    contexts,
    sessions,
    pageSession,
    targetId: created.targetId,
    /* Run an expression inside another target, such as a course frame. */
    evaluateIn: async (sessionId, expr) => {
      const r = await raw(
        'Runtime.evaluate',
        { expression: expr, returnByValue: true, awaitPromise: true },
        sessionId
      );
      if (r.exceptionDetails) {
        throw new Error(
          r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'eval failed'
        );
      }
      return r.result.value;
    },
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
