/* Compare the prefix that served the files with a freshly granted one, and
   print what the server says about each. */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const SID = 'e547484ae39c1c50abdb4d69dde927f3b3375f6d79b0461c';

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
  return res.json().catch(() => null);
};

const resumed = await post(`/api/reviewed-course-session/session/${SID}/resume`, { programId: 841 });
const mounted = await post(`/api/reviewed-course-session/session/${SID}/mount`, { entry: 'atlas' });
const prefixes = {
  old: '/api/reviewed-course-assets/e547484ae39c1c50abdb4d69dde927f3b3375f6d79b0461c/013f31a78dc60f11829db3062dda656cb3e4c01860852756/',
  new: mounted.prefix,
};

const headerSets = {
  'bare': {},
  'auth+origin': { Authorization: `Bearer ${TOKEN}`, Origin: ORIGIN },
  'auth+origin+referer': {
    Authorization: `Bearer ${TOKEN}`,
    Origin: ORIGIN,
    Referer: `${ORIGIN}/play/841`,
  },
  'origin+referer': { Origin: ORIGIN, Referer: `${ORIGIN}/play/841` },
};

for (const [pname, prefix] of Object.entries(prefixes)) {
  for (const file of ['index.html', 'assets/index-Df_Pctd-.js']) {
    for (const [hname, extra] of Object.entries(headerSets)) {
      const res = await fetch(ORIGIN + prefix + file, {
        headers: { 'User-Agent': UA, ...extra },
        redirect: 'manual',
      });
      const text = res.ok ? await res.text() : '';
      console.log(
        `${pname}/${file}/${hname}: ${res.status} len=${text.length} ${res.headers.get('x-reviewed-error') || ''} ${res.headers.get('content-type') || ''}`
      );
    }
  }
}

const res = await fetch(ORIGIN + prefixes.new + 'index.html', { headers: { 'User-Agent': UA } });
console.log('\n403 headers:', JSON.stringify(Object.fromEntries(res.headers.entries()), null, 1));
console.log('resumed entries:', resumed?.descriptor?.entries?.length);
