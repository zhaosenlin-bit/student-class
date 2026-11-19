#!/usr/bin/env node
/*
 * Give the lab pages their simulation back.
 *
 * A good part of the physics lab pages are not lessons: they are the
 * sheet that goes with a lesson — a banner, a diagram and a button that
 * downloads a worksheet.  The line that pointed at the simulation was
 * a link to another page of the original site, and that link is gone, so
 * the page opens onto a banner and nothing else.
 *
 * The simulation itself is in the library, under another name.  This
 * puts it back: the page gets the simulation in a frame, with a Chinese
 * line above it that says what it is.
 *
 *   node tools/repair-lq-lab-launchers.mjs          # report what would change
 *   node tools/repair-lq-lab-launchers.mjs --apply  # make the change
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

/*
 * The lab page, and the simulation that belongs to it.  The names on the
 * right are the pages the library already holds and already opens.
 */
const PAIRS = {
  'phyc240-ac-current-lab': 'electricity-magnetism-ac-builder',
  'phyc140-apparent-weight-lab': 'phyc140-apparent-weight-exp',
  'phyc140-air-table': 'simulation-bullet-block',
  'phyc140-balancing-act-lab': 'mechanics-balancing-act-simulation',
  'phyc140-ballistic-lab': 'phyc140-ballistic-cart',
  'phyc240-rc-circuit-lab': 'phyc240-rc-circuit',
  'phyc140-centripetal-lab': 'phyc140-centripetal-force-formula',
  'phyc140-coe-lab': 'simulation-coe',
  'phyc240-dc-circuit-lab': 'electricity-magnetism-dc-circuit',
  'phyc140-elastic-inelastic-lab': 'phyc140-collision',
  'phyc240-potential-lab': 'phyc240-electric-field-mapping',
  'phyc240-em-spectrum-lab': 'phyc240-electromagnetic-wave',
  'phyc240-electrostatic-friction': 'phyc240-pom-poms',
  'phyc240-electrostatic-contact': 'phyc240-charge-in-efield',
  'phyc240-electrostatics-conductor': 'phyc240-electric-field-spherical-shell',
  'phyc140-gravity-force-lab': 'phyc140-gravity-force',
  'phyc140-heat-transfer-gas-lab': 'phyc140-heat-transfer-gas',
  'phyc240-induction-lab': 'phyc240-lenz-law',
  'phyc240-magnetic-domain': 'phyc240-dia-para-magnetism',
  'phyc240-magnetic-field-lab': 'phyc240-biot-savart',
  'phyc240-magnetic-force-lab': 'phyc240-magnet-force',
  'phyc140-g-lab': 'simulation-newton-g-force',
  'phyc240-multi-loop-lab': 'phyc240-rlc-ac-series',
  'phyc140-newton-cradle': 'phyc140-angular-momentum-collision',
  'phyc140-pressure-fluid-lab': 'phyc140-fluid-pressure',
  'phyc240-ray-optics-lab': 'phyc240-convex-lens',
  'phyc240-resistance-lab': 'phyc240-resistivity-lab',
  'phyc140-translation': 'phyc240-angular-momentum-law',
  'phyc140-simple-pend-lab': 'phyc140-simple-pendulum',
  'phyc140-static-kinetic-friction-lab': 'phyc140-static-kinetic-friction',
  'phyc140-torsion-pend-lab': 'simulation-torsion',
  'phyc140-viscosity-lab': 'phyc140-viscosity',
  '3jcn-labs-coulomb-law-lab': 'phyc240-coulomb-law',
  '3jcn-labs-density-buoyancy-lab': 'simulation-buoyancy',
  '3jcn-labs-hooke-law-lab': 'mechanics-hooke-law-simulation',
  '3jcn-labs-newton-second-law-lab': 'mechanics-newtons-second-law-simulation',
  '3jcn-labs-ohm-law-lab': 'phyc240-ohmlaw',
  '3jcn-labs-photoelectric-lab': 'phyc240-photoelectric',
  '3jcn-labs-pulley-lab': 'mechanics-pulley-system-simulation',
};

const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const catalog = JSON.parse(fs.readFileSync(path.join(LQ, 'catalog.json'), 'utf8'));
const titleOf = (slug) => {
  const p = catalog.products.find((x) => x.id === `lab-${slug}`);
  return p ? p.title : slug;
};

/* The frame that is already used by the lab pages that do work. */
const FRAME = (src) =>
  `<iframe src="${src}" title="物理实验仿真" style="width:100%;height:min(72vh,680px);border:1px solid #2a3550; border-radius:12px;background:#0b1020;display:block;margin:14px auto;"></iframe>`;

/*
 * The card the simulation sits in.  It carries its own light background
 * because the pages it is put into are dark in some places and pale in
 * others, and the writing has to be readable on both.
 */
