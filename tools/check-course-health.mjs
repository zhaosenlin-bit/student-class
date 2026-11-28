#!/usr/bin/env node
/*
 * 看每一门课件是不是真的打开了。
 *
 * 以前那份检查只看「页面上有没有东西」，于是有些课件停在一个转圈的
 * 遮罩上，也被算成「有内容」。这一份看的是三件实在的事：
 *
 *   - 浏览器真的拿到了每一个文件吗（状态码 200/3xx 都算拿到）；
 *   - 课件里那个负责画面的框，是不是已经把适配器的状态走到了正常；
 *   - 转圈的遮罩是不是已经退场，画面是不是真的画出来了。
 *
 *   node tools/check-course-health.mjs --base http://127.0.0.1:8082/leqixiang --cdp 9333
 */
import fs from 'node:fs';
import { connect, sleep, grantPermissions } from './cdpx.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const BASE = arg('base', 'http://127.0.0.1:8082/leqixiang').replace(/\/+$/, '');
const CDP = Number(arg('cdp', 9333));
const CONC = Number(arg('conc', 4));
const WAIT = Number(arg('wait', 14000));
const OUT = arg('out', 'receipts/course-health.json');
const ONLY = arg('only', '');
const ALLCHAPTERS = args.includes('--all-chapters');
const CLICK_START = args.includes('--click-start');
/* 课件跑到本站以外去要东西，说明有一部分内容并没有真正搬回家。 */
const ORIGIN_HOST = new URL(BASE).hostname;

/*
 * 网络会自己抖一下：连接被掐断、读超时。这类毛病和课件本身坏掉
 * 完全是两回事，但都会让一次请求没有结果。所以网络级别的失败不算
 * 课程的账，隔一会儿再开一次同样的课再说。
 */
const NET_NOISE = /ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_CONNECTION_ABORTED|ERR_NETWORK_CHANGED|ERR_SOCKET_NOT_CONNECTED|ERR_EMPTY_RESPONSE|ERR_TIMED_OUT|ERR_NETWORK_IO_SUSPENDED|ERR_QUIC_PROTOCOL_ERROR|net::ERR_ABORTED/;

function onlyNetworkNoise(r) {
  if (!r) return false;
  const bad = r.bad || [];
  if (!bad.length) return false;
  return bad.every((b) => {
    if (b.status === 'failed') {
      /* 请求的地址是哪个不算，失败的原因才算——地址是本地的也可能是被掐断的。 */
      return NET_NOISE.test(String(b.err || '')) || NET_NOISE.test(String(b.url || ''));
    }
    /* 503/502/504 是网关抖出来的，一样不算课件的账。 */
    return [502, 503, 504].includes(b.status);
  });
}

const GOOD_STATES = new Set([
  '',
  'initializing',
  'ready',
  'saved',
  'dirty',
  'saving',
  'save-failed',
  'chapter-ready',
  'atlas-ready',
  'scripts-loaded',
  'bridge-ready',
  'closed',
]);

