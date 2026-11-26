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
node tools/export-static.mjs --out dist
```

把 `dist/` 整个目录放到网站目录下即可，例如 `https://codebn.cn/leqixiang/`。
目录里所有地址都是相对的，放在任意路径、任意域名下都能打开。

## 目录

| 目录 | 内容 |
| --- | --- |
| `server/` | 本地服务（单文件，无依赖） |
| `mirror/` | 课件正文、素材与目录数据 |
| `tools/` | 重建、修补、验收脚本 |
| `receipts/` | 最近一次全库验收的记录 |

## 验收

```powershell
node tools\check-lq-all-courses.mjs --conc 12   # 本地服务：逐门预览 + 下载
node tools\check-static-site.mjs --base http://127.0.0.1:4180/leqixiang --cdp 9333
```

## 说明

课件由本项目**整理、再创作**而成，整理完成的作品公开给大家使用。
品牌为乐启享（[codebn.cn](https://codebn.cn/)）。

每一份素材的来源、许可与署名，逐条写在对应来源目录下的 `NOTICE.md` 里，
目录数据的 `author` / `license` / `sourceUrl` 字段也记着同样的信息。
仓库根目录的 [NOTICE.md](NOTICE.md) 写明了哪一部分适用 MIT 许可、
哪一部分沿用原作者的许可。请一并保留这些说明。

页面上的《许可与署名》列出了完整的来源清单。
