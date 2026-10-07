# Iteration 3：可用性问题卡（U2-x）完成情况

首次写于 2026-10-03，**2026-10-07 按代码重新核对**。来源：ver.5 Epics 报告第 7 节（"Usability findings carried as cards"）和 D45。每张卡对应 Iteration 2 可用性测试里的一个发现，**这些卡都不改任何 AC 的文字**，只是缺陷或改进。

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
