#!/usr/bin/env node
/*
 * The English a reader still sees in a lesson, and the Chinese that
 * stands in its place.
 *
 * Most of the wording in a lesson sits between the tags, and the
 * courseware tool takes care of that.  Some of it is put together by
 * the program itself — a word chosen by a rule, a sentence built from
 * parts — and those words are written down here.
 *
 * A word is only a name when the program looks it up by that name.
 * So before anything is changed the lesson is read twice: once as it
 * stands, and once as it was before the wording was touched.  A word
 * that stands in the place of a name in either of them is left alone,
 * and a word that stands as wording is given its Chinese.
 *
 *   node tools/lq-english-strings.mjs --check --roots mirror
 *   node tools/lq-english-strings.mjs --fix   --roots mirror
 */
import fs from 'node:fs';
import path from 'node:path';
import { stringsOf } from './lq-js-strings.mjs';
import { checkScripts } from './lq-script-check.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const ROOTS = arg(
  'roots',
  [
    'mirror/leqixiang/courseware',
    'mirror/lab-course/courseware',
    'mirror/lab-virtual/courseware',
    'mirror/lab-reaction/courseware',
    'mirror/lab-explore/courseware',
    'mirror/lab-physics/courseware',
    'mirror/lab-process/courseware',
    'mirror/studio/courseware',
    'mirror/library/courseware',
    'mirror/game-block'
  ].join(',')
)
  .split(',')
  .filter(Boolean);
/*
 * The mirror that was taken before any wording was changed.  It is
 * not kept in the repository, so it has to be pointed at; the archive
 * next to the project holds a copy of it.
 */
const PRISTINE = arg('pristine', '');

/* The mirror each kind of lesson was made from. */
const SOURCES = [
  { prefix: 'lab-reaction-', dir: 'mirror/lab-reaction/courseware' },
  { prefix: 'lab-virtual-', dir: 'mirror/lab-virtual/courseware' },
  { prefix: 'lab-physics-', dir: 'mirror/lab-physics/courseware' },
  { prefix: 'lab-explore-', dir: 'mirror/lab-explore/courseware' },
  { prefix: 'lab-process-', dir: 'mirror/lab-process/courseware' },
  { prefix: 'game-block-', dir: 'mirror/game-block/courseware' },
  { prefix: 'lab-course-', dir: 'mirror/lab-course/courseware' },
  { prefix: 'lq-', dir: 'mirror/studio/courseware' }
];

/*
 * The wording, and the Chinese that stands in its place.
 *
 * A lesson is named by the first column; '*' is every lesson.
 */
