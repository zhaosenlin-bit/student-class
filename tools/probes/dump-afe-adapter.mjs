/* Print the whole descriptor of a chapter session, so the local copy can
   be given the same runtime configuration. */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const SID = process.argv[2] || 'e547484ae39c1c50abdb4d69dde927f3b3375f6d79b0461c';
const PROGRAM = Number(process.argv[3] || 841);

const res = await fetch(`${ORIGIN}/api/reviewed-course-session/session/${SID}/resume`, {
  method: 'POST',
  headers: {
    'User-Agent': UA,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    Origin: ORIGIN,
    Referer: `${ORIGIN}/`,
  },
  body: JSON.stringify({ programId: PROGRAM }),
});
const json = await res.json();
console.log(JSON.stringify(json, null, 1));
