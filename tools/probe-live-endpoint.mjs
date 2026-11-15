#!/usr/bin/env node
/* Probe one endpoint on the live site, slowly, and report what it answers. */
const paths = process.argv.slice(2);
for (const spec of paths) {
  const [method, path] = spec.includes(' ') ? spec.split(' ') : ['GET', spec];
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch('https://aifunengjiaoyu.com' + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? '{}' : undefined,
        signal: AbortSignal.timeout(25000),
      });
      const text = await r.text();
      if (r.status === 429 && attempt < 4) {
        await new Promise((res) => setTimeout(res, 5000 * (attempt + 1)));
        continue;
      }
      console.log(`${method.padEnd(4)} ${path.padEnd(34)} -> ${r.status} ${text.slice(0, 90)}`);
      break;
    } catch (e) {
      console.log(`${method.padEnd(4)} ${path.padEnd(34)} -> ERR ${e.message}`);
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1500));
}
