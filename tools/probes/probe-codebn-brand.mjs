/* Read the public brand bits off codebn.cn: logo files, favicon, og image. */
const html = await (await fetch('https://codebn.cn/')).text();

const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
console.log('--- img srcs ---');
[...new Set(imgs)].forEach((i) => console.log(' ', i));

console.log('--- icon links ---');
[...html.matchAll(/<link[^>]*>/gi)]
  .map((m) => m[0])
  .filter((l) => /icon|apple|og:image/i.test(l))
  .forEach((l) => console.log(' ', l));

const title = html.match(/<title>([^<]*)<\/title>/i);
console.log('--- title ---', title?.[1]);
