/*
 * Prove the local install flow works end to end, without waiting for a real
 * courseware download:
 *
 *   1. drop a stand-in document into the courseware slot
 *   2. restart-free: ask the server what it thinks is owned
 *   3. open the detail modal in a browser and read the buttons
 *   4. fetch the download route
 *   5. remove the stand-in again
 */
import fs from 'node:fs';

const ROOT = 'C:/kaifa/xiaobai-class';
const SLOT = `${ROOT}/mirror/aifunengjiaoyu/courseware/754.html`;
const LOCAL = 'http://localhost:4174';

const STANDIN =
  '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
  '<title>本地投放槽位自检</title><style>body{font-family:system-ui;padding:40px;' +
  'background:#0c1526;color:#e6edf8}h1{font-size:22px}</style></head>' +
  '<body><h1>本地投放槽位自检</h1><p>这是一份放进去试一下的占位课件。</p>' +
  '</body></html>';

const existed = fs.existsSync(SLOT);
if (!existed) fs.writeFileSync(SLOT, STANDIN, 'utf8');
console.log('stand-in in place:', SLOT);

const get = async (path) => {
  const res = await fetch(LOCAL + path, {
    headers: { Authorization: 'Bearer local-test' },
  });
  const text = await res.text();
  return { status: res.status, type: res.headers.get('content-type'), text };
};

const purchases = await get('/api/user/purchases');
console.log('purchases:', purchases.status, purchases.text);

const trials = await get('/api/trials?program_id=754');
console.log('trials   :', trials.status, trials.text);

const download = await fetch(`${LOCAL}/download/754.html`);
console.log(
  'download :',
  download.status,
  download.headers.get('content-disposition'),
  (await download.arrayBuffer()).byteLength + 'b'
);

const handshake = await get('/api/programs/754/access-token');
console.log('token    :', handshake.status, handshake.text);

const body = await fetch(`${LOCAL}/api/program-file/754?token=local`);
const html = await body.text();
console.log('body     :', body.status, html.length + 'b', html.slice(0, 60));

if (!existed) {
  fs.rmSync(SLOT);
  console.log('\nstand-in removed again');
}
