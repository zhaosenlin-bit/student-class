#!/usr/bin/env node
/*
 * Pull the 图灵智赋 courseware bodies with the user's own account.
 *
 * The site never serves a course body to an anonymous visitor: the shell
 * asks for /api/programs/<id>/access-token, then loads
 * /api/program-file/<id>?token=<bodyToken>.  The 精品课 side launches
 * through /api/premium/playback/launch, which additionally demands the
 * site's own Origin plus the X-Premium-Catalogue-Intent header.
 *
 * This tool performs exactly that exchange with a token the user already
 * owns.  It stores every body under
 *   mirror/aifunengjiaoyu/courseware/<id>.html
 * which is the drop-in folder the local server replays.
 *
 * Usage:
 *   node tools/pull-afe-courseware.mjs --token <bearer>
 *   node tools/pull-afe-courseware.mjs --token <bearer> --ids 754,7,849
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu');
const CW = path.join(AFE, 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const bearer = arg('token') || process.env.AFE_TOKEN || '';
const onlyIds = arg('ids');
const dryRun = args.includes('--dry-run');

if (!bearer) {
  console.error('missing --token <bearer> (or set AFE_TOKEN)');
  process.exit(2);
}

const AUTH = { Authorization: `Bearer ${bearer}` };

async function api(pathname, options = {}) {
  const res = await fetch(ORIGIN + pathname, {
    ...options,
    headers: {
      'User-Agent': UA,
      Referer: `${ORIGIN}/`,
      ...AUTH,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json };
}

/* Every programme id the site knows about. */
async function collectIds() {
  const ids = new Map();

  const guest = await api('/api/programs');
  for (const p of guest.json?.programs || []) ids.set(p.id, p.title || '');

  const cat = await api('/api/premium/catalogue');
  for (const c of cat.json?.courses || []) {
    if (c.programId && !ids.has(c.programId)) ids.set(c.programId, c.title || '');
  }

  const mine = await api('/api/programs?all=true');
  for (const p of mine.json?.programs || []) ids.set(p.id, p.title || '');

  return ids;
}

