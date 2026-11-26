# 乐启享课件库

一个**交互课件库**，收录 1450 门课件。课件正文、封面与素材全部落在本机，
打开就能用：**看目录 → 在线预览 → 下载**。不需要登录，不收费。

## 本地运行

只用 Node 自带模块，不需要 `npm install`：

```powershell
node server/server.mjs
```

打开 <http://localhost:4173/>。

## 部署到网站

课件库是**纯静态**的：没有后端、没有数据库、没有登录，写成文件夹就能直接
挂在任意域名下。

```powershell
node tools/export-static.mjs --out dist --slim
```

`--slim` 会把各门课件里重复的那份素材收进 `dist/shared/`，只留一份。
1450 门课件原本 7.1 GB，收拢之后 3.7 GB，课件照旧能打开、能下载——
验收全库 1450 门全部通过，页面不往外发一个请求。

把 `dist/` 整个目录放到网站目录下即可，例如 `https://codebn.cn/leqixiang/`。
目录里所有地址都是相对的，放在任意路径、任意域名下都能打开。

### 放到对象存储上

课件库有点大，放在自己的服务器上不划算。传到对象存储更合适——
课件资源放在账号下**自己的前缀** `leqixiang-courseware/` 里，
和同一个账号下别的系统的资源各走各的，互不掺和：

```powershell
node tools/upload-oss.mjs --root dist --prefix leqixiang-courseware --clean
```

桶名、区域和账号写在 `work/oss.txt`（不进仓库）或者环境变量里，
命令行不用再写。桶要设成「公共读」，别人才能直接打开。
`--clean` 会把前缀下多出来的旧文件清掉，让桶里的东西和 `dist/` 完全一致。

服务器上不占地方，只是把请求转过去，写法见 `deploy/nginx-oss.conf`。
转发的时候要去掉一个头：

```nginx
proxy_hide_header Content-Disposition;
proxy_hide_header x-oss-force-download;
```

桶上开了「强制下载」，回来的每个对象都带着 `Content-Disposition: attachment`，
浏览器会把它当文件下载，而不是打开成网页——网页就白费了。课件自己的
「下载」按钮不受影响：那一份是在浏览器里打包的。

想照着线上的样子在本地看，就起这个：

```powershell
node tools\serve-oss.mjs --prefix leqixiang-courseware --mount /leqixiang --port 4181
```

## 目录

| 目录 | 内容 |
| --- | --- |
| `server/` | 本地服务（单文件，无依赖） |
| `tools/` | 重建、修补、验收脚本 |
| `deploy/` | 上线用的转发配置 |
| `receipts/` | 最近一次全库验收的记录 |

课件正文、素材与目录数据放在 `mirror/`：它是出包用的素材，不进仓库，
也不在 GitHub 上。成品是 `dist/`，成品里的资源在对象存储上。

## 验收

```powershell
node tools\check-lq-all-courses.mjs --conc 12   # 本地服务：逐门预览 + 下载
node tools\check-static-site.mjs --base http://127.0.0.1:4180 --cdp 9333
```

放到对象存储上以后，把地址换成对象存储的那个，一样逐门走查：

```powershell
node tools\check-static-site.mjs --base https://<桶名>.oss-cn-hangzhou.aliyuncs.com/leqixiang-courseware --cdp 9333
node tools\check-oss-mirror.mjs --root dist --prefix leqixiang-courseware   # 桶里的文件和本地逐一对照
```

## 说明

课件由本项目**整理、再创作**而成，整理完成的作品公开给大家使用。
品牌为乐启享（[codebn.cn](https://codebn.cn/)）。

每一份素材的来源、许可与署名，逐条写在对应来源目录下的 `NOTICE.md` 里，
目录数据的 `author` / `license` / `sourceUrl` 字段也记着同样的信息。
仓库根目录的 [NOTICE.md](NOTICE.md) 写明了哪一部分适用 MIT 许可、
哪一部分沿用原作者的许可。请一并保留这些说明。

页面上的《许可与署名》列出了完整的来源清单。
