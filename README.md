# 乐启享课件库

一个可以完全离线运行的**交互课件库**。

课件正文、封面、贴图、视频、声音全部落在本机，打开就能用：
**看目录 → 在线预览 → 下载**。不需要登录账号，不联网也能跑。

对外品牌是**乐启享**（信息取自 [codebn.cn](https://codebn.cn/)）。

---

## 快速开始

服务端只用 Node 自带模块，不需要 `npm install`。

```powershell
# 起服务（默认 4173 端口）
node server/server.mjs

# 或者用封装好的脚本（后台起 / 重启同一个端口）
powershell -ExecutionPolicy Bypass -File tools\restart-lq.ps1
```

然后打开 <http://localhost:4173/>。

想把课件库放到别的盘，设 `LQ_ROOT` 就行：

```powershell
$env:LQ_ROOT = 'D:\courseware-library'
node server/server.mjs
```

---

## 库里有什么

**1449 门**课件，每一门都真的能打开、能预览、能下载。

| | |
| --- | --- |
| 目录条目 | 2393 条 |
| 本地可玩 | 1449 门 |
| 语言 | 以中文课件为主 |
| 形态 | 3D 仿真、互动实验、物理游戏、课堂演示、精品课、积木编程 |

上架标准只有一条：**点进去能玩**。打不开的、只是练习纸的、跑起来
一片空白的，一律不进目录 —— 质检结论记在
`mirror/leqixiang/quality-decisions.json`，剔掉的课同时从磁盘上清掉。

目录里不区分付费与免费，不做登录、购买、反馈、订单这些入口。站点只有
一条线：看目录、在线预览、下载课件。

---

## 目录结构

| 目录 | 内容 |
| --- | --- |
| `server/` | 本地服务（单文件，Node 自带模块，无依赖） |
| `mirror/leqixiang/` | 合并后的站点：外壳、目录数据、课件正文与素材 |
| `mirror/<各来源>/` | 各来源的镜像与素材，以及 `NOTICE.md` 署名说明 |
| `tools/` | 重建、修补、验收这一整套脚本 |
| `recon/` | 过程中的报告与证据（markdown / json） |

课件正文一律落在 `mirror/leqixiang/courseware/` 下，一门课一个
`<id>.html` 加一个同名 `<id>.assets/` 素材目录。

---

## 常用脚本

### 重建

```powershell
node tools\build-leqixiang.mjs        # 重新生成合并站（约 4 分钟）
node tools\stamp-lq-build.mjs         # 打构建标记，浏览器好认出版本
powershell -ExecutionPolicy Bypass -File tools\restart-lq.ps1
```

> 素材的**源**在 `mirror/<各来源>/courseware/` 下，构建只是把它搬进
> 站点目录。所以补素材要补回源目录，否则下一次重建会把它冲掉。

### 验收

```powershell
# 全库静态体检：每门课各取一次页面、一次下载包
node tools\check-lq-all-courses.mjs --conc 12

# 逐门开真浏览器，看画面、控件、报错
node tools\verify-lq-courses.mjs --all --conc 6 --cdp 9222

# 封面、可见文案、按钮、分类
node tools\check-lq-covers.mjs
node tools\audit-lq-catalog-ui.mjs
node tools\audit-lq-sensitive.mjs
node tools\check-lq-copy.mjs
```

### 修补

```powershell
node tools\repair-lq-assets.mjs        # 按验收报告里的 404 逐个回源
node tools\fetch-lq-missing.mjs        # 补课件引用的公共文件
node tools\sync-lq-ext-back.mjs        # 回写源镜像，重建不丢
node tools\brand-scrub.mjs             # 清掉页面里的第三方角标与统计脚本
node tools\strip-lq-shop-data.mjs      # 去掉目录数据里的付费、试看与退款字段
node tools\quality-gate.mjs --apply    # 按质检结论收课或剔课
node tools\drop-lq-courses.mjs <id>   # 把打不开的课剔出目录
node tools\remove-lq-course-files.mjs <id>   # 连磁盘上的正文与素材一起清掉
node tools\audit-lq-course-externals.mjs     # 有没有课在运行时去请求别家服务器
```

---

## 许可与署名

课件内容来自公开发布的课件与开放许可的开源课堂，本项目做的是**整理、
本地化与再创作**。

每一份素材的来源、许可与署名，逐条写在对应来源目录下的 `NOTICE.md`
里，目录数据的 `author` / `license` / `sourceUrl` 字段也记着同样的信息。
请一并保留这些说明。

仓库里出现的第三方开源项目，其许可随 `NOTICE.md` 与各项目自带的许可
文件执行。

---

## 一点说明

- 站点外壳、目录、筛选、详情页、预览播放器、下载打包，全部是本项目
  自己写的，没有直接搬运别人的前端。
- 预览走的是本地服务：课件正文按需打包后传输，目录分批渲染，静态
  资源带 ETag，所以离线机器上也不会卡。
- 课件里的付费字样、会员字样、别家角标与统计脚本都已经摘掉；页面
  上不出现别的品牌名。
