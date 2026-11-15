/* How much trial is left, and which works still open? */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const headers = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

for (const id of process.argv.slice(2).map(Number).filter(Boolean)) {
  const access = await (await fetch(`${ORIGIN}/api/programs/${id}/access-token`, { headers })).json();
  let camera = '-';
  if (access.success) {
    const res = await fetch(`${ORIGIN}/api/programs/${id}/camera-launch`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    const data = await res.json();
    camera = data.success ? 'OK' : `${data.msg}${data.reason ? '/' + data.reason : ''}`;
  } else {
    camera = `token:${access.msg}`;
  }
  console.log(`${id}: accessType=${access.accessType} trialUsed=${access.trialUsed} camera=${camera}`);
}
