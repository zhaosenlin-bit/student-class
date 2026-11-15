/*
 * The 图灵智赋 catalogue is far bigger than the twelve works the front page
 * shows: /api/programs lists every programme the platform knows. This keeps
 * the whole list and works out which of them can be opened.
 */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();

const api = async (route) => {
  const r = await fetch(ORIGIN + route, {
    headers: { 'User-Agent': UA, Referer: `${ORIGIN}/`, Authorization: `Bearer ${token}` },
  });
  const text = await r.text();
  try {
    return { status: r.status, json: JSON.parse(text) };
  } catch {
    return { status: r.status, json: null, text };
  }
};

const guest = await api('/api/programs');
const programs = guest.json?.programs || [];
fs.writeFileSync('mirror/aifunengjiaoyu/programs-all.json', JSON.stringify(programs, null, 1));

const tally = (key) => {
  const out = {};
  for (const p of programs) {
    const v = String(p[key]);
    out[v] = (out[v] || 0) + 1;
  }
  return out;
};
console.log('programs:', programs.length);
for (const key of ['status', 'source_kind', 'guest_visible', 'reviewed_public_runtime', 'has_attachment', 'is_zip', 'runtime_mode', 'type', 'subject']) {
  console.log(` ${key}:`, JSON.stringify(tally(key)));
}
const withFile = programs.filter((p) => p.source_kind === 'file');
console.log('\nsource_kind=file:', withFile.length);
console.log('  of those has_attachment=1:', withFile.filter((p) => p.has_attachment).length);
console.log('  attachment names:', [...new Set(withFile.filter((p) => p.attachment_name).map((p) => p.attachment_name))].slice(0, 10));
const priced = programs.filter((p) => Number(p.price) > 0);
console.log('\npriced (price>0):', priced.length, ' free:', programs.length - priced.length);
console.log('free ones:', programs.filter((p) => !(Number(p.price) > 0)).map((p) => `${p.id}:${p.title}`).slice(0, 25).join(' | '));
