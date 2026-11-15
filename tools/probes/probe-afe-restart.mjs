import { connect, sleep } from "./cdp2.mjs";
const ids = process.argv.slice(2).map(Number).filter(Boolean);
const browser = await connect(9222);
await browser.raw("Network.enable", {}, browser.pageSession).catch(() => {});
for (const pid of ids) {
  browser.events.length = 0;
  await browser.goto(`https://aifunengjiaoyu.com/play/${pid}`);
  await sleep(6000);
  // click the restart button if present
  const clicked = await browser.evaluate(`(() => {
    const b = [...document.querySelectorAll("button")].find(x => /重新开始|开始播放|试看/.test(x.textContent));
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
  })()`);
  if (clicked) await sleep(6000);
  const hits = browser.events.filter(e => e.method === "Network.responseReceived" && /reviewed-course/.test(e.params.response.url));
  console.log(`\n=== ${pid} clicked=${clicked} hits=${hits.length}`);
  for (const h of hits) {
    console.log(`  ${h.params.response.status} ${h.params.response.url.replace(/^https:\/\/aifunengjiaoyu\.com/, "")}`);
    try {
      const b = await browser.raw("Network.getResponseBody", { requestId: h.params.requestId }, h.sessionId);
      console.log("    " + b.body.slice(0, 400).replace(/\s+/g, " "));
    } catch (e) { console.log("    (no body)"); }
  }
  const st = await browser.evaluate(`(() => ({
    status: document.getElementById("play-status")?.textContent || "",
    hint: document.getElementById("hint")?.textContent || "",
    storage: Object.keys(sessionStorage).filter(k=>/turing/.test(k)).map(k=>k+"="+sessionStorage.getItem(k)),
  }))()`);
  console.log("  state:", JSON.stringify(st));
}
await browser.close();
