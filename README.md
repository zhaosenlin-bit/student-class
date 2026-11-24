# 乐启享课件库

一个可以完全离线运行的**交互课件库**，收录 1450 门课件。课件正文、封面与
素材全部落在本机，打开就能用：**看目录 → 在线预览 → 下载**。不需要登录，
不收费，断网也能跑。

## 快速开始

服务端只用 Node 自带模块，不需要 `npm install`。

```powershell
node server/server.mjs
```

打开 <http://localhost:4173/>。把课件库放到别的盘，设 `LQ_ROOT` 即可。

## 目录结构

| 目录 | 内容 |
| --- | --- |
| `server/` | 本地服务（单文件，无依赖） |
| `mirror/leqixiang/` | 站点外壳、目录数据、课件正文与素材 |
| `mirror/` | 各来源的课件与素材 |
| `tools/` | 重建、修补、验收脚本 |
| `receipts/` | 最近一次全库验收的记录 |

课件正文在 `mirror/leqixiang/courseware/` 下，一门课一个 `<id>.html`，
同名 `<id>.assets/` 目录放这一门课的素材。目录数据在
`mirror/leqixiang/catalog.json`，按学段、学科与章节分好类，搜索也走这里。

## 常用命令

```powershell
node tools\check-lq-all-courses.mjs --conc 12   # 全库验收：预览 + 下载
node tools\check-lq-offline-assets.mjs          # 离线素材检查
```

逐门在浏览器里打开，用调试端口连上 Chrome 后再跑：

```powershell
node tools\verify-lq-courses.mjs --cdp 9333 --all
```

## 说明

课件内容来自公开发布的课件与开放许可的开源课堂，本项目做的是**整理、
本地化与再创作**，整理完成的作品公开给大家使用。品牌为乐启享
（[codebn.cn](https://codebn.cn/)）。

每一份素材的来源、许可与署名，逐条写在对应来源目录下的 `NOTICE.md` 里，
目录数据的 `author` / `license` / `sourceUrl` 字段也记着同样的信息。
请一并保留这些说明。

页面上的《许可与署名》列出了完整的来源清单。
