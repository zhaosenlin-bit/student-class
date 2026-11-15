/* Can the CDN files of a camera work be downloaded? */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

for (const url of [
  'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js',
  'https://unpkg.com/three@0.147.0/build/three.min.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands_solution_packed_assets.data',
]) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    console.log(`  ${res.status} len=${buf?.length ?? 0} ${url.slice(0, 90)}`);
  } catch (e) {
    console.log(`  ERR ${e.message} ${url.slice(0, 80)}`);
  }
}
