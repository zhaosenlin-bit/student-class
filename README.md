# 乐启享课件库 —— 小白教育 / 图灵智赋 本地离线复刻

把 [xbjiaoyu.com](https://xbjiaoyu.com/#catalog)（小白教育）和
[aifunengjiaoyu.com](https://aifunengjiaoyu.com/)（图灵智赋）两个站点的
前端课件完整镜像到本机，用一个本地 Node 服务顶替它们的商业后端，
让课件、目录、筛选、播放器全部能在浏览器里离线跑起来。

复刻方式不是重画界面，而是**原样托管站点发布的前端代码**，只在它真正
调用的那几十个 API 上做本地替身。界面、路由、交互、3D 场景全部是原件，
所以保真度是 100%。

两个站点已经**合并成一个**：<http://localhost:4173/>，对外的品牌是
**乐启享机器人**（信息取自 [codebn.cn](https://codebn.cn/)）。

现在这一版做完了这几件事：

- **1472 条目录全部并到一处**，图灵智赋的 442 个作品 + 480 门精品课，
  加上小白教育的 550 门，一共 1472 条。
- **页头写 1472、网格是 1471 张卡，这不是少收了一份**：精品课目录按
  套餐列课，programId 889「物理弹珠实验室」同时挂在 `physics-g8`
  （八年级物理）和 `physics-g9`（九年级物理）两个套餐下，于是目录里
  有两行、id 相同。页头按目录行数算，网格按 id 去重 —— 这两段都是
  **原站自己的代码**（页头 `catalog.filter(...).length`，网格
  `browseCatalog` 里的 `new Map(...[p.id,p])`），原站精品课页同样是
  "480 份"配 479 张卡。按学科筛选时这门课在两个套餐下都仍然选得到。
- **523 份课件真的能打开**，逐份开过、逐份截图确认画面不是空白
  （报告在 `recon\scratch\lq-batch-report-final.json`）。
- **登录、反馈、购买、退款、订单这一整套去掉了**，站点只剩"看目录 →
  在线预览 → 下载课件"这一条线；连 `#purchase` / `#purchases` /
  `#admin` / `#creator` / `#teachers` / `#refunds` 这些页面也一并改道，
  合并站（4173）和小白教育分区（4175）整站扫一遍找不到一个"登录"
  "反馈""购买"字样；只剩原站对照页（4174）上那 4 处，那是故意留着没动的
  原站机制。
- **界面按渐进式规则收了一遍**：手机上筛选条和版本条各折成一行，
  课件在详情页里直接内嵌预览，不用来回跳页；目录卡片上直接就是
  「▶ 在线预览」，点一下课件就在那一页展开。
- **坏图、空图、缺素材都收干净了**：线上删掉的 4 张封面用画好的占位图
  顶上，1457 张封面逐张验过，没有一张是空文件或坏图；缺 draco 解码器
  的那门课从同款课件里拷回了两个通用库文件，还缺素材的从 9 门降到 8 门。
- **剩下 949 门是线上付费墙后面的**，补齐要花多少钱、一条命令怎么补，
  写在"剩下那 949 门怎么补齐"一节 —— 没有绕过后门。

---

## 快速开始

```powershell
# 启动本地服务（后台）
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-local-server.ps1
```

| 站点 | 本地地址 | 说明 |
| --- | --- | --- |
| **乐启享合并站** | <http://localhost:4173/> | 小白教育 + 图灵智赋合并，1472 条目录 / 523 份可玩课件（默认入口，本次交付） |
| 小白教育分区 | <http://localhost:4175/> | 同一套干净外壳，只挂小白教育那 550 条目录 / 53 份可玩课件 |
| 图灵智赋原站 | <http://localhost:4174/> | 原站原样留存，留作对照（购买 / 反馈那套机制都还在，没动） |

停止服务：结束 `server.mjs` 对应的 node 进程即可。

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*xiaobai-class\server\server.mjs*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

---

## 乐启享合并站（本次交付）

两个站点合并成**一个**本地站点，品牌换成**乐启享**，只留"看目录 → 在线
使用 → 下载课件"这一条主线，购买 / 试看 / 投稿 / 财务这些机制全部去掉。

| 地址 | 内容 |
| --- | --- |
| <http://localhost:4173/> | **乐启享合并站**（默认入口，小白教育 + 图灵智赋） |
| <http://localhost:4174/> | 图灵智赋原站复刻（原样，留作对照） |
| <http://localhost:4175/> | 小白教育分区（同一套干净外壳，只挂小白那 550 条目录） |

### 里面有什么

| 来源 | 条目 | 能打开的 | 剩下的为什么打不开 | 补齐要花 |
| --- | --- | --- | --- | --- |
| 小白教育 | 550 | 53 | 497 门要买下载卡 | 全科永久版 ¥1017.45（原价 ¥1197，8.5 折）；次卡 ¥98 = 20 额度、尝鲜卡 ¥19.8 = 2 额度、单科年卡 ¥228 / 永久卡 ¥399 |
| 图灵智赋 · 作品 | 442 | 437 | 5 门试看额度用尽（3/3） | 单买 ¥16.6 ~ ¥88，或等站点把额度发回来 |
| 图灵智赋 · 精品课 | 480 | 33 | 447 门要 VIP | VIP 月卡 ¥39（促销价，原价 ¥49）/ 年卡 ¥199 |
| **合计** | **1472** | **523** | 949 门卡在线上付费墙后面 | **约 ¥1056 一次性全部解锁** |

图灵智赋的 442 个作品全部进了目录，正文和素材逐份镜像到本地：3D 长卷
《梦回繁华》、红军长征地图、高考题库、塔罗牌、AI 摄像头手势、物理实验、
历史长卷、化学 3D 模型…… 能打开的 437 份断网也能用。480 门精品课走的是
官方给每门课留的免费体验通道，33 门已经完整落盘（详见下面"精品课"一节）。

页面上的筛选条也照这个口径改成了三档：**全部资源 1472 / 本地可用 523 /
待补齐 949**，每张卡片上写的是"本地可用 / 待补齐"，不是"暂未开放
下载"那种含糊话；具体为什么没收录，写在详情页里。登录入口和"改进建议
与反馈"已经整个去掉。

> 页面上"1472 份课件"是目录条目数，网格里是 1471 张卡片 —— 差的那一张是
> 小白教育自己把同一门课的多个版本（"长度和时间的测量"这类）并成了一张。
> 原站就是这么显示的，这里照搬。

### 523 份逐个开过 —— 运行态体检

目录里有 1472 条，但"能打开"是要真开过才算数。所以用 4 片 Chrome 并行
把这 523 份课件**逐个**走了一遍"进站点 → 点在线使用 → 等课件自己渲染"
的完整路径：

| 项 | 结果 |
| --- | --- |
| 逐份打开 | **523 / 523** |
| 画布真的画出来了 | 523（`canvas` 有尺寸、`body` 有内容） |
| 遮罩层已经撤掉 | 523（小白教育那 53 份会先问一句"这是课堂吗"，遮罩没撤就算没打开） |
| 资源请求 4xx / 5xx | 86 条，全落在下面那 8 门素材不全的课件上，其余 515 门是 0 |
| 失败项 | **0**（最近一次全量跑：523 / 523，用时 22.8 分钟） |

那 86 条 4xx 的分布是：`afe-180` 24 条、`afe-506` 16 条、`afe-196` 11 条、
`afe-501` 10 条、`afe-563` 8 条、`afe-581` 7 条、`afe-469` 4 条、
`afe-616` 1 条，另有 `afe-206` 2 条第三方图片与 `afe-20` 3 个 Vite 分片。
这几门课件本身照样能开能玩（523 份里就有它们），只是画面上少几件素材，
原因见下面"已经打开、但里面还缺几件素材的 8 份"。

```powershell
$env:PATH="C:\kaifa\xiaobai-class\tools\node24\node-v24.22.3-win-x64;$env:PATH"
$env:LQ_REPORT="recon/scratch/lq-batch-report-final.json"
$env:LQ_CDP_PORT="9226"
node tools\verify-lq-batch.mjs        # 批量体检，约 23 分钟
$env:LQ_CDP_PORT="9226"
node tools\probe-lq-shell.mjs <课件id> 26000   # 单份复验
```

> 等待时间要留够：重一点的课件（3D 场景、题库）要 15 秒以上才搭起来，
> 批量跑用 11 秒时 `lens-convex` 会被误判成失败，单独用 26 秒复验就正常。

### 外部依赖也一起搬回了本地

这些课件里有一部分会从公共 CDN 拿库：MediaPipe 的手势识别包、
three.js 的 OrbitControls、MathJax、彩带特效、网页字体。线上没问题，
但本地要"断网也能用"，这些文件就得落到课件自己的目录里。

本地服务把这些域名重写成 `/api/program-assets/<课件>/_ext/<域名>/…`，
然后把文件原样存进对应的 `.assets\_ext\` 下：

| 依赖 | 用途 | 落盘位置 |
| --- | --- | --- |
| three.js / OrbitControls / CSS2DRenderer | 3D 场景与轨道相机 | `_ext\cdn.jsdelivr.net\npm\three@…` |
| @mediapipe/tasks-vision + wasm 引擎 | 手势、AR（afe-10 / afe-11 / afe-657 / afe-658） | `_ext\cdn.jsdelivr.net\npm\@mediapipe\…` |
| MediaPipe 手部模型 | 手势识别模型（7.8 MB） | `_ext\storage.googleapis.com\mediapipe-models\…` |
| MathJax / canvas-confetti | 公式排版、彩带 | `_ext\cdn.jsdelivr.net\npm\…` |
| Google Fonts（JetBrains Mono，107 个分片） | 等宽字体 | `mirror\leqixiang\_shared-ext\fonts.gstatic.com\`（所有课件共用一份） |
| 图小灵 / 飞象老师等第三方脚本与图片 | 页面里的外部小组件 | `_ext\<域名>\…` |
| Google Fonts 样式表本体（25 条查询 / 1598 条 @font-face / 415 个字形） | 字体的声明与下载地址 | `mirror\leqixiang\_shared-ext\fonts.googleapis.com\css2` |
| tailwind / font-awesome / MathJax / three.js 的 `BufferGeometryUtils` | 站级公共依赖 | `mirror\leqixiang\_shared-ext\<域名>\…`（所有课件共用一份） |

补齐用的脚本（可以重复跑，缺什么补什么）：

```powershell
$env:PATH="C:\kaifa\xiaobai-class\tools\node24\node-v24.22.3-win-x64;$env:PATH"
node tools\audit-lq-externals.mjs      # 体检：哪份课件还缺外部文件
node tools\fetch-lq-missing.mjs        # 补齐 CDN 上的库
node tools\fetch-lq-extras.mjs         # 补齐运行时拼出来的地址（MediaPipe 引擎等）
node tools\fetch-lq-fonts.mjs          # 补齐网页字体，并把样式表指向本地
node tools\fetch-shared-ext.mjs        # 扫全部 523 份正文的外部 URL，回源镜像到 _shared-ext
node tools\fetch-fonts-css.mjs         # 原样抄 25 条 Google Fonts 查询，取回 1598 条 @font-face
node tools\sync-lq-ext-back.mjs        # 把补齐的文件回写到两个源镜像，重建不会丢
```

`fetch-shared-ext.mjs` 会把每一份课件正文里提到的外部地址都回源抓一遍
（459 个文件 / 105 MB），落在一个共用的 `_shared-ext\<域名>\` 目录下，
服务端用 `/_shared/<域名>/<路径>` 暴露。这样同一条公共依赖只存一份，
523 份课件一起用。

### 图灵智赋的正文是怎么拿到的

`/api/programs` 列出 442 个作品，但正文有三条不同的通道，每条都单独
处理过：

| 通道 | 适用作品 | 做法 |
| --- | --- | --- |
| 整包令牌 | 绝大多数作品 | `GET /api/programs/<id>/access-token` → `GET /api/program-file/<id>?token=…` 拿到带 `<base href>` 的正文，再顺着引用把整个素材目录爬下来 |
| 摄像头运行时 | AR 手势类（792 / 1266 / 196 / 811） | `POST /api/programs/<id>/camera-launch` → 拿到带签名的 `launchUrl`，跟一次 302 并带上会话 cookie 才拿到正文 |
| 章节型公开课 | 1360 / 842 / 1016 / 841 | `POST /api/reviewed-course-session/<id>/open` 开会话 → `…/mount` 换挂载地址 → 文档只能在浏览器沙箱 frame 里读，素材可以用挂载地址直接下载 |

素材的租约（lease）大约两小时有效，所以正文一到手就立刻把整个目录
爬完落盘，不留后患。

### 品牌信息（取自 codebn.cn）

| 项 | 值 |
| --- | --- |
| 名称 | 乐启享机器人 |
| 标语 | 从乐高启蒙 到 AI 创造 |
| 电话 | 18164173640 / 17371701272 |
| 地址 | 宜昌市猇亭区金岭路 59-1 号 |
| 备案 | 鄂ICP备2025149404号-1 |
| Logo | `mirror/leqixiang/brand/`（来自 codebn.cn） |

站点外壳里能看到的旧站字样已经全部换掉：标题、导航、页脚、Logo、
favicon、"关于"弹窗，以及课件正文里页眉页脚的品牌中文字样（"图灵智赋"
→ 乐启享，"图小灵" → 乐启享助手）。URL 路径和内部协议名
（`turing-long-march-save-v1` 之类）不动 —— 那些是资源引用关系的一部分，
改了反而会把课件弄坏。

```powershell
node tools\rebrand-lq-text.mjs   # 清理课件素材里的旧品牌中文字样
```

复查（结果应该只剩素材路径里的域名，不是可见文案）：

```powershell
rg -n "图灵智赋|图小灵|小白教育" mirror\leqixiang\site mirror\leqixiang\catalog.json
rg -l "图灵智赋|图小灵" mirror\leqixiang\courseware
```

### 本地模式：交易类机制全部关掉

原站那套购买 / 试看计时 / 投稿 / 退款 / 结算，原样保留在 `app.js` 里。
本地版不需要它们，所以加了一层**本地模式守卫**
`mirror/leqixiang/site/lq-mode.js`（源码在 `tools/lq-mode.js`），它比
`app.js` 先加载，做两件事：

1. **路由**：访问 `#purchases` / `#creator` / `#admin` / `#refunds` /
   `#moderation` / `#market` 这类页面时，直接改写回 `#catalog`；
2. **动作**：拦截 `data-action` 里带 `purchase` / `pay` / `checkout` /
   `creator` / `publish` / `refund` 的按钮，弹一句"本地版不提供购买 /
   投稿 / 售后功能"，不让它跳进要付费的流程。

在线使用和下载走的是 `trial` / `download` 动作，不在拦截名单里，照常工作。

```powershell
node tools\wire-lq-mode.mjs      # 给已生成的外壳补上这一行（不必重建）
$env:LQ_CDP_PORT="9226"
node tools\check-lq-mode.mjs      # 验一遍：路由被挡、在线能开、下载能下
```

### 怎么重建

```powershell
$env:PATH="C:\kaifa\xiaobai-class\tools\node24\node-v24.22.3-win-x64;$env:PATH"
node tools\build-leqixiang.mjs      # 重新生成 mirror/leqixiang/
$env:LQ_SITE_ONLY="1"; node tools\build-leqixiang.mjs   # 只重建外壳，不重拷 600 MB 课件
node tools\sync-lq-ext-back.mjs      # （重建前）外部依赖已回写源镜像，这步可省
powershell -ExecutionPolicy Bypass -File tools\restart-server.ps1
```

`build-leqixiang.mjs` 只读两个原镜像，输出到 `mirror/leqixiang/`：
`site/`（换牌后的外壳）、`courseware/`（合并后的全部正文与素材）、
`catalog.json`（合并目录）、`brand/`（logo 与 favicon）。

> 注意：`build-leqixiang.mjs` 会先清空 `mirror/leqixiang/courseware/` 再
> 重新拷贝，所以补齐外部依赖后要跑一次 `sync-lq-ext-back.mjs`，把
> `_ext\` 里的文件回写到 `mirror/aifunengjiaoyu/courseware\` 和
> `mirror/xbjiaoyu/courseware\`，重建才不会把它们冲掉。

### 界面：按渐进式规则收了一遍

线上原站的目录页一进来是**五**个占满整行的版本按钮 + **五十六**个
学科按钮，网格被挤到屏幕第三行以下。现在按"先给最常用的，其余收进
可展开层"重排：

| 位置 | 之前 | 现在 |
| --- | --- | --- |
| 版本（全部 / 三维整合 / 二维整合 / 三维独立 / 二维独立） | 五个 48 px 高的大按钮，占满一行 | 一条 34 px 高的分段条，一行放得下 |
| 学科 | 56 个 56 px 高的大按钮，铺满三行 | 按内容量排前 8 个 42 px 高的小片，剩下 49 个收在「更多学科 49」里，展开状态跨筛选保留 |
| 可用性 | 「全部资源 / 免费下载 / 付费资源」—— 付费资源那档是死的，点开 0 张卡 | 「全部资源 1472 / 本地可用 523 / 待补齐 949」，三档都有真实卡片 |
| 手机上的版本条 | 五个大按钮在手机上铺三行 | 收成一行「版本 · 全部课件 · 1471 份」，点开才展开 |
| 手机上的筛选条 | 筛选条比第一屏还高，卡片要往下翻两屏 | 整条收成一行「筛选与搜索 · 全部学段 · 全部学科 · 全部资源」，**首张卡片从 892 px 提到 417 px** |
| 详情页右栏 | 版本、说明、状态、两个按钮、一段法律声明、一段手机提示，平铺 9 段 | 状态和两个按钮留在第一层，说明 / 法律 / 手机提示收进「使用说明」折叠层 |
| 详情页的课件 | 要跳到另一个页面才看得到 | 直接在详情页里内嵌预览，「▶ 在线预览」按一下课件就在下面展开，还能「全屏打开 ↗」 |
| 预览时看到的画面 | 内嵌在详情页里，描述和面板挤在四周 | **预览接管整屏**：描述、右栏面板、「教学内容」「返回」全部让位，课件铺满可视区，只留一条「收起预览 / 全屏打开」浮条 |
| 详情页的课程简介 | 一整段铺开，把课件挤到屏幕第三行 | 收成三行截断 + 「展开简介」按钮，展开状态跨课记住 |
| 下载弹窗 | 橙底大警告框 + 「备用线路」+「重新准备下载」+「不消耗任何额度」 | 只留一句「本地离线副本，保存后用浏览器打开即可。仅供教学使用。」 |
| 目录卡片上的按钮 | 只有一条「查看资源 →」，点进去才知道能不能看 | 本地可用的卡片直接给「▶ 在线预览」，点一下就跳到该课件并把课件展开在旁边；还没收录的给「查看资料 →」 |
| 卡片角标 | 「免费下载 / 暂未开放 / 选择下载卡」 | 「本地可用 / 待补齐」，为什么没收录写进详情页 |
| 登录 / 反馈 | 顶部有登录入口，详情页底部有「改进建议与反馈」 | 全部去掉；账号入口整个隐藏 |
| 商业页面 | `#purchase/…`、`#purchases`、`#unlocked`、`#admin`、`#moderation`、`#creator`、`#teachers`、`#refunds`、`#feedback-admin` 这些地址还在 | 全部改道：带课件号的去该课件详情页，其余回课件库 |

折叠用按钮 + `data-collapsed` 写，不靠 `<details>` 自己的开合：宽屏要
"永远展开"、手机要"默认收起"，这两种规则放在样式表里最省事，脚本只
负责记住读者自己展开过哪一组。

改动的源码在 `tools/lq-gallery-filters.js`（筛选行）、
`tools/lq-edition-tabs.js`（版本条）、`tools/lq-folds.js`（折叠开关）、
`tools/lq-detail-panel.js`（详情页）、`tools/lq-preview.js`（内嵌预览）
和 `tools/lq-filters.css`（紧凑样式 + 折叠层），由
`tools/build-leqixiang.mjs` 注入，并且每次构建都会检查补丁有没有打中
目标 —— 打不中就直接报错退出，不会留下一个半成品站点。

预览的"接管整屏"是这么做的：点「▶ 在线预览」时给 `<html>` 打上
`data-lq-previewing="1"`，样式表据此把主栏的左右留白去掉、把正文
区域的描述 / 面板 / 「教学内容」/「返回」全部隐藏，iframe 高度改成
`calc(100vh - 168px)`；收起预览时属性去掉，页面回到原来的阅读版式。
这样"沉浸"是样式层的开关，不是另开一个页面 —— 状态、路由、键盘
行为都还在同一条线上。

> 封面画面本身没改：那是每门课自己的作品图（`/prod/uploads/…`），
> 角上那一小块旧站名属于画的一部分，改它等于改课件内容。站点自己渲染
> 的部分（logo、站名、页脚、全部文案）已经是乐启享。线上已经删掉的
> 4 张封面用一张画好的占位图顶上，不再是破图。

### 下载

图灵智赋的作品是"一份正文 + 一个素材目录"，下载时打成一个 zip；
小白教育的课件是单文件 html，直接给。解压后双击 `afe-xxx.html` 就能
在本机浏览器里用，素材路径全部是相对路径。

zip 里的路径是唯一的：同一份文件（three.js 最常见）既在课件自己的
目录里、又在共享库里时，只写一份进去，不会出现两个同名条目。另外把
早先抓取时落在 `assets\api\program-assets\` 下的 94 个空壳（平台的
"加载中"跳转页，不是素材）清掉了，它们只会让压缩包多出无用的条目。

### 边界（都是线上本来就有的限制，不是复刻偷工）

- 小白教育 550 条目录里只有 53 份有正文，其余 497 份线上从不提供正文，
  必须购买下载卡才能拿到，本地没有、也不去绕过付费。
- 图灵智赋 442 个作品全部镜像，437 个能玩。剩下 5 个的正文取不到，
  原因写在下面"没能拿全的 5 份"一节。
- 图灵智赋 480 门精品课，**33 门走官方"免费体验"通道完整落盘**（正文 +
  素材 + 字体，断网可玩），其余 447 门线上要求账号本身有 **VIP 会员**
  （月卡 ¥39 促销价 / 年卡 ¥199，实测自 `GET /api/pay/vip-prices`），没有
  会员就回 `premium_required`。本地不代购、不开会员。
- 长征课件第三章起（湘江 / 遵义 / 赤水 / 金沙江 / 泸定桥 / 夹金山 /
  若尔盖 / 会宁）上游需要购买，服务器直接 403。第一、二章（瑞金、于都）
  连地图、音频、贴图都完整拉下来了。
- 塔罗牌的牌面图托管在第三方站点，本机网络到不了，保留线上原地址。
- 没有登录 / 支付绕过：所有内容都来自你自己的微信会话和公开接口。

### 剩下那 949 门怎么补齐（一条命令的事）

缺口不是"复刻偷工"，是线上把它锁在付费墙后面。工具已经写好，只要账号
自己带上权益（或者你把 cookie 交给脚本），一条命令就能把剩下的全部拉成
和现在这 523 份一样的本地副本：

```powershell
$env:PATH="C:\kaifa\xiaobai-class\tools\node24\node-v24.22.3-win-x64;$env:PATH"

# 先看一眼缺口和账号现在的权限（不写盘）
node tools\fill-missing.mjs

# 权限到位了就直接拉 + 重建合并站
node tools\fill-missing.mjs --pull --rebuild

# 单独拉某一边也行
node tools\pull-afe-premium.mjs --all          # 图灵智赋 447 门精品课（需要 VIP）
node tools\pull-xb-courseware.mjs --cookie "<session cookie>"   # 小白教育 497 门（需要下载卡）
```

`recon\scratch\afe-token.txt` 里现在是本地这一份微信会话的 token。换成
有会员权益的账号之后重跑 `node tools\afe-login.mjs` 即可。

`fill-missing.mjs` 会先去线上问一次账号现在的权限，把三道门各是什么
状态原样打印出来 —— 现在跑的结果是：

| 缺口 | 线上返回 | 什么意思 |
| --- | --- | --- |
| 作品（5 门） | `trial_exhausted` | 这个账号对它们的免费试看已经用完（3/3，`GET /api/trials?program_id=…` 能看到 `used/total`）。**换一个微信号重新登录一次（`node tools\afe-login.mjs`）就能拿到一份新的试看额度**，这 5 门是唯一不用花钱就能补齐的 |
| 精品课（447 门） | `premium_required` | 账号没有 VIP 会员权益 |
| 小白教育（497 门） | `410 此课件请下载后使用` | 站点自己说的：要下载（买卡）才能用；还没有登录 cookie（`node tools\xb-login-cookie.mjs` 取） |

这三道门是逐个接口实测过的，不是照着文档推断的：

```powershell
node tools\probe-lq-gates.mjs 849 1360     # 令牌 / 正文 / 播放各问一遍
node tools\probe-lq-trials.mjs 1360,849    # 试看额度还剩多少
```

精品课正文那条链路，站点自己会先发一个"加载中"页并带上 token，再跳到
`/api/program-file/<id>/body`，最后一步回 `403 无访问权限`；试看用尽的
那 5 门连跳都不跳，直接回 `403 Private courseware unavailable`。钱和
权益是服务器那边判的，本地这份镜像改不了它的判断，也没有去改。

**要花多少钱**（价格都是从线上接口读回来的实价，不是估的）：

| 缺口 | 买什么 | 多少钱 |
| --- | --- | --- |
| 小白教育 497 门 | 全科永久版（`download-permanent-all-subjects`，含全部学科） | ¥1017.45（原价 ¥1197，8.5 折） |
| 图灵智赋 447 门精品课 | 课件广场 VIP 月卡（`vip-month`，促销 ¥39 / 原价 ¥49） | ¥39 |
| 图灵智赋 5 门作品 | 单独买 | ¥16.6 ~ ¥88 |
| **合计** | | **约 ¥1056，一次买断** |

也可以只买需要的：次卡 ¥98 = 20 额度、尝鲜卡 ¥19.8 = 2 额度、单科年卡
¥228、单科永久卡 ¥399。预算够的话，一次把上面三行都买了最省事。

> 线上确实存在一条官方"免费体验"通道：480 门精品课里有 33 门在
> `/api/premium/catalogue` 里标了 `freeSample`，每门给 10 次试看额度，
> 走 `POST /api/premium/playback/launch` → `GET /api/program-file/<id>/body`
> 就能拿到正文。这 33 门已经全部拉完。另外 447 门试了同样的接口，线上
> 一律回 `403 premium_required`，确认了只有会员能进。

### 没能拿全的 5 份

这 5 份在目录里照常显示（标题、封面、说明、作者、评分都在），但正文
文件不在本地，打开会提示"本地未安装"。

| id | 作品 | 原因 |
| --- | --- | --- |
| `afe-1360` | 中国山河：全国与34省级地区3D互动地理课件 | 章节型公开课，试看额度用尽（`REVIEWED_PUBLIC_DENIED`） |
| `afe-1016` | 中国近代史·第一部：1840，国门激变 | 同上 |
| `afe-842` | 《简爱》：七章互动名著阅读 | 同上 |
| `afe-841` | 法国大革命1789：七语言沉浸式互动历史课 | 拿到了章节界面、CSS 与 717 KB 的地图主程序，3D 数据包（地形高程、河流、贴图、章节场景）没在会话关闭前取完 |
| `afe-811` | 【AR】3D四羊方尊可交互课件 | 摄像头运行时，试看额度用尽（`trial_exhausted`） |

`afe-196`（历史文物3D可交互模型）拿到了正文与界面，但毛公鼎的 `.glb`
模型文件在租约过期后无法再取，本地副本只能显示界面，模型为空。

额度是**每个作品三次**的，服务端记在账号上（`GET /api/trials?program_id=…`
能看到 `used / total`）。这 5 份现在都是 `3 / 3`，也就是这个账号对它们
的免费试看已经全部用完；用完之后
`/api/programs/<id>/access-token` 与 `/api/programs/<id>/camera-launch`
都会回 `trial_exhausted`，`/api/reviewed-course-session/<id>/open` 会回
`REVIEWED_PUBLIC_DENIED`。要补齐只有两条正路：等站点给账号重新发额度，
或者自己把这几门课买下来（`afe-1360` 59.8 / `afe-1016` 88 / `afe-842` 19.9 /
`afe-841` 69 / `afe-811` 16.6 元）。额度到位后可以直接用现成的脚本补齐：

```powershell
$env:PATH="C:\kaifa\xiaobai-class\tools\node24\node-v24.22.3-win-x64;$env:PATH"
node tools\pull-afe-bulk.mjs --ids 1360,1016,842,811 --refresh   # 整包通道
node tools\pull-afe-chapters.mjs --ids 841                      # 章节型公开课
node tools\sync-lq-ext-back.mjs                                  # 外部依赖回写
node tools\build-leqixiang.mjs                                  # 重新生成合并站
```

> 站点前端里还留着一个开发用的管理员登录接口（`/api/dev-login`）。
> 用它可以绕过上面所有的试看与付费限制，但那是越权访问别人付费的
> 内容，所以没有用它，也没有用它去批量拉精品课。

### 已经打开、但里面还缺几件素材的 8 份

这 8 份的正文和主程序都在本地，课件能开、能玩；但里面有几张图、几个
模型、几份数据没跟着一块儿落盘，所以画面上会缺一点东西（图标、字形、
可选图片这类为主，不影响主流程）。共同的点是：补素材要重新拿一次
租约，而租约要靠 `/api/programs/<id>/access-token`，这个账号对它们
的试看额度已经用完，接口一律回 `403 无访问权限`。

这 8 门的试看额度逐个查过，全是 `used:3,total:3`
（`node tools\probe-lq-trials.mjs 180,506,196,501,563,581,469,616`），
所以换一个新的微信号登录一次，这 8 门的素材也能一并补齐。

| id | 作品 | 还缺什么 |
| --- | --- | --- |
| `afe-180` | 英雄知识PK赛课堂抢答小游戏 | 24 张人物图（孙悟空 / 哪吒 / 诸葛亮…） |
| `afe-506` | 班级管理——宠物成长系统与学生档案 | 16 张宠物图 |
| `afe-196` | 历史文物3D可交互模型 | 毛公鼎的 `.glb` 模型（11 个候选文件名都试过） |
| `afe-501` | 《春秋：烽火山河图》3D 历史地理课堂 | 10 份地图与地理数据（geojson / json） |
| `afe-581` | 实验仪器与安全互动课件 | 7 张仪器步骤图 |
| `afe-469` | 诗贯山河 | 4 个地球贴图与法线图 |
| `afe-616` | 《经典常谈》互动立体书 | 1 个 `src/main.js` |
| `afe-563` | 海绵宝宝手势交互 | 7 张角色头像图 + 1 个 mediapipe 的 `wasm/vision_wasm_internal.js` |

已经补回来的：`afe-564`（世界杯吉祥物）的 draco 解码器、
`afe-563`（海绵宝宝手势交互）的 draco 解码器（从 `afe-564` 的同款
文件直接拷过来，两个文件都是 three.js 的通用库，不是这一门课私有的）、
`afe-327`（内耳结构）的 `inner_ear.glb`（4.5 MB）、
`afe-495`（候风地动仪）的 `didongyi.glb`（29 MB，站点只存这一份，
正文里另外三种拼法在原站就不存在，是同一件东西的备用写法）、
`afe-19`（多功能正方体画板）的 `three.js` / `oc.js`（OrbitControls）/
`tween.js`。`afe-20`（分数与除法的关系）缺的两个 Vite 分片是线上就
没有的，它靠 SVG 渲染，功能完整，不算缺件。

另外两处不是本地丢的，是在原站就取不到（这两门不在上面的表里）：

- `afe-206`（悟空哪吒 · 权利抢答赛）的 2 张图托管在 `i.pinimg.com`，
  本机到这个域名直接超时
  （连首页都打不开），换个网络环境才有可能拿到。
- `afe-20` 缺的 3 个 Vite 分片（`/assets/61b0b0882325.js` 等）在
  `https://aifunengjiaoyu.com/assets/` 上原样就是 404 —— 线上自己也缺，
  不是镜像丢了。这门课靠 SVG 渲染，功能完整。

每轮验收跑完，`node tools\lq-missing-assets.mjs --confirmed` 会把现在
还真的报 404 的清单列出来，跟上面对照着看就行。

```powershell
# 额度到位之后，把这几份的素材补回来
$env:LQ_REPORT_COUNT="1"
node tools\repair-lq-assets.mjs            # 按验收报告里的 404 逐个回源
node tools\fetch-lq-missing.mjs            # 补课件引用的公共 CDN 文件
node tools\fetch-lq-extra.mjs              # 补样式表间接引用的字体与模块
node tools\sync-lq-ext-back.mjs             # 回写源镜像，重建不丢
node tools\build-leqixiang.mjs             # 重新生成合并站
```

---

## 目录结构

```
C:\kaifa\xiaobai-class
├─ server\server.mjs            本地服务（4173 = 乐启享合并站，4174 / 4175 = 两个原站）
├─ mirror\
│  ├─ xbjiaoyu\
│  │  ├─ catalog.json          550 份课件的原始目录数据
│  │  ├─ assets\               站点外壳（HTML/CSS/JS/图标）
│  │  └─ courseware\           53 份可直接游玩的课件（每份一个自包含 HTML）
│  └─ aifunengjiaoyu\
│     ├─ programs.json         首页展示的作品目录（URL 已改写为本地路径）
│     ├─ programs-all.json     /api/programs 的完整清单：442 个作品
│     ├─ premium\               精品课目录：catalogue / prices / capabilities
│     │                          / vip-prices（逐字节镜像线上响应）
│     ├─ assets\               站点外壳 + /tuxiaoling 图小灵助手页
│     │  └─ premium-catalogue\  精品课前端模块 + 479 张课程封面
│     ├─ play\                 独立播放页 /play/<id>.html
│     ├─ public\prod\uploads\  封面、说明图、演示视频、附件
│     └─ courseware\           470 份正文 + 同名 .assets\ 素材目录
├─ mirror\leqixiang\            乐启享合并站（build-leqixiang.mjs 的产物）
│  ├─ site\                    换牌后的外壳（含 lq-mode.js 本地模式守卫）
│  ├─ courseware\              523 份可玩课件（小白原 id + afe-<id>）
│  ├─ _shared-ext\             所有课件共用的外部资源（网页字体等）
│  ├─ _shared-root\            课件按站点根路径引用的公共脚本（three.js / oc.js / tween.js）
│  ├─ brand\                   codebn.cn 的 logo / favicon
│  ├─ catalog.json             1472 条合并目录
│  └─ catalog-xb.json          只含小白教育那 550 条（4175 端口用）
├─ tools\                       镜像、校验、启动脚本
│  └─ probes\                   151 个一次性探针（逆向过程记录，非流水线）
├─ recon\
│  ├─ captures\                 REA 抓取证据（截图 + 事件流，130+ 个文件）
│  ├─ craft\                    craft-anything 的项目账本（证据 / 结论 / 日志）
│  ├─ craft-report.md           craft-anything 生成的调查报告
│  ├─ xb-live-method-matrix.json  小白教育 40 个接口 × 两种方法的线上答案
│  ├─ response-body-diff.json    响应体逐字节比对的结果
│  └─ *.log                      各项校验的日志
├─ craft-anything\              本机编译好的 craft-anything（Rust）
├─ rea\ / rea-src\              本机 REA（观测工具）
└─ .cargo\config.toml           crates 镜像配置（rsproxy.cn 稀疏索引）
```

镜像体积：小白教育 76 MB / 642 个文件，图灵智赋正文与素材约 1.1 GB
（大头是 3D 模型：心脏 41 MB、四羊方尊、地形、细胞、细菌等），
合并站 523 份可玩课件。

---

## 小白教育（合并站里的小白部分 / localhost:4175）

### 已经能用的部分

- **课件库目录**：550 份课件全部列出，学科 / 学段 / 版本（3D 整合版、
  2D 整合版、3D 独立版、2D 独立版）/ 来源（全部 / 免费下载 / 付费资源）
  筛选、搜索、排序、章节目录树全部保留原有行为。
- **53 份免费课件 100% 可玩**：平面镜成像、凸透镜 / 凹透镜、木炭燃烧、
  核能、方块构建、地形判读等系列，每个课件都是原站发布的自包含
  HTML（含 Three.js），带 3D 场景、参数滑块、开关、视角切换、导出画面。
- **53 份全部逐个验证过**：每一份都用 REA 真实打开，截屏做过像素统计，
  确认画面不是空白；控制台唯一的报错是沙箱 iframe 的 serviceWorker
  提示（Chrome 在 `sandbox` iframe 里禁用了它，属于正常噪声）。
- **下载**：已装课件可以从卡片直接下载成单个 HTML 文件。

### 目录里另外 497 份为什么打不开

原站这 497 份标记为付费资源，接口 `/api/launch/{id}` 直接返回

```
410  此课件请下载后使用；标为免费的课件可在线体验
```

也就是说原站自己也不提供在线播放，只在你购买后把课件文件发给你。
本复刻**没有、也不会**绕过这个边界。这 497 份在本地目录里照常显示，
但会明确标为"待补齐"，详情页里写清是"线上需购买下载卡"，不会伪装成
能玩。

### 把付费课件放进本地

如果你在官网正常购买并下载了课件包，把 HTML 丢进
`mirror\xbjiaoyu\courseware\` 即可，文件名用课件 id（例如
`chemistry-chem02-charcoal.html`），重启服务后目录里那一份立刻变为可玩。

---

## 公开资源到底搬完了没有 —— 一次穷举

镜像是按文件逐个补的，最怕的就是"还有没发现的一层"。所以最后又做了一
遍**全站静态面穷举**：从站点首页出发，广度优先地跟完每一条引用链——
HTML 的 `src/href/srcset`、CSS 的 `url()`/`@import`、ES 模块的
`import`/`import.meta.url`、JS 里所有像路径的字符串字面量，以及
**JSON 正文里的资源字段**（封面、说明图、演示视频都藏在数据里，
只看页面是找不到的）。每条链路的终点都拿去跟线上比，再跟本地镜像比。

| | 爬到的 URL | 线上 200 但本地缺 | 结论 |
| --- | --- | --- | --- |
| 图灵智赋 | 724 | 7 | 补齐后归零 |
| 小白教育 | 646 | 0 | 本来就是齐的 |

图灵智赋补上的这 7 个是之前确实漏掉的东西：

| 路径 | 大小 | 是什么 |
| --- | --- | --- |
| `/premium-catalogue/refunds.mjs` | 4.4 KB | 精品课退款页脚本 |
| `/admin-large/runtime/local-store.mjs` | 3.2 KB | 管理端本地存储模块 |
| `/admin-large/runtime/public-host.mjs` | 12.7 KB | 公开课托管模块 |
| `/admin-large/website-admin.mjs` | 7.7 KB | 管理端脚本 |
| `/course-compat/pk180-bank-host.mjs` | 6.8 KB | 题库托管模块 |
| `/tuxiaoling/js/glb-library.mjs` | 14.8 KB | 图小灵 3D 模型库 |
| `/assets/membership-hero-visual.jpg` | 176 KB | 会员页头图 |

还有 3 个接口正文也是这轮找到的，全部公开、纯文本，已经逐字节镜像到
`mirror\aifunengjiaoyu\api\` 并由服务端原样回放：

| 接口 | 内容 |
| --- | --- |
| `GET /api/announcement` | 全站公告（"最近上新：精品课系列……"） |
| `GET /api/creator-agreement/share-policy` | 创作者分成比例（老师 85% / 平台 15%） |
| `GET /api/program-file/` | 12 个游客可见作品的**完整清单**（带价格），线上也是公开的 |

另外，解开混淆后的字符串表（1966 条）里还藏着 4 个只靠正则爬不到的
模块路径，也一并补齐了。

**所以：凡是线上匿名访客能拿到的文件，现在一个不差。** 剩下的只有账号
和付费墙后面的东西 —— 下面两节讲清楚每一类该怎么拿。

---

## 图灵智赋（localhost:4174）

### 已经能用的部分

- **完整 SPA 外壳**：首页、导航、探索程序页、会员中心、上传作品页，
  样式和脚本全部是原件。
- **442 个作品的完整目录**：标题、学科、年级、作者、评分、使用量、
  详情文案、封面图、说明图、演示视频全部本地化，浏览器不再请求
  远端 CDN（那个 CDN 需要 Referer 才能放行，镜像后就没这个问题了）。
  这一层的**每一个公开文件**都搬完了：46 个媒体 URL（封面 / 说明图 /
  管理说明图 / 演示视频）共 161 MB，加上长征的 10 张原图，全部落在
  `mirror\aifunengjiaoyu\public\prod\uploads\` 下，路径和线上 URL 一一
  对应（`tools/mirror-afe-media.mjs` 可以随时重跑，幂等）。
- **480 门精品课的完整目录**：`/api/premium/catalogue` 是公开接口，
  里面是 10 个套餐、224 个知识分类、480 门课（对应作品号 846–1346）。
  这一整份目录连同 479 张封面图全部镜像，精品课页（导航里的"精品课"）
  在本地能完整浏览：学科页签、年级套餐、知识树、搜索、免费体验区都正常。
- **作品详情弹窗**：点卡片能打开，左边封面 / 演示视频，右边简介与图集。
- **图小灵 AI 教学助手面板**：右侧嵌入的 `/tuxiaoling/` 页面完整还原，
  包含历史栏、新建对话、创作方式切换、深度思考、素材上传、场景横栏
  等全部界面。3D 预览帧用到的 `/tuxiaoling/runtime/viewer-v1.mjs` 和
  **three.js r160 全套**（引擎 + GLTFLoader + OrbitControls + 依赖）
  都已镜像到 `/tuxiaoling/vendor/three/`，导入映射在服务端出站时改写，
  磁盘上的文件保持和线上逐字节一致——这样断网也能转 3D 模型。
- **独立播放页**：`/play/<id>` 共 12 个，每个都是原站服务端渲染的播放器，
  同样支持本地课件。

### 12 个 vs 480 个：线上到底有多少"作品"

这是复刻过程中最容易被漏掉的一层。`/api/programs` 只返回 **12 个**
游客可见的作品（长征、答题吃鸡赛、AR 手势、诗贯山河……），而且响应里
带着 `guestLimited: true`——它本身就是一份被裁剪过的列表。

真正的全量目录在 `/api/premium/catalogue`（"精品课"那一栏），它**不需要
登录**就能读到：

| | 线上 | 本地 |
| --- | --- | --- |
| 套餐 packages | 10 | 10 |
| 知识分类 categories | 224 | 224 |
| 课程 courses | 480 | 480 |
| 课程封面 | 479 张 | 479 张（44 MB） |
| 课程指向的作品号 | 846–1346 | 同上 |

480 门课全部 `accessState: premium_not_open`、`legacyAvailable: false`，
也就是说线上这套精品课目前是"编目完成、尚未开放"状态，连线上自己都放
不出课件正文。所以本复刻能做到的是把**目录层**完整搬过来（能做浏览、
检索、分类、封面），正文层仍然只能靠你把已购文件放进
`mirror\aifunengjiaoyu\courseware\{作品号}.html`。

放进去之后，服务端会给这门课发一个本地播放租约
（`/api/premium/access` 里 `courses[作品号].allowed = true`，
`/api/premium/playback/launch` 返回本地 token），精品课页上的按钮就会
直接打开你放进来的课件；没放文件时，服务端和线上一样回
`400 invalid_launch`。

### 本地身份

原站每个交互动作都挂在微信登录态后面（`localStorage.aiedu_token`），
没有登录态前端根本不会去请求课件地址。本地副本没有账号体系，所以服务端
会签发一个**本地身份**（`Bearer local-…`），页面加载时自动写入
`localStorage`，界面右上角显示"本地用户"。

这个身份只解锁**界面**，不解锁任何内容：作品正文仍然必须是你自己下载
回来、放进 `courseware\` 目录的文件才会出现。没有本地文件时，播放器会
明确提示"本地未安装这份课件：请把在官网下载到的 HTML 放进
mirror/aifunengjiaoyu/courseware/<id>.html"。

### 本地装了的课件按"已拥有"处理 —— 和站 1 一样

站 1（小白教育）的做法是：本地装了的课件在目录里直接标成
`owned / accessible / canDownload`，点开就能玩、能存下来，不问你要不要
买。图灵智赋这边原本还停在"购买 / 免费试用"的按钮上，看着别扭。

现在改成一样：`/api/user/purchases` 返回本地 `courseware\` 目录里实际
存在的作品号，前端读到 `purchasedIds` 之后就会把这一份显示成
**"已购买 · 永久使用"**，按钮变成直接打开；`/api/trials` 也按线上格式
返回 `{success, used, total}`，试用次数不再显示成 0/3。

另外补了 `/download/{作品号}.html`：本地装了的课件可以直接存成单个
HTML 文件带走，和站 1 的 `/download/{产品id}.html` 行为一致。

顺带把作品目录里的**真实价格**写回去了（之前镜像时为了省事清零了）。
详情弹窗现在和线上一样显示 `¥88`、`¥49.7` 这些，同时"已拥有"的状态
仍然盖过购买按钮，两边都不耽误。

### 作品正文需要你自己的账号

图灵智赋的作品正文走 `/api/program-file/{id}`，原站对未登录访问返回
`401 请先登录`；`/api/trials`（在线试用）同样要登录。这一层是账号 +
付费体系，本复刻同样**不绕过**。

不过只要**你自己的账号**买过或试用过，正文是可以合法下载的。本复刻
把这条路径做成了现成命令：

```powershell
# 站点2（图灵智赋）：先扫码登录，工具会自己把 token 存下来
node tools/afe-login-watch.mjs       # Chrome 弹出登录码，微信扫一下（码会自动刷新）

# 然后把账号能拿到的每一份课件正文拉下来
node tools/pull-afe-courseware.mjs --token (Get-Content recon\scratch\afe-token.txt)
```

```powershell
# 站点1（小白教育）：线上只收手机号+短信验证码（账号密码已被关停），拖动验证码
# 不好自动过，所以在浏览器里手动登一次，脚本把会话接走
node tools/xb-login-cookie.mjs
node tools/pull-xb-courseware.mjs --cookie (Get-Content recon\scratch\xb-cookie.txt)
```

---

## 这个仓库里装了什么

仓库地址：<https://github.com/zhaosenlin-bit/student-class>

克隆下来之后，`node server/server.mjs` 就能跑 —— 服务端只依赖 Node
自带模块，不需要 `npm install`。

| 目录 | 内容 |
| --- | --- |
| `server/` | 本地服务（一个文件，Node 自带模块，无依赖） |
| `mirror/` | 镜像下来的全部站点内容：合并站、乐启享站点外壳、两个原站、课件正文与素材 |
| `tools/` | 镜像、重建、验收这一整套脚本（不含本机装的工具链） |
| `recon/` | 逆向过程的报告与证据（markdown / json） |
| `craft-anything/` | Rust 写的静态分析工具箱源码（编译产物 `target/` 不入库） |
| `rea/` | 观测工具 REA 的源码 |

没有入库的东西，都是"哪台机器上都能重新生成"的：

- 工具链（`tools/node24`、`tools/mingw64`、`tools/mingw-binutils`、
  `tools/.cache`）—— 装一次就好；
- `craft-anything/target/`（1.1 GB 编译产物）—— `cargo build --release`
  或者 `tools/build-craft-anything.ps1` 能重造；
- 抓取用的浏览器 profile（`tools/chrome-*`）；
- `recon/captures/`、`recon/scratch/` 里的一次性产物，和所有凭据
  （`*.token` / `*.cookie` / `.env`）。

三件值得单独说的事：

1. **`rea-src/` 是 `rea/` 的逐字节副本**，所以只跟踪了 `rea/`。两个目录
   都完整保留在本机（`C:\kaifa\xiaobai-class\`），只是 `rea-src/` 不入
   仓库。
2. **三个上游项目的 `.git` 目录搬到了 `C:\kaifa\_vendored-git-backup\`**，
   历史一个字没少，但不进仓库 —— 否则 git 会把整个目录当成子仓库，
   源码反而进不去。
3. **镜像里删掉了 3 个文件名末尾带点的文件**（`issues/21559.`、
   `issues/21819.`、`wiki/Three.js-Shading-Language}.`）。它们是爬虫
   从 three.js 的 JS 注释里把 URL 连同句末标点一起抓下来的产物 ——
   注释里的链接浏览器永远不会去请求，而且这种文件名在 Windows 上根
   本打不开、git 也索引不了。全仓再扫一遍，末尾带点 / 带空格的名字
   已经是 0。

两个脚本都只做**线上公开的握手**（取 access-token → 换正文 URL → 下载），
拿不到就如实记一条 `refused`，不会去绕任何鉴权。拉下来的正文按站点约定
落盘：

| 站点 | 落盘位置 |
| --- | --- |
| 图灵智赋 | `mirror\aifunengjiaoyu\courseware\{作品号}.html`（附件在同名 `.assets\` 目录） |
| 小白教育 | `mirror\xbjiaoyu\courseware\{产品id}.html` |

合法拿到文件之后的本地安装方式：

1. 在官网正常登录、购买或试用，下载课件 HTML。
2. 放到 `mirror\aifunengjiaoyu\courseware\{作品id}.html`
   （id 就是目录里那一项的数字，例如 `754.html` 对应"长征"）。
3. 重启服务。作品卡片上的"试用 / 播放"就会指向
   `http://localhost:4174/courseware/754.html`，完全离线运行。

图小灵的**AI 生成**功能依赖云端模型，本地副本把它标为只读（面板上会
写明"本地离线副本：课件创作依赖云端模型，本地不提供"）。其余所有界面
交互都还在。

---

## 本地服务做了哪些改动

| 位置 | 改动 | 原因 |
| --- | --- | --- |
| `/courseware/{id}.html` | 把课件里写死的 `"origin":"https://xbjiaoyu.com"` 改成本地 origin | 课件会和父页面做课堂握手，origin 不匹配就一直是黑屏 |
| `index.html` | 去掉 `content-guard.js`（防开发者工具 / 右键另存） | 个人本地副本，这段会挡住浏览器的调试能力 |
| `/play/<id>.html` | 去掉页面里的反调试按键拦截 | 同上 |
| `/api/catalog` | 全部条目按"免费"渲染，但只有本地真的有的才标记可玩 | 关掉商业化，又不谎报可用性 |
| `/api/launch/{id}` | 无本地文件时返回 410，和原站对付付费课件的措辞一致 | 保持行为一致 |
| `/api/*`（图灵智赋） | 按游客身份逐条对齐线上返回码（401 / 404 / `{"success":false}`） | 让前端在离线下走和线上一模一样的分支 |
| `/api/*`（图灵智赋）· 未知路径 | 照抄 Express 那页 `Cannot GET /api/xxx` 的 HTML | 线上未知路径回的是 HTML，前端 `r.json()` 会抛异常，两边得一样 |
| `/api/*`（小白教育）· POST | 校验 `Origin` + `X-Requested-With: studio`，缺一就是 403 | 线上就是这么挡跨站 POST 的，本地照抄 |
| 静态文件 · 非 GET | 405 `{"error":"不支持此操作"}`（小白教育）/ 404 HTML（图灵智赋） | 线上静态资源只收 GET/HEAD |
| 未知路径 · GET | 404 `{"error":"未找到"}`（小白教育）/ 404 HTML（图灵智赋） | 小白教育用 hash 路由，线上没有 SPA 兜底，本地也不该有 |
| `/api/programs/<id>/access-token` | 返回本地 token，指向 `courseware/<id>.html` | 这是前端真正用来打开课件正文的握手接口 |
| `/api/programs/<id>/camera-launch` | 摄像头类课件返回本地播放地址 | AR / 体感类课件在原站走的是这条分支 |
| `/prod/uploads/*` | 直接吐镜像下来的 CDN 文件 | 前端所有图片和演示视频都指向这里 |
| `/cdn-cgi/*` | 204 | Cloudflare 埋点，本地没有意义 |

镜像出来的课件文件本身**一个字节都没改**，全部保持原站发布的样子，
改写只发生在服务端返回的那一刻。

---

## 工具

| 脚本 | 作用 |
| --- | --- |
| `tools/mirror-xbjiaoyu.mjs` | 镜像小白教育的目录 / 外壳 / 53 份免费课件 |
| `tools/mirror-aifunengjiaoyu.mjs` | 镜像图灵智赋的外壳 / 作品目录 / 公开媒体 |
| `tools/fixup-aifunengjiaoyu.mjs` | 补抓漏掉的媒体，并把 CDN 链接改写成本地路径 |
| `tools/mirror-afe-modules.mjs` | 镜像图灵智赋运行时导入的 3 个 ES 模块（长征播放租约等） |
| `tools/mirror-afe-play.mjs` | 镜像 `/play/<id>` 独立播放页（每页绑定一个作品） |
| `tools/mirror-afe-premium.mjs` | 镜像精品课：4 份 JSON、8 个前端模块、479 张课程封面 |
| `tools/mirror-afe-media.mjs` | 镜像 12 个游客可见作品的全部公开媒体（46 个 URL / 161 MB）+ 长征原图扫描 |
| `tools/mirror-afe-three.mjs` | 镜像 `/tuxiaoling/runtime/viewer-v1.mjs` 与 three.js r160 全套（含传递依赖） |
| `tools/mirror-afe-public-api.mjs` | 镜像 3 个公开接口正文：公告 / 分成政策 / 作品全量清单 |
| `tools/crawl-afe-static.mjs` | 全站静态面穷举爬取（HTML/CSS/JS/JSON/媒体），对比镜像找缺口 |
| `tools/crawl-xb-static.mjs` | 同上，针对小白教育（646 个 URL） |
| `tools/restore-afe-prices.mjs` | 把线上真实价格写回作品目录（媒体路径仍指向本地） |
| `tools/pull-afe-courseware.mjs` | 用你自己的登录 token 拉取图灵智赋的课件正文（含精品课播放租约） |
| `tools/pull-xb-courseware.mjs` | 用手机号验证码 / 账号密码登录后拉取小白教育的付费课件 |
| `tools/afe-login.mjs` | 打开微信扫码登录弹窗，等扫完把 token 存到 `recon\scratch\afe-token.txt` |
| `tools/afe-login-watch.mjs` | 同上，但会定时刷新二维码（微信码两分钟就过期）并一直等到扫成功 |
| `tools/afe-login-api.mjs` | 走站点自己的接口登录，不依赖浏览器（自动刷新二维码 + 轮询扫码结果） |
| `tools/xb-login-cookie.mjs` | 在真实浏览器里手动登录小白教育，然后自动取走会话 cookie |
| `tools/check-local-install-flow.mjs` | 自检：投放槽位 → 已拥有 → 试用次数 → 下载 → 正文全链路 |
| `tools/cdp.mjs` | 极简 Chrome DevTools Protocol 客户端（Node 自带 WebSocket，无依赖） |
| `tools/mirror-afe-fonts.mjs` | 镜像 Google Fonts 的 Noto Serif SC（101 个 woff2 分片） |
| `tools/mirror-tuxiaoling-glb.mjs` | 镜像图小灵场景栏用的 3D 模型（.glb） |
| `tools/mirror-afe-vendor.mjs` | 镜像 html2canvas（封面截图用），并把 shell 指回本地 |
| `tools/deobfuscate-source.mjs` | 解开图灵智赋 bundle 的字符串表，打印某段真实源码 |
| `tools/deobfuscate-afe.mjs` | 解出图灵智赋 shell bundle 的字符串表，用来读真实 API 契约 |
| `tools/scan-api-paths.mjs` | 列出前端代码会调用的全部 API 路径 |
| `tools/scan-xb-api-calls.mjs` | 列出小白教育前端（含 53 份课件）真正会请求的接口 |
| `tools/scan-afe-api-calls.mjs` | 列出图灵智赋 bundle 会请求的接口，并标出本地没接的 |
| `tools/scan-live-deps.mjs` | 扫描镜像 / 线上页面里残留的绝对外链（目录和 URL 都能扫） |
| `tools/crosscheck-api-surface.mjs` | 用 craft-anything 读出来的接口清单，逐条对比本地与线上 |
| `tools/compare-guest-responses.mjs` | 把游客态的 29 个接口按 GET/POST 逐条和线上对齐 |
| `tools/compare-response-bodies.mjs` | 连响应体一起比：状态码 + Content-Type + 正文 |
| `tools/compare-afe-premium.mjs` | 精品课接口与静态资源逐条对比（29 条，含 Origin 门槛变体） |
| `tools/probe-xb-all-paths.mjs` | 探清小白教育 40 个接口 × GET/POST 的线上答案 |
| `tools/probe-xb-method-matrix.mjs` | 同上，先验出 POST 的来源门槛 |
| `tools/match-runtime-scripts.mjs` | 把 REA 抓到的运行时脚本哈希成 craft-anything 能吃的清单 |
| `tools/craft-runtime-match.mjs` | 组装静态↔运行时比对的参数 |
| `tools/craft-record-findings.mjs` | 把 brief 与结论写进 craft-anything 的证据账 |
| `tools/write-afe-guest-paths.mjs` | 从服务端源码里抽出游客接口清单 |
| `tools/probe-live-endpoint.mjs` | 单独问线上某个接口（限速重试，避免把 429 当成差异） |
| `tools/verify-free-courses.mjs` | 逐个打开本地课件，确认课堂握手成功、场景正常渲染 |
| `tools/verify-lq-batch.mjs` | 并行体检合并站全部可玩课件（523 份逐个开，报告落在 `recon\scratch\lq-batch-report-*.json`） |
| `tools/probe-lq-shell.mjs` | 单份课件的运行态复验：进站点 → 点在线使用 → 看 frame 里画出来没有 |
| `tools/shot-lq.mjs` | 给合并站的几个关键页面截图 |
| `tools/shot-lq-responsive.mjs` | 同一页在桌面宽度和手机宽度各截一张，顺带量首张卡片的位置 |
| `tools/check-lq-copy.mjs` | 扫全站文案：登录 / 反馈 / 购买 / 退款这些词还有没有漏网的 |
| `tools/build-leqixiang.mjs` | 生成合并站 `mirror/leqixiang/`（换牌外壳 + 合并目录 + 523 份正文） |
| `tools/sync-lq-ext-back.mjs` | 把补齐的外部依赖回写两个源镜像，重建合并站时不会丢 |
| `tools/rebrand-lq-text.mjs` | 把课件素材里残留的旧品牌中文字样换成乐启享 |
| `tools/lq-gallery-filters.js` | 合并站的筛选行（学段 / 搜索 / 学科 / 可用性 / 排序） |
| `tools/lq-edition-tabs.js` | 合并站的版本条（宽屏一行，手机折一行） |
| `tools/lq-folds.js` | 手机上那两组折叠的开关，记住读者展开过哪一组 |
| `tools/lq-detail-panel.js` | 合并站的课件详情页（状态 / 在线预览 / 下载 / 使用说明） |
| `tools/lq-preview.js` | 详情页里的内嵌课件预览，顺带替课件应答课堂握手 |
| `tools/lq-filters.css` | 合并站的紧凑样式与折叠层（构建时写进 `site\lq-ui.css`） |
| `tools/lq-mode.js` | 本地模式守卫（挡交易类路由与动作），构建时接进外壳 |
| `tools/wire-lq-mode.mjs` | 不重建、只给已生成的外壳补上 lq-mode.js |
| `tools/check-lq-mode.mjs` | 验本地模式：路由被挡、在线能开、下载能下 |
| `tools/check-lq-zip.mjs` | 把下载下来的 zip 打开看目录，确认素材齐全、路径是相对的 |
| `tools/check-lq-offline.mjs` | 把 zip 解开、**掐断网络**、再用 `file://` 打开，证明下载下来真能离线用 |
| `tools/check-lq-localfilter.mjs` | 验"本地可用 / 待补齐"两档筛选和卡片的本地状态文案 |
| `tools/audit-lq-404.mjs` | 汇总验收报告里所有 404，逐条对到本地文件 |
| `tools/audit-lq-assets.mjs` | 体检每个课件的素材目录，列出缺的文件 |
| `tools/repair-lq-assets.mjs` | 给缺素材的课件重开一份租约，把文件补回本地（线上也缺的就如实记下来） |
| `tools/fill-missing.mjs` | 查三道权限门现在是什么状态；门开了就把剩下的课件拉下来并重建合并站 |
| `tools/lq-missing-assets.mjs` | 素材缺口清单：确认缺口（验收真的 404）与疑似缺口（正文写了本地没有）分两层列 |
| `tools/lq-broken-images.mjs` | 逐页找出坏掉的图（导出画面的暂存位不算） |
| `tools/check-lq-covers.mjs` | 目录里每一张封面都去本地服务器取一次，确认拿到的是真图不是空文件 |
| `tools/probe-lq-gates.mjs` | 复核线上三道权限门的原话：令牌、正文、播放各问一遍，跟着站点自己的跳转走到底 |
| `tools/probe-lq-trials.mjs` | 查账号在某门课上的试看额度还剩多少（只读，不消耗） |
| `tools/probe-xb-gates.mjs` | 复核小白教育那 497 门：正文、投放、目录三个接口各问一遍 |
| `tools/fetch-lq-extra.mjs` | 补样式表间接引用的字体与模块（jsdelivr 取不到时改走 unpkg 再存回本地路径） |
| `tools/fetch-lq-missing.mjs` | 补课件正文里直接写死地址的公共 CDN 文件 |
| `tools/course-cover-fallback.svg` | 线上已经删掉的那 4 张封面的占位图（构建时写进 `assets\images\`） |

`tools/probes\` 里是逆向过程中用的一次性探针（每个 `probe-*.mjs` 问站点
一个具体问题），留着是为了以后能复查某个接口的答案；跑产品用不到它们。
| `tools/fetch-shared-ext.mjs` | 扫全部课件正文里的外部 URL，回源镜像到共用的 `_shared-ext\` |
| `tools/fetch-lq-missing.mjs` | 只补课件正文里还缺着的外部文件 |
| `tools/fetch-lq-extra.mjs` | 补样式表和模块间接引用的那几件（字体文件、BufferGeometryUtils） |
| `tools/fetch-fonts-css.mjs` | 取回 25 条 Google Fonts 查询的样式表与 415 个字形 |
| `tools/pull-afe-premium.mjs` | 拉图灵智赋精品课正文（默认只拉免费体验的 33 门，`--all` 需要会员权益） |
| `tools/verify-afe-viewer.mjs` | 装入桩课件后按"立即使用"，抓出播放器真正的请求序列 |
| `tools/test-courseware-slots.mjs` | 验证两份付费课件的本地投放槽位可用 |
| `tools/scan-courseware-externals.mjs` | 扫描课件里的外链，确认没有隐藏的网络依赖 |
| `tools/check-capture-pixels.ps1` | 对截图做像素统计，揪出"控制台没报错但画面是空白"的课件 |
| `tools/summarize-capture.mjs` | 汇总一次 REA 抓取：报错、外链请求、截图落盘 |
| `tools/show-capture-requests.mjs` | 列出一次抓取里每个请求的地址和状态码 |
| `tools/start-local-server.ps1` | 启动本地服务 |
| `tools/launch-recon-chrome.ps1` | 启动带远程调试端口的 Chrome，供 REA 抓取 |
| `tools/build-craft-anything.ps1` | 编译 craft-anything CLI（配好 dlltool 与 crates 镜像） |
| `tools/probe-crate-mirrors.mjs` | 查各个 crates 镜像有没有锁定版本 |
| `tools/install-mingw-binutils.mjs` | 装 mingw-w64 binutils（补 dlltool 缺的汇编器） |
| `tools/install-mingw64-toolchain.mjs` | 装完整的 mingw-w64 GCC（`ring` 这类 crate 要用） |
| `tools/cleanup-artifacts.mjs` | 清掉下载缓存里的解压产物和空目录 |
| `tools/verify-lq-batch.mjs` | 逐份打开本地课件正文，抓网络请求 / 画布数 / 报错，产出批量体检报告 |
| `tools/lq-missing-assets.mjs` | 把"确认缺失"和"疑似缺失"分层列出来（`--confirmed` 只给确认版） |
| `tools/lq-broken-images.mjs` | 扫全部课件正文里的图片，揪出加载失败的 |
| `tools/check-lq-covers.mjs` | 逐张验 1457 张封面：不是空文件、不是坏图 |
| `tools/probe-lq-gates.mjs` / `tools/probe-lq-trials.mjs` | 复核某几门课的权限门与试看额度到底回什么 |
| `tools/probe-xb-gates.mjs` | 同上，针对小白教育（`410` / `403` 各是什么条件） |
| `tools/check-lq-copy.mjs` | 扫整站文案，确认没有"登录""反馈""购买""额度"这类多余话术 |
| `tools/shot-lq-flow.mjs` | 桌面 + 手机两条链路各截一遍：详情 → 预览 → 下载 |
| `tools/shot-login-qr.mjs` | 给扫码登录弹窗截图，方便确认二维码状态 |

复刻过程中的观测证据（截图、网络事件流、控制台报错）都在
`recon\captures\` 里，用 REA 抓的。

`tools\probes\` 里是 151 个一次性探针 —— 逆向过程中每试一个接口、每撞
一次 401 就写一个。它们不是流水线的一部分，是发现过程的记录，读 README
的时候想看"这个结论是怎么试出来的"就去那儿翻。

---

## 接口对得上吗 —— 三层交叉验证

光"页面能打开"不算复刻到位。前端拿到 200 还是 401、走 JSON 还是走
Express 的 404 页面，会进入完全不同的分支，所以接口要按**方法**和
**响应体**都对上。这件事分三步做，每一步都能独立复跑。

### 第一步：用 craft-anything 读代码

`js_app_map` 静态解析镜像下来的 bundle，列出它可能调用的每一个接口。
整目录一起解析比只解析单个入口包更全：

```powershell
.\craft-anything\target\release\craft-anything-cli.exe --deep js_app_map `
  --input-path "C:\kaifa\xiaobai-class\mirror\aifunengjiaoyu\assets" `
  --output-format json > recon\craft-js-app-map-afe-all.json
```

图灵智赋的 27 个脚本合起来读出 **61 个接口路径**（其中 21 条带明文
`/api/` 前缀，其余被字符串表混淆）；小白教育 31 个脚本读出 5 个。
单看入口包时只能读出 54 个和 4 个 —— 剩下的在按需加载的子脚本里。

### 第二步：拿本地和线上逐条对

```powershell
# 从 bundle 清单出发，GET/POST 各比一次
node tools\crosscheck-api-surface.mjs

# 把游客态的接口按方法逐条对
node tools\compare-guest-responses.mjs

# 连响应体一起比（状态码 + Content-Type + 正文）
node tools\compare-response-bodies.mjs
```

第三个工具是最较真的那个：它把**正文**也比一遍。这一步挖出了几个只看
状态码看不见的差别 —— 线上 Express 对它不认识的路径（以及用错方法的
已知路径）回的是一页 HTML：

```html
<!DOCTYPE html>
<html lang="en">
...
<pre>Cannot GET /api/inquiry</pre>
```

本地原来回的是一段 JSON。前端 `await r.json()` 在线上会抛异常、在本地
却能解析出对象，两边走的分支因此并不相同。现在本地也照抄这一页 HTML，
连 `<pre>` 里的路径都一致。

现在的结果：

| 检查 | 范围 | 结果 |
| --- | --- | --- |
| `crosscheck-api-surface` | 17 条明文接口 × GET/POST = 34 条 | **34 条全部与线上一致** |
| `compare-guest-responses` | 29 个游客接口 × 2 方法 = 58 条 | **58 条全部与线上一致** |
| `compare-response-bodies` | 68 个接口 × 2 方法 = 136 条 | **129 条逐字节一致**，另外 7 条是下面列出的有意差异 |
| `compare-afe-premium` | 精品课 29 条接口 + 静态资源 | **29 条全部与线上一致** |

### 第三步：小白教育的 POST 有一道门槛

小白教育的前端在 POST 时会带上自己的 `X-Requested-With: studio` 和
同源 `Origin`。线上没有这两样就直接 **403 请求来源不匹配**，连路由都
不看。这道门槛是逐个请求试出来的（`tools\probe-xb-all-paths.mjs` 记着
40 个接口 × 两种方法的线上答案）。本地照抄了这条规则，所以：

- 浏览器发起的 POST 一律正常；
- 从别的页面（或者脚本）硬发一个 POST，会得到和线上一样的 403。

### 对齐过程中改掉的那些地方

- `GET /api/programs/click`、`GET /api/programs/ratings` 线上是 **401**，
  之前本地一律返回 200；
- `GET /api/programs/sort-by-uses` 线上是 **405**（只收 POST）；
- `POST /api/programs`、`POST /api/premium/capabilities` 线上是 **405 / 404**，
  本地之前用 GET 的逻辑把它们也答了；
- `POST /api/points/balance`、`POST /api/premium/access`、`POST /api/trials`
  线上没有这个路由（404），本地之前被当成 GET 处理；
- `GET /api/creator/*`、`GET /api/user/update` 等线上是 404；
- 小白教育的 `/api/classroom/release` 线上是 **410**（没有课堂租约可退），
  本地之前回 200；
- `POST /api/auth/check-scan`、`POST /api/captcha-token` 线上只收 POST，
  现在本地也按方法区分（captcha token 同样是 16 位十六进制）；
- 图灵智赋的 `/api/runtime-status` 只存在于 `/tuxiaoling/` 命名空间下，
  顶层那条线上是 404；`/tuxiaoling/api/materials` 只有 POST 是 401，
  GET 是 404 —— 本地现在也把这两个命名空间分开处理；
- `GET /api/premium/access` 线上回 `{"error":"login_required"}`，
  本地原来写的是"请先登录"，现在改成和线上一样的字面量；
- 小白教育的未知路径线上是 **404 {"error":"未找到"}**（不是 SPA 兜底），
  静态文件用 POST 请求线上是 **405 {"error":"不支持此操作"}**；
- `/course-compat/long-march-save-policy.json` 是运行时才会去取的配置，
  之前漏了，本地现在也镜像了一份（线上 1062 字节）。

### 有意保留的本地差异

这些地方本地和线上**故意**不一样，都是"商业机制不需要"那一头：

| 位置 | 线上 | 本地 | 为什么 |
| --- | --- | --- | --- |
| `/api/premium/capabilities` | `{"enabled":true,"uploadsEnabled":true,...}` | `{"enabled":false,"uploadsEnabled":false,"playbackEnabled":true}` | 上传和投稿在本地关掉，前端因此不会把用不了的入口摆出来 |
| `/api/get-qrcode` | 微信扫码登录二维码 | "本地离线副本已自动使用本地身份" | 本地没有账号体系 |
| `/api/auth/verify`、`/api/programs/{id}`、`/api/programs/{id}/access-token` | 游客 401 | 本地身份 / 本地数据 | 让目录、详情弹窗和"立即使用"在离线时能走通 |
| `/api/library`、`/api/creator`（GET） | 401 请先登录 | 空列表（本地已安装的课件） | 同上：页面渲染得出来，而不是撞到登录墙 |
| `/api/downloads/prepare`（POST） | 401 | 交出本地镜像的那份课件 | 本地没有"下载"这个动作，文件本来就在机器上 |
| `/courseware/{id}.html` | 403 请从课件页面重新进入课堂 | 直接给文件 | 线上要课堂票据，本地没有票据系统 |
| `/api/programs` | 商品有价格 | 价格记为 0 | 商业化关掉，但不谎报可用性 |
| `/api/catalog`（小白教育） | 付费课要买 | 全部按"免费"渲染 | 同上 |
| `/api/auth/phone/status`（小白教育） | 开启手机号登录 | `enabled:false` | 本地不登录，也不该弹手机号验证码 |
| `/api/captcha-token` | 每次一个随机 token | 每次一个随机 token | 两边都是 16 位十六进制，只有值不同 |

状态码在这些地方仍然一致，差别只在响应体。

---

## 镜像到底忠不忠实 —— 两个项目合起来验

光是"页面能打开"也证明不了镜像忠实：万一某个脚本被改写过，界面照样
能渲染，只是行为和原站不一样。所以这里让 **REA** 和 **craft-anything**
各管一端，在同一件事上对上：

| | 负责什么 | 怎么做的 |
| --- | --- | --- |
| REA | **运行时**：浏览器真正加载了什么 | 抓本地页面的网络事件，连响应体字节一起留下来 |
| craft-anything | **静态**：这个 bundle 里到底有什么 | `js_app_map` 逐个模块算出 sha256 |

流程是这样的：

1. REA 打开 `http://localhost:4173/` 和 `http://localhost:4174/`，
   把每个脚本请求的**响应体**都留下来；
2. `tools\match-runtime-scripts.mjs` 对这些响应体算 sha256，
   同时和本地镜像文件的 sha256 对一遍；
3. 把这份清单交给 craft-anything 的 `js_runtime_code_match`，
   和静态图里的模块逐个比 digest。

结果：

| 站点 | 运行时脚本 | 静态模块 | digest 命中 | 镜像与响应体不一致 |
| --- | --- | --- | --- | --- |
| 小白教育 | 62 | 30 | **30 / 30** | **0** |
| 图灵智赋 | 21 | 21 | **21 / 21** | **0** |

也就是说：**浏览器拿到的每一个字节，都和镜像目录里的文件一模一样**，
而静态分析读到的每一个模块，也都在运行时被原样加载过。

图灵智赋还有 4 个模块（`admin-large/runtime/public-lease.mjs`、
两个长征播放宿主、`vendor/html2canvas.min.js`）在浏览页没被加载 —— 这
是正常的，html2canvas 是导出图片时才按需加载的，另外三个属于管理端和
播放页，游客页面不会打开。

```powershell
# 1. 抓本地运行时（响应体要带上）
node C:\Users\Administrator\AppData\Roaming\npm\node_modules\rea-agents\scripts\rea.mjs `
  capture-browser-scenario recon\scenario-local-afe-runtime.json --json `
  > recon\captures\local-afe-runtime.json

# 2. 算哈希、核对镜像
node tools\match-runtime-scripts.mjs

# 3. 交给 craft-anything 做静态↔运行时比对
node tools\craft-runtime-match.mjs
.\craft-anything\target\release\craft-anything-cli.exe --deep `
  --project recon\craft js_runtime_code_match `
  --json "@recon\craft-runtime-match-aifunengjiaoyu.params.json"
```

craft-anything 的调查报告在 `recon\craft-report.md`，brief、四条结论和
证据账都记在 `recon\craft\` 里。

---

## 断网也能用

镜像下来的前端代码原本还指着三个外部地址，都已经换成本地资源：

| 原来指向 | 现在 | 为什么 |
| --- | --- | --- |
| `fonts.googleapis.com` | `/fonts/noto-serif-sc.css` + 101 个 woff2 分片 | 标题用的思源宋体，断网就掉回系统字体 |
| `tuxiaoling-glb-2026.oss-cn-shenzhen.aliyuncs.com` | `/tuxiaoling/models/*.glb` | 图小灵场景栏里的 3D 模型（大众 ID Buzz、苯分子、细胞、地球） |
| `cdn.jsdelivr.net`（html2canvas） | `/assets/vendor/html2canvas.min.js` | 从 HTML 生成封面图时用的截图库 |

Cloudflare 的统计脚本（`static.cloudflareinsights.com`）本地没有对应物，
服务端在返回 HTML 时直接把它去掉。

查外链的工具：

```powershell
# 扫镜像目录
node tools\scan-live-deps.mjs mirror\aifunengjiaoyu mirror\xbjiaoyu\assets

# 扫浏览器实际拿到的内容（这个才准，服务端会改写）
node tools\scan-live-deps.mjs `
  http://localhost:4174/ `
  http://localhost:4174/assets/assets/app.17e3fb394175.min.js `
  http://localhost:4173/ `
  http://localhost:4173/courseware/mirror
```

剩下的几个 `w3.org` / `beian.miit.gov.cn` 是 SVG 命名空间和页脚备案号，
不会产生请求。

有一个 3D 模型（动物细胞结构）在原站的 OSS 桶里就不存在，线上同样是
404，本地保持同样的结果，不去猜别的文件名。

---

## 复刻时用了哪两个项目

### REA（`rea-agents`）—— 观测与取证

REA 负责"看清楚原站在干什么"这一段。它以 launch 模式拉起真实 Chrome，
按场景脚本走完交互，把截图、DOM 快照、accessibility 树、网络事件流、
控制台输出全量落到 `recon\captures\`。

用它跑过的场景（JSON 都留在 `recon\`）：

| 场景 | 用途 |
| --- | --- |
| `scenario-xb-catalog-local.json` | 小白教育目录页的真实 DOM 与筛选行为 |
| `scenario-play-<id>.json` | 每份课件的课堂握手与 3D 场景渲染 |
| `scenario-afe-browse.json` | 图灵智赋探索页的 12 个作品卡片 |
| `scenario-afe-detail.json` | 作品详情弹窗（封面 / 演示视频 / 图集） |
| `scenario-afe-launch.json` | "立即使用"点击后的请求序列 |
| `scenario-afe-tuxiaoling.json` | 图小灵助手面板的完整界面 |
| `scenario-afe-viewer-13.json` / `-469.json` | 摄像头类与常规类课件的播放器握手 |

### craft-anything —— 静态分析与报告

`craft-anything` 是 Rust 写的逆向 / 重建工具箱，本复刻用它做**读代码**
这一环：把混淆的前端 bundle 拆开、把 API 契约和运行时行为写成报告，
让"原站到底调了哪些接口"有据可查，而不是靠猜。

常用命令：

```powershell
cd C:\kaifa\xiaobai-class\craft-anything

# 列出这个工具箱能用哪些能力
.\target\release\craft-anything-cli.exe commands
.\target\release\craft-anything-cli.exe capabilities

# 对镜像下来的前端 bundle 做一次"初诊"
.\target\release\craft-anything-cli.exe triage `
  ..\mirror\aifunengjiaoyu\assets\assets\app.17e3fb394175.min.js

# 在项目账本里留下 brief、结论和证据（这一步要带 --deep 和 --project）
.\target\release\craft-anything-cli.exe --deep --project ..\recon\craft `
  core_brief_write --question "..." --purpose "..." --done-when "..."
.\target\release\craft-anything-cli.exe --deep --project ..\recon\craft `
  core_finding_record --statement "..." --evidence-ids '["ev_..."]' --confidence observed

# 出一份带证据的调查报告
.\target\release\craft-anything-cli.exe --deep --project ..\recon\craft `
  report --out ..\recon\craft-report.md
```

现在 `recon\craft-report.md` 里是一份完整的调查档案：一句提问、一段
目的、六条结论，每条都挂着证据 id，末尾是 10 条记录的证据账。

`rebuild` 子命令（让 agent 重建一个网站）是给"从零写"用的；本复刻走的是
**原样托管 + API 替身**的路子，所以没有用它 —— 界面既然能拿到原件，
重画只会更差。

#### 在这台机器上把它编出来

默认的 windows-gnu Rust 工具链在这台机器上还差三样东西，
`tools\build-craft-anything.ps1` 已经把它们补齐了：

| 缺什么 | 为什么需要 | 怎么补的 |
| --- | --- | --- |
| `dlltool.exe` 能找到的 `as.exe` | `windows-sys` 用 `raw-dylib`，要 dlltool 生成导入库，而 dlltool 会去调汇编器 | 从 MSYS2 镜像取 mingw-w64 binutils，把 `as.exe` 放到 rustc 的 sysroot 旁边 |
| 一个能用的 C 编译器 | `ring` 编译 C 代码，cc-rs 找不到 gcc 就直接失败 | 从同一镜像取完整的 mingw-w64 GCC 16.2 工具链 |
| crates 镜像 | crates.io 直连超时；SJTU 的索引又落后于 `Cargo.lock` | 换成 rsproxy.cn 的稀疏索引 |

```powershell
# 一次性装好工具链（binutils + gcc，缓存放在 tools\.cache）
node tools\install-mingw-binutils.mjs
node tools\install-mingw64-toolchain.mjs

# 之后就能直接编译
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\build-craft-anything.ps1
```

---

## 重新验证一遍

服务跑起来之后，下面这几条命令能把两站点重新体检一次：

```powershell
# 1. 53 份课件逐个打开，确认课堂握手成功、场景真的画出来了
$env:SETTLE_MS = 15000
node tools\verify-free-courses.mjs `
  (Get-ChildItem mirror\xbjiaoyu\courseware -Filter *.html |
   ForEach-Object { $_.BaseName })

# 2. 对截图做像素统计（控制台干净 != 画面非空）
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-capture-pixels.ps1

# 3. 确认两份课件投放槽位可用
node tools\test-courseware-slots.mjs

# 4. 接口和线上逐条对齐（三个层次）
node tools\crosscheck-api-surface.mjs
node tools\compare-guest-responses.mjs
node tools\compare-response-bodies.mjs
node tools\compare-afe-premium.mjs

# 5. 镜像保真度：运行时字节 vs 静态模块 digest
node tools\match-runtime-scripts.mjs
node tools\craft-runtime-match.mjs
```

`SETTLE_MS` 不能太小：重一点的课件要 15 秒左右才把实验台搭起来，
5 秒截到的是"正在准备实验台"那一屏。

---

## 边界说明

- 镜像范围 = 站点**公开发布**的内容 + 你自己有权访问的内容。
- 付费正文不破解、不绕过鉴权；未授权的部分在本地就明确显示为不可用。
- 精品课的 480 门课在本地全是**目录级**复刻（标题、分类、封面、套餐都
  在）；其中 33 门有正文、其余 447 门要 VIP，买了会员之后用
  `tools\pull-afe-premium.mjs --all` 就能补齐。
- 图灵智赋的云端 AI 生成、支付、提现等商业能力没有本地实现，因为它们
  依赖服务端的真实账户体系 —— 这部分按"多余的机制不需要"处理。

### 每一类内容到底能拿到多少 —— 逐条核实过的结论

| 内容 | 线上真实状态 | 本地现在有什么 |
| --- | --- | --- |
| 小白教育 · 550 份课件目录 | 公开 | **全部 550 份**（含 497 份付费目录） |
| 小白教育 · 53 份免费课件正文 | 匿名可玩（走课堂握手） | **53 份全部可玩**，逐个开过、截过图 |
| 小白教育 · 497 份付费正文 | `410 此课件请下载后使用` —— 线上**从不在线提供** | 目录里标着"待补齐"；用你的下载卡账号拉下来即可用 |
| 图灵智赋 · 442 个作品目录 | 公开 | **全部 442 个**，含真实价格与使用量 |
| 图灵智赋 · 442 个作品正文 | 登录后可试看，多数作品可取 | **437 个已镜像**并可玩，剩 5 个试看额度用尽 |
| 图灵智赋 · 480 门精品课目录 | 公开 | **全部 480 门**（10 套餐 / 224 分类 / 479 封面） |
| 图灵智赋 · 480 门精品课正文 | 33 门标了 `freeSample`，走官方试看通道；其余 447 门回 `403 premium_required` | **33 门完整落盘**，447 门要 VIP |
| 两站全部前端资源 | 公开 | **一个不差**（穷举爬取验证：图灵智赋 724 个 URL、小白教育 646 个 URL，缺口归零） |

两点需要说清楚：

1. **图灵智赋那 480 门精品课，线上只有 33 门是开着的。** 这 33 门在
   `/api/premium/catalogue` 里标着 `freeSample`，每门给 10 次试看额度，
   走 `POST /api/premium/playback/launch` → `GET /api/program-file/<id>/body`
   就能拿到正文，已经全部落盘。另外 447 门试了同样的接口，线上一律回
   `403 premium_required`，要会员才有。
2. **小白教育那 497 份付费正文线上也不在线提供**，只在你买的下载卡
   名下通过 `POST /api/downloads/prepare` 发文件，而且文件里带账号指纹
   （站点原话："此资源含有与下载账号关联的专属授权指纹，仅限您本人
   教学使用，禁止转发、共享或二次售卖"）。用**你自己的**下载卡账号
   拉到本机自己用，是站点设计的使用方式；本复刻照做，不多拿。

所以能补齐的最后一公里，只差你的两个登录态：

```powershell
# 图灵智赋：微信扫一下码（工具每分钟自动刷新二维码）
node tools/afe-login-api.mjs
# 扫完就会写出 recon\scratch\afe-token.txt，然后：
node tools/pull-afe-courseware.mjs --token (Get-Content recon\scratch\afe-token.txt)

# 小白教育：线上只收手机号+短信验证码（账号密码登录已被关掉，
# 返回 403「请使用手机号验证码登录」），拖动验证码不好自动过，
# 所以在浏览器里手动登一次，再把会话拿走：
node tools/xb-login-cookie.mjs
node tools/pull-xb-courseware.mjs --cookie (Get-Content recon\scratch\xb-cookie.txt)
```

