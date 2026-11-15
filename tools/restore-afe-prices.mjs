#!/usr/bin/env node
/*
 * Put the published prices back into the mirrored 图灵智赋 programme list.
 *
 * The mirror was first built by rewriting the live payload so every media
 * URL pointed at the local /prod/uploads/... tree; the same pass zeroed
 * the prices.  The prices are part of the catalogue the site publishes, so
 * they are restored from the raw payload while the local media paths stay.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'recon', 'scratch', '_recon_aife_programs.json');
const OUT = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs.json');

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const rawPrograms = raw.programs || raw;
const local = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const localPrograms = local.programs || local;

const priceById = new Map(rawPrograms.map((p) => [String(p.id), p.price]));
const usesById = new Map(rawPrograms.map((p) => [String(p.id), p.uses]));

let changed = 0;
for (const p of localPrograms) {
  const live = priceById.get(String(p.id));
  if (live !== undefined && p.price !== live) {
    p.price = live;
    changed++;
  }
  /* The "uses" counter ticks up on the live site; keep the mirrored value
   * from the same snapshot instead of a drifting one. */
  const uses = usesById.get(String(p.id));
  if (uses !== undefined) p.uses = uses;
}

fs.writeFileSync(OUT, JSON.stringify(local, null, 2), 'utf8');
console.log(`restored ${changed} prices in ${path.relative(ROOT, OUT)}`);
for (const p of localPrograms) console.log(`  ${String(p.id).padStart(5)}  ${p.price}`);
