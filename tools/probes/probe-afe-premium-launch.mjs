/* 试一条精品课的官方免费体验通道：/api/premium/playback/launch */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();

const ids = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : [846, 858, 890, 1041];

for (const programId of ids) {
  const useId = crypto.randomUUID();
  const headers = {
    'User-Agent': UA,
    Referer: `${ORIGIN}/`,
    Origin: ORIGIN,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Premium-Catalogue-Intent': 'cataloguing',
  };
  const r = await fetch(`${ORIGIN}/api/premium/playback/launch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ programId, useId }),
  });
  const text = await r.text();
  console.log(`launch ${programId} -> ${r.status} ${text.length}B`);
  console.log('   ', text.slice(0, 500).replace(/\s+/g, ' '));
  await new Promise((r2) => setTimeout(r2, 500));
}

