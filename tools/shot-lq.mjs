/* Take a picture of the pages that matter, so the look can be checked. */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const pages = (process.argv[2] || '/').split(',');
const tag = process.argv[3] || 'shot';

const browser = await connect(Number(process.env.LQ_CDP_PORT || 9222));
for (const page of pages) {
  const [hash, wait] = page.split('@');
  await browser.goto(`http://127.0.0.1:${PORT}/${hash.replace(/^\/+/, '')}`);
  await sleep(Number(wait || 3500));
  const file = `recon/scratch/${tag}-${hash.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}.png`;
  await browser.shot(file);
  console.log(file);
}
await browser.close();
