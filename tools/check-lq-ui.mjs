#!/usr/bin/env node
/* Walk the local library the way a teacher does and report what answers. */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const browser = await connect(CDP);

await browser.raw('Emulation.setDeviceMetricsOverride', {
  width: 1600,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
}, browser.pageSession);

const read = (label, expr) =>
  browser.evaluate(expr).then((v) => {
    console.log('--- ' + label);
    console.log(JSON.stringify(v, null, 1));
    return v;
  });

/* 1. The catalogue. */
await browser.goto('http://localhost:' + PORT + '/#catalog');
await sleep(3500);
await read('catalogue', `(() => {
  const row = document.querySelector('.download-subject-options');
  const more = document.querySelector('.download-subject-more');
  const login = [...document.querySelectorAll('button,a')]
    .filter((e) => /登录|注册|绑定手机号/.test(e.textContent || '')).length;
  const feedback = [...document.querySelectorAll('[data-value="course-feedback"],#course-feedback,.download-feedback-link')]
    .length;
  return {
    cards: document.querySelectorAll('#grid .product-card').length,
    subjectChips: row ? row.querySelectorAll('button').length : 0,
    moreLabel: more ? more.querySelector('summary').textContent.trim() : null,
    moreChips: more ? more.querySelectorAll('button').length : 0,
    loginButtons: login,
    feedbackNodes: feedback,
    accountHidden: (document.querySelector('#account') || {}).hidden,
  };
})()`);
await browser.shot('recon/scratch/lq-ui-catalog.png');

/* 2. Open the disclosure. */
await browser.evaluate(`(() => {
  const s = document.querySelector('.download-subject-more > summary');
  if (s) s.click();
  return !!s;
})()`);
await sleep(700);
await read('subjects expanded', `(() => {
  const more = document.querySelector('.download-subject-more');
  return { open: more ? more.open : null, chips: more ? more.querySelectorAll('button').length : 0 };
})()`);
await browser.shot('recon/scratch/lq-ui-subjects.png');

/* 3. A 精品课 detail page. */
await browser.goto('http://localhost:' + PORT + '/#course/afe-846');
await sleep(2500);
await read('精品课 detail', `(() => {
  const panel = document.querySelector('.download-panel');
  const button = panel && panel.querySelector('[data-download-action="download"]');
  return {
    heading: (document.querySelector('.download-detail h1') || {}).textContent,
    status: (document.querySelector('.download-status') || {}).textContent,
    downloadLabel: button ? button.textContent.trim() : null,
    downloadDisabled: button ? button.disabled : null,
    trial: !!document.querySelector('[data-action="trial"]'),
    feedbackLink: !!document.querySelector('.download-feedback-link'),
  };
})()`);
await browser.shot('recon/scratch/lq-ui-detail.png');

/*
 * 4. The about dialog.  It is the one place where the library says who
 *    it belongs to, so it must name 乐启享 and carry nothing that rings
 *    a phone or opens a mailbox.
 */
await browser.goto('http://localhost:' + PORT + '/#catalog');
await sleep(2500);
await browser.evaluate(`(() => {
  const b = [...document.querySelectorAll('button')]
    .find((e) => /关于我们/.test(e.textContent || ''));
  if (b) b.click();
  return !!b;
})()`);
await sleep(900);
await read('about', `(() => {
  const dialog = document.querySelector('.dialog-content');
  const text = dialog ? dialog.innerText : '';
  return {
    open: !!dialog,
    text: text.replace(/\s+/g, ' ').trim().slice(0, 300),
    phones: text.match(/(?<![\w.-])1[3-9]\d{9}(?![\w.-])/g) || [],
    emails: text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [],
    namesUs: /乐启享/.test(text),
    linksToSite: [...document.querySelectorAll('.dialog-content a')].map((a) => a.href),
  };
})()`);
await browser.shot('recon/scratch/lq-ui-about.png');

/* 5. Play it. */
await browser.evaluate(`(() => {
  const c = document.querySelector('[data-action="close"]');
  if (c) c.click();
  return !!c;
})()`);
await browser.goto('http://localhost:' + PORT + '/#course/afe-846');
await sleep(2500);
await browser.evaluate(`(() => {
  const b = document.querySelector('[data-lq-preview]')
    || [...document.querySelectorAll('button')].find((e) => /在线预览|在线使用/.test(e.innerText || ''));
  if (!b) return false;
  b.click();
  return true;
})()`);
await sleep(9000);
await read('lesson', `(() => {
  const frames = [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('src'));
  const inner = [...document.querySelectorAll('iframe')].length;
  return { hash: location.hash, frames, inner, loadingHidden: (document.querySelector('#lesson-loading') || {}).hidden };
})()`);
await browser.shot('recon/scratch/lq-ui-lesson.png');

await browser.close();
