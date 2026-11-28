#!/usr/bin/env node
/*
 * 目录数据里记着两个数字：装了多少门、一共多少门。它们是当初从别处
 * 搬过来时带来的，搬走两门课之后没有跟着改。
 *
 * 这里按目录里实际有多少门课把它们改成真的数字，免得页面上写着
 * 1450，进去一看只有 1448。
 *
 *   node tools/fix-replica-count.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const FILE = path.join(ROOT, 'catalog', 'catalog.json');

const catalog = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const count = (catalog.products || []).length;

if (catalog.localReplica) {
  catalog.localReplica.installedCount = count;
  catalog.localReplica.totalCount = count;
}

fs.writeFileSync(FILE, JSON.stringify(catalog));
console.log(`目录数据里的门数改成 ${count}`);
