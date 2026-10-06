# Iteration 3：可用性问题卡（U2-x）还没做的部分

写于 2026-10-03。来源：ver.5 Epics 报告第 7 节（"Usability findings carried as cards"）和 D45。每张卡对应 Iteration 2 可用性测试里的一个发现，**这些卡都不改任何 AC 的文字**，只是缺陷或改进。

## 先读这一段

- **本次会话里我没有动过任何一张 U2 卡**（共 19 张改进或缺陷，加 1 张测试卡 U2-7）。下面的"现状"栏是我根据已有代码做的判断，没有逐一在页面上验证过，标了"我没有核实"的就是没看过。
- 我**没有读过** "Usability Testing Report (Iteration 2)"，所以每个发现对应的录像和时间点我没有，卡片的"具体怎么改"以 ver.5 里的一句话描述为准。需要细节要回到那份报告。
- **D45 的顺序：缺陷最先做**，然后是 Must 的改进，再是 Should、Could。
- 负责人是 ver.4 和 ver.5 里写的；"Hamza 给文案"指 Mirza Hamza Foad 提供要写的句子。

---

## 一、Must（D45：先做）

### 缺陷（Defect）

| 卡 | 影响的 AC | 要改成什么（原文大意） | 负责人 | 现状和提示 |
|---|---|---|---|---|
| **U2-1** | AC 6.2.1，Emergency 流程 | 从联系页（Who to call）点 "next" 要进入 Plan，**不能往回走到 Prevention** | Jingyu Zhen | 没做。Emergency 页是内嵌的 iframe 页面，导航在 `emergency-flow-ac.js` 和页面自己的脚本里，已有"Next: Plan"的修补（把 "Next: Prevention" 改成 "Next: Plan"），需要确认联系页那一步是否仍有问题 |
| **U2-2** | AC 1.4.1 和语言 | 我选的语言要保持到**结果页和打印页** | Xingyu Ye | 没做。语言开关靠 `html[lang]` 和 localStorage `roomForBoth.lang`；要查 Plan 结果、打印页和 AI 总结在切换语言后是否沿用同一语言（AI 总结要和所选语言一致，Safeguards 4.1 第 6 条也要求） |
| **U2-3** | AC 7.1.1（Iteration 1） | 屏幕上的计划和打印的计划**显示同样的内容**；**没有任何框是替我预先勾好的** | Xingyu Ye | 没做。打印读的是 `roomForBoth.currentPlanSnapshot` 快照（`plan-db-client.js` 写、`print-*.js` 读）。**注意：我做的访问日记重排只改了屏幕，没有同步到打印，两者会不一致，这张卡要一起处理** |

### 改进（Improvement）

| 卡 | 影响的 AC | 要改成什么 | 负责人 | 现状和提示 |
|---|---|---|---|---|
| **U2-9** | AC 1.4.1 | AI 总结和表格之间**可以双向切换** | Xingyu Ye | 没做。相关文件 `plan-ai-summary.js`、`src/worker-plan-summary.js`。Safeguards 4.1 第 8 条也要求"总结和表格相隔一次点击，双向" |
| **U2-19** | AC 1.4.1 | AI 总结**只能提到页面上出现的动物**；规则要写进提示词，**也要写进拒绝检查** | Jingyu Zhen | 没做。Safeguards 4.1 第 3 条：用 species 表里七种动物的中英文名和别名建一个列表，输出里出现不在页面上的名字就拒绝 |
| **U2-5** | AC 1.2.1 | 三个数字上方的标题改成**大白话** | Xingyu Ye（文案 Hamza） | 没做。标题在 `plan-signals-client.js`（"Recorded occurrences"、"Conflict complaints"、"Documented attractants matched"）；我做的档位标签不改变这些标题。**需要 Hamza 的文案** |
| **U2-6** | AC 1.2.3，AC 5.0.4（Iteration 1） | 每个数字旁边写一行"**一条记录是一份报告，不是一只动物**"，**打印页也要有** | Xingyu Ye（文案 Hamza） | **部分**：Plan 的 "Signals for your home" 卡片底部已经有一句 "Records are observations, not animals…"，但**不是每个数字旁边，打印页也没有**。我没有逐页核实 |
| **U2-8** | Epic 6 | Emergency 流程里**最后一个紧急步骤改名**，步骤条标成"步骤" | Xingyu Ye（文案 Hamza） | 没做。**需要 Hamza 的文案**；Emergency 页是内嵌 iframe |
| **U2-10** | AC 1.2.1 | **没选动物时**，结果用**一句话**说明，并提供选项 | Xingyu Ye（文案 Hamza） | 没做。现在 `plan-signals-client.js` 在没选动物时写 "No species was selected in the questionnaire. No species signal is invented."，需要按 Hamza 的句子改成一句话并带选择按钮 |

### 测试卡

| 卡 | 内容 | 负责人 | 说明 |
|---|---|---|---|
| **U2-7**（Must，作为测试） | 给陌生人看首页，问"这个站是干什么的、你会点什么"。**在结果出来之前，首页不改** | Nisuri Edirisinghe | 这是测试，不是开发。**测试结果出来之前不要改 AC 6.1.1 对应的首页** |