const WORDS = [
  /* The buttons of the experiments that run in a browser. */
  { id: '*', from: 'Start', to: '开始' },
  { id: '*', from: 'End', to: '结束' },
  { id: '*', from: 'Pause', to: '暂停' },
  { id: '*', from: 'Resume', to: '继续' },
  { id: '*', from: 'Run', to: '运行' },
  { id: '*', from: 'Reset', to: '重置' },
  { id: '*', from: 'Stop', to: '停止' },
  { id: '*', from: 'READY', to: '就绪' },

  /* Words that name a part of a reading. */
  { id: '*', from: 'one', to: '一' },
  { id: '*', from: 'two', to: '二' },
  { id: '*', from: 'three', to: '三' },
  { id: '*', from: 'High', to: '高' },
  { id: '*', from: 'Low', to: '低' },
  { id: '*', from: 'Static', to: '静摩擦' },
  { id: '*', from: 'Kinetic', to: '动摩擦' },
  { id: '*', from: 'Condition:', to: '条件：' },
  { id: '*', from: 'Formula:', to: '公式：' },
  { id: '*', from: 'Meaning:', to: '含义：' },
  { id: '*', from: 'Mode:', to: '模式：' },
  { id: '*', from: 'Resonance:', to: '共振：' },
  { id: '*', from: 'Constructive', to: '相长' },
  { id: '*', from: 'Destructive', to: '相消' },
  { id: '*', from: 'On / Off', to: '开 / 关' },
  { id: '*', from: 'Sky', to: '天空' },
  { id: '*', from: 'Ground', to: '地面' },
  { id: '*', from: 'Water', to: '水' },
  { id: '*', from: 'Ice', to: '冰' },
  { id: '*', from: 'Steam', to: '蒸汽' },

  /* The names the physics experiments give their own parts. */
  { id: '*', from: 'Quantum number n', to: '量子数 n' },
  { id: '*', from: 'Angular frequency ω', to: '角频率 ω' },
  { id: '*', from: 'Mass m', to: '质量 m' },
  { id: '*', from: 'Planck constant ħ', to: '普朗克常数 ħ' },
  { id: '*', from: 'Probability Density |ψ|', to: '概率密度 |ψ|' },
  { id: '*', from: 'Classical turning point A', to: '经典转折点 A' },
  { id: '*', from: 'Nodes in ψ', to: 'ψ 的节点' },
  { id: '*', from: 'Switch K:', to: '开关 K：' },
  { id: '*', from: 'Contact T:', to: '触点 T：' },
  { id: '*', from: 'Electromagnet E:', to: '电磁铁 E：' },
  { id: '*', from: 'Wavelength (λ)', to: '波长 (λ)' },
  { id: '*', from: 'Polarization Angle (θ)', to: '偏振角 (θ)' },
  { id: '*', from: 'Mass 1 (', to: '质量 1 (' },
  { id: '*', from: 'Mass 2 (', to: '质量 2 (' },
  { id: '*', from: 'Vector 1 (v₁)', to: '向量 1 (v₁)' },
  { id: '*', from: 'Vector 2 (v₂)', to: '向量 2 (v₂)' },
  { id: '*', from: 'Opposite Vector (−v₂)', to: '反向向量 (−v₂)' },
  { id: '*', from: 'Resultant R = v₁ − v₂ = v₁ + (−v₂)', to: '合力 R = v₁ − v₂ = v₁ + (−v₂)' },
  { id: '*', from: 'Resultant R = V₁ + V₂', to: '合力 R = V₁ + V₂' },
  { id: '*', from: 'Input Resistors (Δ):', to: '输入电阻 (Δ)：' },
  { id: '*', from: 'Predicted v', to: '预测 v' },
  { id: '*', from: 'Current v', to: '当前 v' },
  { id: '*', from: 'More negative E means a more tightly bound state.', to: 'E 越负，束缚越紧。' },
  { id: '*', from: 'Symmetry → Conservation Law', to: '对称性 → 守恒定律' },
  { id: '*', from: 'Rotation → Angular Momentum', to: '旋转 → 角动量' },
  {
    id: '*',
    from: 'same laws after transformation → conserved quantity.',
    to: '变换后定律不变 → 守恒量。'
  },
  {
    id: '*',
    from: 'Change the frequency until XL ≈ XC.',
    to: '改变频率，直到 XL ≈ XC。'
  },
  { id: '*', from: 'Area of parallelogram in x-z plane:', to: 'x-z 平面内平行四边形的面积：' },
  { id: '*', from: 'Direction by right-hand rule:', to: '方向按右手定则：' },
  { id: '*', from: '1 major grid division = 0.5 m', to: '每大格 = 0.5 m' },
  { id: '*', from: 'E and V', to: 'E 与 V' },
  { id: '*', from: 'thus', to: '因此' },
  { id: '*', from: 'slit', to: '狭缝' },

  /* The whole sentences the experiments put together. */
  {
    id: '*',
    from:
      'm1 = 0.30 kg slides on a frictionless surface and collides with a stationary ball of mass m2 = 0.35 kg.',
    to: 'm1 = 0.30 kg 在光滑面上滑动，与质量为 m2 = 0.35 kg 的静止小球相撞。'
  },
  { id: '*', from: 'The incoming speed of m1 is', to: 'm1 的入射速度为' },
  {
    id: '*',
    from: 'A classical bit can be in one of two definite states:',
    to: '一个经典比特只能处于两个确定状态之一：'
  },
  { id: '*', from: '(No superposition possible)', to: '（不存在叠加）' },
  {
    id: '*',
    from:
      "The Sun is shown near the center, and the Earth\n            orbits around it. The curved grid illustrates\n            spatial curvature around the Sun.\n\n            However, this is only a simplified analogy.\n            A marble rolls toward the center of a real\n            rubber sheet because Earth's gravity pulls it\n            downward. Therefore, the model uses gravity\n            to illustrate gravity rather than explaining\n            its origin.\n\n            In general relativity, gravity arises from\n            the curvature of four-dimensional spacetime,\n            not just space.",
    to:
      "太阳画在靠近中心的位置，地球绕着它转。弯曲的网格表示太阳附近的空间弯曲。\n\n            不过这只是一个简单的类比：\n            在真实的橡皮膜上，小球会朝中心滚去，因为地球的重力把它往下拉。\n            所以这个模型是用重力来说明重力，而不是解释重力的来源。\n\n            在广义相对论中，重力来自四维时空的弯曲，而不只是空间的弯曲。"
  },
  {
    id: '*',
    from:
      ') is the rotational analog\n                    of force that causes an object to undergo angular acceleration (',
    to: ') 是使物体产生角加速度的力的转动形式（'
  },
  {
    id: '*',
    from:
      "). The relationship is\n                    governed by Newton's Second Law for rotation.",
    to: '）。这一关系由转动的牛顿第二定律决定。'
  },
  {
    id: '*',
    from: 'the ball floats relative to the cabin.',
    to: '小球相对轿厢悬浮。'
  },
  {
    id: '*',
    from:
      'How is the speed of the block at a certain position related to the probability density of the block at that position?',
    to: '小方块在某个位置的速度，与它在该处的概率密度有什么关系？'
  },
  {
    id: '*',
    from: 'At θ = 87°, Aristarchus gets ES/EM ≈',
    to: '当 θ = 87° 时，阿利斯塔克得到 ES/EM ≈'
  },
  {
    id: '*',
    from:
      'For height h = 10 m and μ = 0.8, the distance is d = h / μ = 10 / 0.8 = 12.5 m.',
    to: '当高度 h = 10 m、μ = 0.8 时，距离 d = h / μ = 10 / 0.8 = 12.5 m。'
  },
  {
    id: '*',
    from: 'Example: When Blue Clock Advances 1.00 s',
    to: '例：当蓝钟走过 1.00 s'
  },
  { id: '*', from: 'Travel Distance: 299,792,458 m', to: '飞行距离：299,792,458 m' }
];

