/* Read one program of the upstream site and list the files it names. */
const slug = process.argv[2] || 'ColorMixing';
const list = process.argv[3] || 'Games';
const base = `https://thephysicsaviary.com/Physics/Programs/${list}/${slug}/`;

const res = await fetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const text = await res.text();
console.log(res.status, text.length);
const srcs = [...text.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
console.log(srcs.join('\n'));
console.log('--- inline scripts mentioning Initialize ---');
for (const m of text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
  if (/Initialize/.test(m[1])) console.log(m[1].slice(0, 300));
}
