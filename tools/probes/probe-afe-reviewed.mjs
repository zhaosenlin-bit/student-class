/* Open a reviewed course session and see what comes back. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const post = async (route, body) => {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Referer: `${ORIGIN}/`,
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
};

for (const id of process.argv.slice(2).map(Number).filter(Boolean)) {
  const requestId = Array.from(crypto.getRandomValues(new Uint8Array(24)), (v) =>
    v.toString(16).padStart(2, '0')
  ).join('');
  console.log(`\n=== ${id} ===`);
  const res = await post(`/api/reviewed-course-session/${id}/open`, { requestId });
  console.log(`  open -> ${res.status} ${res.text.slice(0, 400).replace(/\s+/g, ' ')}`);
  let data = null;
  try {
    data = JSON.parse(res.text);
  } catch {}
  if (data?.id) {
    for (const action of ['renew', 'checkpoint']) {
      const r = await post(`/api/reviewed-course-session/session/${data.id}/${action}`, { programId: id });
      console.log(`  ${action} -> ${r.status} ${r.text.slice(0, 200).replace(/\s+/g, ' ')}`);
    }
  }
}
