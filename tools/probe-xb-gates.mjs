#!/usr/bin/env node
/*
 * 复核小白教育那 497 门的门槛。
 *
 * 每一门都问三句：正文地址、投放接口、下载接口。答案原样记下来，
 * 让人知道缺的是登录还是买卡。
 */
const ORIGIN = 'https://xbjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

async function ask(method, path, body) {
  try {
    const res = await fetch(ORIGIN + path, {
      method,
      headers: {
        'User-Agent': UA,
        Referer: ORIGIN + '/',
        Origin: ORIGIN,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch (e) {
    return { status: 0, text: e.message };
  }
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.log('用法：node tools/probe-xb-gates.mjs <courseId...>');
  process.exit(0);
}

for (const id of ids) {
  console.log(`\n== ${id}`);
  for (const [label, method, path, body] of [
    ['正文', 'GET', `/courseware/${encodeURIComponent(id)}`, null],
    ['投放', 'GET', `/api/launch/${encodeURIComponent(id)}`, null],
    ['目录', 'GET', `/api/catalog/${encodeURIComponent(id)}`, null],
  ]) {
    const r = await ask(method, path, body);
    console.log(`   ${label} : ${r.status} ${r.text.replace(/\s+/g, ' ').slice(0, 90)}`);
  }
}
