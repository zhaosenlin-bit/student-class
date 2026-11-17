#!/usr/bin/env node
/*
 * Take a picture of a course, so a claim about it can be looked at.
 *
 *   node tools/shot-course.mjs <course-id> [<course-id> …]
 *   node tools/shot-course.mjs --wait 9000 <course-id>
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect, sleep } from './cdpx.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(arg('port', 4173));
const CDP = Number(arg('cdp', 9222));
const WAIT = Number(arg('wait', 4500));
const ids = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));

const OUT = path.resolve('recon/scratch/shots');
fs.mkdirSync(OUT, { recursive: true });

const p = await connect(CDP);
for (const id of ids) {
  /* An id that starts with a slash is a page of the library itself. */
  const isPage = id.startsWith('/');
  const url = isPage
    ? `http://localhost:${PORT}${id.startsWith('/') ? id : `/${id}`}`
    : `http://localhost:${PORT}/courseware/${id}.html`;
  const name = isPage ? id.replace(/[^\w.-]+/g, '_').replace(/^_|_$/g, '') || 'home' : id;
  p.send('Page.navigate', { url }).catch(() => {});
  await sleep(WAIT);
  /* A course that stops answering must not stop the run. */
  const shot = await Promise.race([
    p.send('Page.captureScreenshot', { format: 'png' }).catch(() => null),
    sleep(15000).then(() => null),
  ]);
  if (shot?.data) {
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(shot.data, 'base64'));
    console.log('shot', id);
  } else {
    console.log('FAIL', id);
  }
}
await p.close();