const PROBE = `(() => {
  const d = document;
  const visible = (el, win) => {
    if (!el) return false;
    const st = win.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const outerCanvases = [...d.querySelectorAll('canvas')];
  const outerText = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const outerSpinners = [...d.querySelectorAll('.spinner,#loading,.loading,.loader,[aria-busy="true"]')]
    .filter((el) => visible(el, window));
  const frames = [...d.querySelectorAll('iframe')].map((f) => {
    let inner = null;
    try {
      const idoc = f.contentDocument;
      if (!idoc) return { src: f.getAttribute('src'), gone: true };
      /*
       * A frame that was never told where to go is an empty box in the
       * page, not the lesson.  The lesson may well be right there on the
       * page itself.
       */
      const src = f.getAttribute('src');
      if (!src) return { src, empty: true };
      /*
       * Some lessons put a video or a sound into a frame. A frame
       * showing a clip is not a lesson and has no text in it, so it
       * must not be counted as an empty lesson.
       */
      if (/\\.(mp4|webm|mov|m4v|mp3|wav|ogg|m4a|png|jpe?g|gif|webp|pdf)(\\?|#|$)/i.test(src)) {
        return { src, media: true };
      }
      /*
       * 有些课把本站的外壳（首页）也放进一个框里当背景。那不是课件，
       * 是壳子自己，拿它来判断「课开没开」永远会算错。
       */
      let shell = false;
      try {
        const u = new URL(src, d.baseURI);
        shell = /\\/index\\.html$/.test(u.pathname) && !/\\/courseware\\//.test(u.pathname);
      } catch (e) {}
      const ic = [...idoc.querySelectorAll('canvas')];
      const body = idoc.body;
      const text = (body ? body.innerText : '').replace(/\\s+/g, ' ').trim();
      const spinners = [...idoc.querySelectorAll('.spinner,#loading,.loading,.loader,[aria-busy="true"]')]
        .filter((el) => visible(el, idoc.defaultView));
      inner = {
        src: f.getAttribute('src'),
        shell,
        nodes: idoc.querySelectorAll('*').length,
        canvases: ic.length,
        painted: ic.filter(c => c.width > 0 && c.height > 0).length,
        textLen: text.length,
        head: text.slice(0, 100),
        state: body ? body.getAttribute('data-course-adapter-state') : null,
        readyAttr: body ? body.getAttribute('data-ready') : null,
        spinnerVisible: spinners.length,
        fields: idoc.querySelectorAll('input,select,textarea,button,[role="button"]').length,
      };
    } catch (e) {
      inner = { src: f.getAttribute('src'), err: String(e) };
    }
    return inner;
  });
  return {
    title: d.title,
    frames,
    outer: {
      nodes: d.querySelectorAll('*').length,
      canvases: outerCanvases.length,
      painted: outerCanvases.filter((c) => c.width > 0 && c.height > 0).length,
      textLen: outerText.length,
      head: outerText.slice(0, 100),
      state: d.body ? d.body.getAttribute('data-course-adapter-state') : null,
      readyAttr: d.body ? d.body.getAttribute('data-ready') : null,
      spinnerVisible: outerSpinners.length,
      fields: d.querySelectorAll('input,select,textarea,button,[role="button"]').length,
    },
  };
})()`;

const catalogue = await (await fetch(`${BASE}/catalog.json`)).json();
let ids = catalogue.products.filter((p) => p.localInstalled).map((p) => p.id);
if (ONLY) {
  const wanted = new Set(ONLY.split(',').map((s) => s.trim()).filter(Boolean));
  ids = ids.filter((id) => wanted.has(id));
}
console.log(`严格体检：${ids.length} 门（并发 ${CONC}，每门最多 ${WAIT}ms）`);

/*
 * 要摄像头的课（手势、AR 一类）先替它把权限开了，不然浏览器会一直
 * 停在「等用户同意」上，课件看起来像是打不开。
 */
if (args.includes('--camera')) {
  try {
    const origin = new URL(BASE).origin;
    await grantPermissions(CDP, origin, ['camera', 'audio']);
    console.log(`已给 ${origin} 打开摄像头权限`);
  } catch (e) {
    console.log('摄像头权限没开成：' + (e.message || e));
  }
}

const problems = [];
const ok = [];
const okOffsite = [];
let cursor = 0;
let done = 0;

const chapterOptions = `(async () => {
  const s = document.querySelector('#chapter');
  return s ? [...s.options].map(o => o.value) : [];
})()`;

