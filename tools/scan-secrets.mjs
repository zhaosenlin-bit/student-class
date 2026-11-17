/* Look through the files that are tracked for anything that looks like a
   credential, so nothing like that reaches the repository. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files'], {
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
})
  .split('\n')
  .filter(Boolean);

const patterns = [
  [/Bearer\s+[A-Za-z0-9._-]{20,}/g, 'bearer'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, 'jwt'],
  [/"token"\s*:\s*"[A-Za-z0-9._-]{20,}"/g, 'token field'],
  [/"accessToken"\s*:\s*"[A-Za-z0-9._-]{20,}"/g, 'access token'],
  [/openid["']?\s*[:=]\s*["'][^"']{8,}/gi, 'openid'],
  [/session_key["']?\s*[:=]\s*["'][^"']{8,}/gi, 'session key'],
  [/unionid["']?\s*[:=]\s*["'][^"']{8,}/gi, 'unionid'],
];

let hits = 0;
for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (text.length > 40 * 1024 * 1024) continue;
  for (const [re, kind] of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      hits++;
      console.log(`${file}  [${kind}]  ${m[0].slice(0, 70).replace(/\n/g, ' ')}`);
    }
  }
}
console.log(hits ? `${hits} suspicious places` : 'nothing that looks like a credential');