/*
 * The wordings that may stand inside a longer wording.
 *
 * A label keeps its meaning wherever it stands, so it may be given
 * its Chinese in the middle of a sentence: "Wavelength (lambda):"
 * becomes "the wavelength (lambda):" and the label is still a label.
 *
 * An ordinary English word does not keep its meaning there, and a
 * word that stands in the middle of a sentence is left alone.  The
 * same goes for a word that stands in a longer wording of its own:
 * only the label is given its Chinese there.
 */
const PARTS = new Set([
  'Condition:',
  'Formula:',
  'Meaning:',
  'Mode:',
  'Resonance:',
  'On / Off',
  'Quantum number n',
  'Angular frequency ω',
  'Mass m',
  'Planck constant ħ',
  'Probability Density |ψ|',
  'Classical turning point A',
  'Nodes in ψ',
  'Switch K:',
  'Contact T:',
  'Electromagnet E:',
  'Wavelength (λ)',
  'Polarization Angle (θ)',
  'Mass 1 (',
  'Mass 2 (',
  'Vector 1 (v₁)',
  'Vector 2 (v₂)',
  'Opposite Vector (−v₂)',
  'Resultant R = v₁ − v₂ = v₁ + (−v₂)',
  'Resultant R = V₁ + V₂',
  'Input Resistors (Δ):',
  'Predicted v',
  'Current v',
  'Symmetry → Conservation Law',
  'Rotation → Angular Momentum',
  'same laws after transformation → conserved quantity.',
  'Change the frequency until XL ≈ XC.',
  'Area of parallelogram in x-z plane:',
  'Direction by right-hand rule:',
  '1 major grid division = 0.5 m',
  'E and V'
]);

/* Every page of the given folders. */
const pages = (roots) => {
  const out = [];
  for (const root of roots) {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let names = [];
      try {
        names = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const n of names) {
        const full = path.join(dir, n.name);
        if (n.isDirectory()) {
          /* The folders of assets hold pieces of a lesson, not lessons. */
          if (/\.assets$/.test(n.name) || /_shared/.test(n.name)) continue;
          stack.push(full);
        }
        else if (n.name.endsWith('.html')) out.push(full.split(path.sep).join('/'));
      }
    }
  }
  return out;
};

