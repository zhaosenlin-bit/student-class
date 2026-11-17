#!/usr/bin/env node
/*
 * Mirrors the open science simulations.
 *
 * Upstream is a teacher's own collection: every simulation is one HTML
 * file that draws itself, and the only things it reaches for are three.js
 * and a couple of web fonts.  Those two are pulled in once and put into the
 * shared folder, so the copies here run with no connection at all.
 *
 *   node tools/mirror-labsims.mjs [--src recon/vendor/science_simulations]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const SRC = path.resolve(ROOT, arg('src', path.join('recon', 'vendor', 'science_simulations')));
const OUT = path.join(ROOT, 'mirror', 'labsims');
const CW = path.join(OUT, 'courseware');
const SHARED = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

/*
 * The lessons, in the words the library uses.  Upstream is written for
 * English schools, so the titles are translated here and the collection is
 * marked as the English edition.
 */
const LESSONS = [
  /* 3D reaction scenes — chemistry */
  ['3dreactionscenes/metal-oxygen.html', '金属与氧气反应', '化学', '初中'],
  ['3dreactionscenes/metal-water.html', '金属与水反应', '化学', '初中'],
  ['3dreactionscenes/metal-acid.html', '金属与酸反应', '化学', '初中'],
  ['3dreactionscenes/metal-displacement.html', '金属活动性顺序', '化学', '初中'],
  ['3dreactionscenes/metal-halogen.html', '金属与卤素', '化学', '高中'],
  ['3dreactionscenes/metal-oxide-carbon.html', '碳还原金属氧化物', '化学', '初中'],
  ['3dreactionscenes/acid-metal-oxide.html', '酸与金属氧化物', '化学', '初中'],
  ['3dreactionscenes/acid-metal-hydroxide.html', '酸与金属氢氧化物', '化学', '初中'],
  ['3dreactionscenes/acid-metal-carbonate.html', '酸与碳酸盐', '化学', '初中'],
  ['3dreactionscenes/halogen-displacement.html', '卤素置换反应', '化学', '高中'],
  ['3dreactionscenes/combustion.html', '燃烧反应 3D 场景', '化学', '初中'],
  ['3dreactionscenes/thermal-decomposition.html', '热分解反应', '化学', '初中'],
  ['3dreactionscenes/electrolysis-aqueous.html', '电解水溶液', '化学', '高中'],
  ['3dreactionscenes/electrolysis-molten.html', '电解熔融物', '化学', '高中'],
  ['3dreactionscenes/blast-furnace.html', '高炉炼铁 3D 场景', '化学', '初中'],

  /* Cell biology */
  ['cell_biology/generic_animal_cell.html', '动物细胞结构', '生物', '初中'],
  ['cell_biology/generic_plant_cell.html', '植物细胞结构', '生物', '初中'],
  ['cell_biology/neuron.html', '神经元', '生物', '高中'],
  ['cell_biology/muscle_cells.html', '肌肉细胞', '生物', '高中'],
  ['cell_biology/red_blood_cell.html', '红细胞', '生物', '初中'],
  ['cell_biology/sperm.html', '精子', '生物', '初中'],
  ['cell_biology/xylem.html', '木质部运输', '生物', '初中'],
  ['cell_biology/phloem.html', '韧皮部运输', '生物', '初中'],
  ['cell_biology/root_hair.html', '根毛吸收水分', '生物', '初中'],

  /* Human anatomy */
  ['human_anatomy/heart/heart.html', '人体心脏 3D 交互', '生物', '高中'],
  ['human_anatomy/heart/heart-viewer.html', '心脏结构观察器', '生物', '高中'],
  ['human_anatomy/digestion/digestion.html', '消化过程 3D', '生物', '初中'],
  ['human_anatomy/reflex-arc/reflex-arc-3d.html', '反射弧 3D 交互', '生物', '高中'],
  ['human_anatomy/reflex-arc/scene.html', '反射弧演示场景', '生物', '高中'],
  ['human_anatomy/respiration/respiration.html', '呼吸作用 3D', '生物', '初中'],

  /* Genetics */
  ['genetics/mitosis-3d-story.html', '细胞分裂 3D 分镜', '生物', '高中'],
  ['genetics/meiosis-3d-story.html', '减数分裂 3D 分镜', '生物', '高中'],
  ['genetics/cell-to-dna-3d-story.html', '从细胞到 DNA 3D 分镜', '生物', '高中'],

  /* Particles and matter */
  ['particles/density.html', '密度与浮沉', '物理', '初中'],
  ['particles/brownian-motion.html', '布朗运动', '物理', '高中'],
  ['particles/diffusion-osmosis-active-transport-3d-story.html', '扩散 · 渗透 · 主动运输', '生物', '初中'],
  ['particles/conduction.html', '热传导', '物理', '初中'],
  ['particles/convection.html', '对流', '物理', '初中'],
  ['particles/melting-snowman.html', '融化实验：守恒定律', '物理', '初中'],
  ['particles/foams-and-aerosols.html', '泡沫与气溶胶', '物理', '高中'],
  ['particles/giant-covalent.html', '巨型共价结构', '化学', '高中'],
  ['particles/acid-strength-vs-concentration.html', '酸强度与浓度', '化学', '高中'],
  ['particles/alkali-strength-vs-concentration.html', '碱强度与浓度', '化学', '高中'],
  ['particles/acid-strength-3d-story.html', '酸强度 3D 分镜', '化学', '高中'],
  ['particles/alkali-strength-3d-story.html', '碱强度 3D 分镜', '化学', '高中'],
  ['particles/atoms-molecules-compounds-mixtures-3d-story.html', '原子 · 分子 · 化合物 · 混合物', '化学', '初中'],
  ['particles/pure-substances-vs-mixtures-3d-story.html', '纯净物与混合物', '化学', '初中'],
  ['particles/energy-vs-temperature-3d-story.html', '温度与能量', '物理', '初中'],

  /* Energy and electricity */
  ['energy/energy-chemical-change.html', '化学变化中的能量', '化学', '初中'],
  ['energy/energy-physical-change.html', '物理变化中的能量', '物理', '初中'],
  ['energy/energy-resources.html', '能源与转换', '物理', '初中'],
  ['energy/specific-heat-capacity.html', '比热容实验', '物理', '初中'],
  ['electricity/voltage_energy_charge.html', '电压 · 电能 · 电荷', '物理', '高中'],
  ['electricity/wire-resistance.html', '导线电阻', '物理', '高中'],
  ['electricity/circuit_quiz_teacher_tool.html', '电路测验工具', '物理', '初中'],

  /* Waves and motion */
  ['waves/pulse_echo.html', '脉冲与回声', '物理', '初中'],
  ['waves/ultrasonic_ndt.html', '超声波无损检测', '物理', '高中'],
  ['waves/ultrasonicv2.html', '超声波测距实验', '物理', '高中'],
  ['mechanics/projectiles.html', '抛体运动', '物理', '高中'],

  /* Chemistry toolkit */
  ['reactionbuilder/reaction-builder.html', '化学方程式生成器', '化学', '初中'],
  ['reactionbuilder/copper-oxide-reaction.html', '氧化铜还原反应', '化学', '初中'],
  ['chemsheet_help/moles.html', '物质的量', '化学', '高中'],
  ['chemsheet_help/avogadros_constant.html', '阿伏加德罗常数', '化学', '高中'],
  ['chemsheet_help/relative_formula_mass.html', '相对式量', '化学', '初中'],
  ['chemsheet_help/percentage_by_mass.html', '质量百分比', '化学', '初中'],
  ['homework/y7hw1.html', '七年级科学练习册', '科学', '初中'],
];

