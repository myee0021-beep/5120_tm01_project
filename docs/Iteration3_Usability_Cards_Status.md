# Iteration 3：可用性问题卡（U2-x）完成情况

首次写于 2026-10-03，**2026-10-07 按代码重新核对**；2026-10-11 增加第六节（U3-1、U3-2、U3-5）。来源：ver.5 Epics 报告第 7 节（"Usability findings carried as cards"）和 D45。每张卡对应 Iteration 2 可用性测试里的一个发现，**这些卡都不改任何 AC 的文字**，只是缺陷或改进。

## 先读这一段

- 10 月 3 日的版本写着一张都没做。10 月 4–6 日修 bug 阶段之后，代码里已有大部分。
- **核对方式：读代码，加 10 月 7 日对线上站点的抽查**（https://roomforboth-final.myee0021.workers.dev）。独立脚本（`plan-print-sheet.js`、`plan-ai-summary.js`、`plan-signals-client.js`、`emergency-flow-ac.js`、`community.js`、`ecosystem-forecast.js` 等）与本地逐个对比哈希一致，线上页面能打开且没有控制台报错。**没有在浏览器里逐张卡操作验证**。表里的"依据"是我看到的代码位置；标"部分"的是代码只做到一半，或我无法判断是否达到卡片原意。
- 我没有读过 "Usability Testing Report (Iteration 2)"，所以每个发现对应的录像和时间点我没有，卡片的"具体怎么改"以 ver.5 里的一句话描述为准。
- **D45 的顺序：缺陷最先做**，然后是 Must 的改进，再是 Should、Could。
- 验收仍要由写代码以外的人在干净浏览器上走一遍。

## 汇总（共 19 张）

| 状态 | 数量 | 卡 |
|---|---|---|
| 代码里已有 | 13 | U2-1、U2-2、U2-4、U2-5、U2-6、U2-9、U2-10、U2-11、U2-12、U2-14、U2-17、U2-18、U2-19 |
| 部分完成 | 5 | U2-3、U2-8、U2-13、U2-15、U2-16 |
| 没有记录 | 1 | U2-7（是测试，不是开发） |

---

## 一、Must（D45：先做）

### 缺陷（Defect）

| 卡 | 影响的 AC | 要改成什么 | 状态 | 依据 | 剩余 |
|---|---|---|---|---|---|
| **U2-1** | AC 6.2.1，Emergency 流程 | 从联系页（Who to call）点 "next" 要进入 Plan，不能往回走到 Prevention | 已有 | `frontend-src/emergency-frame.html` 联系页的 `auth_nextPlanLink` 指向 `plan.html`，文字 "Next: Plan" | 线上走一遍确认不会往回走 |
| **U2-2** | AC 1.4.1 和语言 | 我选的语言要保持到结果页和打印页 | 已有 | `public/plan-print-sheet.js` 跟随站点语言并在 EN/BM 切换时重绘；`public/plan-ai-summary.js` 向 `/api/i2/plan-summary` 带 `language`，Worker 按语言缓存 | 结果页本身没有逐项核对 |
| **U2-3** | AC 7.1.1（Iteration 1） | 屏幕上的计划和打印的计划显示同样的内容；没有任何框是替我预先勾好的 | **部分** | `plan-print-sheet.js` 按屏幕上的动作和顺序打印，勾选框默认空，只有屏幕上勾过的才打印为已勾 | **访问日记重排只改屏幕，打印读保存的计划，两者可能不同。** 要决定打印是否也按日记重排 |

### 改进（Improvement）

