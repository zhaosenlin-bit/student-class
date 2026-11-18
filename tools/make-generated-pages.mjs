#!/usr/bin/env node
/*
 * 把缺掉的那一页补出来。
 *
 * 「分省地形」这一门课的目录里列了澳门，澳门的地形数据也在本地，
 * 只是那一页本身没有拉下来，所以点进去是空的。这里照着同一套模板
 * 把澳门这一页写出来，再把各页里指向澳门的那条地址修正。
 *
 *   node tools/make-generated-pages.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['mirror/leqixiang/courseware', 'mirror/aifunengjiaoyu/courseware'];

/*
 * 「分省地形」每一页都请了一个 _chapter_locks.js，那个文件本地没有，
 * 于是每一页都报一次 404。这门课的地方都在本地，没有哪一节是锁着的，
 * 所以这里照着别的课已经有的那一份，写一个全部解锁的版本。
 */
const LOCK_STYLE = `[data-reviewed-locked]{position:relative;cursor:pointer}[data-reviewed-locked] img{filter:brightness(.45)}[data-reviewed-locked] h4::before{content:'🔒 ';font-size:.85em}[data-reviewed-locked]>.reviewed-picture-lock{position:absolute;top:34px;left:50%;transform:translateX(-50%);z-index:2;border:1px solid #d6b777;border-radius:50%;padding:12px;background:#211d17e8;color:#edcf94;font-size:28px;pointer-events:none}.reviewed-lock-dialog{max-width:520px;padding:32px;border:1px solid #b29257;border-radius:18px;background:radial-gradient(ellipse at top,#403529,#191b1b);color:#f5ead4;text-align:center;font:16px/1.8 system-ui}.reviewed-lock-dialog::backdrop{background:#071014a8}.reviewed-lock-dialog h2{font-size:24px}.reviewed-lock-dialog button{padding:10px 24px;border:1px solid #d3b578;border-radius:9px;background:#e5c98f;color:#282119;font:inherit;cursor:pointer}.reviewed-lock-dialog button:focus-visible{outline:3px solid white;outline-offset:3px}`;

const lockScript = (config) =>
  `/* 本地库里的每一节都收全了，这里没有锁住的章节。 */\n` +
  `(function installLocks(config){\n` +
  ` const locked=new Map((config.entries||[]).filter(e=>e.locked).map(e=>[e.id,e]));\n` +
  ` const style=document.createElement('style');style.textContent=${JSON.stringify(LOCK_STYLE)};document.head.append(style);\n` +
  ` if(!locked.size)return;\n` +
  ` const message='本作品的后续章节暂未收录到本地库。';\n` +
  ` let modal;\n` +
  ` function show(){if(!modal){modal=document.createElement('dialog');modal.className='reviewed-lock-dialog';modal.setAttribute('aria-label','后续章节未收录');const title=document.createElement('h2');title.textContent='🔒 后续章节未收录';const text=document.createElement('p');text.textContent=message;const button=document.createElement('button');button.type='button';button.textContent='知道了';button.onclick=()=>modal.close();modal.append(title,text,button);document.body.append(modal);}if(!modal.open)modal.showModal();}\n` +
  ` document.addEventListener('click',event=>{const node=event.target.closest?.('[data-reviewed-locked]');if(!node)return;event.preventDefault();show();},true);\n` +
  `})(${JSON.stringify(config)});\n`;

const SAMPLE = 'province-terrain-samples/hongkong.html';
const TARGET = 'province-terrain-samples/macau.html';

