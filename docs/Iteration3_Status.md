# Iteration 3 项目状态

**2026-10-07，线上核对版。** 首次写于 10 月 3 日，当时只读了本地代码。这一版加入了对线上站点的实际检查，写清楚了哪些是"看到线上确实如此"，哪些只是"本地代码里有"，哪些我没有验证。

线上地址：**https://roomforboth-final.myee0021.workers.dev**

## 一句话

团队报告 Iteration 3 的前端、数据清洗、特征工程、模型训练、后端、数据库连接、上线和 bug 修复都已完成。线上核对支持这一点：站点在运行，已发布的数据来自数据库，页面和脚本与本地一致。**但线上有一个会影响 AC 1.3.1 和 Draft AC 1.3.2 的问题（`signal_threshold` 表是空的），区级地图和区域模型还没有部署，AC 11.3.1 的正式测试记录仍然是空的。** 详见第 3 节。

## 怎么核对的

| 方法 | 做了什么 |
|---|---|
| 读本地代码 | 路由、页面、脚本、迁移文件、ML 脚本和输出 |
| 线上 GET 请求 | 打开线上首页，请求十几个静态文件和只读接口，把线上文件和本地文件逐个对比哈希 |
| 在浏览器里打开线上页面 | Community、预测页、说明页、访问日记、About the data、How this is computed；看页面文字和控制台报错 |
| **没有做的** | 在线上提交帖子、做审核决定、调用 AI 路由（这些会写数据或产生费用，也需要密钥）；触发定时删除；查看 Cloudflare 的部署记录（部署 id 和时间）、secrets 和数据库表结构 |

---

## 1. 完成情况和分工

| 工作 | 谁 | 时间 | 状态 | 依据 |
|---|---|---|---|---|
| 数据清洗 | Mingtong | 10/3 | 完成（团队报告） | `ml/build_dataset.py` 有 7 项检查；`ml/data/ml_dataset_v3.csv` 12,131 行 |
| 特征工程 | Jingyu 和 Mingtong | 10/3 | 完成（团队报告） | 从约 40 个候选特征缩到 6 个：species、state、month、year、州人口 2020、森林保护区面积；`train_and_export.py` 禁止记录数、占比等作为特征 |
| 模型训练（州模型） | Jingyu | 设计 10/2–3 | 完成 | `ml/output/` 里有模型、预测文件和评估报告；文件里记录的训练日期是 2026-10-01，以文件为准。2024 年 AUC 0.941 / Brier 0.094，与简单平均相当 |
| 区域模型（网格位置） | Jingyu | 10/7 | 完成，已部署（10/7） | `ml/train_grid_model.py`；2024 年 AUC 0.887 / Brier 0.116；预测页“按区域（28 km 方格）”读取 `public/forecast_grid_predictions.json`（`ml/output/grid_predictions.json` 的副本） |
| 前端开发 | Jingyu | 10/3–4 | 完成 | 线上页面可见：说明页、Plan、访问日记、Community、预测页、方法页、About the data |
| 区级地图 | Jingyu | 10/7 | 完成，**未部署** | 本地可用；线上 `ecosystem-districts-data.js` 返回 404 |
| 后端开发 | Maggie | 10/4–6 | 完成 | 线上接口能响应：`/api/community`、`/api/community/review/*`、`/api/i3/signal-thresholds`、`/api/i2/*` |
| 数据库连接 | Maggie | 10/4–6 | 完成 | 线上 `/api/community` 返回 2 条已发布的帖子；`/api/i2/complaints` 返回 60 行，`/api/i2/attractants` 返回 15 行 |
| 项目上线 | Maggie | 10/4–7（线上文件版本号最晚到 20261007） | 完成 | 线上站点 HTTP 200；Cloudflare 边缘节点在吉隆坡（`colo=KUL`）；Worker 名 `roomforboth-final` |
| Bug 修复 | Maggie | 10/4–6 | 完成 | U2 可用性卡 13 张的修复在代码里；独立脚本里的部分（打印、AI 总结、Plan 数字标题）已与线上逐个对比一致，首页内嵌和急救页的部分按首页 HTML 基本一致推断（详见 `Iteration3_Usability_Cards_Status.md`） |

---

## 2. 线上核对结果

