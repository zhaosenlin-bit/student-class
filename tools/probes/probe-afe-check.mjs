/* The runtime checks an entry before it reads it. Try that order. */
import { connect, sleep } from './cdp2.mjs';

const sessionId = process.argv[2];
const programId = Number(process.argv[3]);
const browser = await connect(9222);
await browser.goto('https://aifunengjiaoyu.com/');
await sleep(1500);

const expr = `(async () => {
  const token = localStorage.getItem('aiedu_token');
  const out = { steps: [] };
  const post = async (route, body) => {
    const res = await fetch(route, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    out.steps.push({ route, status: res.status, text: text.slice(0, 200) });
    try { return { status: res.status, json: JSON.parse(text) }; }
    catch { return { status: res.status, json: null }; }
  };
  const resume = await post('/api/reviewed-course-session/session/${sessionId}/resume', { programId: ${programId} });
  if (!resume.json?.id) return out;
  const entry = resume.json.descriptor.entries[0];
  const mount = await post('/api/reviewed-course-session/session/' + resume.json.id + '/mount', { entry: entry.id });
  if (!mount.json?.prefix) return out;
  const prefix = mount.json.prefix;
  const check = await post('/api/reviewed-course-session/session/' + resume.json.id + '/check', { entry: entry.id });
  const url = new URL(prefix + entry.path.split('/').map(encodeURIComponent).join('/'), location.origin).href;
  for (const [name, opts] of [
    ['same-origin', { credentials: 'same-origin' }],
    ['omit', { credentials: 'omit' }],
    ['include', { credentials: 'include' }],
  ]) {
    const res = await fetch(url, opts);
    const text = res.ok ? await res.text() : '';
    out.steps.push({ fetch: name, status: res.status, len: text.length });
  }
  out.url = url;
  return out;
})()`;

const out = await browser.evaluate(expr);
console.log(JSON.stringify(out, null, 1));
await browser.close();
