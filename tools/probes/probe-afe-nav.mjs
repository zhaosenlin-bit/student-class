/*
 * The course files answer a navigation, not a script fetch. Try the
 * headers of a top-level navigation.
 */
const url = process.argv[2];
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const navHeaders = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent': UA,
};

for (const [name, headers] of [
  ['navigation', navHeaders],
  [
    'navigation + no sec-fetch-user',
    { ...navHeaders, 'Sec-Fetch-User': undefined },
  ],
  [
    'navigation + sec-fetch-site same-origin',
    { ...navHeaders, 'Sec-Fetch-Site': 'same-origin' },
  ],
]) {
  const clean = Object.fromEntries(Object.entries(headers).filter(([, v]) => v !== undefined));
  const res = await fetch(url, { headers: clean });
  const text = res.ok ? await res.text() : '';
  console.log(`  ${res.status} len=${text.length} ${name}`);
  if (res.ok) console.log('     ' + text.slice(0, 200).replace(/\s+/g, ' '));
}