/* Pull the body of one programme and every relative asset it references. */
async function pullOne(id, title) {
  const note = (m) => console.log(`  [${id}] ${m}`);

  let url = null;
  let useId = null;
  let leaseId = null;

  const access = await api(`/api/programs/${id}/access-token`);
  if (access.json?.success && access.json.token) {
    url = `${ORIGIN}/api/program-file/${id}?token=${encodeURIComponent(access.json.token)}`;
  } else {
    /*
     * 长征 (754 / 498) runs under its own playback lease: the body is only
     * handed out as /api/program-file/<id>/body?token=lm1.<lease>.<hex>.
     */
    const lmStatus = await api(`/api/programs/${id}/long-march-playback/status`, {
      method: 'POST',
      body: '{}',
    });
    if (lmStatus.json?.enabled === true) {
      const requestId = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
      const opened = await api(`/api/programs/${id}/long-march-playback/open`, {
        method: 'POST',
        body: JSON.stringify({ requestId }),
      });
      if (opened.json?.url) {
        url = opened.json.url.startsWith('http') ? opened.json.url : ORIGIN + opened.json.url;
        leaseId = opened.json.id || null;
      }
    }

    if (!url) {
      // 精品课 route: the launch needs the site's own Origin and intent header.
      useId = `local-${id}-${Date.now().toString(16)}`;
      const launch = await api('/api/premium/playback/launch', {
        method: 'POST',
        body: JSON.stringify({ programId: id, useId }),
        headers: {
          Origin: ORIGIN,
          'X-Premium-Catalogue-Intent': 'cataloguing',
        },
      });
      if (launch.json?.url) url = launch.json.url.startsWith('http') ? launch.json.url : ORIGIN + launch.json.url;
      else if (launch.json?.token) url = `${ORIGIN}/api/program-file/${id}?token=${encodeURIComponent(launch.json.token)}`;
      else {
        note(`no access (${access.status} ${access.json?.msg || access.json?.error || ''})`.trim());
        return { ok: false, reason: access.json?.msg || access.json?.error || access.status };
      }
    }
  }

  if (dryRun) {
    note(`would fetch ${url}`);
    return { ok: true, dry: true };
  }

  /*
   * The protected endpoint answers with a tiny bootstrap document that
   * redirects to /api/program-file/<id>/body?token=… .  Follow that hop so
   * what lands on disk is the actual courseware, not the stub.
   */
  let body = null;
  let html = '';
  let hops = 0;
  while (hops < 4) {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: `${ORIGIN}/`, Authorization: `Bearer ${bearer}` },
    });
    if (!res.ok) {
      note(`body ${res.status}`);
      return { ok: false, reason: res.status };
    }
    body = Buffer.from(await res.arrayBuffer());
    html = body.toString('utf8');
    const hop = html.match(/window\.location\.replace\(["']([^"']+)["']\)/);
    if (!hop) break;
    const next = hop[1].startsWith('http') ? hop[1] : ORIGIN + hop[1];
    note(`bootstrap -> ${hop[1].split('?')[0]}`);
    url = next;
    hops++;
  }
  if (!body) return { ok: false, reason: 'no-body' };

  fs.mkdirSync(CW, { recursive: true });
  const file = path.join(CW, `${id}.html`);
  fs.writeFileSync(file, body);
  note(`body ${(body.length / 1024).toFixed(1)} KB -> courseware/${id}.html`);

  /* Harvest the relative assets the body asks for. */
  const dir = path.join(CW, `${id}.assets`);
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const ref = m[1];
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith('data:') || ref.startsWith('#')) continue;
    if (!/\.(js|mjs|css|html|png|jpe?g|gif|svg|webp|glb|gltf|mp3|mp4|wav|ogg|woff2?|ttf|otf|json|txt|wasm)$/i.test(ref.split('?')[0]))
      continue;
    refs.add(ref.split('?')[0]);
  }

  let assetCount = 0;
  for (const ref of refs) {
    const rel = decodeURIComponent(ref.replace(/^\/+/, ''));
    const target = path.join(CW, `${id}.assets`, rel);
    if (fs.existsSync(target) && fs.statSync(target).size > 0) {
      assetCount++;
      continue;
    }
    const bodyToken = new URL(url).searchParams.get('token') || '';
    const candidates = [
      `${ORIGIN}/api/program-file/${id}/${rel}?token=${encodeURIComponent(bodyToken)}`,
      `${ORIGIN}/api/program-file/${id}/body/${rel}?token=${encodeURIComponent(bodyToken)}`,
      `${ORIGIN}/${rel}`,
    ];
    for (const candidate of candidates) {
      try {
        const r = await fetch(candidate, { headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` } });
        if (!r.ok) continue;
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, Buffer.from(await r.arrayBuffer()));
        assetCount++;
        break;
      } catch {}
    }
  }
  if (refs.size) note(`assets ${assetCount}/${refs.size}`);

  if (useId) {
    await api('/api/premium/playback/close', {
      method: 'POST',
      body: JSON.stringify({ useId }),
      headers: {
        Origin: ORIGIN,
        'X-Premium-Catalogue-Intent': 'cataloguing',
      },
    });
  }
  if (leaseId) {
    await api(`/api/programs/${id}/long-march-playback/close`, {
      method: 'POST',
      body: JSON.stringify({ id: leaseId }),
    });
  }
  return { ok: true, bytes: body.length, assets: assetCount, title };
}

const all = await collectIds();
let ids = [...all.keys()];
if (onlyIds) ids = ids.filter((id) => onlyIds.split(',').map((s) => s.trim()).includes(String(id)));

console.log(`programmes known: ${all.size}; pulling ${ids.length}`);

const report = [];
for (const id of ids) {
  const result = await pullOne(id, all.get(id));
  report.push({ id, title: all.get(id), ...result });
}

const ok = report.filter((r) => r.ok && !r.dry);
console.log(`\npulled ${ok.length}/${report.length}`);
const failed = report.filter((r) => !r.ok);
if (failed.length) {
  const reasons = new Map();
  for (const f of failed) reasons.set(f.reason, (reasons.get(f.reason) || 0) + 1);
  console.log('not available:');
  for (const [reason, count] of reasons) console.log(`  ${count} x ${reason}`);
}
fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'afe-courseware-pull.json'),
  JSON.stringify(report, null, 1),
);
