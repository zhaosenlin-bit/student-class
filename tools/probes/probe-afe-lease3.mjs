/* Can a mount address still be taken, and what does it serve? */
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
  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text) };
  } catch {
    return { status: res.status, json: null, text };
  }
};

for (const entry of ['atlas', 'chapter-1', 'chapter-2']) {
  const mounted = await post(`/api/reviewed-course-session/session/${SID}/mount`, { entry });
  console.log(entry, mounted.status, mounted.json?.prefix || mounted.text?.slice(0, 120));
  if (!mounted.json?.prefix) continue;
  const prefix = mounted.json.prefix;
  for (const rel of [
    'delivery/20260912/chapters.html',
    'delivery/20260912/chapter01.js',
    'delivery/20260912/chapter01.mjs',
    'delivery/20260912/chapter-1.js',
    'assets/index-Df_Pctd-.js',
  ]) {
    const res = await fetch(ORIGIN + prefix + rel, {
      headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
    });
    console.log(`   ${res.status} ${rel}`);
  }
}
