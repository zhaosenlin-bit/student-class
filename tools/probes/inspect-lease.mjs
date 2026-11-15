/* Look at the lease that a captured course body still carries. */
import fs from 'node:fs';

const file = process.argv[2];
const t = fs.readFileSync(file, 'utf8');
console.log('len', t.length);
console.log('base', t.match(/<base[^>]*href="([^"]+)"/i)?.[1]);
console.log('lease', t.match(/\/t\/([A-Za-z0-9_-]+)\//)?.[1]);

const i = t.indexOf('})({"protocol"');
if (i > 0) {
  const rest = t.slice(i + 3);
  let depth = 0;
  for (let k = 0; k < rest.length; k++) {
    const c = rest[k];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        const json = JSON.parse(rest.slice(0, k + 1));
        console.log('assetRoot', json.assetRoot);
        console.log('entries', JSON.stringify(json.entries));
        break;
      }
    }
  }
}

const urls = [...new Set([...t.matchAll(/["'(]([^"'()\s]*\/api\/program-assets\/[^"'()\s]+)/g)].map((m) => m[1]))];
console.log('asset urls', urls.slice(0, 20));
