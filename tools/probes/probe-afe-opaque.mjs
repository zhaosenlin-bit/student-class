/*
 * The chapter frame is sandboxed without allow-same-origin, so every
 * request it makes carries a null origin. The server decides on that.
 * Try the request the way such a frame would make it.
 */
const url = process.argv[2];
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const variants = [
  ['null-origin, no-referrer', {
    'User-Agent': UA,
    Origin: 'null',
    Referer: '',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
  }],
  ['null-origin, cross-site', {
    'User-Agent': UA,
    Origin: 'null',
    Referer: '',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
  }],
  ['null-origin + accept */*', {
    'User-Agent': UA,
    Origin: 'null',
    Referer: '',
    Accept: '*/*',
  }],
  ['no-origin at all', { 'User-Agent': UA, Accept: '*/*' }],
  ['null-origin + sec-fetch-mode no-cors', {
    'User-Agent': UA,
    Origin: 'null',
    Referer: '',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Dest': 'empty',
  }],
];

for (const [name, headers] of variants) {
  const res = await fetch(url, { headers });
  const text = res.ok ? await res.text() : '';
  console.log(`  ${res.status} len=${text.length} ${name}`);
  if (res.ok) console.log('     ' + text.slice(0, 200).replace(/\s+/g, ' '));
}
