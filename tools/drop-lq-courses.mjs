#!/usr/bin/env node
/*
 * Take courses out of the catalogue.
 *
 * A course that will not open is not a course.  The verdict is written
 * into mirror/leqixiang/quality-decisions.json — the same file the
 * quality gate writes — so the next build leaves them out of the
 * catalogue, and the reason travels with the decision.
 *
 *   node tools/drop-lq-courses.mjs afe-1393 "素材取不回来"
 *   node tools/drop-lq-courses.mjs --from recon/scratch/verify-a.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DECISIONS = path.join(ROOT, "mirror", "leqixiang", "quality-decisions.json");

const args = process.argv.slice(2);
const decisions = fs.existsSync(DECISIONS)
  ? JSON.parse(fs.readFileSync(DECISIONS, "utf8"))
  : { note: "", drop: {} };
if (!decisions.drop) decisions.drop = {};

const add = (id, reason) => {
  if (decisions.drop[id]) {
    console.log(`${id} 已经在剔除名单里：${decisions.drop[id]}`);
    return;
  }
  decisions.drop[id] = reason;
  console.log(`剔除 ${id}：${reason}`);
};

if (args.includes("--from")) {
  const file = args[args.indexOf("--from") + 1];
  const report = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), "utf8"));
  const rows = report.results || [];
  const bad = rows.filter((r) => !r.ok);
  const reason = args.includes("--reason")
    ? args[args.indexOf("--reason") + 1]
    : "在浏览器里打不开";
  if (!bad.length) console.log("这份报告里没有打不开的课");
  for (const r of bad) add(r.id, reason);
} else {
  const ids = args.filter((a) => /^[\w-]+$/.test(a) && !a.startsWith("--"));
  const reason = args.includes("--reason")
    ? args[args.indexOf("--reason") + 1]
    : "在浏览器里打不开";
  if (!ids.length) {
    console.log("用法：node tools/drop-lq-courses.mjs <id> [id…] --reason \"…\"");
    process.exit(0);
  }
  for (const id of ids) add(id, reason);
}

decisions.at = new Date().toISOString();
fs.writeFileSync(DECISIONS, JSON.stringify(decisions, null, 1));
console.log(`\n写回 ${path.relative(ROOT, DECISIONS)}，现在一共剔除了 ${Object.keys(decisions.drop).length} 门。`);
