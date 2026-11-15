import fs from "node:fs";
const ORIGIN = "https://aifunengjiaoyu.com";
const TOKEN = fs.readFileSync("recon/scratch/afe-token.txt", "utf8").trim();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";
const H = { "User-Agent": UA, Referer: ORIGIN + "/", Authorization: "Bearer " + TOKEN };
for (const id of [1360, 1016, 842, 841, 811, 10, 193]) {
  const res = await fetch(`${ORIGIN}/api/trials?program_id=${id}`, { headers: H });
  console.log(id, res.status, (await res.text()).slice(0, 200));
}