| 检查 | 结果 |
|---|---|
| 首页 | 能打开，HTTP 200，约 6.75 MB |
| 页面和控制台 | Community、预测页、方法页、访问日记、About the data、How this is computed 都能打开，**没有控制台报错** |
| 静态文件与本地是否一致 | 抽查 16 个文件（`community.js`、`community-api.js`、`encounter-log.js`、`ecosystem-forecast.js`、`ecosystem-forecast-method.js`、`plan-print-sheet.js`、`plan-signals-client.js`、`plan-ai-summary.js`、`plan-how-computed.js`、`signal-thresholds.js`、`emergency-flow-ac.js`、`ac-compliance.js`、`print-ac-fixes.js`、`forecast_predictions.json`、`forecast_evaluation.json`、`signal_threshold.json`），**全部与本地一致** |
| 首页 HTML | 与本地逐行对比，我检查的差异都是今天的区级地图改动；线上多一行 `community-api.js`，它是 Worker 在运行时注入的。差异共 308 行，我只看了前 60 行 |
| Community 读取 | `/api/community` 返回 2 条已发布的帖子：`R-2026-0001`（Ulu Langat，10/4）和 `R-2026-0002`（Klang，10/5）。说明提交、审核、发布流程至少跑通过一次；两条看起来是测试帖 |
| 审核接口 | `/api/community/review/queue` 和 `/log` 没有 key 时返回 401 |
| 阈值接口 | `/api/i3/signal-thresholds` 返回 `{"ok":true,"rows":[]}`，**没有任何行** |
| 预测评估记录 | 线上 `forecast_evaluation.json` 的 `run_by` 仍是 null |
| 区级地图 | `/ecosystem-districts-data.js` 返回 404，没有部署 |
| 页面里加载的脚本 | 共 24 个：2 个 CDN（Tailwind、Leaflet）、8 个写在首页里、**14 个由 Worker 运行时注入**（`about-ai-routes`、`ac-compliance`、`community-api`、`complaint-db-client`、`emergency-flow-ac`、`general-guidance-image-fix`、`home-live-data`、`plan-ai-summary`、`plan-db-client`、`plan-print-sheet`、`plan-result-cleanup`、`plan-result-consistency`、`print-ac-fixes`、`print-plan-recovery`） |

---

## 3. 线上发现的问题

| # | 问题 | 影响 | 怎么处理 |
|---|---|---|---|
| 1 | **`signal_threshold` 表在线上是空的。** 打开线上 How this is computed，三个信号和合并等级都显示 "No signed value is held for this signal, so no band is shown"，算例的档位列显示 "Not recorded"/"None" | AC 1.3.1 的分档表在线上不显示；按代码，Draft AC 1.3.2 的档位和合并等级也不显示，Plan 结果页只剩计数（Plan 结果页我没有在线上打开） | 原因：接口请求成功但返回空数组，`public/signal-thresholds.js` 只在请求失败时才回退到 `signal_threshold.json`。两种修法：(a) 在 Neon 里执行 `database_code/iteration3_create_tables.sql` 里的 D46 签字行 `INSERT`（含 `min_records = 30`）；(b) 前端在返回空数组时也回退到 JSON。(a) 才是长期做法，且 `min_records` 要 Lead 按 D38 签字 |
| 2 | **区级地图和区域模型还在本地，没有部署** | mentor review 要求的位置功能线上看不到 | 部署 `public/index0914.html`、`public/ecosystem-districts-data.js` 和 `ml/output/grid_*`（若要上页面还需要前端读取，目前页面还没有区域模型方格层） |
| 3 | **AC 11.3.1 的正式测试记录仍为空**（`run_by` null）；方法页的所有结果格显示"尚未测试" | AC 11.2.2 和 11.3.1 不满足 | 由训练者以外的成员重跑 `ml/build_dataset.py`、`ml/train_and_export.py`，把评估报告填上 `run_by` 和日期，替换 `public/forecast_evaluation.json` |
| 4 | 预测页没有"计数回退"路径；切分点（0.80/0.40）没有写进导出文件的 `metadata`；`train_and_export.py` 没有自动检查发布门槛 | AC 11.3.1(2)、AC 11.1.1(2) 的要求没有完全满足 | 见第 6 节第 6 项 |
| 5 | 迁移脚本和安装说明里的表名过时：`database_code/iteration3_create_tables.sql` 和 `BACKEND_SETUP.md` 写 `community_report`、`community_review_log`，代码和线上用 `community_post`、`review_log` | 按文档从零搭环境会建出不对的表 | 把脚本和文档改成与代码一致 |
| 6 | 线上有 14 个运行时注入的补丁脚本；Build 文档的预期是"只有基础版本" | Build 文档第 4 节的预期与事实不符 | 逐个说明，或合并进基础版；清单已在第 2 节 |
| 7 | 线上有 2 条测试帖（`R-2026-0001`、`R-2026-0002`） | 演示或评审时会被当成真实数据 | 决定保留还是删除 |
| 8 | 部署 id、部署时间、回滚记录、secrets 是否齐全，在项目文件里找不到 | Build 文档第 2、5 节没法填 | 需要从 Cloudflare 看板取 |

---

## 4. Iteration 3 各条 AC 的状态

"线上可见"指我在线上页面或接口里看到了对应内容；"线上交互未验证"指页面在，但我没有操作（提交、审核、AI 调用等）。

