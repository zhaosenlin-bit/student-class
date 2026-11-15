/* launch 拿到的 token 能打开正文吗？逐个候选路径试。 */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const programId = Number(process.argv[2] || 846);

const base = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Origin: ORIGIN,
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Premium-Catalogue-Intent': 'cataloguing',
};

const useId = crypto.randomUUID();
const launch = await (
  await fetch(`${ORIGIN}/api/premium/playback/launch`, {
    method: 'POST',
    headers: base,
    body: JSON.stringify({ programId, useId }),
  })
).json();
console.log('launch:', JSON.stringify({ ...launch, token: launch.token?.slice(0, 24) + '…' }));

const candidates = [
  `/api/program-file/${programId}?token=${launch.token}`,
  `/api/program-file/${programId}/body?token=${launch.token}`,
  `/api/premium/program/${programId}?token=${launch.token}`,
  `/api/premium/body/${programId}?token=${launch.token}`,
  `/api/premium/playback/${programId}?token=${launch.token}`,
  `/api/premium/courseware/${programId}?token=${launch.token}`,
  `/api/program-file/${programId}`,
];

for (const path of candidates) {
  const r = await fetch(ORIGIN + path, { headers: { ...base, Authorization: `Bearer ${launch.token}` } });
  const text = await r.text();
  console.log(`${r.status} ${String(text.length).padStart(7)}B  ${path.split('?')[0]}`);
  if (r.status === 200) console.log('    ', text.slice(0, 300).replace(/\s+/g, ' '));
  else console.log('    ', text.slice(0, 160).replace(/\s+/g, ' '));
  await new Promise((r2) => setTimeout(r2, 300));
}

