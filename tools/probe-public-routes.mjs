#!/usr/bin/env node
/*
 * Look for public catalogue routes that have not been mirrored yet.
 *
 *   node tools/probe-public-routes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN_FILE = path.join(ROOT, 'recon', 'scratch', 'afe-token.txt');
const TOKEN = fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : '';

const CANDIDATES = {
  'https://aifunengjiaoyu.com': [
    '/api/programs',
    '/api/programs/recommended',
    '/api/programs/hot',
    '/api/programs/new',
    '/api/programs/categories',
    '/api/programs/subjects',
    '/api/program-file/',
    '/api/home',
    '/api/index',
    '/api/gallery',
    '/api/featured',
    '/api/announcement',
    '/api/chapters',
    '/api/collections',
    '/api/playlists',
    '/api/uploads/public',
    '/api/uploads',
    '/api/premium/catalogue',
    '/api/premium/packages',
    '/api/premium/playlists',
    '/api/premium/categories',
    '/api/premium/point-prices',
    '/api/creator-works',
    '/api/teacher-works',
    '/api/works',
    '/api/courses',
    '/api/subjects',
    '/api/classroom/release',
    '/api/classroom/viewer-check',
  ],
  'https://xbjiaoyu.com': [
    '/api/catalog',
    '/api/catalog/featured',
    '/api/catalog/creators',
    '/api/library',
    '/api/creator/profile',
    '/api/marketplace',
    '/api/resources',
    '/api/bundles',
  ],
};

for (const [origin, routes] of Object.entries(CANDIDATES)) {
  console.log(`\n===== ${origin}`);
  for (const route of routes) {
    for (const withAuth of TOKEN ? [false, true] : [false]) {
      const headers = { 'User-Agent': UA, Referer: `${origin}/` };
      if (withAuth) headers.Authorization = `Bearer ${TOKEN}`;
      try {
        const res = await fetch(origin + route, { headers });
        const text = await res.text();
        const kind = (() => {
          try {
            const j = JSON.parse(text);
            if (Array.isArray(j)) return `array(${j.length})`;
            if (j && typeof j === 'object') {
              const keys = Object.keys(j);
              const arrKey = keys.find((k) => Array.isArray(j[k]));
              return `object{${keys.slice(0, 6).join(',')}}${arrKey ? ` ${arrKey}(${j[arrKey].length})` : ''}`;
            }
            return typeof j;
          } catch {
            return text.slice(0, 40).replace(/\s+/g, ' ');
          }
        })();
        if (res.status === 404) {
          if (!withAuth) process.stdout.write(`  404 ${route}\n`);
          break;
        }
        console.log(`  ${res.status} ${route}${withAuth ? ' (+auth)' : ''}  ${kind}`);
        break;
      } catch (e) {
        console.log(`  ERR ${route}: ${e.message}`);
        break;
      }
    }
  }
}

