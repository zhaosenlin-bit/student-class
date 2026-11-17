#!/usr/bin/env node
/*
 * Serves one course straight from the source mirror, with nothing added.
 *
 * The body asks the host whether it may run, so the answer is given.  What
 * is left is the course as it was published, and that tells a frozen course
 * apart from one that the local server froze.
 *
 *   node tools/serve-raw-course.mjs 180 --port 4181
 */
import fs from 'node:fs';
import http from 'http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const numeric = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const PORT = Number(args[args.indexOf('--port') + 1] || 4181);

const src = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware', `${numeric}.html`);
const assets = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware', `${numeric}.assets`);
console.log('source:', src, fs.existsSync(src) ? 'ok' : 'MISSING');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    /* The body itself, at the plain address as well. */
    if (url === '/' || url === `/api/program-assets/${numeric}/index.html`) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(src));
      return;
    }
    if (url.startsWith('/api/program-file/verify-access')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    /* The body asks for its assets under a signed prefix. */
    const rel = url.replace(/^\/api\/program-assets\/\d+\/(?:t\/[^/]+\/)?/, '');
    const file = path.join(assets, rel);
    if (file.startsWith(assets) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
      return;
    }
    res.writeHead(404);
    res.end('not found');
  })
  .listen(PORT, () => console.log(`raw server: http://localhost:${PORT}/api/program-assets/${numeric}/`));