/* The web fonts the lessons ask for, and where they live once mirrored. */
const FONT_QUERIES = [
  'family=Fredoka:wght@500;600&family=Nunito:wght@400;700;800&display=swap',
  'family=JetBrains+Mono:wght@300;400;600;700&family=Bebas+Neue&display=swap',
  'family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800&display=swap',
];
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const THREE_REL = 'cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

const get = async (url, asBuffer = false) => {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: 'https://fonts.googleapis.com/' },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.text();
};

fs.mkdirSync(CW, { recursive: true });

/* ------------------------------------------------------- shared libraries */

/* three.js is asked for by name; it is put in the shared folder once. */
const threeFile = path.join(SHARED, THREE_REL);
if (!fs.existsSync(threeFile) || fs.statSync(threeFile).size === 0) {
  fs.mkdirSync(path.dirname(threeFile), { recursive: true });
  fs.writeFileSync(threeFile, await get(THREE_URL, true));
  console.log('three.js r128 fetched');
}

/*
 * The style sheets that ask for web fonts are cut down to the families a
 * lesson really uses, and the font files are put next to them.  The merged
 * sheet is the one the server hands out, so the new families are added to
 * it — otherwise the server would answer with a sheet that does not
 * mention them.
 */
const mergedSheet = path.join(SHARED, 'fonts.googleapis.com', 'css2');
const families = new Set();
const blocks = [];
for (const query of FONT_QUERIES) {
  const css = await get(`https://fonts.googleapis.com/css2?${query}`);
  for (const m of css.matchAll(/@font-face\s*\{[\s\S]*?\}/g)) {
    const block = m[0];
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    if (!family || families.has(family + block.match(/font-weight:\s*(\d+)/)?.[1])) continue;
    families.add(family + block.match(/font-weight:\s*(\d+)/)?.[1]);
    /* The address the file is served under, once it is local. */
    const local = block.replace(
      /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g,
      (all, url) => `url(/_shared/fonts.gstatic.com/${url.replace('https://fonts.gstatic.com/', '')})`
    );
    blocks.push(local);
  }
}

