#!/usr/bin/env node
/*
 * Walks the online-preview path a teacher takes and proves the lesson body
 * really renders inside the frame, instead of trusting that the button was
 * there:
 *
 *   detail page -> click the "online preview" button -> read the frame
 *
 * For every frame it reports the URL, the text length, the number of
 * canvases and whether those canvases hold any painted pixels, so a blank
 * frame is reported as blank rather than as "loaded".
 *
 *   node tools/check-lq-preview-flow.mjs --id <course-id> [--cdp 9222] [--shot out.png]
 *   node tools/check-lq-preview-flow.mjs --ids id1,id2,id3
 */
import { connect, sleep } from './cdpx.mjs';
import { decodePNG, pictureStats } from './png.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const CDP = Number(arg('cdp', 9222));
const PORT = Number(arg('lq', 4173));
const IDS = arg('ids', '')
  ? arg('ids', '').split(',').map((s) => s.trim()).filter(Boolean)
  : [arg('id', 'lab-reaction-genetics-mitosis-3d-story')];
const SHOT = arg('shot', '');

const CLICK = `(() => {
  const btn = [...document.querySelectorAll('button,a')]
    .find((b) => /在线预览/.test(b.innerText || ''));
  if (!btn) return { ok: false, why: 'no preview button', buttons: [...document.querySelectorAll('button,a')].map((b) => b.innerText.trim()).filter(Boolean) };
  btn.click();
  return { ok: true };
})()`;

const FRAMES = `(() => {
  const out = [];
  for (const f of document.querySelectorAll('iframe')) {
    const r = f.getBoundingClientRect();
    out.push({
      src: f.getAttribute('src'),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      visible: r.width > 40 && r.height > 40,
    });
  }
  return out;
})()`;

/*
 * Reads one frame's own DOM.  The courseware runs in its own execution
 * context, so the top page cannot look inside it.
 */
const FRAME_BODY = `(() => {
  const d = document;
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const canvases = [...d.querySelectorAll('canvas')];
  const painted = canvases.map((c) => {
    try {
      const g = c.getContext('2d');
      if (!g) return { w: c.width, h: c.height, state: 'webgl' };
      const px = g.getImageData(0, 0, Math.min(c.width, 200), Math.min(c.height, 200)).data;
      const colors = new Set();
      for (let i = 0; i < px.length; i += 4) colors.add(px[i] + ',' + px[i + 1] + ',' + px[i + 2]);
      return { w: c.width, h: c.height, colors: colors.size };
    } catch (e) {
      return { w: c.width, h: c.height, state: 'blocked' };
    }
  });
  return {
    title: d.title,
    textLen: text.length,
    textHead: text.slice(0, 160),
    canvases: painted,
    imgs: [...d.images].length,
    brokenImgs: [...d.images].filter((i) => i.complete && i.naturalWidth === 0).length,
    scripts: d.querySelectorAll('script').length,
    hasThree: typeof window.THREE !== 'undefined',
    errorText: /未找到|加载失败|404|not found/i.test(text) ? text.slice(0, 120) : null,
  };
})()`;

const results = [];

for (const id of IDS) {
  const p = await connect(CDP);
  const row = { id };
  try {
    await p.goto(`http://localhost:${PORT}/#course/${encodeURIComponent(id)}`);
    await sleep(1200);
    await p.send('Page.reload', { ignoreCache: true });
    await sleep(3500);

    const click = await p.evaluate(CLICK);
    row.click = click;
    if (!click.ok) {
      results.push(row);
      await p.close();
      continue;
    }
    await sleep(6000);

    /*
     * A few lessons run an anti-debugger loop that keeps the renderer busy;
     * asking it a question then times out.  The picture check below covers
     * those, so a failed query is recorded and the run continues.
     */
    try {
      row.frames = await p.evaluate(FRAMES);
    } catch (e) {
      row.frames = [];
      row.framesError = String(e.message).slice(0, 120);
    }
    row.frameUrl = row.frames.find((f) => f.visible)?.src || '(no visible frame)';

    /*
     * The lesson frame gets its own execution context.  Its origin may be
     * the same as the shell's, so the frame is matched by frame id from the
     * page's frame tree rather than by origin.
     */
    const tree = await p.send('Page.getFrameTree');
    const frames = [];
    const walk = (node) => {
      frames.push({ id: node.frame.id, url: node.frame.url });
      for (const c of node.childFrames || []) walk(c);
    };
    walk(tree.frameTree);
    row.frameTree = frames;

    const lessonFrame = frames.find(
      (f) => f.id !== tree.frameTree.frame.id && /\/courseware\//.test(f.url)
    );
    if (lessonFrame) {
      const ctx = [...p.contexts.values()].find(
        (c) => c.auxData?.frameId === lessonFrame.id
      );
      if (ctx) {
        try {
          row.body = await p.evaluate(FRAME_BODY, ctx.id);
        } catch (e) {
          row.body = { error: String(e.message).slice(0, 160) };
        }
      } else {
        row.body = { error: 'no execution context for the lesson frame' };
      }
    } else {
      row.body = { error: 'no lesson frame in the tree' };
    }

    /*
     * The picture of the frame itself is the last word on whether the
     * lesson really drew something, and it works even when the frame's
     * script cannot be queried.
     */
    const visible = row.frames.find((f) => f.visible);
    if (visible) {
      try {
        const shot = await p.send('Page.captureScreenshot', {
          format: 'png',
          clip: {
            x: visible.x,
            y: visible.y,
            width: visible.w,
            height: visible.h,
            scale: 1,
          },
        });
        const png = decodePNG(Buffer.from(shot.data, 'base64'));
        const stats = pictureStats(png);
        row.picture = {
          width: png.width,
          height: png.height,
          colors: stats.colors,
          offRatio: Number(stats.offRatio.toFixed(4)),
          blank: !(stats.colors > 3 && stats.offRatio > 0.02),
        };
      } catch (e) {
        row.picture = { error: String(e.message).slice(0, 120) };
      }
    }

    if (SHOT) {
      const file = SHOT.includes(',')
        ? SHOT.replace(/,/, `-${id}.png`)
        : SHOT.replace(/\.png$/, `-${id}.png`);
      await p.shot(file);
      row.shot = file;
    }
  } catch (e) {
    row.error = String(e.message).slice(0, 200);
  }
  results.push(row);
  await p.close();
}

console.log(JSON.stringify(results, null, 1));
