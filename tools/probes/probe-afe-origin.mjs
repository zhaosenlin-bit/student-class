/* The course frame is sandboxed, so its requests carry Origin: null.
   That may be what the server checks. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const url = process.argv[2];
for (const [name, headers] of [
  ['origin-null', { 'User-Agent': UA, Origin: 'null', Referer: '' }],
  ['origin-null-noref', { 'User-Agent': UA, Origin: 'null' }],
  ['origin-site', { 'User-Agent': UA, Origin: 'https://aifunengjiaoyu.com' }],
  ['no-origin', { 'User-Agent': UA }],
]) {
  const res = await fetch(url, { headers });
  const text = res.ok ? await res.text() : '';
  console.log(`  ${res.status} len=${text.length} ${name}`);
  if (res.ok) console.log('     ' + text.slice(0, 160).replace(/\s+/g, ' '));
}