let fetched = 0;
for (const block of blocks) {
  for (const m of block.matchAll(/\/_shared\/fonts\.gstatic\.com\/([^)"'\s]+)/g)) {
    const rel = m[1];
    const file = path.join(SHARED, 'fonts.gstatic.com', rel);
    if (fs.existsSync(file) && fs.statSync(file).size > 0) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, await get(`https://fonts.gstatic.com/${rel}`, true));
    fetched++;
  }
}
console.log(`font files fetched: ${fetched}`);

if (fs.existsSync(mergedSheet)) {
  const text = fs.readFileSync(mergedSheet, 'utf8');
  const missing = blocks.filter((b) => !text.includes(b));
  if (missing.length) {
    fs.writeFileSync(mergedSheet, `${text}\n${missing.join('\n')}\n`);
    console.log(`families added to the shared sheet: ${missing.length}`);
  }
}

/* ------------------------------------------------------------- the lessons */

const seen = new Set();
const catalog = [];
const missing = [];
const auxFiles = new Set();

/*
 * Some of the simulations load a helper that sits next to them: the cell
 * biology ones share a file of organelles, the anatomy ones carry a
 * manifest and a recipe.  The lessons are filed under one name each, so
 * those helpers keep their own place in a shared folder and every lesson
 * points at the copy there.
 */
const AUX = path.join(SHARED, 'labsims');
const REF =
  /(["'])([A-Za-z0-9_\-./]+\.(?:js|mjs|json|txt|glb|gltf|bin|png|jpe?g|svg|wasm|mp3|wav|css|glsl|vert|frag))\1/g;

const rewriteRefs = (html, simRel, id) => {
  const dir = path.posix.dirname(simRel.split(path.sep).join('/'));
  return html.replace(REF, (all, quote, ref) => {
    if (/^[a-z]+:/i.test(ref) || ref.startsWith('/')) return all;
    const resolved = path.posix.normalize(path.posix.join(dir, ref));
    if (resolved.startsWith('..')) return all;
    const source = path.join(SRC, resolved.split('/').join(path.sep));
    if (!fs.existsSync(source) || fs.statSync(source).isDirectory()) return all;
    auxFiles.add(resolved);
    return `${quote}/api/program-assets/${id}/_ext/labsims/${resolved}${quote}`;
  });
};

for (const [rel, title, subject, stage] of LESSONS) {
  const src = path.join(SRC, rel);
  if (!fs.existsSync(src)) {
    missing.push(rel);
    continue;
  }
  const slug = rel.replace(/[/\\]/g, '-').replace(/\.html$/, '');
  if (seen.has(slug)) continue;
  seen.add(slug);
  const id = `labsims-${slug}`;
  const html = rewriteRefs(fs.readFileSync(src, 'utf8'), rel, id);
  fs.writeFileSync(path.join(CW, `${slug}.html`), html);
  catalog.push({
    slug,
    title,
    subject,
    stage,
    stages: [stage],
    dimension: /3d|heart|neuron|mitosis|meiosis|dna|digestion|respiration|reflex/i.test(rel)
      ? '3d'
      : '2d',
    tagline: `${subject} · ${stage} · 英文原版`,
    description:
      `<p>${title}：来自公开许可教学资源库（MIT）的互动仿真实验，` +
      `可调参数、可看过程、可完全离线运行。<strong>课件正文为英文原版</strong>，` +
      `画面与操作方式与国内课堂一致，可直接作课堂演示或学生分组探究。</p>`,
    cover: `/brand/labsims/${slug}.png`,
    sourceUrl: `https://github.com/iwalpola/science_simulations/blob/main/${rel}`,
    license: 'MIT',
    author: 'iwalpola science_simulations',
  });
}

/* The helpers travel with the library, once each. */
let copiedAux = 0;
for (const rel of auxFiles) {
  const source = path.join(SRC, rel.split('/').join(path.sep));
  const target = path.join(AUX, rel.split('/').join(path.sep));
  if (fs.existsSync(target)) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  copiedAux++;
}
if (copiedAux) console.log(`helper files copied: ${copiedAux}`);

fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 1));

fs.writeFileSync(
  path.join(OUT, 'NOTICE.md'),
  [
    '# 开源科学仿真实验（science_simulations）',
    '',
    '这批互动课件来自 [iwalpola/science_simulations](https://github.com/iwalpola/science_simulations)，',
    '作者是一位中学教师，课件按 GCSE / KS3 课程编写，正文为英文。',
    '',
    '许可：MIT License。',
    '',
    '## 乐启享的改编与再创作',
    '',
    '本目录里的课件由乐启享机器人（[codebn.cn](https://codebn.cn/)）整理、改编并本地化后收录。',
    '乐启享完成的工作有：中文标题与中文说明的撰写、封面截图与品牌接入、',
    '脚本与样式表与字体与模型与贴图的本地化改写、离线打包与本地服务，',
    '以及课件质量的分级筛选（结论见 `mirror/leqixiang/quality-decisions.json`）。',
    '课件本身的著作权仍属于原作者；上游链接、作者署名与许可协议一并保留在下面，',
    '并写进目录条目的 `author` / `license` / `sourceUrl` 字段里。',
    '',
    '课件本身不改动；只把 three.js 与网页字体换成本地副本，',
    '使每门课件都能离线打开。',
    '',
    `共收录 ${catalog.length} 门。`,
    '',
  ].join('\n')
);

console.log(`labsims: ${catalog.length} lessons mirrored, ${missing.length} missing`);
if (missing.length) console.log('missing:', missing.join(' '));
