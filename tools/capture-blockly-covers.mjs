#!/usr/bin/env node
/*
 * Takes a picture of every block-programming game so the library can
 * show a cover instead of a grey square.
 *
 *   node tools/capture-blockly-covers.mjs [--cdp 9222] [--port 4173]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdpx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CDP = Number(arg('cdp', 9222));
const PORT = Number(arg('port', 4173));

const OUT = path.join(ROOT, 'mirror', 'leqixiang', 'brand', 'blocklygames');
fs.mkdirSync(OUT, { recursive: true });

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'blocklygames', 'catalog.json'), 'utf8')
);

const client = await connect(CDP);
await client.send('Page.enable');
await client.send('Emulation.setDeviceMetricsOverride', {
  width: 1200,
  height: 750,
  deviceScaleFactor: 1,
  mobile: false,
});

for (const game of catalog) {
  const id = `blocklygames-${game.slug}`;
  await client.send('Page.navigate', {
    url: `http://localhost:${PORT}/courseware/${id}.html`,
  });
  await sleep(4000);
  /* The picture of the working area is the part worth showing. */
  const box = await client.evaluate(`(() => {
    const el = document.getElementById('blockly');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
  })()`);
  const file = path.join(OUT, `${game.slug}.png`);
  const clip =
    box && box.width > 40 && box.height > 40
      ? { clip: { ...box, scale: 1 } }
      : {};
  const shot = await client.send('Page.captureScreenshot', { format: 'png', ...clip });
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(`${game.slug}: ${(fs.statSync(file).size / 1024).toFixed(0)}KB`);
}

client.close();
console.log(`done: ${catalog.length} covers`);
