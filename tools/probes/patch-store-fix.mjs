/*
 * 卡片状态那一串是嵌套三元，替换时要整段换，不能只换其中一段，
 * 否则会多出一个冒号把整行变成语法错误。
 */
import fs from 'node:fs';
const p='tools/build-leqixiang.mjs';
let s=fs.readFileSync(p,'utf8');

const OLD = `  /* The card in the catalogue carries the same wording. */
  js = js.replace(
    "const state=p.mode==='free'?'免费下载'",
    "const state=p.downloadable===false?'本地未收录':p.mode==='free'?'免费下载':p.localInstalled?'本地可用':'待补齐'"
  );`;
if(!s.includes(OLD)){ console.error('old block missed'); process.exit(1); }

const OLD_FULL = "const state=p.mode==='free'?'免费下载':integrated(p)?unavailable(p)?'暂未开放':p.downloadReason==='count'?trial(p)?'尝鲜卡可选':'次卡可选':p.canDownload?'已解锁':'选择下载卡':p.mode==='free'?'免费下载':p.downloadReason==='count'?'可选资源':p.canDownload?'已解锁':'下载资源';";
const NEW_FULL = "const state=p.downloadable===false?'本地未收录':p.mode==='free'?'免费下载':p.localInstalled?'本地可用':integrated(p)?unavailable(p)?'暂未开放':p.downloadReason==='count'?trial(p)?'尝鲜卡可选':'次卡可选':p.canDownload?'已解锁':'选择下载卡':p.mode==='free'?'免费下载':p.downloadReason==='count'?'可选资源':p.canDownload?'已解锁':'下载资源';";

const NEW = `  /* The card in the catalogue carries the same wording. */
  js = js.replace(
    ${JSON.stringify(OLD_FULL)},
    ${JSON.stringify(NEW_FULL)}
  );`;

s = s.replace(OLD, NEW);
s = s.replace(
  `    "const state=p.downloadable===false?'暂未开放'"],`,
  `    "const state=p.downloadable===false?'本地未收录'"],`
);
fs.writeFileSync(p,s);
console.log('fixed');
