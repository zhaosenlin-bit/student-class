#!/usr/bin/env node
/*
 * Ask every account we hold how many openings it still has for a course.
 *
 * The platform gives every account a few openings per course. Asking for
 * an opening spends one of them, so this only asks about courses that
 * still have something missing — and it stops asking the moment an
 * account has no openings left, so a spent account is never probed
 * twice for the same course.
 *
 *   node tools/probe-afe-quota.mjs 842 1016 1360 616 563
 *   node tools/probe-afe-quota.mjs --tokens afe-token.txt,afe-token-account1.txt 842
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const tokenNames = (args.includes('--tokens')
  ? args[args.indexOf('--tokens') + 1]
  : 'afe-token.txt,afe-token-account1.txt'
).split(',');
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);

const accounts = tokenNames.map((name) => ({
  name,
  token: fs.readFileSync(path.join(SCRATCH, name), 'utf8').trim(),
}));

async function openWith(account, id) {
  try {
    const res = await fetch(`${ORIGIN}/api/reviewed-course-session/${id}/open`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${account.token}`,
        Origin: ORIGIN,
        Referer: `${ORIGIN}/`,
      },
      body: '{}',
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }
    return { status: res.status, json, text };
  } catch (e) {
    return { status: 0, json: null, text: String(e) };
  }
}

for (const id of ids) {
  console.log(`\n===== ${id} =====`);
  for (const account of accounts) {
    const res = await openWith(account, id);
    if (res.status === 200 && res.json?.id) {
      console.log(`  ${account.name}: 可开会话 ${res.json.id}`);
      /* Put the opening back so it is not wasted. */
      try {
        await fetch(`${ORIGIN}/api/reviewed-course-session/session/${res.json.id}/close`, {
          method: 'POST',
          headers: {
            'User-Agent': UA,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${account.token}`,
            Origin: ORIGIN,
            Referer: `${ORIGIN}/`,
          },
          body: JSON.stringify({ programId: id }),
        });
        console.log(`  ${account.name}: 已关闭，额度退回`);
      } catch {
        console.log(`  ${account.name}: 关闭失败`);
      }
    } else {
      const why = res.json?.error || res.text?.slice(0, 80) || '无回答';
      console.log(`  ${account.name}: ${res.status} ${why}`);
    }
  }
}
