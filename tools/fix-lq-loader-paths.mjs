#!/usr/bin/env node
/*
 * 三维课里那些「贴图名」被改成了完整地址，结果贴图反而取不到。
 *
 * 这类课自己有一个装载路径，比如
 *   .../examples/textures/cube/Bridge2/
 * 贴图只写名字（posx.jpg），由装载器自己接在路径后面。
 * 早先补资源的时候，把名字改成了完整的本机地址，装载器再接一次，
 * 就成了「路径/路径/posx.jpg」这样的怪地址，于是每一张贴图都裂。
 *
 * 这里把这样的名字还原回去，路径由课自己接。
 *
 *   node tools/fix-lq-loader-paths.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/leqixiang/courseware';
const SHARED = 'mirror/leqixiang/_shared-ext';

/*
 * 课里那种装载路径，和它下面真正存着的贴图。目录是照着共享库里实际
 * 存着的那些数出来的 —— 多一个少一个，这里就会漏掉一批课。
 */
const CUBE_DIR = path.join(SHARED, 'threejs.org', 'examples', 'textures', 'cube');
const LOADER_DIRS = (() => {
  try {
    return fs
      .readdirSync(CUBE_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => 'threejs.org/examples/textures/cube/' + e.name);
  } catch {
    return [];
  }
})();

let fixed = 0;
let files = 0;

for (const name of fs.readdirSync(CW)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(CW, name);
  const id = name.replace(/\.html$/, '');
  let text = fs.readFileSync(file, 'utf8');
  const before = text;

  for (const dir of LOADER_DIRS) {
    const loaderMark = '/_ext/' + dir + '/';
    if (!text.includes(loaderMark)) continue;
    /* 课里被改成了完整地址的贴图名。 */
    const re = new RegExp(
      '(/api/program-assets/' +
        id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '/_ext/vendor/(?:Phyc140|Phyc240|vendor)/)([A-Za-z0-9_.-]+\\.(?:jpg|png|jpeg|webp))',
      'g'
    );
    text = text.replace(re, (m, prefix, base) => {
      const real = path.join(SHARED, dir, base);
      if (!fs.existsSync(real)) return m;
      fixed++;
      return base;
    });
  }

  if (text !== before) {
    fs.writeFileSync(file, text);
    files++;
    console.log('* 改了 ' + id);
  }
}

console.log('\n改了 ' + files + ' 门，共 ' + fixed + ' 处');
