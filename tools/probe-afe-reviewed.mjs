/* Read the player of the live site and find out how a preview session is
   opened, so the same request can be made without a browser. */
import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const ORIGIN = 'https://aifunengjiaoyu.com';

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  return { status: res.status, text: await res.text() };
};

const page = await get(`${ORIGIN}/play/849`);
console.log('play page', page.status, page.text.length);
fs.writeFileSync('recon/scratch/afe-play-849.html', page.text);

const scripts = [...page.text.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
console.log('scripts:', scripts.join(' '));

for (const s of scripts) {
  const url = s.startsWith('http') ? s : ORIGIN + s;
  const r = await get(url);
  const name = s.split('/').pop().replace(/\W+/g, '_');
  fs.writeFileSync(`recon/scratch/afe-js-${name}`, r.text);
  console.log('saved', name, r.status, r.text.length);
}

/* Look through every saved bundle for the preview call. */
for (const file of fs.readdirSync('recon/scratch')) {
  if (!file.startsWith('afe-js-')) continue;
  const text = fs.readFileSync(`recon/scratch/${file}`, 'utf8');
  for (const key of [
    'reviewed-course-session',
    'playback/launch',
    'REVIEWED_PUBLIC_DENIED',
    'premium_sample',
    'trialRemaining',
    'allowedEntryIds',
  ]) {
    let i = 0;
    let n = 0;
    while ((i = text.indexOf(key, i)) !== -1 && n < 4) {
      console.log(
        `\n### ${file} :: ${key}\n` +
          text.slice(Math.max(0, i - 420), i + 320).replace(/\s+/g, ' ')
      );
      i += key.length;
      n++;
    }
  }
}
