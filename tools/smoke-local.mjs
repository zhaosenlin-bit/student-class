/*
 * One-shot smoke test of the local replica: every route that was added or
 * changed during the last pass has to answer the way the live site does.
 */
const AFE = 'http://localhost:4174';
const XB = 'http://localhost:4173';

const CASES = [
  // 图灵智赋 — public API payloads replayed byte for byte
  ['AFE', '/api/announcement', 'GET', 200, 'application/json'],
  ['AFE', '/api/creator-agreement/share-policy', 'GET', 200, 'application/json'],
  ['AFE', '/api/program-file/', 'GET', 200, 'application/json'],
  ['AFE', '/api/program-file', 'GET', 200, 'application/json'],
  ['AFE', '/api/announcement', 'POST', 404, 'text/html'],

  // 图灵智赋 — newly mirrored static files
  ['AFE', '/premium-catalogue/refunds.mjs', 'GET', 200, 'application/javascript'],
  ['AFE', '/admin-large/runtime/local-store.mjs', 'GET', 200, 'application/javascript'],
  ['AFE', '/admin-large/runtime/public-host.mjs', 'GET', 200, 'application/javascript'],
  ['AFE', '/admin-large/website-admin.mjs', 'GET', 200, 'application/javascript'],
  ['AFE', '/course-compat/pk180-bank-host.mjs', 'GET', 200, 'application/javascript'],
  ['AFE', '/tuxiaoling/js/glb-library.mjs', 'GET', 200, 'application/javascript'],
  ['AFE', '/invoices/index.mjs', 'GET', 200, 'application/javascript'],
  ['AFE', '/finance/index.mjs', 'GET', 200, 'application/javascript'],
  ['AFE', '/invoices/style.css', 'GET', 200, 'text/css'],
  ['AFE', '/assets/membership-hero-visual.jpg', 'GET', 200, 'image/jpeg'],

  // 图灵智赋 — local courseware drop-in slot
  ['AFE', '/api/trials?program_id=754', 'GET', 404, 'application/json'],
  ['AFE', '/api/user/purchases', 'GET', 200, 'application/json'],
  ['AFE', '/download/754.html', 'GET', 404, 'application/json'],
  ['AFE', '/api/program-file/754?token=local', 'GET', 401, 'application/json'],

  // 图灵智赋 — still-mirrored originals
  ['AFE', '/api/premium/catalogue', 'GET', 200, 'application/json'],
  ['AFE', '/api/premium/prices', 'GET', 200, 'application/json'],
  ['AFE', '/api/pay/vip-prices', 'GET', 200, 'application/json'],
  ['AFE', '/api/programs', 'GET', 200, 'application/json'],
  ['AFE', '/tuxiaoling/vendor/three/build/three.module.js', 'GET', 200, 'application/javascript'],

  // 小白教育
  ['XB', '/', 'GET', 200, 'text/html'],
  ['XB', '/api/catalog', 'GET', 200, 'application/json'],
  ['XB', '/courseware/mirror', 'GET', 200, 'text/html'],
  ['XB', '/download/mirror.html', 'GET', 200, 'text/html'],
  ['XB', '/images/resource-covers', 'GET', 404, 'application/json'],
];

let ok = 0;
let bad = 0;

for (const [site, path, method, status, type] of CASES) {
  const base = site === 'AFE' ? AFE : XB;
  const res = await fetch(base + path, {
    method,
    headers: { Authorization: 'Bearer local-test' },
  });
  const got = res.headers.get('content-type') || '';
  const typeOk = got.includes(type) || (!type && res.status === status);
  const pass = res.status === status && typeOk;
  pass ? ok++ : bad++;
  console.log(
    `${pass ? 'ok  ' : 'FAIL'} ${site.padEnd(3)} ${method.padEnd(4)} ${path.padEnd(56)} ` +
      `status=${res.status} (want ${status}) type=${got.split(';')[0]}`
  );
}

console.log(`\npassed ${ok}, failed ${bad}`);
process.exit(bad ? 1 : 0);
