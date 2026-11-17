#!/usr/bin/env node
/*
 * Puts one course on a side server with the local patches taken out, so a
 * course that freezes can be asked whether the freeze is in the copy or in
 * the place that serves it.
 *
 *   node tools/isolate-course.mjs afe-180
 */
import fs from 'node:fs';
import http from 'http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const PORT = Number(args[args.indexOf('--port') + 1] || 4180);

const src = path.join(ROOT, 'mirror', 'leqixiang', 'courseware', `${id}.html`);
const out = path.join(ROOT, 'recon', 'scratch', `isolate-${id}`);
fs.mkdirSync(out, { recursive: true });

const html = fs.readFileSync(src, 'utf8');
/* The server adds a script at the top of the head; that one goes first. */
const headEnd = html.indexOf('</head>');
const stripped = html.slice(0, html.indexOf('<head>') + 6) + html.slice(html.indexOf('<head>') + 6, headEnd).replace(/<script>[\s\S]*?<\/script>/, '') + html.slice(headEnd);
fs.writeFileSync(path.join(out, `${id}.html`), stripped);
console.log(`${id}: ${stripped.length} bytes (head script removed)`);

http
  .createServer((req, res) => {
    const file = path.join(out, req.url.split('?')[0]);
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(file));
    } else if (req.url.startsWith('/api/program-file/verify-access')) {
      /* The guard in the body asks the host whether it may run. */
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(404);
      res.end('not found');
    }
  })
  .listen(PORT, () => console.log(`isolate server: http://localhost:${PORT}/${id}.html`));
