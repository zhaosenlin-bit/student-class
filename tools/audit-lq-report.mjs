#!/usr/bin/env node
/*
 * Turn the raw audit into a work list.
 *
 * The browser sometimes reports a request that belongs to the previous
 * course, and every page asks for a favicon that the site does not have.
 * Neither is a broken course, so both are dropped here before the list
 * is printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'lq-audit-all.json'), 'utf8')
);

const IGNORE = [/favicon\.ico$/, /\/_ext\//];

/* A course counts as blank only when nothing at all reached the screen. */
const rendered = (p) =>
  (p && ((p.nodes || 0) >= 20 || (p.painted || 0) > 0 || (p.textLen || 0) >= 30)) || false;

const real = [];
for (const r of data.results) {
  if (r.ok) continue;
  const failed = (r.failed || []).filter((f) => !IGNORE.some((re) => re.test(f)));
  const mine = failed.filter((f) => f.includes(`/${r.id}/`) || f.includes(`/api/program-assets/${r.id.slice(4)}/`));
  const cdn = (r.failed || []).filter((f) => /\/_ext\//.test(f));
  const probe = r.probe || {};
  const own = mine.length ? mine : failed;
  const item = {
    id: r.id,
    title: probe.title || probe.head || '',
    kind: !rendered(probe)
      ? r.error
        ? '脚本异常'
        : '空白页'
      : own.length
        ? '本地资源缺失'
        : cdn.length
          ? '公共库缺失'
          : probe.guardMsg
            ? '授权守卫'
            : probe.adapterErr
              ? '握手失败'
              : '正常',
    failed: own,
    cdn,
    errors: r.errors || [],
    probe,
  };
  real.push(item);
}

console.log(`总 ${data.results.length} 门，报告有问题 ${data.bad.length} 门，剔除噪声后 ${real.length} 门\n`);
const byKind = new Map();
for (const i of real) {
  if (!byKind.has(i.kind)) byKind.set(i.kind, []);
  byKind.get(i.kind).push(i);
}
for (const [k, list] of byKind) {
  console.log(`── ${k} (${list.length})`);
  for (const i of list) {
    console.log(`   ${i.id}  ${i.title}`);
    for (const f of i.failed.slice(0, 4)) console.log(`        ${f}`);
    for (const f of i.cdn.slice(0, 4)) console.log(`        ~ ${f}`);
    for (const e of i.errors.slice(0, 2)) console.log(`        ! ${e}`);
    if (i.kind === '空白页' || i.kind === '脚本异常')
      console.log(
        `        nodes=${i.probe.nodes} canvases=${i.probe.canvases} text=${i.probe.textLen} head=${(i.probe.head || '').slice(0, 60)}`
      );
  }
}
