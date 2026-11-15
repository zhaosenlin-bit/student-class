#!/usr/bin/env node
/*
 * Pull the works that are filed as chapter courses.
 *
 * They do not open through the whole-program token. The player mounts a
 * hosted module that opens a reviewed-course session; the course files
 * are then served to a sandboxed frame under a session address that only
 * that frame may read. So the reading happens in the browser: the frame's
 * own responses are taken out of it, one chapter at a time.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdp2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';

const args = process.argv.slice(2);
const onlyIds = args.includes('--ids') ? args[args.indexOf('--ids') + 1] : null;

const all = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json'), 'utf8')
);
let targets = all;
if (onlyIds) {
  const wanted = onlyIds.split(',').map((s) => s.trim());
  targets = all.filter((p) => wanted.includes(String(p.id)));
}

/* The session address has this shape. */
const ROOT_PATTERN = /^(https?:\/\/[^/]+\/api\/reviewed-course-assets\/[A-Za-z0-9]+\/[A-Za-z0-9]+)\//;

const browser = await connect(9222);

for (const program of targets) {
  const id = program.id;
  console.log(`\n=== ${id} ${program.title}`);

  browser.events.length = 0;
  await browser.goto(`${ORIGIN}/play/${id}`);

  /* Wait for the player to open the course. */
  let frameSrc = '';
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    frameSrc = await browser
      .evaluate(`document.querySelector('iframe')?.src || ''`)
      .catch(() => '');
    if (frameSrc.includes('reviewed-course-assets')) break;
    const status = await browser
      .evaluate(`document.getElementById('play-status')?.textContent || ''`)
      .catch(() => '');
    if (/播放已暂停/.test(status)) break;
  }
  if (!frameSrc.includes('reviewed-course-assets')) {
    const status = await browser
      .evaluate(
        `(document.getElementById('play-status')?.textContent || '') + ' / ' + (document.getElementById('hint')?.textContent || '')`
      )
      .catch(() => '');
    console.log('  no course:', status);
    continue;
  }
  console.log('  frame:', frameSrc.slice(0, 130));

  const outDir = path.join(CW, `${id}.assets`);
  let saved = 0;

  /*
   * Take the files out of the responses the frame received. The bodies
   * live in the browser until the frame is torn down, so they are
   * collected after each chapter.
   */
  const harvest = async () => {
    const responses = browser.events
      .filter((e) => e.method === 'Network.responseReceived')
      .filter((e) => /reviewed-course-assets/.test(e.params.response.url))
      .filter((e) => e.params.response.status === 200);
    for (const e of responses) {
      const url = e.params.response.url;
      const root = url.match(ROOT_PATTERN)?.[1];
      if (!root) continue;
      const rel = url.slice(root.length + 1);
      if (!rel) continue;
      const target = path.join(outDir, rel);
      if (fs.existsSync(target) && fs.statSync(target).size > 0) continue;
      try {
        const body = await browser.raw(
          'Network.getResponseBody',
          { requestId: e.params.requestId },
          e.sessionId
        );
        const buf = Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8');
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, buf);
        saved++;
      } catch {
        /* The body may already be gone; the next pass will find it again. */
      }
    }
  };

  await sleep(6000);
  await harvest();
  console.log(`  after first chapter: ${saved} files`);

  /* Walk the chapter list. Every chapter brings its own files. */
  const chapters = await browser.evaluate(`(() => {
    const select = document.querySelector('.reviewed-public-controls select');
    if (!select) return [];
    return [...select.options].map(o => ({ id: o.value, title: o.textContent }));
  })()`);
  console.log(`  chapters: ${chapters.length}`);

  for (const chapter of chapters) {
    if (!chapter.id) continue;
    const before = saved;
    await browser
      .evaluate(`(() => {
        const select = document.querySelector('.reviewed-public-controls select');
        if (!select) return false;
        const option = [...select.options].find(o => o.value === ${JSON.stringify(chapter.id)});
        if (!option) return false;
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`)
      .catch(() => false);
    await sleep(5000);
    await harvest();
    if (saved !== before) console.log(`    ${chapter.id}: +${saved - before}`);
  }

  console.log(`  saved ${saved} files`);

  /* The entry document is the start of the local copy. */
  const entry = fs.existsSync(path.join(outDir, 'index.html'))
    ? 'index.html'
    : fs.readdirSync(outDir).find((f) => f.endsWith('.html'));
  if (entry) {
    let html = fs.readFileSync(path.join(outDir, entry), 'utf8');
    /* Point the local copy at its own folder instead of the session
       address it was served from. */
    html = html.replace(
      /https:\/\/aifunengjiaoyu\.com\/api\/reviewed-course-assets\/[A-Za-z0-9]+\/[A-Za-z0-9]+\//g,
      './'
    );
    fs.writeFileSync(path.join(CW, `${id}.html`), html);
    console.log('  entry written:', entry);
  }
}

await browser.close();
