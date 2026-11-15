/* 试看额度还剩多少：只读，不消耗。 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const ids = (process.argv[2] || '19,20,180,196,206,327,501,506,563,581,616').split(',').map(Number);
for (const id of ids) {
  const res = await fetch(`${ORIGIN}/api/trials?program_id=${id}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': UA, Referer: `${ORIGIN}/` },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 非 JSON */
  }
  console.log(id, res.status, text.slice(0, 160).replace(/\s+/g, ' '));
  await new Promise((r) => setTimeout(r, 400));
}