---

## 二、Should

| 卡 | 影响的 AC | 要改成什么 | 负责人 | 现状和提示 |
|---|---|---|---|---|
| **U2-4** | AC 3.2.1 | 全国地图要**一直可见**，或有一个**明确的"回到全国地图"**；气泡合并时给出说明 | Jingyu Zhen | 没做。地图页里已有 "Back to the national map" 按钮，但只在选中某州后出现；"气泡合并时的说明"点开气泡有弹窗。我没有核实用户测试时具体遇到什么 |
| **U2-12** | AC 5.1.4（Iteration 1，物种页） | **每个物种的页面上也显示月度图** | Jingyu Zhen | 没做。月度图在 Plan 结果页有（`plan-signals-client.js` 的 `renderMonthly`）；物种页是否有，我没有核实 |
| **U2-14** | AC 3.3.1 | **任何提到动物名字的页面**都能到"它是入侵种吗"的检查 | Jingyu Zhen | 没做。物种页有指向入侵检查的链接；其他提到动物的页面（如我做的预测页、Community 页）**没有**，要加入口 |
| **U2-13** | AC 4.3.1（Iteration 1），authority 行 | 机构公布了**开放时间**就显示，没公布就写"未指明" | Xingyu Ye；表中的行由 Nisuri Edirisinghe 补 | 没做。数据在 authority 表（70 行），页面在 Emergency 的内嵌页；需要先有数据 |
| **U2-15** | 内容表，马来语行 | **动物名、状态标签、来源行和 AI 区域用马来语**；审核人在看板上署名 | Mingtong Li 装载；审核人待定（开放项 3） | 没做。我写的 Community、预测页等的马来语**没有人审**，页面上也没有"未审核"标记；完成定义要求每一条马来语要么标"已审"，要么标"未审" |
| **U2-11** | AC 7.1.1（Iteration 1） | A4 打印页**一行一个动作**，来源放在页脚 | Xingyu Ye | 没做。打印页 `plan-print` 和 `print-*.js` |
| **U2-17** | AC 1.1.1 | 首页的五个问题**在屏幕上编号** | Xingyu Ye | 没做。首页的 questionnaire |
| **U2-18** | AC 4.2.1（Iteration 1） | "打电话前要准备什么"的列表**做成清单样式** | Xingyu Ye | 没做。在 Emergency 的 who to call 页 |

---

## 三、Could

| 卡 | 影响的 AC | 要改成什么 | 负责人 | 现状和提示 |
|---|---|---|---|---|
| **U2-16** | AC 6.2.1 | 蛇页上，**安全提示和 999 规则放在最前面（首屏以内）** | Jingyu Zhen | 没做。**要注意：我本次改了同一个页面**（`page-snakewhattodo`），为 IT-3（"Not sure" 走新的安全页）加了一个变体，页面结构和蛇页共用，改这张卡时要避开我加的 `ns-only` 和 `ns-hide` 两类元素 |

---

## 四、与我已做的内容有关联的地方（动手前要先协调）

1. **U2-3（打印和屏幕一致）与访问日记重排**：重排只改屏幕，会让打印和屏幕不一致。要决定打印是否也按日记重排。
2. **U2-16 与 IT-3 的 "Not sure" 页**：两个都改 `page-snakewhattodo`，且都在 Emergency 内嵌页（一个约 1.35MB 的 base64 内嵌代码）里，**不要两个人同时改**。
3. **U2-5、U2-6 与 Draft AC 1.3.2**：我给每个计数旁加了档位标签，它们的标题和注释位置不变，但 U2-5 改标题时要保持档位标签仍在计数后面。
4. **U2-10 与预测页、Plan**：没选动物时 Plan 的 "Signals for your home" 会显示 "No species was selected…"；这句话的改法要和合并等级的 "No level" 提示保持一致。
5. **U2-15 与 Community、预测页、说明页**：我写的马来语都没有审，一起列入审核清单。
6. **U2-19、U2-9 与 Safeguards 第 4 节（AI 2）**：这两张卡的实现细节在 Safeguards 里已有（逐句绑定行、数字和物种检查、V7 到 V14 单元测试），做之前先看那一节，避免重复设计。

---

## 五、建议顺序

1. **U2-1、U2-2、U2-3**（三个缺陷，D45 要求先做）。
2. **U2-19、U2-9**（AI 总结，一起做，对应 Safeguards 第 4 节）。
3. **U2-5、U2-6、U2-8、U2-10**（文案类 Must，先向 Hamza 要句子）。
4. **U2-7**（Nisuri 的测试，可以并行；测试期间首页不改）。
5. Should：U2-4、U2-12、U2-14、U2-13、U2-11、U2-17、U2-18、U2-15。
6. Could：U2-16。

## 六、需要补充的信息

- "Usability Testing Report (Iteration 2)" 里每个发现的录像和时间点，以及用户当时具体的行为。
- Hamza 的文案（U2-5、U2-6、U2-8、U2-10）。
- U2-13 的开放时间数据，U2-15 的马来语审核人。
- 以上每张卡的负责人是否仍按 ver.5 的分工。
