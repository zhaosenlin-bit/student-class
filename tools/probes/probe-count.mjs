import { readFileSync } from 'node:fs';
const s = readFileSync('mirror/xbjiaoyu/assets/download-store.js', 'utf8');
for (const t of [
  '保存到教学电脑，用浏览器打开文件',
  '无需下载即可体验',
  '${warning()}',
  '手机可管理资源和购买',
  '<aside class="download-panel">',
]) {
  let n = 0;
  let i = 0;
  while ((i = s.indexOf(t, i)) >= 0) {
    n++;
    i += t.length;
  }
  console.log(JSON.stringify(t), n);
}