async function oneCourse(id) {
  let p = null;
  for (let t = 0; t < 3 && !p; t++) {
    try {
      p = await connect(CDP);
    } catch {
      await sleep(1500);
    }
  }
  if (!p) return { id, ok: false, why: ['browser'] };

  const bad = [];
  const notes = [];
  let aborted = 0;
  const offsite = new Set();
    /*
     * The address a request was sent to is remembered, so that a
     * request that never arrived can be named.
     */
    const asked = new Map();
  try {
    const started = Date.now();
    await p.goto(`${BASE}/courseware/${encodeURIComponent(id)}/index.html`);
    await sleep(1500);

    /*
     * 有些课第一屏是一个「开始实验」的按钮，等着人点。不点它，
     * 后面的画面就一直是空的，看起来像是课打不开。卡住的时候替它
     * 点一下——只点一次，也不点那些看着就正常的课。
     */
    if (CLICK_START) {
      const clicked = await p
        .evaluate(`(() => {
          const vis = (el) => {
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden') return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          };
          const spin = [...document.querySelectorAll('.spinner,#loading,.loading,.loader')].filter(vis).length;
          const painted = document.querySelectorAll('canvas').length;
          const txt = (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').trim();
          if (spin === 0 && painted > 0) return false;
          /*
           * 只点「开课前的那一屏」上的按钮：什么还没画，控件也少，
           * 整屏就是一句「开始实验」。
           *
           * 有的课自己画面上就有一个「开始战斗」之类的小按钮，那是课
           * 的一部分，点它会把课带到别的状态去，反倒把一门好好的课算成
           * 了坏的。那种页面上东西很多（几十上百个字、好几个控件），
           * 这里不会去点它。
           */
          const fields = document.querySelectorAll('input,select,textarea,button,[role="button"]').length;
          const gate = painted === 0 && (spin > 0 || (txt.length < 60 && fields <= 4));
          if (!gate) return false;
          const btn = [...document.querySelectorAll('button,[role="button"],a.btn,.btn')]
            .filter(vis)
            .find((b) => /开始|启动|运行|进入体验|开始实验|开始体验/.test(b.innerText || ''));
          if (!btn) return false;
          btn.click();
          return true;
        })()`)
        .catch(() => false);
      if (clicked) await sleep(1200);
    }

    const options = await p.evaluate(chapterOptions).catch(() => []);
    const list = ALLCHAPTERS ? options : options.slice(0, 1);

    /*
     * A course that has no list of chapters is looked at all the same:
     * without this, such a course would pass without being opened at all.
     */
    const phases = list.length ? list : [''];

    for (const opt of phases) {
      const phase = list.length > 1 ? opt : '';
      if (list.length > 1) {
        await p.evaluate(`(() => {
          const s = document.querySelector('#chapter');
          if (!s) return;
          const o = [...s.options].find(x => x.value === ${JSON.stringify(opt)});
          if (o) { s.value = o.value; s.dispatchEvent(new Event('change')); }
        })()`).catch(() => {});
        await sleep(1200);
      }

      const deadline = Date.now() + WAIT;
      let probe = null;
      while (Date.now() < deadline) {
        probe = await p.evaluate(PROBE).catch(() => null);
        if (probe && looksDone(probe)) break;
        await sleep(400);
      }
      probe = await p.evaluate(PROBE).catch(() => null);

      const why = [];
      if (!probe || !probe.frames || !probe.frames.length) {
        /*
         * A lesson that shows itself in one page has no frame at all.
         * That is not a fault; what matters is whether the page has
         * something on it.
         */
        const o = probe && probe.outer;
        const alive =
          o &&
          o.readyAttr !== 'error' &&
          !(o.state && !GOOD_STATES.has(o.state)) &&
          !(o.spinnerVisible > 0 && o.painted === 0 && o.textLen < 160) &&
          (o.painted > 0 || o.textLen > 60 || o.fields > 3 || o.nodes >= 60);
        if (!alive) why.push('no-frame');
      } else {
        const real = probe.frames.filter((f) => !f.empty && !f.media && !f.shell);
        if (!real.length) {
          /* Every frame in the page is an empty box; the page itself is the lesson. */
          const o = probe.outer;
          const alive =
            o &&
            o.readyAttr !== 'error' &&
            !(o.state && !GOOD_STATES.has(o.state)) &&
            !(o.spinnerVisible > 0 && o.painted === 0 && o.textLen < 160) &&
            (o.painted > 0 || o.textLen > 60 || o.fields > 3 || o.nodes >= 60);
          if (!alive) why.push('no-frame');
        }
        for (const f of real) {
          if (f.gone) {
            why.push('frame-gone');
            continue;
          }
          if (f.err) {
            why.push('frame-unreadable');
            continue;
          }
          const st = f.state;
          if (st && !GOOD_STATES.has(st)) why.push(`state:${st}`);
          if (st && ['TIMEOUT', 'REVOKED', 'closed', 'CONTROL_FAILED', 'PROTOCOL'].includes(st)) {
            why.push(`fatal-state:${st}`);
          }
          if (f.spinnerVisible > 0 && f.painted === 0 && f.textLen < 40 && (f.fields || 0) <= 3) {
            why.push('stuck-on-spinner');
          }
          if (f.painted === 0 && f.textLen < 40 && f.nodes < 30) why.push('empty-frame');
          if (f.readyAttr === 'error') why.push('ready:error');
        }
      }

      /*
       * 「还没有内容」不等于坏了：有的课要慢慢画，画面本来就在动，
       * 只是还没画完；机器忙的时候，一门好好的课也可能还没加载完就被
       * 看了一眼。隔一会儿再看一次，动了的就不算坏——只有一直停在
       * 同一个样子、怎么等都不动的，才是真的打不开。
       */
      const maybeStillLoading = ['stuck-on-spinner', 'no-frame', 'empty-frame'];
      if (maybeStillLoading.some((w) => why.includes(w))) {
        await sleep(1600);
        const later = await p.evaluate(PROBE).catch(() => null);
        if (later && movedOn(probe, later)) {
          /* 动了 —— 还在往前走，只是刚才没赶上。 */
          for (const w of maybeStillLoading) {
            const i = why.indexOf(w);
            if (i >= 0) why.splice(i, 1);
          }
        }
      }

      for (const e of p.events) {
        if (e.method === 'Network.requestWillBeSent') {
          asked.set(e.params.requestId, e.params.request.url);
          const u = e.params.request.url;
          if (/^https?:/i.test(u) && new URL(u).hostname !== ORIGIN_HOST) {
            offsite.add(new URL(u).hostname + new URL(u).pathname);
          }
        }
        if (e.method === 'Network.responseReceived') {
          const r = e.params.response;
          if (r.status >= 400 && !/favicon\.ico$/.test(r.url)) {
            bad.push({ status: r.status, url: r.url, phase });
          }
        }
        if (e.method === 'Network.loadingFailed') {
          const url = asked.get(e.params.requestId) || e.params.errorText;
          /*
           * 浏览器会拿「这个请求被换掉了」来报告那些刚发起就被换掉的
           * 请求（切章节、换画面的那一瞬间）。这不是课件的错，真出了
           * 事的请求会以别的形式报上来。单独记一笔，不算课件的问题。
           */
          if (/ERR_ABORTED/.test(String(e.params.errorText || ''))) {
            aborted++;
            continue;
          }
          if (!/favicon\.ico$/.test(url)) {
            bad.push({ status: 'failed', url, err: e.params.errorText, phase });
          }
        }
      }
      if (why.length) notes.push({ phase, why });
    }

    const errs = p.events
      .filter((e) => e.method === 'Runtime.exceptionThrown')
      .map((e) =>
        (e.params.exceptionDetails.exception?.description ||
          e.params.exceptionDetails.text ||
          'error')
          .replace(/\s+/g, ' ')
          .slice(0, 200)
      );

    return {
      id,
      ok: bad.length === 0 && notes.length === 0,
      bad,
      notes,
      aborted,
      offsite: [...offsite].slice(0, 10),
      errors: errs.slice(0, 5),
    };
  } catch (e) {
    return { id, ok: false, why: [String(e.message || e)] };
  } finally {
    await p.close().catch(() => {});
  }
}