/* 香港那一页和澳门那一页只差这些地方。 */
const swaps = [
  [
    '<title>香港 · 立体地形课堂</title>',
    '<title>澳门 · 立体地形课堂</title>',
  ],
  [
    '<h1 id="sceneTitle">香港 · 立体地形课堂</h1>',
    '<h1 id="sceneTitle">澳门 · 立体地形课堂</h1>',
  ],
  ['<summary>香港 · 分省地图', '<summary>澳门 · 分省地图'],
  [
    'data-region-search="香港hongkong香港特别行政区xianggang" aria-current="page">香港</a>',
    'data-region-search="香港hongkong香港特别行政区xianggang">香港</a>',
  ],
  [
    'href="/api/program-assets/1360/macau.html" data-region-search="澳门macau澳门特别行政区aomen">澳门</a>',
    'href="/api/program-assets/1360/province-terrain-samples/macau.html" ' +
      'data-region-search="澳门macau澳门特别行政区aomen" aria-current="page">澳门</a>',
  ],
  ['旋转山河，走进香港', '旋转山河，走进澳门'],
  [
    '<span>当前地区</span><strong>香港</strong>',
    '<span>当前地区</span><strong>澳门</strong>',
  ],
  [
    '<button data-region="gorge">大帽山及周边 ↗</button>',
    '<button data-region="gorge">路环丘陵 ↗</button>',
  ],
  ['区域观察 / 香港', '区域观察 / 澳门'],
  [
    '<h2 id="question">山地、海湾与有限的低地</h2>',
    '<h2 id="question">低地之间的花岗岩丘陵</h2>',
  ],
  [
    '<p id="prompt">香港山地丘陵较多，低地在山间和沿海分布。小区域可从较低教学倍数观察山体。</p>',
    '<p id="prompt">澳门以低平地形为主，也有零星丘陵。路环丘陵在小范围内有明显的相对高度；' +
      '城市和填海岸线会随资料年代变化。</p>',
  ],
  ['<body>', '<body data-course-adapter-state="initializing">'],
];

/* 各页里指向澳门的那条地址少了半截，点了会跳到空处。 */
const linkFix = [
  [
    'href="/api/program-assets/1360/macau.html"',
    'href="/api/program-assets/1360/province-terrain-samples/macau.html"',
  ],
];

const apply = (text, table) => {
  let out = text;
  for (const [from, to] of table) out = out.split(from).join(to);
  return out;
};

for (const root of ROOTS) {
  /* 两边目录的名字不一样，用哪一个看谁真的带着分省地形那几页。 */
  let dir = null;
  let sample = null;
  for (const holder of ['afe-1360.assets', '1360.assets']) {
    const candidate = path.join(root, holder, 'province-terrain-samples');
    if (fs.existsSync(path.join(candidate, 'hongkong.html'))) {
      dir = candidate;
      sample = path.join(candidate, 'hongkong.html');
      break;
    }
  }
  if (!sample) {
    console.log('跳过 ' + root + '（没有模板）');
    continue;
  }
  const target = path.join(dir, 'macau.html');
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, apply(fs.readFileSync(sample, 'utf8'), swaps));
    console.log('新写了 ' + target);
  }
  /* 把各页里那条写错的地址改回来。 */
  let fixed = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(dir, name);
    const before = fs.readFileSync(file, 'utf8');
    const after = apply(before, linkFix);
    if (after !== before) {
      fs.writeFileSync(file, after);
      fixed++;
    }
  }
  console.log(root + ' 修正了 ' + fixed + ' 页里的澳门地址');

  /* 把缺的那个 _chapter_locks.js 按本地目录补上。 */
  const runtime = path.join(root, path.basename(path.dirname(dir)), '_course_runtime');
  const adapterFile = path.join(runtime, 'adapter.json');
  const lockFile = path.join(runtime, '..', '_chapter_locks.js');
  if (fs.existsSync(adapterFile) && !fs.existsSync(lockFile)) {
    const adapter = JSON.parse(fs.readFileSync(adapterFile, 'utf8'));
    const entries = (adapter.entries || []).map((e) => ({
      id: e.id,
      title: e.title || e.id,
      path: e.path,
      aliases: e.aliases || [],
      locked: false,
    }));
    fs.writeFileSync(
      lockFile,
      lockScript({
        adapter: 'shanhe-terrain-v1',
        entries,
        prefix: `/api/program-assets/${path.basename(path.dirname(dir)).replace(/^afe-/, '')}/`,
        eventEntries: {},
      })
    );
    console.log('补上了 ' + lockFile);
  }
}
