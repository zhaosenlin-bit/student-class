import fs from "node:fs";
const files = ["recon/scratch/_recon_aife_app.17e3fb394175.min.js"];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const t = fs.readFileSync(f, "utf8");
  const set = new Set();
  for (const m of t.matchAll(/["'`](\/api\/[A-Za-z0-9_\-\/\{\}\$\.]+)["'`]/g)) set.add(m[1]);
  console.log("== " + f + " (" + set.size + ") ==");
  console.log([...set].sort().join("\n"));
}