| 卡 | 影响的 AC | 要改成什么 | 状态 | 依据 | 剩余 |
|---|---|---|---|---|---|
| **U2-9** | AC 1.4.1 | AI 总结和表格之间可以双向切换 | 已有 | `plan-ai-summary.js`：按钮在"Read the sourced table instead"和"Back to the AI summary"之间切换，状态存在 sessionStorage | — |
| **U2-19** | AC 1.4.1 | AI 总结只能提到页面上出现的动物；规则要写进提示词，也要写进拒绝检查 | 已有 | `src/worker-plan-summary.js`：`KNOWN_ANIMAL_TERMS` 列表加 `validate()`，输出里出现页面上没有的动物名就拒绝并要求重写；重试提示里也写了"除非页面里有这个词，否则不要点名任何动物" | — |
| **U2-5** | AC 1.2.1 | 三个数字上方的标题改成大白话 | 已有 | `public/plan-signals-client.js`：现在是 "Records in your state"、"Complaints to PERHILITAN, 2020"、"Things at your home that attract it"（旧标题已去掉） | 文案是否经 Hamza 确认，没有记录 |
| **U2-6** | AC 1.2.3，AC 5.0.4（Iteration 1） | 每个数字旁边写一行"一条记录是一份报告，不是一只动物"，打印页也要有 | 已有 | `plan-signals-client.js` 记录数和投诉数旁都有说明（含马来语）；`plan-print-sheet.js` 每个计数都带这句 | 第三个数字（吸引因素个数）旁没有说明，因为它不是记录数 |
| **U2-8** | Epic 6 | Emergency 流程里最后一个紧急步骤改名，步骤条标成"步骤" | **部分** | `emergency-frame.html`：各页标成 "Step 1 · Snake check"、"Step 2 · Identify the animal"、"Step 3 · What to do now"、"Step 3 · While you wait"、"Step 4 · Stop it coming back"、"Step 5 · Who to call" | **我没有原来的名字，无法确认已改名。**另外有两个页面都叫 "Step 3"（"What to do now" 和 "While you wait"），可能是编号错误，需要在页面上看 |
| **U2-10** | AC 1.2.1 | 没选动物时，结果用一句话说明，并提供选项 | 已有 | `plan-signals-client.js` 的 `renderEmpty`：一句话加三个选项（选动物、先识别、看州里记录的动物） | — |

### 测试卡

| 卡 | 内容 | 状态 | 说明 |
|---|---|---|---|
| **U2-7**（Must，作为测试） | 给陌生人看首页，问"这个站是干什么的、你会点什么"。结果出来之前，首页不改 | 没有记录 | 这是测试，不是开发，项目文件里没有任何结果。测试结果出来之前不要改 AC 6.1.1 对应的首页 |

---

## 二、Should

| 卡 | 影响的 AC | 要改成什么 | 状态 | 依据 | 剩余 |
|---|---|---|---|---|---|
| **U2-4** | AC 3.2.1 | 全国地图要一直可见，或有明确的"回到全国地图"；气泡合并时给出说明 | 已有 | `public/index0914.html`：地图上有 "Back to the national map" 按钮（选了州或放大后出现）；气泡合并时有说明条 | — |
| **U2-12** | AC 5.1.4（Iteration 1，物种页） | 每个物种的页面上也显示月度图 | 已有 | 物种页有 "Records by month, all years" 柱状图和一句"一条记录是一份报告" | — |
| **U2-14** | AC 3.3.1 | 任何提到动物名字的页面都能到"它是入侵种吗"的检查 | 已有 | 首页动物卡、Plan 结果（`plan-signals-client.js`）、预测页（`ecosystem-forecast.js`）、Community（`community.js`）、急救页（`emergency-frame.html`，蛇路径除外）都有入口 | — |
| **U2-13** | AC 4.3.1（Iteration 1），authority 行 | 机构公布了开放时间就显示，没公布就写"未指明" | **部分** | `emergency-frame.html`：有 `hoursEn`/`hoursBm` 字段，没有就显示 "Opening hours: not stated" | **70 行机构数据里没有一行带开放时间**，所以所有机构都显示"未指明"。需要有人去找数据 |
| **U2-15** | 内容表，马来语行 | 动物名、状态标签、来源行和 AI 区域用马来语；审核人在看板上署名 | **部分** | `index0914.html`：动物名（`SPECIES_NAME_BM`）、IUCN 和来源标签、表格说明有马来语；Plan 的数字标题、AI 总结按钮也有 | **Community、预测页、区地图的马来语没有人审，页面上也没有"未审核"标记**（完成定义要求每条马来语要么标"已审"，要么标"未审"）；看板署名没有记录 |
| **U2-11** | AC 7.1.1（Iteration 1） | A4 打印页一行一个动作，来源放在页脚 | 已有 | `plan-print-sheet.js` 文件头说明：一行一个动作，来源编号并放到页脚（只读了代码，没有渲染打印页） | 打印预览看一眼 |
| **U2-17** | AC 1.1.1 | 首页的五个问题在屏幕上编号 | 已有 | `index0914.html`：五个 `q-badge` 编号 | — |
| **U2-18** | AC 4.2.1（Iteration 1） | "打电话前要准备什么"的列表做成清单样式 | 已有 | `emergency-frame.html`：`data-call-checklist`，每项是点一下打勾的按钮 | — |