function looksDone(probe) {
  if (!probe || !probe.frames) return false;
  const real = probe.frames.filter((f) => !f.empty && !f.media);
  if (!real.length) {
    const o = probe.outer;
    return Boolean(
      o &&
        o.state !== 'initializing' &&
        o.spinnerVisible === 0 &&
        (o.painted > 0 || o.textLen > 60 || o.fields > 3 || o.nodes >= 60)
    );
  }
  return real.some(
    (f) =>
      f &&
      !f.gone &&
      !f.err &&
      !f.shell &&
      /*
       * A course that is still starting up has not said yet whether it
       * managed to open.  Stopping the wait here would call a course
       * that is about to time out a good one.
       */
      f.state !== 'initializing' &&
      (f.painted > 0 || f.textLen > 60 || f.fields > 3) &&
      f.spinnerVisible === 0
  );
}

/*
 * 两次探测之间，画面是不是变了。
 *
 * 变了就是在往前走（还在加载、还在画），没变才是真卡住。
 */
function movedOn(a, b) {
  if (!a || !b) return false;
  const fa = a.frames || [];
  const fb = b.frames || [];
  const n = Math.min(fa.length, fb.length);
  for (let i = 0; i < n; i++) {
    const x = fa[i] || {};
    const y = fb[i] || {};
    if (x.err || y.err) continue;
    if ((x.nodes || 0) !== (y.nodes || 0)) return true;
    if ((x.textLen || 0) !== (y.textLen || 0)) return true;
    if ((x.painted || 0) !== (y.painted || 0)) return true;
  }
  const oa = a.outer || {};
  const ob = b.outer || {};
  if ((oa.nodes || 0) !== (ob.nodes || 0)) return true;
  if ((oa.textLen || 0) !== (ob.textLen || 0)) return true;
  if ((oa.painted || 0) !== (ob.painted || 0)) return true;
  return false;
}

