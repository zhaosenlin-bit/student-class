import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

async function get(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal });
    const body = await r.text();
    return { status: r.status, body };
  } catch (e) {
    return { status: 0, body: '' };
  } finally {
    clearTimeout(t);
  }
}

const simPage = await get('https://phet.colorado.edu/en/simulations/forces-and-motion-basics');
const simHtml = await get(
  'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_zh_CN.html'
);

const out = {
  pageStatus: simPage.status,
  htmlStatus: simHtml.status,
  htmlLen: simHtml.body.length,
  zipLinks: [...new Set([...simPage.body.matchAll(/https?:\/\/[^"'<>\\ ]+?\.zip/g)].map((m) => m[0]))].slice(0, 20),
  offlineWords: [...new Set([...simPage.body.matchAll(/[^"'<>]{0,80}(?:offline|Offline)[^"'<>]{0,80}/g)].map((m) => m[0]))]
    .slice(0, 15),
  htmlRefs: [...new Set([...simHtml.body.matchAll(/["']([^"']*\.(?:js|json|png|svg|jpg|css|woff2?))["']/g)].map((m) => m[1]))].slice(
    0,
    40
  ),
};
fs.writeFileSync('recon/scratch/phet-probe2.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2).slice(0, 4000));
