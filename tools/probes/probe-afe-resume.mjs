/*
 * A reviewed-course session survives the trial: the id and the mount
 * grant are enough to resume it. The frame reads the files with a null
 * origin, so that is what the request has to look like.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const post = async (route, body) => {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Referer: `${ORIGIN}/`,
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
};

const sessionId = process.argv[2];
const programId = Number(process.argv[3]);

const resume = await post(`/api/reviewed-course-session/session/${sessionId}/resume`, { programId });
console.log('resume ->', resume.status, resume.text.slice(0, 300).replace(/\s+/g, ' '));

let data = null;
try {
  data = JSON.parse(resume.text);
} catch {}
if (!data?.id) {
  console.log('no session to work with');
  process.exit(0);
}

const mount = await post(`/api/reviewed-course-session/session/${data.id}/mount`, {
  entry: data.descriptor.entries[0].id,
});
console.log('mount ->', mount.status, mount.text.slice(0, 300).replace(/\s+/g, ' '));

let grant = null;
try {
  grant = JSON.parse(mount.text);
} catch {}
if (!grant?.prefix) process.exit(0);

const prefix = new URL(grant.prefix, ORIGIN).href;
console.log('prefix:', prefix);
const entry = data.descriptor.entries[0];

for (const [name, headers] of [
  ['plain', { 'User-Agent': UA }],
  ['origin-null', { 'User-Agent': UA, Origin: 'null' }],
  ['origin-null-bearer', { 'User-Agent': UA, Origin: 'null', Authorization: `Bearer ${TOKEN}` }],
  ['bearer', { 'User-Agent': UA, Authorization: `Bearer ${TOKEN}` }],
]) {
  const url = prefix + entry.path.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(url, { headers });
  const text = res.ok ? await res.text() : '';
  console.log(`  ${res.status} len=${text.length} ${name}`);
  if (res.ok) console.log('     ' + text.slice(0, 130).replace(/\s+/g, ' '));
}
