import fs from "node:fs";
const ORIGIN = "https://aifunengjiaoyu.com";
const PREFIX = "/api/reviewed-course-assets/e547484ae39c1c50abdb4d69dde927f3b3375f6d79b0461c/013f31a78dc60f11829db3062dda656cb3e4c01860852756/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";
const rels = [
  "data/terrain.json","data/rivers.json","data/height.u16.gz","data/mask.u8.gz",
  "data/overview.mesh.gz","data/overview.edges.gz","data/detail.mesh.gz","data/detail.edges.gz",
  "assets/session-CafD1QSe.js","assets/session-_JOdV8Ha.js",
  "art/revolution-actors.webp","art/battle-props.webp","art/revolution-landscape-ink-green.webp",
  "chapter.json","chapters/ch01/act1/chapter.json",
  "delivery/20260912/chapter03.html","delivery/20260912/chapter04.html","delivery/20260912/chapter05.html",
  "delivery/20260912/chapter06.html","delivery/20260912/chapter07.html","delivery/20260912/chapter08.html",
  "delivery/20260912/ex-valmy.html","delivery/20260912/ex-marseille.html",
  "delivery/20260912/locales/en/map-scoped.json","delivery/20260912/locales/fr/map-scoped.json",
  "delivery/20260912/_turing_trial_locks.js","delivery/20260912/chapter01.html",
];
for (const rel of rels) {
  const url = ORIGIN + PREFIX + rel.split("/").map(encodeURIComponent).join("/");
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Referer: ORIGIN + "/" }, redirect: "manual" });
    const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
    console.log(`${res.status} ${String(buf.length).padStart(9)}  ${rel}`);
  } catch (e) { console.log(`ERR ${rel} ${e.message}`); }
}
