#!/usr/bin/env node
/*
 * Some 图灵 works refuse the access token because the courseware was
 * updated after the last open. The site asks for a fresh look at the play
 * page, so the play page is opened with the account's own token and the
 * answers are watched.
 */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const CDP = Number(process.env.CDP_PORT || 9226);
const ids = process.argv.slice(2).map(Number).filter(Boolean);

const browser = await connect(CDP);

/* Sign in on the site itself, so the play page sees the account. */
await browser.goto(ORIGIN + '/');
await sleep(1500);
await browser.evaluate(
  `(() => { localStorage.setItem('aiedu_token', ${JSON.stringify(TOKEN)}); return true; })()`
);

for (const id of ids) {
  const mark = browser.events.length;
  await browser.goto(ORIGIN + '/play/' + id);
  await sleep(8000);
  const hits = browser.events
    .slice(mark)
    .filter((e) => e.method === 'Network.responseReceived')
    .filter((e) => /program|access-token|reviewed|playback|launch/i.test(e.params.response.url))
    .map((e) => e.params.response.status + ' ' + e.params.response.url.replace(ORIGIN, ''));
  console.log('\n== ' + id);
  console.log([...new Set(hits)].slice(0, 14).join('\n'));
  const note = await browser.evaluate(
    `(() => (document.getElementById('play-status') || {}).textContent || document.body.innerText.slice(0, 160))()`
  );
  console.log('page:', String(note).replace(/\s+/g, ' ').slice(0, 160));
}

await browser.close();
