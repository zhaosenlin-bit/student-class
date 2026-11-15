import { connect, sleep } from "./cdp2.mjs";
const id = process.argv[2] || "afe-19";
const browser = await connect(9226);
await browser.raw("Log.enable", {}, browser.pageSession);
await browser.goto(`http://localhost:4173/courseware/${id}?local=1`);
await sleep(6000);
const ev = browser.events.filter(e => /exceptionThrown|consoleAPICalled|entryAdded|loadingFailed/i.test(e.method));
for (const e of ev.slice(0, 25)) {
  const p = e.params;
  const txt = p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || p.entry?.text || p.args?.map(a=>a.value||a.description).join(" ") || "";
  console.log("[" + e.method + "]", String(txt).split("\n").slice(0,3).join(" | ").slice(0,300));
}
const state = await browser.evaluate(`(()=>({
  canvases: document.querySelectorAll("canvas").length,
  bodyLen: document.body.innerHTML.length,
  hasTHREE: typeof window.THREE, hasTWEEN: typeof window.TWEEN,
  globals: Object.keys(window).filter(k=>/^(oc|OC|Obj|Orbit|Drag|Gizmo)/i.test(k)).slice(0,20),
  title: document.title
}))()`);
console.log("\nSTATE", JSON.stringify(state, null, 1));
await browser.shot(`recon/scratch/probe-${id}.png`);
await browser.close();
