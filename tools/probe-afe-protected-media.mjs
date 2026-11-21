/*
 * 找一找"静态主机的根"能不能绕开启动这一步拿到。
 *
 * 摄像头运行时的作品把素材放在
 *   https://protected-static.aifunengjiaoyu.com/prod/protected-uploads/<站点>/<版本>/package/...
 * 中间那个"版本"每门课都不一样，它写在启动令牌里。这个工具在没有
 * 令牌的地方挨个问一遍，看看有没有别的门能问出它来。
 *
 *   node tools/probe-afe-protected-media.mjs 1412
 */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const PLAY = 'https://play.aifunengjiaoyu.com';
const STATIC = 'https://protected-static.aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();

const id = process.argv[2] || '1412';

const ROUTES = [
  `${PLAY}/api/program-assets/${id}/`,
  `${PLAY}/api/program-assets/${id}/manifest`,
  `${PLAY}/api/program-assets/${id}/package/`,
  `${PLAY}/api/programs/${id}/asset-manifest`,
  `${PLAY}/api/programs/${id}/assets`,
  `${ORIGIN}/api/program-assets/${id}/`,
  `${ORIGIN}/api/programs/${id}/asset-manifest`,
  `${ORIGIN}/api/programs/${id}/revision`,
  `${ORIGIN}/api/programs/${id}/assets`,
  `${ORIGIN}/api/program-file/${id}/manifest`,
  `${STATIC}/prod/protected-uploads/site-20260911-a1/`,
];

for (const url of ROUTES) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: `${ORIGIN}/`,
        Authorization: `Bearer ${TOKEN}`,
      },
      redirect: 'manual',
    });
    const text = await res.text();
    console.log(
      `${res.status}  ${url.replace(ORIGIN, '').replace(PLAY, 'play').replace(STATIC, 'static')}\n      ${JSON.stringify(
        text.replace(/\s+/g, ' ').slice(0, 160)
      )}`
    );
  } catch (e) {
    console.log(`ERR  ${url}  ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}
