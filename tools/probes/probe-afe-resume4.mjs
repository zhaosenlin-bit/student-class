/* Ask the server why a chapter session cannot be resumed, and what the
   session storage still holds. */
import { connect, sleep } from './cdp2.mjs';

const programId = Number(process.argv[2] || 841);
const forcedSid = process.argv[3] || null;
const browser = await connect(9222);
await browser.goto('https://aifunengjiaoyu.com/');
await sleep(1500);

const expr = `(async () => {
  const token = localStorage.getItem('aiedu_token');
  const out = { programId: ${programId}, storage: {}, steps: [] };
  for (const key of Object.keys(sessionStorage)) {
    if (/turing-reviewed/.test(key)) out.storage[key] = sessionStorage.getItem(key);
  }
  const post = async (route, body) => {
    const res = await fetch(route, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    out.steps.push({ route, status: res.status, text: text.slice(0, 400) });
    try { return JSON.parse(text); } catch { return null; }
  };
  const sid = ${forcedSid ? JSON.stringify(forcedSid) : "out.storage['turing-reviewed-session:' + " + programId + "]"};
  if (!sid) { out.note = 'no stored session'; return out; }
  const resumed = await post('/api/reviewed-course-session/session/' + sid + '/resume',
    { programId: ${programId} });
  if (!resumed?.id) return out;
  out.sessionId = resumed.id;
  out.entries = (resumed.descriptor?.entries || []).map(e => ({ id: e.id, title: e.title, path: e.path }));
  out.allowed = resumed.allowedEntryIds;
  out.binding = resumed.binding;
  out.uses = resumed.uses;
  out.trialRemaining = resumed.trialRemaining;
  return out;
})()`;

const out = await browser.evaluate(expr);
console.log(JSON.stringify(out, null, 1));
await browser.close();
