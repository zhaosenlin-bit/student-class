#!/usr/bin/env node
/*
 * Put an account into the browser the player page reads from.
 *
 * The 图灵智赋 player keeps its sign-in in localStorage ("aiedu_token"
 * and "aiedu_user"); the same bearer token the command line tools use is
 * accepted there, so a course that only opens through the chapter player
 * can be harvested without going through the WeChat code again.
 *
 *   node tools/seed-browser-login.mjs --token afe-token-account3.txt [--port 9222]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect } from './cdp2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const ORIGIN = 'https://aifunengjiaoyu.com';

const args = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const tokenFile = arg('token', 'afe-token.txt');
const port = Number(arg('port', '9222'));

const TOKEN = fs.readFileSync(path.join(SCRATCH, tokenFile), 'utf8').trim();

const browser = await connect(port);

/* The sign-in has to be in place before the player's own script runs, so it
   is injected into every new document rather than set afterwards. */
const userJson = JSON.stringify({
  wechatId: 'local-preview',
  name: '本地预览',
  role: 'teacher',
  isMember: false,
});

await browser.raw(
  'Page.addScriptToEvaluateOnNewDocument',
  {
    source:
      `try{localStorage.setItem('aiedu_token', ${JSON.stringify(TOKEN)});` +
      `if(!localStorage.getItem('aiedu_user'))` +
      `localStorage.setItem('aiedu_user', ${JSON.stringify(userJson)});}catch(e){}` +
      /* A session id left in session storage belongs to a playback that has
         already ended; the player would refuse to start a new one. */
      `try{for(const k of Object.keys(sessionStorage))` +
      `if(k.startsWith('turing-reviewed-'))sessionStorage.removeItem(k);}catch(e){}`,
  },
  browser.pageSession
);

await browser.goto(`${ORIGIN}/play/${args.includes('--page') ? args[args.indexOf('--page') + 1] : ''}`);

const stored = await browser
  .evaluate(
    `({token: (localStorage.getItem('aiedu_token')||'').length, user: localStorage.getItem('aiedu_user')})`
  )
  .catch(() => null);

console.log('已写入登录态:', tokenFile, JSON.stringify(stored));

