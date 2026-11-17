#!/usr/bin/env node
/*
 * Take the signed account out of the stored courseware.
 *
 * A 图灵智赋 body points its <base href> at a signed folder address.  That
 * address is a base64 blob which carries the wechat id of whoever opened
 * the course — the account of the person who made this mirror.  The local
 * server rewrites the whole lease away when it hands the document out
 * (rewriteCoursewareUrls), so the token inside the file is dead weight on
 * disk and an account id in the repository.
 *
 * This tool swaps the signed part for a fixed word.  The shape of the
 * address is unchanged, so the server still recognises it and still
 * rewrites it.
 *
 *   node tools/scrub-afe-leases.mjs            # 只报
 *   node tools/scrub-afe-leases.mjs --write    # 改写
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');

const ROOTS = [
  path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware'),
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
];

const LEASE = /(\/api\/program-assets\/[A-Za-z0-9_-]+\/t\/)([A-Za-z0-9_.-]{12,})/g;
/* The bodies also carry a signed access token for /verify-access. */
const TOKEN = /([?&]token=)([A-Za-z0-9._-]{16,})/g;

function ownerOf(blob) {
  const head = blob.split('.')[0];
  try {
    const json = Buffer.from(
      head.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf8');
    const match = json.match(/"o":"([^"]+)"/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

const owners = new Map();
let touched = 0;
let files = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const entry of fs.readdirSync(root, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    if (!/\.(?:html?|mjs|js|json|txt)$/i.test(entry.name)) continue;
    const file = path.join(entry.parentPath || entry.path, entry.name);
    const text = fs.readFileSync(file, 'utf8');
    if (!LEASE.test(text) && !TOKEN.test(text)) {
      LEASE.lastIndex = 0;
      TOKEN.lastIndex = 0;
      continue;
    }
    LEASE.lastIndex = 0;
    TOKEN.lastIndex = 0;
    const seen = new Set();
    let next = text.replace(LEASE, (whole, head, token) => {
      seen.add(token);
      return `${head}local`;
    });
    for (const token of seen) {
      const owner = ownerOf(token);
      if (owner) owners.set(owner, (owners.get(owner) || 0) + 1);
    }
    next = next.replace(TOKEN, (whole, head, blob) => {
      const owner = ownerOf(blob);
      if (owner) owners.set(owner, (owners.get(owner) || 0) + 1);
      return `${head}local`;
    });
    files++;
    if (next !== text) {
      touched++;
      if (write) fs.writeFileSync(file, next);
    }
  }
}

console.log(`扫了 ${files} 份正文，${touched} 份带签名租约`);
console.log('租约里出现过的账号:');
for (const [id, n] of owners) console.log(`  ${id}  (${n} 处)`);
if (!write) console.log('\n（加 --write 改写）');
