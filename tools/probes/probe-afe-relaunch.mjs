import { connect, sleep } from "./cdp2.mjs";
const browser = await connect(9222);
await browser.goto("https://aifunengjiaoyu.com/");
await sleep(1200);
const expr = `(async () => {
  const token = localStorage.getItem("aiedu_token");
  const out = { steps: [] };
  const post = async (route, body) => {
    const res = await fetch(route, { method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body || {}) });
    const text = await res.text();
    out.steps.push({ route, status: res.status, text: text.slice(0, 300) });
    try { return JSON.parse(text); } catch { return null; }
  };
  const ids = [841, 811, 1360, 1016, 842];
  for (const pid of ids) {
    const key = "turing-reviewed-launch:" + pid;
    const sid = sessionStorage.getItem(key);
    out["launch-" + pid] = sid || null;
    if (!sid) continue;
    await post("/api/reviewed-course-session/session/" + sid + "/resume", { programId: pid });
  }
  return out;
})()`;
const out = await browser.evaluate(expr);
console.log(JSON.stringify(out, null, 1));
await browser.close();

