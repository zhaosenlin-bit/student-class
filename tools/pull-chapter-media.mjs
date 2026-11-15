#!/usr/bin/env node
/*
 * Pick up the pictures and sounds the chapter courses need.
 *
 * The chapter documents name their media under the platform's own asset
 * address, not under the session they were opened with.  A browser that
 * carries the session can still fetch them, so the media is collected
 * from inside a real browser and written next to the documents.
 *
 * Every chapter is opened in turn, because each one asks for its own
 * pictures.  A session that refuses to hand out a mount is retried with
 * a fresh one until the quota runs out.
 *
 *   node tools/pull-chapter-media.mjs 842 1360 1016 841
 *   node tools/pull-chapter-media.mjs 842 --sessions 3
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdp2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const sessionRounds = args.includes('--sessions')
  ? Number(args[args.indexOf('--sessions') + 1])
  : 2;
const ids = args.map(Number).filter(Boolean);
if (!ids.length) ids.push(842, 1360, 1016, 841);

const post = async (route, body) => {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/* Where a media address belongs in the local folder. */
const localPath = (url, id, prefix) => {
  let rel = url;
  const marker = `/api/program-assets/${id}/`;
  const at = url.indexOf(marker);
  if (at >= 0) rel = url.slice(at + marker.length);
  else if (prefix && url.startsWith(prefix)) rel = url.slice(prefix.length);
  else return null;
  rel = rel.split('?')[0].split('#')[0];
  if (!rel || rel.includes('..')) return null;
  return path.join(CW, `${id}.assets`, decodeURIComponent(rel));
};

const browser = await connect(9222);
await browser.goto(ORIGIN + '/');
await sleep(1500);

for (const id of ids) {
  let totalSaved = 0;
  const done = new Set();

  for (let round = 1; round <= sessionRounds; round++) {
    const opened = await post(`/api/reviewed-course-session/${id}/open`, {});
    if (!opened?.id) {
      console.log(`${id}: no session`);
      break;
    }
    const sessionId = opened.id;
    const resumed = await post(`/api/reviewed-course-session/session/${sessionId}/resume`, {
      programId: id,
    });
    const entries = resumed?.descriptor?.entries || [];
    if (!entries.length) {
      console.log(`${id}: cannot resume`);
      break;
    }

    for (const entry of entries) {
      if (done.has(entry.id)) continue;
      const mounted = await post(`/api/reviewed-course-session/session/${sessionId}/mount`, {
        entry: entry.id,
      });
      const prefix = mounted?.prefix;
      if (!prefix) {
        console.log(`  ${id}: ${entry.id} no mount`);
        continue;
      }
      done.add(entry.id);
      const url = ORIGIN + prefix + entry.path.split('/').map(encodeURIComponent).join('/');

      /* Open the document in a frame that carries the session. */
      await browser.evaluate(`(() => {
        document.querySelectorAll('iframe[data-pull]').forEach(f => f.remove());
        const frame = document.createElement('iframe');
        frame.setAttribute('data-pull', '1');
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        frame.style.cssText = 'width:1200px;height:800px;border:0;position:fixed;left:0;top:0;z-index:99999';
        document.body.append(frame);
        window.__pullFrame = frame;
        frame.src = ${JSON.stringify(url)};
        return true;
      })()`);
      await sleep(9000);

      const frameEntry = [...browser.sessions.entries()]
        .reverse()
        .find(([, s]) => s.targetInfo.type === 'iframe');
      if (!frameEntry) {
        console.log(`  ${id}: ${entry.id} no frame`);
        continue;
      }
      const [frameSession] = frameEntry;

      /* Every picture and sound the frame asked for. */
      const responses = browser.events
        .filter((e) => e.method === 'Network.responseReceived')
        .filter((e) => e.params.sessionId === frameSession)
        .map((e) => e.params.response)
        .filter((r) => r.status === 200);

      let saved = 0;
      let present = 0;
      let missed = 0;
      for (const r of responses) {
        const type = r.mimeType || '';
        if (!/^(image|audio|video)\//.test(type)) continue;
        const target = localPath(r.url, id, prefix);
        if (!target) continue;
        if (fs.existsSync(target) && fs.statSync(target).size > 0) {
          present++;
          continue;
        }
        try {
          const body = await browser.raw(
            'Network.getResponseBody',
            { requestId: r.requestId },
            frameSession
          );
          if (!body?.body) continue;
          const buf = Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8');
          if (!buf.length) continue;
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, buf);
          saved++;
        } catch {
          missed++;
        }
      }
      totalSaved += saved;
      console.log(
        `  ${id}: ${entry.id} 存下 ${saved} 个, 已有 ${present} 个, 读不到 ${missed} 个`
      );
    }
  }
  console.log(`${id}: 本轮共存下 ${totalSaved} 个文件`);
}

await browser.close();