/* The page of the library, and the page of the mirror it came from. */
const pagesOfLesson = (id, known) => {
  const out = [];
  const inLibrary = `mirror/leqixiang/courseware/${id}.html`;
  if (known.has(inLibrary)) out.push(inLibrary);
  for (const s of SOURCES) {
    if (!id.startsWith(s.prefix)) continue;
    let name = id.slice(s.prefix.length);
    if (id.startsWith('lq-')) name = id.slice(4);
    const file = `${s.dir}/${name}.html`;
    if (known.has(file)) out.push(file);
    break;
  }
  return out;
};

/*
 * The place a string stands in.
 *
 * 'key' is a name a program looks up, 'index' is a name it looks up
 * with brackets, 'call' is a name handed to a program of its own,
 * 'mark' is the name of a part of a lesson, and '' is wording a
 * reader sees.
 */
/* The attributes whose value a reader sees. */
const READS = ['title', 'alt', 'placeholder', 'aria-label'];

/* The words a program hides behind a code, said in plain letters. */
const plainOf = (text) =>
  text
    .replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));

/*
 * Whether a string is put where a reader will see it.
 *
 * A word that is handed to the page is a wording.  A word that is
 * kept in a variable is a name, and the program compares it with
 * another word written somewhere else; such a word is left alone.
 */
