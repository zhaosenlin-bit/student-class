import fs from "node:fs";
const ORIGIN = "https://aifunengjiaoyu.com";
const TOKEN = fs.readFileSync("recon/scratch/afe-token.txt", "utf8").trim();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";
const H = { "User-Agent": UA, Referer: ORIGIN + "/", Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" };
const routes = [
  ["GET", "/api/trials"],
  ["GET", "/api/trials?programId=841"],
  ["GET", "/api/user/stats"],
  ["GET", "/api/programs/841"],
  ["GET", "/api/programs/841/access-token"],
];
for (const [m, r] of routes) {
  try {
    const res = await fetch(ORIGIN + r, { method: m, headers: H });
    const t = await res.text();
    console.log(`\n--- ${m} ${r} -> ${res.status}`);
    console.log(t.slice(0, 900));
  } catch (e) { console.log(r, "ERR", e.message); }
}
