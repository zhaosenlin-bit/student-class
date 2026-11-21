/*
 * 把正文素材里"拼出来的"媒体路径找出来。
 *
 * 这批英语情景课的画面不是写在正文里的，而是运行的时候拼出来的：
 *   'assets/video/' + scene.scene + '-idle.mp4'
 * 静态爬虫看不见这种地址，所以要把数据里的场景表和音频表读出来，
 * 按同样的规矩把文件名补齐。
 *
 *   node tools/dump-afe-media-paths.mjs mirror/aifunengjiaoyu/courseware/1394
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.log('用法：node tools/dump-afe-media-paths.mjs <素材目录>');
  process.exit(0);
}

const files = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
for (const f of files) {
  if (!f.isFile() || !/\.(?:js|mjs|json)$/i.test(f.name)) continue;
  const full = path.join(f.parentPath || f.path, f.name);
  const text = fs.readFileSync(full, 'utf8');
  const hits = [...text.matchAll(/['"`]([^'"`]*assets\/[^'"`]*)['"`]/g)].map((m) => m[1]);
  const dyn = [...text.matchAll(/['"`]([^'"`]*\/)\s*\+\s*[A-Za-z_$][\w.$]*\s*\+\s*['"`]([^'"`]*)['"`]/g)].map(
    (m) => `${m[1]}<值>${m[2]}`
  );
  if (!hits.length && !dyn.length) continue;
  console.log(`\n== ${path.relative(dir, full)}`);
  for (const h of [...new Set(hits)]) console.log('   静态', h);
  for (const d of [...new Set(dyn)]) console.log('   动态', d);
}

/* The data files hold the names that fill those holes. */
for (const f of files) {
  if (!f.isFile() || !/\.(?:js|mjs)$/i.test(f.name)) continue;
  const full = path.join(f.parentPath || f.path, f.name);
  const text = fs.readFileSync(full, 'utf8');
  if (!/scenes\s*:\s*\[/.test(text) && !/audios\s*:\s*\[/.test(text)) continue;
  const scenes = [...text.matchAll(/\bscene\s*:\s*'([^']+)'/g)].map((m) => m[1]);
  const clips = [...text.matchAll(/\bclip\s*:\s*'([^']+)'/g)].map((m) => m[1]);
  const audios = [...text.matchAll(/\baudio\s*:\s*'([^']+)'/g)].map((m) => m[1]);
  console.log(`\n== 数据 ${path.relative(dir, full)}`);
  console.log('   场景', [...new Set(scenes)].join(' '));
  console.log('   片段', [...new Set(clips)].join(' '));
  console.log('   音频', [...new Set(audios)].join(' '));
  const audioRows = [...text.matchAll(/audios\s*:\s*\[([\s\S]{0,1200})\]/g)];
  if (audioRows.length) console.log('   音频表', audioRows[0][1].replace(/\s+/g, ' ').slice(0, 400));
}
