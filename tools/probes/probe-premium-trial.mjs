/* 试看通道到底覆盖多少门精品课：随便挑几门没标 freeSample 的试。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const catalogue = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'premium', 'catalogue.json'), 'utf8')
);
const nonSample = catalogue.courses.filter((c) => c.programId && !c.freeSample);
const ids = (process.argv[2] ? process.argv[2].split(',') : nonSample.slice(0, 5).map((c) => c.programId)).map(Number);

for (const id of ids) {
  const useId = crypto.randomUUID();
  const res = await fetch(`${ORIGIN}/api/premium/playback/launch`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      'X-Premium-Catalogue-Intent': 'cataloguing',
    },
    body: JSON.stringify({ programId: id, useId }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 非 JSON */
  }
  const course = catalogue.courses.find((c) => c.programId === id);
  console.log(
    id,
    String(course?.title || '').slice(0, 24).padEnd(26),
    'status=' + res.status,
    'token=' + (json?.token ? 'yes' : 'no'),
    'accessType=' + (json?.accessType || '-'),
    'sampleRemaining=' + (json?.sampleRemaining ?? '-'),
    'err=' + (json?.error || json?.msg || text.slice(0, 90))
  );
  if (json?.token) {
    const body = await fetch(`${ORIGIN}/api/program-file/${id}/body?token=${encodeURIComponent(json.token)}`, {
      headers: { Authorization: `Bearer ${json.token}`, Origin: ORIGIN },
    });
    console.log('   body', body.status, (await body.text()).length, 'chars');
    await fetch(`${ORIGIN}/api/premium/playback/close`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Origin: ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ useId }),
    }).catch(() => {});
  }
}