| AC | 状态 | 说明 |
|---|---|---|
| **1.3.1** 说明页 | **线上有问题** | 页面在，但分档表为空（问题 1） |
| **Draft 1.3.2** 档位和合并等级 | **线上有问题** | 同上 |
| **2.3.1–2.3.4** 访问日记 | 线上可见，交互未验证 | 只在浏览器里运行；日记重排不同步到打印页，见问题清单（U2-3） |
| **5.1.1** How review works | 线上可见 | 页面写 15 天保留期 |
| **5.2.1** 地区帖子列表 | 线上可见，**数据来自数据库** | `/api/community` 返回已发布帖 |
| **5.3.1** 三步分享 | 线上间接验证 | 数据库里有两条提交并发布的帖子，说明提交可用；照片默认不存（代码里 `PHOTO_REVIEW_ENABLED` 默认关闭，线上设置未核实） |
| **5.4.1** AI 填表 | 代码里有，线上未验证 | 没有调用 `/api/community/fill`；需要 `MINIMAX_API_KEY` |
| **5.5.1** 个人信息检查 | 代码里有，线上交互未验证 | 页面和服务端都检查；服务端对不带称谓的姓名不检查 |
| **5.6.1** 审核队列 | 线上部分验证 | 接口要求 key（401）；决定流程和 15 天删除没有验证 |
| **11.1.1、11.1.2、11.2.1** 预测页 | 线上可见 | 页面读静态文件，与本地一致 |
| **11.2.2** 方法页 | 线上可见，**测试结果为空** | `run_by` 为 null |
| **11.3.1** 发布门槛和回退 | **未满足** | 无正式测试记录；无计数回退 |
| **11.3.2** 只用过往数据、读静态文件 | 脚本里有检查；页面确实读静态文件 | 线上请求不触发模型 |
| **Epic 10** About the data | 线上可见 | 有地区列表、Community、Wildlife forecast 行；没有单独列森林、人口、训练集和网格数据 |
| **AC 3.4.1、4.3.1、4.3.2** | **不做（D47）** | 留在 Backlog |

---

## 5. 没有对应 AC，但已做的

| 项 | 说明 |
|---|---|
| 区级地图（V2 + 区边界） | 来自 10 月 6 日 mentor review；57.4% 的记录能归到区，其余只到州；未部署 |
| ML 区域模型（网格位置） | 同上；不在 Epic 11 的六条 AC 里；未部署 |
| 地图的年份和月份筛选 | ver.4、ver.5 写"不在 Iteration 3 范围"；已做，区视图也用 |
| 备注检查的额外规则 | 邮箱、网址、邮编、不带称谓的姓名（页面检查） |
| "Filled from your sentence" 标记 | Safeguards 有，AC 5.4.1 没写 |

---

## 6. 需要团队拍板

| # | 事项 | 现状 |
|---|---|---|
| 1 | **D51 要不要通过**（档位切分点 0.80/0.40、模型不用历史特征、发布门槛、"in a month"） | Epics 里状态是"提议，尚未同意" |
| 2 | **`min_records` 行由 Lead 按 D38 签字** | 问题 1 的修法 (a) 要用到 |
| 3 | **区域模型和区级地图要不要写进 Epics，写成哪条 AC** | 没有对应 AC。老师说的"locality"指网格位置还是 V2 里的 `locality` 文字，建议直接问老师 |
| 4 | **网格 CSV 和现有训练集是两份数据** | 网格文件多 191 条记录、没有单年、没有布城、一个方格只归一个州 |
| 5 | **Plan 重排要不要同步到打印页** | 现在不同步，与 U2-3 冲突 |
| 6 | **回退（过去十二个月的记录占比）怎么算** | 构建时生成，还是页面现算 |
| 7 | **照片存哪里、这一期做不做** | 未定，可选功能 |
| 8 | **地区名统一** | 区地图用 geoBoundaries 的写法（如 Ulu Langat），Community 用 DOSM 名，前端手写 133 个 |
| 9 | **两条线上测试帖和地图年月筛选的去留** | 见问题 7 和第 5 节 |

---

## 7. 剩下要做的事

| 谁 | 事项 | 对应 |
|---|---|---|
| Maggie | 往线上 `signal_threshold` 表里加 D46 签字行（等 Lead 签字） | 问题 1 |
| Maggie | 把迁移脚本和 `BACKEND_SETUP.md` 的表名改成与代码一致 | 问题 5 |
| Maggie | 从 Cloudflare 取部署 id、时间、回滚记录，补 Build 文档第 1、2、5 节；核对 secrets | 问题 8 |
| Maggie | 作为检查人重跑州模型并记录 `run_by`，替换线上 `forecast_evaluation.json` | 问题 3 |
| Maggie | 线上验证提交 → 审核 → 发布、15 天定时删除、AI 3 路由和限流（我没验证的部分） | 第 4 节 |
| Jingyu | 部署区级地图和（如需要）区域模型；把区域模型放到地图上 | 问题 2 |
| Jingyu | 计数回退、切分点写入 metadata、门槛自动检查 | 问题 4 |
| Jingyu | 处理 U2 遗留：打印和日记重排、"最后一步"的名字、蛇页首屏、马来语"未审核"标记 | Usability 文档 |
| Jingyu | Figma 修改（site map、保留期文案、Plan 14/15、Community 06、Ecosystem 12） | 另见对话 |
| 其他成员 | U2-7 首页测试、U2-13 开放时间数据、AI 测试集、干净浏览器上的 walkthrough | Usability 文档 |
