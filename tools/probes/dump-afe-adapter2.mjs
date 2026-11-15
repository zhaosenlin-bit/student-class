/* Read the whole descriptor of a chapter session from inside the site. */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const SID = process.argv[2] || 'e547484ae39c1c50abdb4d69dde927f3b3375f6d79b0461c';
const PROGRAM = Number(process.argv[3] || 841);

const browser = await connect(9222);
await browser.goto(ORIGIN + '/');
await sleep(1500);

const expr = `(async () => {
  const token = localStorage.getItem('aiedu_token');
  const res = await fetch('/api/reviewed-course-session/session/${SID}/resume', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ programId: ${PROGRAM} }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
})()`;

const out = await browser.evaluate(expr);
console.log('status', out.status);
try {
  const json = JSON.parse(out.body);
  fs.writeFileSync('recon/scratch/afe-841-adapter.json', JSON.stringify(json, null, 1));
  console.log(JSON.stringify(json, null, 1).slice(0, 6000));
} catch {
  console.log(out.body.slice(0, 500));
}
await browser.close();
