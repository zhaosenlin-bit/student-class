/* Take a fresh mount grant and try to read a course file from inside the
   browser, in several ways. */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const sessionId = process.argv[2];
const programId = Number(process.argv[3]);
const wantFile = process.argv[4] || 'index.html';

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

const resumed = await post(`/api/reviewed-course-session/session/${sessionId}/resume`, {
  programId,
});
const entry = resumed.descriptor.entries[0];
const mounted = await post(`/api/reviewed-course-session/session/${sessionId}/mount`, {
  entry: entry.id,
});
const prefix = mounted.prefix;
console.log('prefix:', prefix);
const url = ORIGIN + prefix + wantFile;

/* Try the full set of headers Chrome sends, from Node. */
const chromeHeaders = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Sec-CH-UA': '"Chromium";v="157", "Not=A?Brand";v="99"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  Priority: 'u=0, i',
};
const nodeRes = await fetch(url, { headers: chromeHeaders, redirect: 'manual' });
const nodeText = nodeRes.ok ? await nodeRes.text() : '';
console.log(`node chrome-headers: ${nodeRes.status} len=${nodeText.length}`);

const browser = await connect(9222);
await browser.goto(ORIGIN + '/');
await sleep(1200);

const expr = `(async () => {
  const target = ${JSON.stringify(url)};
  const out = {};
  const r1 = await fetch(target, { credentials: 'include' });
  out.pageFetch = { status: r1.status, len: (await r1.text()).length };
  const r2 = await fetch(target, { credentials: 'omit' });
  out.pageFetchOmit = { status: r2.status, len: (await r2.text()).length };
  const r3 = await fetch(target, {
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + localStorage.getItem('aiedu_token') },
  });
  out.pageFetchAuth = { status: r3.status, len: (await r3.text()).length };
  return out;
})()`;
console.log(JSON.stringify(await browser.evaluate(expr), null, 1));
await browser.close();