const readsOf = (text, at) => {
  const before = plainOf(text.slice(Math.max(0, at - 320), at));
  /* The word is put into what a reader reads. */
  if (SHOWS.test(before)) {
    return true;
  }
  /* The word is the value of a property whose name says it is wording. */
  const at_ = before.lastIndexOf(':');
  if (at_ < 0) return false;
  const key = /['"]?([A-Za-z0-9_$]+)['"]?\s*$/.exec(before.slice(0, at_));
  if (!key) return false;
  if (!/(?:Text|Label|Title)$/i.test(key[1])) return false;
  return !/[;{}]/.test(before.slice(at_ + 1));
};

/* The places a word is put where a reader will see it. */
const SHOWS =
  /(?<![\w$])(?:textContent|innerHTML|innerText|innerText|title|placeholder|ariaLabel|label)\s*['"]?\]\s*=\s*[^;]{0,320}$/;

const rolesOf = (text) => {
  const lits = stringsOf(text, 'html');
  const out = [];
  for (const l of lits) {
    let role = '';
    if (l.inTag) {
      /* The value of a tag is a name, unless a reader sees it. */
      const before = text.slice(Math.max(0, l.start - 60), l.start);
      const tag = /<([a-zA-Z][\w-]*)[^<>]*$/.exec(before);
      const name = tag ? tag[1].toLowerCase() : '';
      if (!READS.includes(name)) role = 'mark';
    } else {
      const after = text.slice(l.end);
      const next = /^\s*(.)/.exec(after);
      const mark = next ? next[1] : '';
      const before = text.slice(Math.max(0, l.start - 6), l.start);
      if (mark === ':' && !/[?]$/.test(before)) role = 'key';
      else if (/\[\s*['"`]?\s*$/.test(before)) role = 'index';
      else if (/[,(]\s*['"`]?\s*$/.test(before) && /^[),]/.test(mark)) role = 'call';
      else if (/\b(?:import|export|require)\b[^;]*$/i.test(text.slice(Math.max(0, l.start - 120), l.start))) {
        /* The name of a part that is brought in is not wording. */
        role = 'key';
      }
      else if (/^(?:===|!==|==|!=)/.test(text.slice(l.end).replace(/^\s+/, ''))) {
        /* A word the program compares with another word is a name. */
        role = 'name';
      }
      else if (/\bcase\s+$/.test(text.slice(Math.max(0, l.start - 12), l.start))) {
        role = 'name';
      }
      else if (readsOf(text, l.start)) role = 'reads';
    }
    out.push({ ...l, role });
  }
  return out;
};

/*
 * The places where a lesson keeps its program.
 *
 * A program is not wording.  It is read apart from the page, for a
 * sign of less in a program is not a sign of less in a sentence.
 */
const programRegionsOf = (text) => {
  const out = [];
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '<') {
      i++;
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      i = close < 0 ? text.length : close + 3;
      continue;
    }
    let name = '';
    if (lower.startsWith('<script', i)) name = 'script';
    else if (lower.startsWith('<style', i)) name = 'style';
    else if (lower.startsWith('<textarea', i)) name = 'textarea';
    if (!name) {
      i++;
      continue;
    }
    const open = text.indexOf('>', i);
    if (open < 0) break;
    const close = lower.indexOf('</' + name, open);
    const end = close < 0 ? text.length : close;
    out.push({ start: i, end });
    i = end;
  }
  return out;
};

/* The wording that stands between the tags, and nothing else. */
const wordingRunsOf = (text) => {
  const out = [];
  const lower = text.toLowerCase();
  const programs = programRegionsOf(text);
  let i = 0;
  let start = 0;
  while (i < text.length) {
    if (text[i] !== '<') {
      i++;
      continue;
    }
    /* A sign of less inside a program is not the start of a tag. */
    const program = programs.find((r) => i >= r.start && i < r.end);
    if (program) {
      if (program.start > start) out.push({ start, end: program.start });
      i = program.end;
      start = program.end;
      continue;
    }
    if (i > start) out.push({ start, end: i });
    if (text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      i = close < 0 ? text.length : close + 3;
      start = i;
      continue;
    }
    const open = text.indexOf('>', i);
    if (open < 0) break;
    i = open + 1;
    start = i;
  }
  if (start < text.length) out.push({ start, end: text.length });
  return out;
};

/*
 * Where a wording stands inside a longer sentence.
 *
 * It has to stand there once, and it has to be a wording of its own:
 * a word that is only a part of a longer word is a name.
 */
const findPhrase = (text, phrase) => {
  const lastWord = phrase.search(/[A-Za-z0-9_][^A-Za-z0-9_]*$/);
  let at = -1;
  let found = -1;
  let times = 0;
  for (;;) {
    const i = text.indexOf(phrase, at + 1);
    if (i < 0) break;
    at = i;
    const before = i > 0 ? text[i - 1] : ' ';
    const after = text[i + lastWord + 1] ?? ' ';
    if (/[A-Za-z0-9_]/.test(before) || /[A-Za-z0-9_]/.test(after)) continue;
    times++;
    if (times > 1) return -1;
    found = i;
  }
  return times === 1 ? found : -1;
};

/*
 * How a word is written in the lesson as it was before the wording was
 * touched.
 *
 * A word that is written once, as wording, is the one thing it says,
 * and it may be given a Chinese.  A word that is written as a program
 * of its own is a name, and a name is left as it is.
 */
const placesOfReference = (file, words) => {
  const out = new Map();
  for (const w of words) out.set(w, { lits: 0, texts: 0, names: false });
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    for (const box of out.values()) {
      box.lits = 99;
      box.texts = 99;
      box.names = true;
    }
    return out;
  }
  for (const l of rolesOf(text)) {
    const box = out.get(l.value);
    if (!box) continue;
    box.lits++;
    if (l.role && l.role !== 'reads') box.names = true;
  }
  for (const run of wordingRunsOf(text)) {
    const box = out.get(text.slice(run.start, run.end).trim());
    if (!box) continue;
    box.texts++;
  }
  return out;
};

const files = pages(ROOTS);
const fileSet = new Set(files);
const only = arg('only', '');
if (only) {
  const keep = files.filter((f) => f.includes(only));
  files.length = 0;
  files.push(...keep);
}

const lessons = new Set();
for (const f of files) {
  const m = /mirror\/leqixiang\/courseware\/(.+)\.html$/.exec(f);
  if (m) lessons.add(m[1]);
}

/* The lesson each page belongs to, in the library and in the mirrors. */
const lessonByFile = new Map();
for (const lesson of lessons) {
  for (const file of pagesOfLesson(lesson, fileSet)) lessonByFile.set(file, lesson);
}
const lessonOf = (file) => lessonByFile.get(file) || null;

let changed = 0;
let written = 0;
const skipped = [];
const missing = [];
const report = [];
let seen = 0;

/* The lessons the table names, and the lessons it leaves to '*'. */
const namedLessons = new Set(WORDS.map((w) => w.id).filter((id) => id !== '*'));
for (const id of namedLessons) {
  if (!pagesOfLesson(id, fileSet).length) missing.push(`${id}  (no page of this lesson)`);
}

const wordsByText = new Map();
for (const w of WORDS) {
  if (!wordsByText.has(w.from)) wordsByText.set(w.from, []);
  wordsByText.get(w.from).push(w);
}

/* Every page that holds one of the words of the table. */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const anyWord = new RegExp(
  `(?<![\\w$])(?:${[...wordsByText.keys()].map(escapeRe).join('|')})(?![\\w$])`,
  'g'
);

for (const file of files) {
  seen++;
  if (seen % 400 === 0) console.error(`  ${seen} pages read`);
  const text = fs.readFileSync(file, 'utf8');
  anyWord.lastIndex = 0;
  if (!anyWord.test(text)) continue;

  /* The reference that says which words are names. */
  const reference = PRISTINE ? path.join(PRISTINE, file) : '';
  const places = placesOfReference(reference, [...wordsByText.keys()]);

  const lits = rolesOf(text);
  const edits = new Map();
  const addEdit = (start, end, to) => {
    const key = `${start}:${end}`;
    if (!edits.has(key)) edits.set(key, { start, end, to });
  };

  for (const l of lits) {
    const words = wordsByText.get(l.value);
    for (const word of words || []) {
      if (word.id !== '*' && !lessonOf(file)?.startsWith(word.id)) continue;
      /* Only a word that a reader sees may be given a Chinese. */
      if (l.role !== 'reads') continue;
      const where = places.get(word.from);
      /* A word the program looks up by name stays as it is. */
      if (where.names) continue;
      if (l.value === word.from) {
        /* A word that is written many times over is not a wording. */
        if (where.lits > 6) continue;
        /* The quotes are kept, so the word stays a word and not a name. */
        addEdit(l.start + 1, l.end - 1, word.to);
        continue;
      }
      /* A wording that is part of a longer sentence. */
      if (!PARTS.has(word.from)) continue;
      if (!l.template) continue;
      const at = findPhrase(l.value, word.from);
      if (at < 0) continue;
      addEdit(l.start + at, l.start + at + word.from.length, word.to);
    }
  }

  /* The wording that stands between the tags. */
  for (const run of wordingRunsOf(text)) {
    const body = text.slice(run.start, run.end);
    const trimmed = body.trim();
    for (const word of wordsByText.get(trimmed) || []) {
      if (word.id !== '*' && !lessonOf(file)?.startsWith(word.id)) continue;
      const where = places.get(word.from);
      /* A word the program looks up by name stays as it is. */
      if (where.names) continue;
      const start = run.start;
      const lead = body.slice(0, body.indexOf(trimmed));
      addEdit(start + lead.length, start + lead.length + trimmed.length, word.to);
    }
    /* A wording that is part of a longer sentence. */
    for (const word of WORDS) {
      if (word.id !== '*' && !lessonOf(file)?.startsWith(word.id)) continue;
      if (!PARTS.has(word.from)) continue;
      if (body.length > 320) continue;
      if (/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/.test(body)) continue;
      const where = places.get(word.from);
      if (where.names) continue;
      const at = findPhrase(body, word.from);
      if (at < 0) continue;
      addEdit(run.start + at, run.start + at + word.from.length, word.to);
    }
  }

  if (!edits.size) continue;
  changed += edits.size;
  for (const e of edits.values()) {
    const word = WORDS.find((w) => w.to === e.to);
    report.push(`${file}  ${JSON.stringify(word?.from ?? '?')} -> ${JSON.stringify(e.to)}`);
    if (has('why')) {
      console.log(
        `${file} @${e.start}\n  ${JSON.stringify(
          text.slice(Math.max(0, e.start - 70), e.end + 40)
        )}`
      );
    }
  }

  if (!has('fix')) continue;

  let out = text;
  for (const e of [...edits.values()].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.to + out.slice(e.end);
  }
  const check = checkScripts(out);
  if (!check.ok) {
    skipped.push(`${file}  (the script no longer reads)`);
    continue;
  }
  fs.writeFileSync(file, out, 'utf8');
  written++;
}

console.log(
  `\n${has('fix') ? 'put into Chinese' : 'would put into Chinese'} ${changed} places`
);
if (written) console.log(`written: ${written}`);
if (arg('report', '')) {
  fs.writeFileSync(arg('report', ''), report.join('\n'), 'utf8');
  console.log(`the list of places: ${arg('report', '')}`);
}
for (const s of skipped.slice(0, 40)) console.log(`  left alone: ${s}`);
if (skipped.length > 40) console.log(`  ... and ${skipped.length - 40} more`);
for (const m of missing) console.log(`  not found: ${m}`);
