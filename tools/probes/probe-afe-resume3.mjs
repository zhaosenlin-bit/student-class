/* Resume a session, mount a chapter, and read the file with whatever the
   mount left behind. */
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
    out.steps.push({ route, status: res.status, cookie: res.headers.get('set-cookie') || '' });
    try { return { status: res.status, json: JSON.parse(text) }; }
    catch { return { status: res.status, json: null }; }
  };
  const resume = await post('/api/reviewed-course-session/session/${sessionId}/resume', { programId: ${programId} });
  if (!resume.json?.id) { out.error = 'no resume'; return out; }
  const entries = resume.json.descriptor.entries;
  out.entries = entries.map(e => ({ id: e.id, path: e.path }));
  const mount = await post('/api/reviewed-course-session/session/' + resume.json.id + '/mount', {
    entry: entries[0].id,
  });
  const prefix = mount.json?.prefix;
  out.prefix = prefix;
  if (!prefix) return out;
  out.documentCookie = document.cookie;
  const url = new URL(prefix + entries[0].path.split('/').map(encodeURIComponent).join('/'), location.origin).href;
  const res = await fetch(url, { credentials: 'include' });
  const text = res.ok ? await res.text() : '';
  out.file = { url, status: res.status, len: text.length, head: text.slice(0, 200) };
  return out;
})()`;

const out = await browser.evaluate(expr);
console.log(JSON.stringify(out, null, 1));
await browser.close();
