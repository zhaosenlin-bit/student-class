/*
 * 把正文里那段"只允许在授权平台运行"的守门代码整段打印出来，
 * 好看清它到底拦了什么、改的时候该改成什么样。
 *
 *   node tools/dump-afe-host-guard.mjs mirror/leqixiang/courseware/afe-1393.html
 */
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.log('用法：node tools/dump-afe-host-guard.mjs <正文文件>');
  process.exit(0);
}
const text = fs.readFileSync(file, 'utf8');
const at = text.indexOf('location.hostname');
if (at < 0) {
  console.log('这段正文里没有域名守门');
  process.exit(0);
}
console.log(text.slice(Math.max(0, at - 700), at + 900));
console.log('\n===== 守门之后 =====\n');
console.log(text.slice(at + 900, at + 2200));
