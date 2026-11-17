import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

async function head(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal });
    return { status: r.status, len: Number(r.headers.get('content-length') || 0), type: r.headers.get('content-type') };
  } catch (e) {
    return { status: 0, len: 0, error: String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

const urls = process.argv.slice(2);
const out = [];
for (const u of urls) out.push({ url: u, ...(await head(u)) });
fs.writeFileSync('recon/scratch/phet-probe.json', JSON.stringify(out, null, 2));
console.log(out.map((o) => `${o.status} ${o.len} ${o.url}`).join('\n'));