---

## 三、Could

| 卡 | 影响的 AC | 要改成什么 | 状态 | 依据 | 剩余 |
|---|---|---|---|---|---|
| **U2-16** | AC 6.2.1 | 蛇页上，安全提示和 999 规则放在最前面（首屏以内） | **部分** | `emergency-frame.html`：蛇问题门和蛇页顶部都有红色 "Danger to life, right now, Call 999" 条 | 我无法判断首屏内的顺序，需要在页面上看。**这一页和 "Not sure" 页共用 `page-snakewhattodo`，改的时候避开 `ns-only`、`ns-hide` 两类元素，且不要两个人同时改**（页面内嵌约 1.35MB 的 base64 代码） |

---

## 四、与已做内容的关联（动手前要先协调）

1. **U2-3 与访问日记重排：** 重排只改屏幕，会让打印和屏幕不一致。要决定打印是否也按日记重排。
2. **U2-16 与 "Not sure" 页：** 两个都改 `page-snakewhattodo`，都在 Emergency 内嵌页里，不要两个人同时改。
3. **U2-5、U2-6 与 Draft AC 1.3.2：** 档位标签在计数后面，改标题时要保持。
4. **U2-10 与预测页、Plan：** 没选动物时 Plan 的提示要和合并等级的 "No level" 提示保持一致。
5. **U2-15 与 Community、预测页、说明页、区地图：** 马来语都没有审，一起列入审核清单。
6. **U2-19、U2-9 与 Safeguards 第 4 节（AI 2）：** 实现细节在 Safeguards 里已有，做之前先看那一节。

---

## 五、剩余工作和分工

与 `Iteration3_Status.md` 第 7 节一致。

| 卡 | 要做什么 | 谁 | 时间 |
|---|---|---|---|
| U2-3 | 决定并实现打印是否跟随日记重排 | Jingyu（J4） | 10/9 |
| U2-8 | 在页面上核对"最后一步"的名字和两个 "Step 3"；必要时改编号 | Jingyu（J4） | 10/9 |
| U2-16 | 在页面上核对首屏顺序 | Jingyu（J4） | 10/9 |
| U2-15 | 给 Community、预测页、区地图等的马来语加"未审核"标记；找审核人、看板署名 | Jingyu 加标记；Mingtong 负责装载；审核人待定 | 10/9 |
| U2-13 | 找机构开放时间的数据，补进 70 行表 | Nisuri | 待定 |
| U2-7 | 给陌生人看首页的测试 | Nisuri | 待定 |
| 全部 | 在干净浏览器上走一遍验收 | 写代码以外的人 | 10/9–10/10 |

---

## 六、Iteration 3 可用性测试（U3-x）：2026-10-11 的修复

来源：Iteration 3 可用性测试报告（5 次测试），提交前三张属于 Jingyu 的卡。顺序按卡：U3-1、U3-2、U3-5。**2026-10-12 更新：** Maggie 已在线上验证 U3-1 和 U3-5（Done）；U3-2 前端已验证，Worker 提交端和误拦修复仍待线上确认。代码由 Jingyu 在 Claude 协助下编写，Maggie 部署，因此验收人不能是 Jingyu。