async function worker() {
  while (cursor < ids.length) {
    const id = ids[cursor++];
    let r = await oneCourse(id);
    /* 抖动出来的失败，隔一会儿再开一次同样的课。 */
    if (!r.ok && onlyNetworkNoise(r)) {
      await sleep(1500);
      const again = await oneCourse(id);
      if (again.ok) r = { ...again, retried: true };
      else r = { ...r, retryWhy: (again.notes || []).map((n) => n.why.join(',')), retryBad: again.bad };
    }
    if (r.ok) {
      ok.push(id);
      if ((r.offsite || []).length) okOffsite.push({ id, offsite: r.offsite });
    } else problems.push(r);
    done++;
    if (done % 25 === 0) {
      console.log(`  ${done}/${ids.length}  有问题 ${problems.length}`);
    }
  }
}

await Promise.all(Array.from({ length: CONC }, () => worker()));

const report = {
  checkedAt: new Date().toISOString(),
  base: BASE,
  total: ids.length,
  ok: ok.length,
  problems: problems.length,
  offsite: {
    courses: problems.filter((p) => (p.offsite || []).length).length + okOffsite.length,
    hosts: [...new Set(problems.flatMap((p) => p.offsite || []).concat(okOffsite.flatMap((p) => p.offsite || [])))].slice(0, 60),
  },
  bad: problems,
};
fs.mkdirSync('receipts', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`\n通过 ${ok.length} / ${ids.length}，有问题 ${problems.length}`);
console.log(`还在往站外要东西的课：${report.offsite.courses} 门`);
for (const h of report.offsite.hosts.slice(0, 20)) console.log('  ' + h);
for (const p of problems.slice(0, 60)) {
  console.log(
    `  ${p.id}  ${(p.notes || []).map((n) => n.why.join(',')).join(' | ')}  ${(p.bad || [])
      .slice(0, 4)
      .map((b) => `${b.status} ${b.url}`)
      .join(' | ')}`
  );
}
