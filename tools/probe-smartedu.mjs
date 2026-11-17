/* Probe the national smart-education platform for open resource modules. */
import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const get = async (url, extra = {}) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 20000);
  try {
    const r = await fetch(url, {
      signal: c.signal,
      headers: { 'User-Agent': UA, referer: 'https://basic.smartedu.cn/', ...extra },
    });
    const text = await r.text();
    return { status: r.status, text, headers: r.headers };
  } catch (e) {
    return { status: 0, text: '', error: e.message };
  } finally {
    clearTimeout(t);
  }
};

const mode = process.argv[2] || 'shell';

if (mode === 'shell') {
  const r = await get('https://basic.smartedu.cn/');
  console.log('root', r.status, r.text.length);
  const scripts = [...r.text.matchAll(/src=["']([^"']+\.js)["']/g)].map((m) => m[1]);
  const links = [...r.text.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]);
  console.log('scripts:\n' + scripts.join('\n'));
  console.log('links:\n' + links.join('\n'));
  fs.writeFileSync('recon/scratch/smartedu-root.html', r.text);
} else if (mode === 'bundle') {
  /* grep a downloaded bundle for API paths */
  const file = process.argv[3];
  const text = fs.readFileSync(file, 'utf8');
  const hits = new Set();
  const urlRe = new RegExp('["\'`](https?://[^"\'`\\\\ ]{10,120})["\'`]', 'g');
  const pathRe = new RegExp(
    '["\'`](/[a-z0-9_-]*(?:ndrs|ndrv2|api|resources)[a-z0-9_\\-/.]*)["\'`]',
    'gi'
  );
  for (const m of text.matchAll(urlRe)) {
    if (/cbern|smartedu|ykt/.test(m[1])) hits.add(m[1]);
  }
  for (const m of text.matchAll(pathRe)) {
    hits.add(m[1]);
  }
  console.log([...hits].sort().join('\n'));
} else if (mode === 'modules') {
  const names = [
    'tch_material', 'tch_courseware', 'tch_resource', 'tch_resources',
    'courseware', 'interactive', 'assets', 'ndrs', 'resources',
    'tch_lesson', 'lesson', 'esp', 'lab', 'experiment',
    'coursewares', 'lesson_plandesign', 'learning_task', 'after_class_exercise',
    'exam_paper_set', 'homework_exercise', 'examinationpapers',
    'classroom_record', 'assets_teaching', 'assets_url', 'assets_video',
    'assets_document', 'micro_lesson_video', 'experiment_video',
  ];
  const roots = [
    'https://s-file-1.ykt.cbern.com.cn/zxx/ndrs/resources/',
    'https://s-file-2.ykt.cbern.com.cn/zxx/ndrs/resources/',
    'https://s-file-1.ykt.cbern.com.cn/zxx/ndrv2/resources/',
    'https://s-file-1.ykt.cbern.com.cn/zxx/ndrv2/',
    'https://s-file-1.ykt.cbern.com.cn/zxx/ndrs/',
  ];
  for (const root of roots) {
    for (const n of names) {
      const u = `${root}${n}/version/data_version.json`;
      const r = await get(u);
      if (r.status === 200) console.log('OK', u, r.text.slice(0, 300));
    }
  }
  for (const u of [
    'https://s-file-1.ykt.cbern.com.cn/zxx/ndrs/experiment/teachingmaterials/version/data_version.json',
    'https://s-file-1.ykt.cbern.com.cn/zxx/ndrs/national_lesson/teachingmaterials/version/data_version.json',
    'https://s-file-1.ykt.cbern.com.cn/zxx/ndrs/prepare_lesson/teachingmaterials/parts.json',
    'https://api.ykt.cbern.com.cn/zxx/resources/list.json',
  ]) {
    const r = await get(u);
    console.log('extra', u, r.status, r.text.slice(0, 300));
  }
  /* the resource kinds live in their own modules under ndrs */
  const kinds = [
    'coursewares', 'courseware', 'assets', 'assets_url', 'assets_video',
    'assets_document', 'lesson_plandesign', 'learning_task',
    'after_class_exercise', 'homework_exercise', 'exam_paper_set',
    'examinationpapers', 'classroom_record', 'micro_lesson_video',
    'experiment_video', 'question', 'questions', 'article', 'special_edu',
    'thematic_course', 'quality_course', 'evaluation', 'practice',
  ];
  for (const k of kinds) {
    for (const base of [
      'https://s-file-1.ykt.cbern.com.cn/zxx/ndrs/',
      'https://s-file-2.ykt.cbern.com.cn/zxx/ndrs/',
    ]) {
      const u = `${base}${k}/teachingmaterials/version/data_version.json`;
      const r = await get(u);
      if (r.status === 200) console.log('KIND', u, r.text.slice(0, 400));
    }
  }
  console.log('done');
}