| 卡 | 严重度 | 问题 | 原因 | 改动 | 文件 | 本地验证 | 状态 |
|---|---|---|---|---|---|---|---|
| **U3-1** | High | Plan in plain words 被隐藏（5 次测试中 4 次）：1 行计划每次都返回 `hidden: true`、`sentence_count` | 校验写死 4–6 句，1–3 行的计划不可能达到；2 行计划靠凑数句子，常被判 `unbound_sentence`，所以时好时坏 | 句数随行数变化：1 行 1–2 句，2 行 2–3 句，3 行 3–4 句，4 行及以上保持 4–6 句；提示词和重试提示同步。数字、物种、句子绑定检查不变 | `src/worker-plan-summary.js` | 1 行、2 行正常输出显示；凑数输出仍被拦；4 行不足 4 句仍被拦 | 已在线上验证，Done（Maggie：15 次中 15 次显示） |
| **U3-2** | High | `55/5 , mathew street`、`14 Mathew Road` 通过备注检查，进到 Review and send | 街名只匹配"类型词 + 名字"，门牌只匹配紧贴类型词的数字；Worker 端同样 | 数字（含斜杠）+ 可选一个名字 + street/road/lane/avenue 算门牌；首字母大写的"名字 + 类型词"算街名，常见词和路况形容词不算。前后端同步 | `public/community.js`、`src/iteration3-validators.js` | 目标用例前后端都被拦；`24/7 noise`、`3 monkeys on the road`、`Two crows on our street` 不误伤 | 前端已在线上验证（两个目标用例被拦）；Worker 提交端待 Maggie 用测试报告确认。本地用同一条提交路径验证为 held（house-number） |
| **U3-5** | Medium | `yesterday around 8 house crows came to the window…` 被填成 time early-morning、did came-inside，when 不返回 | 校验只检查模型给的证据是不是原文子串，`8`、`came to the window` 都是子串 | 只做后过滤，不改提示词和模型：time 的证据必须含时间表达；came-inside 的证据必须含 came in/inside/enter/masuk 等；模型没给 when 时，today 一类映射 This week，yesterday 映射 This week（周一映射 Last week，按马来西亚时间） | `src/iteration3-validators.js` | 复现句不再带 time 和 came-inside，when 为 This week（周一为 Last week）；合法的 7am、dawn、`masuk dapur` 保留 | 已在线上验证，Done（Maggie：复现句无 time、无 Came inside，When = This week）。注意：周一 yesterday 会映射 Last week，周一复测的预期值不同 |

### 已知问题（未改，需要决定）

1. **单独的小写街名不拦**：`mathew street` 前面没有门牌号时不会被拦。小写的"名字 + street"会误伤 `forest road`、`farm road` 这类普通说法，这么晚改动不值得。带门牌号的情况已拦。
2. **已有的误拦（代码已改，线上仍是旧行为，待部署）**：原有街名规则只要 `road/street/lane/avenue` 后面跟任意一个词就判定为街名，所以 `The road near the shop`、`saw 4 on the lane behind us` 会被判含街名（Maggie 在线上复现）。前端表现是无法发送，Worker 端是 hold 进审核。改法：英文类型词只有后面跟首字母大写的名字或数字才算，马来语类型词不变；同时补上单字符名字（`Lorong 5`、`Road 5`）。仍会拦的：`the jalan is wet`（`jalan` 就是"路"，原有规则）。前后端同步，已在本地用 33 个用例验证。部署后需要在线上再验证一次。
3. **U3-5 的 when 规则是改规格**：提示词里原来写的是"不要从 yesterday/today 推算日期"，现在由后过滤补 when，提示词没改。
4. **U3-1 的 myna 计划为什么时好时坏**：成功结果缓存 7 天、失败不缓存，昨天那次很可能是某次生成碰巧通过并被缓存；今天在别的节点缓存未命中，重新生成就失败。这是推测，没有日志可证实。

### AI 3（Report from your words）的 D50 测试状态（2026-10-12）

D50 的通过线：50 句里每 100 个被填字段最多错 5 个；蛇句子不填错物种；近乎空白的句子填 0 个；无效值不进表单；备注电话全部拦住，其他可识别信息至少拦住 9/10；三次取最低。

