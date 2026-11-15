#!/usr/bin/env node
/*
 * 小白教育 login, driven through the real browser.
 *
 * The site's phone login is guarded by a drag-the-puzzle captcha, so it is
 * far easier to sign in by hand in a real window and let this tool pick
 * up the session afterwards.
 *
 *   1. run this script — it opens xbjiaoyu.com in the recon Chrome
 *   2. log in there (phone + SMS code, or account + password)
 *   3. the script notices the session and writes the cookie to
 *      recon/scratch/xb-cookie.txt
 *
 * Then:  node tools/pull-xb-courseware.mjs --cookie (Get-Content recon\scratch\xb-cookie.txt)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'recon', 'scratch', 'xb-cookie.txt');
const ORIGIN = 'https://xbjiaoyu.com';

const page = await connect(9222, 'xbjiaoyu.com');
await page.send('Page.navigate', { url: `${ORIGIN}/#catalog` });
await new Promise((r) => setTimeout(r, 4000));

console.log('log in at the 小白教育 window; this script waits for the session');

const deadline = Date.now() + Number(process.env.MAX_MS || 1800000);

/*
 * The session is cookie based (the front-end calls /api/session with plain
 * credentials), so every cookie the browser holds for the site is taken and
 * then checked against /api/session — a cookie jar only counts once the
 * server agrees there is a signed-in user behind it.
 */
async function trySession(jar) {
  const res = await fetch(`${ORIGIN}/api/session`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
      Cookie: jar,
      Referer: `${ORIGIN}/`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user || null;
}

while (Date.now() < deadline) {
  try {
    const cookies = await page.send('Network.getCookies', { urls: [ORIGIN] });
    const jar = (cookies.cookies || [])
      .filter((c) => c.domain && c.domain.includes('xbjiaoyu.com'))
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');

    if (jar) {
      const user = await trySession(jar);
      if (user) {
        fs.writeFileSync(OUT, jar, 'utf8');
        console.log('session captured ->', OUT);
        console.log('user:', JSON.stringify(user).slice(0, 200));
        page.close();
        process.exit(0);
      }
    }
    process.stdout.write('\r  waiting for the session ...   ');
  } catch (error) {
    console.log('\nretry:', String(error.message || error).slice(0, 100));
  }
  await new Promise((r) => setTimeout(r, 3000));
}

console.log('\ngave up waiting for the login');
page.close();
process.exit(1);
