/* Resume a chapter session and fetch its files without a browser, so the
   delivery rules can be mapped out. */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const sessionId = process.argv[2];
const programId = Number(process.argv[3]);
const wantFile = process.argv[4] || 'index.html';

const variants = {
  'plain bearer': { Authorization: `Bearer ${TOKEN}` },
  'bearer + referer': { Authorization: `Bearer ${TOKEN}`, Referer: `${ORIGIN}/play/${programId}` },
  'bearer + origin': {
    Authorization: `Bearer ${TOKEN}`,
    Referer: `${ORIGIN}/play/${programId}`,
    Origin: ORIGIN,
  },
  'bearer + no origin (same as bearer)': { Authorization: `Bearer ${TOKEN}` },
};

const post = async (route, body, headers) => {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text: text.slice(0, 300), setCookie: res.headers.getSetCookie?.() };
};

for (const [name, headers] of Object.entries(variants)) {
  const resumed = await post(
    `/api/reviewed-course-session/session/${sessionId}/resume`,
    { programId },
    headers
  );
  console.log(`\n[${name}] resume ${resumed.status} ${resumed.text.slice(0, 120)}`);
  if (!resumed.json?.id) continue;

  const entries = resumed.json.descriptor.entries;
  const mounted = await post(
    `/api/reviewed-course-session/session/${sessionId}/mount`,
    { entry: entries[0].id },
    headers
  );
  console.log(`[${name}] mount ${mounted.status} ${mounted.text.slice(0, 200)}`);
  if (!mounted.json?.prefix) continue;
  console.log(`[${name}] prefix ${mounted.json.prefix}`);
  if (mounted.setCookie?.length) console.log(`[${name}] set-cookie ${mounted.setCookie.join(' | ')}`);

  for (const [assetName, assetHeaders] of [
    ['bare', {}],
    ['bearer', { Authorization: `Bearer ${TOKEN}` }],
    ['bearer+referer', { Authorization: `Bearer ${TOKEN}`, Referer: `${ORIGIN}/play/${programId}` }],
    ['origin null', { Origin: 'null' }],
    ['origin null + cross-site script', {
      Origin: 'null',
      'Sec-Fetch-Dest': 'script',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    }],
    ['origin null + cross-site iframe', {
      Origin: 'null',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
    }],
    ['cross-site script no origin', {
      'Sec-Fetch-Dest': 'script',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    }],
    ['same-site iframe', {
      Referer: `${ORIGIN}/`,
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-site',
    }],
    ['same-site iframe + origin', {
      Referer: `${ORIGIN}/`,
      Origin: ORIGIN,
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-site',
    }],
    [
      'nav',
      {
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    ],
  ]) {
    const url = ORIGIN + mounted.json.prefix + wantFile;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, ...assetHeaders },
      redirect: 'manual',
    });
    const text = res.ok ? await res.text() : '';
    console.log(
      `   [${assetName}] ${res.status} len=${text.length} ${text.slice(0, 70).replace(/\s+/g, ' ')}`
    );
  }
  break;
}
