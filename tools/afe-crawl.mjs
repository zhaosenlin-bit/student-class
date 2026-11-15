/*
 * 把课件正文里引用的素材爬下来 —— 图灵智赋的正文是一张"带租约的网"：
 * <base href="/api/program-assets/<id>/t/<签名>"> 之后是几十上百个相对
 * 路径的 js / css / 贴图 / 模型。租约只有一两个小时，所以正文一到手就得
 * 顺着引用链把整个目录抓完。
 *
 * 这个模块给两条通道共用：
 *   - pull-afe-bulk.mjs     整包令牌通道（普通作品）
 *   - pull-afe-premium.mjs  精品课试看通道（launch token）
 */
import fs from 'node:fs';
import path from 'node:path';

const FILE_EXT =
  /\.(?:js|mjs|css|html?|png|jpe?g|gif|svg|webp|avif|glb|gltf|bin|mp3|mp4|wav|ogg|m4a|woff2?|ttf|otf|eot|json|txt|wasm|ktx2?|basis)(?:\?|$)/i;

/* 正文尾部带一段 JSON 协议配置，里面写着素材根目录和入口清单。 */
export const configOf = (html) => {
  const i = html.indexOf('})({"protocol"');
  if (i < 0) return null;
  const rest = html.slice(i + 3);
  let depth = 0;
  for (let k = 0; k < rest.length; k++) {
    const c = rest[k];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(rest.slice(0, k + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

export const assetRootOf = (html) => {
  const base = html.match(/<base[^>]*href="([^"]+)"/i);
  if (base) return base[1];
  const cfg = configOf(html);
  return cfg?.assetRoot || null;
};

/* 把正文里所有"看着像资源路径"的字符串挖出来。 */
export const refsOf = (text) => {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    let ref = raw.split('?')[0].split('#')[0];
    if (!ref) return;
    if (/^https?:\/\//i.test(ref)) {
      if (FILE_EXT.test(ref)) out.add(ref);
      return;
    }
    if (/^\/\//.test(ref)) return;
    if (ref.startsWith('data:') || ref.startsWith('mailto:')) return;
    if (!FILE_EXT.test(ref)) return;
    out.add(ref);
  };
  for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of text.matchAll(/\bimport\s*(?:[^'"]*?\bfrom\s*)?["']([^"']+)["']/g)) add(m[1]);
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(m[1]);
  for (const m of text.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) add(m[1]);
  for (const m of text.matchAll(/["'](\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["']/g)) add(m[1]);
  for (const m of text.matchAll(
    /["'`]([A-Za-z0-9_\-]+\.(?:png|jpe?g|gif|svg|webp|avif|glb|gltf|mp3|mp4|wav|ogg|m4a|json|js|mjs|css|wasm|bin|woff2?|ttf))["'`]/g
  ))
    add(m[1]);
  for (const m of text.matchAll(/["'](\/api\/program-assets\/[A-Za-z0-9_\-./]*)/g)) out.add(m[1]);
  return out;
};

/*
 * 顺着引用链把素材抓全。
 *
 *   origin        站点根
 *   cwDir         正文目录（<id>.html 与 <id>.assets\ 落在这里）
 *   id            作品号
 *   html          正文
 *   fetchBuffer   (url) => Buffer|null，调用方决定带什么凭证
 */
export async function crawlAssets({ origin, cwDir, id, html, fetchBuffer }) {
  const outDir = path.join(cwDir, `${id}.assets`);
  const assetRoot = assetRootOf(html);
  if (!assetRoot) return { files: 0, missing: 0 };

  const cfg = configOf(html);
  const seeds = cfg?.entries || [];
  const importMap = (() => {
    const m = html.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!m) return {};
    try {
      return JSON.parse(m[1]).imports || {};
    } catch {
      return {};
    }
  })();

  const queue = [];
  const seen = new Set();
  const push = (rel) => {
    if (!rel || seen.has(rel)) return;
    seen.add(rel);
    queue.push(rel);
  };
  for (const e of seeds) push(e);
  for (const r of refsOf(html)) {
    if (/^https?:\/\//i.test(r)) push(r);
    else if (r.startsWith(assetRoot)) push(decodeURIComponent(r.slice(assetRoot.length)));
    else if (r.startsWith('/api/program-assets/')) push(r.replace(/^\/+/, ''));
    else push(r.replace(/^\/+/, ''));
  }
  for (const m of html.matchAll(/from\s*["']([^"']+)["']/g)) {
    const spec = m[1];
    if (/^https?:/i.test(spec) || spec.startsWith('/') || spec.startsWith('.')) continue;
    if (importMap[spec]) push(importMap[spec]);
    else {
      for (const [key, value] of Object.entries(importMap)) {
        if (key.endsWith('/') && spec.startsWith(key)) {
          push(value + spec.slice(key.length));
          break;
        }
      }
    }
  }

  let files = 0;
  let missing = 0;
  while (queue.length) {
    const raw = queue.shift();
    const isExt = /^https?:\/\//i.test(raw);
    const rel = isExt
      ? '_ext/' + new URL(raw).host + new URL(raw).pathname
      : decodeURIComponent(raw);
    const target = path.join(outDir, rel);
    const url = isExt
      ? raw
      : rel.startsWith('api/program-assets/')
        ? origin + '/' + rel
        : origin + assetRoot + rel;
    let buf = null;
    try {
      buf =
        fs.existsSync(target) && fs.statSync(target).size > 0
          ? fs.readFileSync(target)
          : await fetchBuffer(url);
    } catch {
      buf = null;
    }
    if (!buf) {
      missing++;
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, buf);
    files++;
    if (/\.(js|mjs|css|html?|json)($|\?)/i.test(rel) && !isExt) {
      const text = buf.toString('utf8');
      for (const r of refsOf(text)) {
        if (r.startsWith(assetRoot)) push(decodeURIComponent(r.slice(assetRoot.length)));
        else if (r.startsWith('/api/program-assets/')) push(r.replace(/^\/+/, ''));
        else if (/^https?:\/\//i.test(r)) push(r);
        else {
          const dir = path.posix.dirname(rel);
          push(path.posix.normalize(path.posix.join(dir, r)));
        }
      }
    }
  }
  return { files, missing };
}

