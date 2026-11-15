#!/usr/bin/env node
/*
 * 给正在等扫码的登录窗口截一张图。
 *
 * 微信的二维码会过期，afe-login.mjs 只在开头截一次。等久了就重截一张，
 * 新的那张扫码更好使。
 *
 *   node tools\shot-login-qr.mjs
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LOGIN_CDP_PORT || 9222);
const OUT = process.argv[2] || 'recon/scratch/afe-login-qr.png';

const page = await connect(PORT);
await sleep(500);
await page.shot(OUT);
console.log('->', OUT);
console.log('title:', await page.evaluate('document.title'));
await page.close();