const BLOCK = (src, title) =>
  `<div style="max-width:900px;margin:18px auto 30px;padding:16px 18px 18px;background:#ffffff;border-radius:14px;box-shadow:0 6px 20px rgba(12,24,44,.16);font-family:'Microsoft YaHei',-apple-system,'PingFang SC',sans-serif;color:#1b2436;">` +
  `<div style="font-size:19px;font-weight:700;margin:0 0 4px;">配套仿真 · 《${title}》</div>` +
  `<div style="font-size:13px;color:#5b6b85;margin-bottom:4px;">下面是这一课可以动手操作的仿真。</div>` +
  FRAME(src) +
  `</div>`;

/*
 * The banner at the top of these pages carries the mark of the house the
 * lessons came from.  A reader of this library should not be met by
 * another house's mark, so the banner becomes a line of ours.
 */
const HEADER =
  `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:linear-gradient(120deg,#12233f,#1d3d6b);border-radius:12px;margin:0 0 12px;font-family:'Microsoft YaHei',-apple-system,'PingFang SC',sans-serif;">` +
  `<img src="/brand/brand-mark.png" alt="乐启享" width="34" height="34" style="width:34px;height:34px;border-radius:9px;display:block;">` +
  `<span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.02em;">乐启享 · 物理实验</span>` +
  `</div>`;

const BANNER = /<img\b[^>]*3jcn_banner\.png[^>]*>/gi;

/* The card as it was written before it was given a background of its own. */
const OLD_BLOCK =
  /<div style="max-width:900px;margin:0 auto;padding:8px 16px 28px;[\s\S]*?<\/iframe>\s*<\/div>/g;

/* The line that says "click the image" while there is no image. */
const STALE = /<h2\b[^>]*>\s*(?:Click(?:\s+on|\s+the)?\s+(?:the\s+)?image[^<]*)\s*<\/h2>/gi;

/*
 * One of the lab pages shows two films; the second of them was never
 * mirrored, so the player sits there empty.  The film is taken out and
 * the simulation takes its place, so the page still teaches something.
 */
const BROKEN_MEDIA = {
  'phyc140-air-table': /<video id="video2"[\s\S]*?<\/video>/i,
};

const JOBS = [];
const seen = new Set();
for (const [slug, target] of Object.entries(PAIRS)) {
  /*
   * The archive keeps the address of its own house; the merged copy is
   * what the library hands out, and there the name of the house is one
   * of ours.  The build makes that second copy out of the first, so the
   * two are written the same way here and stay the same way after a
   * rebuild.
   */
  const files = [
    {
      file: path.join(ROOT, 'mirror', '3jcn', 'courseware', `${slug}.html`),
      src: `/courseware/3jcn-${target}.html`,
    },
    {
      file: path.join(LQ, 'courseware', `lab-${slug.replace(/^3jcn-/, '')}.html`),
      src: `/courseware/lab-${target}.html`,
    },
  ];
  for (const { file, src } of files) {
    if (!fs.existsSync(file)) {
      console.log(`没有这个文件 ${path.relative(ROOT, file)}`);
      continue;
    }
    const before = fs.readFileSync(file, 'utf8');
    const title = titleOf(target);
    let after = before.replace(STALE, '');
    const media = BROKEN_MEDIA[slug];
    if (media) after = after.replace(media, '');
    after = after.replace(BANNER, HEADER);
    after = after.replace(OLD_BLOCK, '');
    if (!after.includes(BLOCK(src, title))) {
      const at = after.lastIndexOf('</body>');
      if (at < 0) {
        console.log(`没有 body ${path.relative(ROOT, file)}`);
        continue;
      }
      after = after.slice(0, at) + BLOCK(src, title) + after.slice(at);
    }
    if (after === before) {
      console.log(`已经改过了 ${path.relative(ROOT, file)}`);
      continue;
    }
    JOBS.push({ file, before, after });
    seen.add(file);
  }
}

/*
 * The banner is on every one of these pages, not only on the ones that
 * lost their simulation, so it is swept over all of them.
 */
const COURSEWARE_DIRS = [
  path.join(ROOT, 'mirror', '3jcn', 'courseware'),
  path.join(LQ, 'courseware'),
];
for (const dir of COURSEWARE_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(dir, name);
    if (seen.has(file)) continue;
    const before = fs.readFileSync(file, 'utf8');
    if (!BANNER.test(before)) continue;
    BANNER.lastIndex = 0;
    const after = before.replace(BANNER, HEADER);
    BANNER.lastIndex = 0;
    if (after === before) continue;
    JOBS.push({ file, before, after });
    seen.add(file);
  }
}

if (!APPLY) {
  console.log(`会改 ${JOBS.length} 个文件。`);
  for (const job of JOBS) console.log(`  ${path.relative(ROOT, job.file)}`);
  process.exit(0);
}

for (const job of JOBS) {
  fs.writeFileSync(job.file, job.after);
  console.log(`改好了 ${path.relative(ROOT, job.file)}`);
}
console.log(`一共改了 ${JOBS.length} 个文件。`);
