/*
 * The 精品课 catalogue carries a programId for every entry. This asks the
 * live platform for those bodies with the account's own token.
 */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const catalogue = JSON.parse(
  fs.readFileSync('mirror/aifunengjiaoyu/premium/catalogue.json', 'utf8')
);

const headers = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${token}`,
};

const ids = (process.argv.slice(2).length
  ? process.argv.slice(2)
  : catalogue.courses.slice(0, 8).map((c) => String(c.programId))
).map(Number);

for (const id of ids) {
  for (const route of ['body', 'meta']) {
    const url = `${ORIGIN}/api/program-file/${id}/${route}`;
    try {
      const r = await fetch(url, { headers });
      const text = await r.text();
      console.log(
        `${id} ${route} -> ${r.status} ${r.headers.get('content-type') || ''} ${text.length}B`,
        text.slice(0, 160).replace(/\s+/g, ' ')
      );
    } catch (e) {
      console.log(`${id} ${route} -> ERR ${e.message}`);
    }
  }
  await new Promise((r) => setTimeout(r, 300));
}
