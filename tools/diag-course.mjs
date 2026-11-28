#!/usr/bin/env node
/*
 * Look closely at one lesson and say exactly what the browser asked for
 * and what came back.
 *
 *   node tools/diag-course.mjs --url http://127.0.0.1:8082/leqixiang/courseware/lq-1016/index.html --cdp 9333
 */
import fs from 'node:fs';
import { connect, sleep } from './cdpx.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const URL_ = arg('url', '');
const CDP = Number(arg('cdp', 9333));
const WAIT = Number(arg('wait', 30000));
const SHOT = arg('shot', '');
const OUT = arg('out', '');

if (!URL_) {
  console.error('need --url');
  process.exit(1);
}

const b = await connect(CDP, URL_, { quiet: false });

const reqs = new Map();
const order = [];
const failures = [];
const consoleMsgs = [];
const pageErrors = [];

b.on((m) => {
  if (m.method === 'Network.requestWillBeSent') {
    const r = m.params.request;
    const info = {
      url: r.url,
      type: m.params.type,
      method: r.method,
      status: null,
      mime: null,
      err: null,
    };
    reqs.set(m.params.requestId, info);
    order.push(info);
  }
  if (m.method === 'Network.responseReceived') {
    const info = reqs.get(m.params.requestId);
    if (info) {
      info.status = m.params.response.status;
      info.mime = m.params.response.mimeType;
    }
  }
  if (m.method === 'Network.loadingFailed') {
    const info = reqs.get(m.params.requestId);
    const rec = {
      url: info ? info.url : m.params.requestId,
      type: m.params.type,
      error: m.params.errorText,
      canceled: m.params.canceled,
      blockedReason: m.params.blockedReason,
      cors: m.params.corsErrorStatus,
    };
    failures.push(rec);
    if (info) info.err = m.params.errorText;
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    consoleMsgs.push({
      type: m.params.type,
      text: (m.params.args || [])
        .map((a) => a.value ?? a.description ?? a.unserializableValue ?? '')
        .join(' '),
    });
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    pageErrors.push(d.exception?.description || d.text || JSON.stringify(d));
  }
});

await b.send('Page.navigate', { url: URL_ });
await sleep(WAIT);

const probe = await b.evaluate(`(() => {
  const d = document;
  const canvases = [...d.querySelectorAll('canvas')];
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const frames = [...d.querySelectorAll('iframe')].map((f) => {
    let inner = null;
    try {
      const idoc = f.contentDocument;
      if (idoc) {
        const ic = [...idoc.querySelectorAll('canvas')];
        inner = {
          nodes: idoc.querySelectorAll('*').length,
          painted: ic.filter(c => c.width > 0 && c.height > 0).length,
          textLen: (idoc.body ? idoc.body.innerText : '').replace(/\\s+/g, ' ').trim().length,
          fields: idoc.querySelectorAll('input,select,textarea,button').length,
          bodyState: idoc.body ? idoc.body.getAttribute('data-course-adapter-state') : null,
          head: (idoc.body ? idoc.body.innerText : '').replace(/\\s+/g,' ').trim().slice(0, 120),
        };
      }
    } catch (e) { inner = { err: String(e) }; }
    return { src: f.getAttribute('src'), resolved: f.src, inner };
  });
  return {
    title: d.title,
    nodes: d.querySelectorAll('*').length,
    canvases: canvases.length,
    painted: canvases.filter(c => c.width > 0 && c.height > 0).length,
    textLen: text.length,
    head: text.slice(0, 200),
    frames,
  };
})()`).catch((e) => ({ evalError: String(e) }));

if (SHOT) {
  await b.shot(SHOT, { captureBeyondViewport: false }).catch(() => {});
}

const report = {
  url: URL_,
  probe,
  requestCount: order.length,
  byStatus: {},
  failures,
  pageErrors,
  consoleMsgs: consoleMsgs.slice(0, 200),
  requests: order.map((r) => ({
    status: r.status,
    type: r.type,
    mime: r.mime,
    err: r.err,
    url: r.url,
  })),
};
for (const r of order) {
  const k = r.err ? `FAIL(${r.err})` : r.status;
  report.byStatus[k] = (report.byStatus[k] || 0) + 1;
}

if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

console.log('== probe ==');
console.log(JSON.stringify(probe, null, 2));
console.log('\n== status tally ==');
console.log(JSON.stringify(report.byStatus, null, 2));
console.log('\n== failures ==');
console.log(JSON.stringify(failures, null, 2));
console.log('\n== page errors ==');
console.log(JSON.stringify(pageErrors.slice(0, 30), null, 2));
console.log('\n== console (warn/error) ==');
console.log(
  JSON.stringify(
    consoleMsgs.filter((c) => c.type === 'error' || c.type === 'warning').slice(0, 40),
    null,
    2
  )
);

await b.close();
process.exit(0);
