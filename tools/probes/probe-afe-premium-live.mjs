/* 看看线上现在对精品课（846-1346）给什么答案：账号有没有权益、正文从哪条通道走。 */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const headers = { 'User-Agent': UA, Referer: `${ORIGIN}/`, Authorization: `Bearer ${token}` };

const show = async (label, url, init = {}) => {
  try {
    const r = await fetch(url, { headers: { ...headers, ...(init.headers || {}) }, ...init });
    const text = await r.text();
    console.log(`${label} -> ${r.status} ${text.length}B ${text.slice(0, 300).replace(/\s+/g, ' ')}`);
    return { status: r.status, text };
  } catch (e) {
    console.log(`${label} -> ERR ${e.message}`);
    return { status: 0, text: '' };
  }
};

await show('GET /api/premium/account', `${ORIGIN}/api/premium/account`);
await show('GET /api/premium/access', `${ORIGIN}/api/premium/access`);
await show('GET /api/premium/capabilities', `${ORIGIN}/api/premium/capabilities`);
await show('GET /api/premium/prices', `${ORIGIN}/api/premium/prices`);
await show('GET /api/pay/vip-prices', `${ORIGIN}/api/pay/vip-prices`);

for (const id of [849, 850, 1346]) {
  await show(`GET /api/programs/${id}/access-token`, `${ORIGIN}/api/programs/${id}/access-token`);
  await show(
    `POST /api/premium/playback/launch ${id}`,
    `${ORIGIN}/api/premium/playback/launch`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-premium-catalogue-intent': 'play' },
      body: JSON.stringify({ programId: id, useId: `probe-${id}` }),
    }
  );
  await new Promise((r) => setTimeout(r, 400));
}

