import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

async function get(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 40000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal });
    return { status: r.status, body: await r.text() };
  } catch (e) {
    return { status: 0, body: '' };
  } finally {
    clearTimeout(t);
  }
}

const shell = await get('https://phet.colorado.edu/en/simulations');
const scripts = [...new Set([...shell.body.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]))];
const apiHints = [...new Set([...shell.body.matchAll(/["']([^"']*(?:services|api|graphql|\.json)[^"']*)["']/g)].map((m) => m[1]))].slice(
  0,
  30
);

let bundleApi = [];
for (const s of scripts.slice(0, 4)) {
  const u = s.startsWith('http') ? s : 'https://phet.colorado.edu' + s;
  const b = await get(u);
  if (b.status === 200) {
    bundleApi = bundleApi.concat(
      [...new Set([...b.body.matchAll(/["'`](\/services\/[^"'`\s]{0,80})["'`]/g)].map((m) => m[1]))].slice(0, 20)
    );
  }
}

const gh = [];
for (const u of [
  'https://api.github.com/repos/phet-simulations/forces-and-motion-basics',
  'https://api.github.com/repos/phet-simulations/colorado',
  'https://api.github.com/orgs/phet-simulations/repos?per_page=5',
]) {
  const r = await get(u);
  gh.push({ url: u, status: r.status, head: r.body.slice(0, 160) });
}

const out = { shellStatus: shell.status, shellLen: shell.body.length, scripts, apiHints, bundleApi, gh };
fs.writeFileSync('recon/scratch/phet-probe3.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2).slice(0, 5000));
