/*
 * Does anything still point at a file that is not there?
 *
 * When files are taken out of the project, a tool that called one of
 * them stops working, and nothing says so until the day it is needed.
 * This walks every tool and every script the site loads, and reports
 * the ones that name a file that is not in the project any more.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const tracked = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
  .split('\n')
  .filter(Boolean);

const known = new Set(tracked);
const scripts = tracked.filter(
  (f) => f.startsWith('tools/') && /\.(mjs|js)$/.test(f)
);

const importPattern = /(?:import|from)\s*\(?\s*['"]\.\/([a-z0-9._-]+\.mjs)['"]/gi;
const pathPattern = /tools[\\/]+([a-z0-9._-]+\.mjs)/gi;

const broken = [];
for (const f of scripts) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(importPattern)) {
    /* A tool usually reaches for a file beside itself. */
    const beside = path.join(path.dirname(f), m[1]).replace(/\\/g, '/');
    if (!known.has(beside) && !known.has(`tools/${m[1]}`)) broken.push(`${f} -> ${m[1]}`);
  }
  for (const m of text.matchAll(pathPattern)) {
    if (!known.has(`tools/${m[1]}`)) broken.push(`${f} -> ${m[1]}`);
  }
}

/* The site loads a few scripts by name as well. */
const site = path.join(ROOT, 'mirror', 'leqixiang', 'site');
for (const file of fs.readdirSync(site)) {
  if (!/\.(html|js)$/.test(file)) continue;
  const text = fs.readFileSync(path.join(site, file), 'utf8');
  for (const m of text.matchAll(/src=["']\/([a-z0-9._-]+\.js)["']/gi)) {
    if (!fs.existsSync(path.join(site, m[1]))) {
      broken.push(`site/${file} -> ${m[1]}`);
    }
  }
}

if (broken.length) {
  console.log('断掉的引用:');
  for (const b of broken) console.log('  ' + b);
  process.exit(1);
}
console.log(`绿灯：${scripts.length} 个工具和站点脚本的引用都还找得到。`);