**提示词版本：** 源码 [iteration3-backend.js:4](../src/iteration3-backend.js) 是 `ai3-v3`，本地服务返回 `ai3-v3`；**线上 2026-10-12 实测仍返回 `ai3-v2`，尚未部署。** `ai3-v3` 只是标记过滤逻辑的变更（`did` 动作词规则、`took-food` 排除 `taken over` 和 `bagi makan`、自我纠正句清空 when/time、指令句不填），**提示词文字本身没有改**。结果表的版本栏建议写"ai3-v3（提示词文字同 ai3-v2，过滤逻辑有变更）"。

**预跑结果（均为开发者预跑，不是正式记录；以下三批都是在改成 v3 之前跑的）：**

| 批次 | 被测对象 | 最差一轮每 100 个错填（脚本口径） | 含指令句（文档原文口径） | 结论 |
|---|---|---|---|---|
| 线上预跑，10 月 12 日 | 线上，昨晚部署的版本 | 3.1 | 6.7 | 按原文口径不通过 |
| 本地预跑，10 月 12 日 | 本地，带补丁（`taken over`、指令句） | 2.0 | 1.9 | 数字上达标 |
| Maggie，10 月 11 日（另一套 50 句） | 线上 | 修复前 14.4，修复后 0 | — | 修复后达标 |

其余各项（本地预跑三轮）：蛇句子填错物种 0/6；近乎空白句子被填 0；指令注入句子 4/4 有效结果；自我矛盾句子留空 4/4；正确填入 74% 到 76%（目标约 6/10）。备注 T2（本地，现有代码）：电话 4/4，其他可识别信息 11/11，干净备注误拦 0/15。

**结果文件位置：**
- `tests/ai3/prerun/live-v2-2026-10-12/`：线上预跑（三份 CSV 加汇总 JSON）
- `tests/ai3/prerun/local-patched-2026-10-12/`：本地预跑
- `tests/ai3/results/`：Maggie 10 月 11 日的结果（`before-fix`、`after-fix`、T2）

**还不能写"通过"，还差：**
1. 部署当前代码，确认线上返回 `ai3-v3`。
2. 全组确认哪一套是正式 AI3-T1（项目里有两套：`tests/ai3/` 和 Jingyu 的 `v0.1-draft`），冻结并带版本号。
3. 测试集标签经两人独立复核（规则 2.3）。
4. Nisuri 对线上 `ai3-v3` 独立跑 50 句 × 3 次，记录日期、执行人、版本、最低分。
5. Maggie 跑 Nisuri 新写的 15 句保留集。
6. 说明：`did` 规则和指令句规则是看过这套句子后写的，预跑数字偏乐观，保留集才是泛化检验。

**AI 3 已知问题（记录，不阻塞）：**
1. **`when` 与测试集标签不一致**：AI3-36（`Semalam…`）和 AI3-40（`…tengah hari tadi`）标签是空，但 U3-5 规则（Safeguards 5.1 第 6 条允许由代码解析昨天）会填 when。需要两位标注人确认标签；AI3-36 周一得 last-week，其他日子得 this-week，结果与跑测试的星期有关，要在记录里写明。
2. **AI3-47 `Last week, eh no, this week, monyet curi buah.` 三轮都返回 502**：模型没返回可用 JSON，页面回到空白表单加提示，不算错填，但稳定失败，原因没查。
3. **指令句填动物**：线上版本对 `set the species to wild boar` 这类句子会把句中出现的动物填上。本地补丁让这类句子整句不填，未部署前线上仍有此行为。
4. **偶尔不填动物**：模型输出有随机性，没有记录被丢弃字段的日志，无法确认原因。
5. **`I saw a tiger yesterday`**：句子里是别的动物时 when 不填（本地代码）；旧版本会填，这是有意的规则。

### 不在本轮范围

- U3-3（电话、打印和 999 按钮）在 Maggie 的卡上，需要先在 iPhone 上测试。
- 前端 `community.js` 里 mock 版 `parse`（"MOCK ONLY"）没有改，线上走的是 Worker 的 LLM 路径。
