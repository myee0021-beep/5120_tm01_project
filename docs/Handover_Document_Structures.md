# Room for Both — Handover Package 三份文档结构

依据：`FIT5120 Handover Package Guidelines 2026 S2`、`Handover Document Rubric`、`example/` 三份样例，以及本项目代码和 `docs/`、`ml/README.md`、`BACKEND_SETUP.md`。
标题用英文（直接用于正式文档），括号里的中文是写作提示，不进正式文档。

> 说明：Guidelines 写明 Generative AI 不能用于该作业，除非另有说明。这份文件只是提纲和素材索引，正文请团队成员自己写。

---

## 总体包结构

```
Handover Package/
├── 1_Product_Document.pdf          (1–5 页)
├── 2_Support_Document.pdf          (长度不限)
├── 3_Maintenance_Document.pdf      (长度不限)
├── 4_Sign_off_Sheet.pdf            (Monash mentor 签收单，用 Moodle 模板改)
└── Project Governance Portfolio (Google Drive 链接，文件夹命名要有规则)
```

评分标准是三份文档作为一个整体评价："新 sponsor 能不能接手"。三份文档之间用交叉引用，不要重复内容。

---

# 1. Product Document（1–5 页，对象：未来 sponsor）

目标：回答"作为 sponsor，我为什么要这个产品"。样例只有 6 页（含封面和目录），精简为主。

| # | 章节 | 内容 | 素材来源 |
|---|---|---|---|
| — | Cover + Table of Contents | 项目名、团队名、版本、日期、logo | — |
| 1 | **Overview** | | |
| 1.1 | Background | **问题陈述**：人与野生动物冲突；全国 76,361 宗投诉、损失 RM58.7 百万（2021–2026 年 5 月，Bernama / Hansard）；居民不知道怎么辨认、遇到后怎么做、怎么预防。**目标受众**：马来西亚居民（英语 / 马来语）；不是专家用户 | `DATA_PROVENANCE.md`、README 开头 |
| 1.2 | Product | **解决方案**：双语 web 应用，居民可完成四件事——辨认动物、立刻获得安全指引（蛇优先）、了解证据信号、生成并打印有来源的预防计划。Iteration 3 增加：野生动物预测页、遭遇日记（本机存储）、Community 分享与审核、信号阈值说明页。设计原则：不编造风险分数、AI 受限且可选。**放线上链接 + 产品视频 + 密码** | README §Iteration 3 additions、§14 |
| 2 | **Ethics Canvas** | 附 Canvas 图（存 PG folder，给链接）；正文 1 页内，**逐条映射 ACS Code of Conduct**（见下表） | 见下 |
| 3 | **Support & Maintenance** | 两三句话 + 指向 Support / Maintenance 文档：服务器、数据库、备份、安全、测试计划、BAU 任务 | — |
| 4 | **Future Sponsors** | 谁会要这个产品、为什么、能怎么用（见下表） | — |
| 5 | **Team Information** | 成员、角色、LinkedIn / 邮箱（或指向 PG folder） | PG folder |
| 6 | **References** | ACS Code of Professional Conduct、GBIF、DOSM、Bernama、Hansard、GRIIS 等（统一引用格式） | — |

### Ethics Canvas 映射草表（ACS 六项价值）

| ACS 价值 | 本项目对应的伦理问题 | 项目里已有的做法（可作证据） |
|---|---|---|
| **Primacy of the public interest**（公众利益优先） | 遇蛇时如果先问物种或照片会延误安全行动；产品不能鼓励对动物下手 | 蛇路径"是 / 不确定"直接跳到蛇安全指引；预防措施只来自有来源的行；不提供捕杀、投毒、投喂建议（Community 审核理由 `harmful-advice`） |
| **Enhancement of quality of life** | 居民用得上吗？语言、可及性 | 英语 / 马来语；打印版；结果用文字档位而不是百分比 |
| **Honesty**（诚实） | 模型和数据的局限；"风险分数"会误导 | 不给住户风险分；预测页写明"不是动物数量、不是住户概率"；方法页在没有正式测试记录前显示"尚未测试"；GBIF 偏差、2025–2026 数据不全都写明 |
| **Competence**（胜任） | AI 输出可靠吗；模型比简单平均强多少 | Describe it 用固定白名单；Plan 总结 4–6 句并校验数字和物种词；ML 按时间切分测试，对照三个基线，发布门槛记录在 `Iteration3_Release_Gate_Record.md` |
| **Professionalism**（专业性） | 来源、署名、许可 | 每条措施带来源和核实日期；CC BY 4.0 数据署名；马来语译文标注是否已审 |
| **Professional development** | 团队能力边界、交接 | 三份交接文档、测试记录、已知问题清单 |

另外单列的隐私和数据治理问题（放进 Canvas 的 Data / Privacy 区）：
Community 不收姓名、地址、精确位置、IP；照片在浏览器端去 EXIF、默认不存；备注做个人信息检查（只能增加保留，不能放行）；被保留的帖子 15 天后删除并记日志；限流用盐值哈希，不存原始地址；遭遇日记只存在本机 localStorage；AI 填表的句子不存储、不记日志。

### Future sponsors 草表（需团队确认再写）

| 候选 sponsor | 价值 |
|---|---|
| PERHILITAN（野生动物和国家公园局） | 居民侧分流：复用 Plan / Emergency 内容，减少重复咨询；Community 帖子作为早期信号 |
| 州 / 地方政府（PBT）、环境部门 | 区域热点和预测，决定宣传和垃圾管理投入 |
| 环保 / 野生动物 NGO、大学 | 数据和教育；研究合作 |
| 房地产和社区管理方 | 住宅区预防清单 |

---

# 2. Support Document（对象：sponsor 的支持 / 运维人员）

目标：回答"我接手后怎么把它跑起来、守住、备份"。样例章节顺序：Introduction → Support（Host / Server / DB / Setup）→ Backup → Security → Data management。本项目在这个骨架上扩展，满足 Guidelines 里的"覆盖全部功能、截图、排错、集成/API/数据/安全、行业标准、已知漏洞"。

| # | 章节 | 内容 | 素材来源 |
|---|---|---|---|
| — | Cover + TOC | | |
| 1 | **Introduction** | 文档目的、读者、与另外两份文档的关系；产品一句话 | |
| 2 | **Technical Overview** | 架构图（Browser SPA → Cloudflare Worker 分层 → Neon PostgreSQL / MiniMax）；技术栈和版本表 | README §1 |
| 2.1 | Hosting | Cloudflare Worker `roomforboth-final`；入口 `src/worker-plan-print-entry.js`；`wrangler.jsonc`；Cron Trigger；线上地址；账号归属（交接后改成 sponsor 自己的，**不要写入真实密码，用占位**） | README、BACKEND_SETUP |
| 2.2 | Runtime stack | Node / Wrangler `^4.120` / `@neondatabase/serverless ^1.0`；Python 3.12 + `ml/requirements.txt`（仅离线训练用）；前端 Tailwind CDN、Leaflet CDN | `package.json` |
| 2.3 | Database | Neon PostgreSQL；表清单（species、animal_category、species_media、species_behaviour、immediate_action、prevention_action、authority、state、complaint_series、attractant_rule、signal_threshold、community_post、review_log…）；ERD 图；建表脚本位置 `database_code/` | BACKEND_SETUP、`database_code/` |
| 2.4 | Environment & secrets | 变量表：`DATABASE_URL`、`MINIMAX_API_KEY`、`REVIEWER_KEY`、`RATE_LIMIT_SALT`、`AI3_ENABLED`、可选 R2 `COMMUNITY_PHOTOS` / `PHOTO_REVIEW_ENABLED`；用途、谁持有、轮换方式 | README §12 |
| 3 | **Setup & Deployment** | 从零部署的步骤：clone → `npm install` → `.dev.vars` → 跑 `iteration3_create_tables.sql` → 灌 D46 阈值行 → `wrangler secret put` ×4 → `npm run deploy` → 验证 `/api/health`、`/api/i2/status`；本地 `npm run dev` 的限制（无 `DATABASE_URL` 时接口报错） | BACKEND_SETUP、Status 问题 1 |
| 4 | **Running the Product (feature guide)** | 每个功能一小节，**配截图**：Home；Plan questionnaire；Plan Result（三类证据、季节图、预防措施、Plan in plain words）；Print；Emergency flow（蛇优先、Describe it、Guided Q&A）；Ecosystem 地图 / 预测页 / 方法页；遭遇日记；Community（浏览、三步分享、一句话填表）；Community 审核（输入 reviewer key、发布 / 保留 / 删除、日志）；About the data；How this is computed | README §2–9、Data & API 文档 |
| 5 | **API Reference** | 路由表：`/api/health`、`/api/i2/*`、`/api/identify-describe`、`/api/community*`、`/api/community/review/*`、`/api/i3/signal-thresholds`；方法、用途、鉴权、限流 | README §10、`src/iteration3-backend.js` |
| 6 | **Backup & Recovery** | Neon 备份 / 分支恢复；代码在 GitHub；Worker 版本回滚；静态文件靠 `?v=` 缓存版本；旧 Iteration 2 部署保留 | |
| 7 | **Security** | 7.1 机密管理；7.2 接口只读 / 数据库角色最小权限（建议只 SELECT）；7.3 审核 key（不写 cookie / localStorage）；7.4 限流与盐值；7.5 个人信息检查与 15 天删除；7.6 AI 防护（白名单、输出校验、开关、超时）；7.7 `cache-control: no-store`；7.8 **已知漏洞和风险清单**（见下） | README §15、BACKEND_SETUP |
| 8 | **Data Management** | 8.1 数据源表（仿样例：名称 / 获取方式 / 更新频率 / 粒度 / URL / 许可）；8.2 数据流和 ERD；8.3 数据准备步骤（对应脚本）；8.4 个人数据和保留期（15 天）；8.5 署名要求 | `ml/README.md` Data 表、DATA_PROVENANCE |
| 9 | **Troubleshooting** | 表：现象 → 原因 → 处理。例：分档表显示"No signed value"（`signal_threshold` 为空）；Describe it 报错（MiniMax 超时或 key 缺失，回到 Guided Q&A）；Community 审核 401（key 错误）；数据库接口本机报错；打印页内容旧（快照问题）；预测页不更新（`?v=` 没升） | Status、README |
| 10 | **Standards & Compliance** | ACS Code of Conduct；Malaysia PDPA 2010（个人数据）；OWASP 基本项；数据许可（CC BY 4.0、ODbL / CC BY-SA 视实际数据源） | |
| App. | Appendices | 配置文件示例（脱敏）、术语表、联系人 | |

### 7.8 已知漏洞和风险（来自 `Iteration3_Status.md`，交接前核对是否仍成立）

1. `signal_threshold` 表为空 → 分档不显示（AC 1.3.1 / 1.3.2）。
2. 个人信息检查：服务端对不带称谓的姓名不检查。
3. reviewer key 是共享密钥，没有按人区分。
4. 照片存储未定；默认关闭。
5. 线上存在 14 个运行时注入的补丁脚本，依赖加载顺序。
6. 线上有 2 条测试帖。
7. 限流、定时删除、AI 路由没有在线上验证。

---

# 3. Maintenance Document（对象：sponsor 的技术团队）

目标：回答"我要改它、加功能，需要知道什么"。样例章节：Introduction → Maintenance Team → Development cycle → Product（功能表 Epic / Feature / AC + 截图）→ System architecture → Maintenance activities（Code / Data / Test / Troubleshoot）。

| # | 章节 | 内容 | 素材来源 |
|---|---|---|---|
| — | Cover + TOC | | |
| 1 | **Introduction** | 目的、读者、使用方式 | |
| 2 | **Maintenance Team Composition** | 角色表：Product Owner、前端、后端 / Worker、数据库、数据科学 / ML、QA、安全、（可选）译审（马来语）。每角色：职责 + 所需技能 | 样例 §2 |
| 3 | **Development Cycle** | Agile Scrum，三个 iteration；LeanKit 看板；GitHub；决定编号（D34、D46、D47、D49、D50、D51…）如何追溯；Epics 报告 | |
| 4 | **Product** | | |
| 4.1 | Product Features | 表：**Epic / Feature (User Story) / Acceptance Criteria + Developer guidelines + UI 截图**。覆盖：急救与辨认；Plan 与证据信号（AC 1.2.x、1.3.1、1.3.2）；遭遇日记（AC 2.3.1–2.3.4）；Community（AC 5.1.1–5.6.1）；About the data（Epic 10）；预测页与方法页（AC 11.1.1–11.3.2）。**Backlog（D47）**：AC 3.4.1、4.3.1、4.3.2 | Status §4 |
| 4.2 | Operating Environment | 浏览器支持、Cloudflare 运行时、依赖服务（Neon、MiniMax）、外部 CDN | |
| 5 | **System Architecture** | 5.1 Worker 分层（`worker-plan-print-entry` → `worker-state-persistence` → `worker-plan-summary` → `worker-iteration2`，加 `iteration3-backend`）；5.2 前端：`index0914.html` + `public/*.js` 补丁脚本及加载顺序；5.3 数据流（resident → Plan → snapshot → Print）；5.4 AI 路由；5.5 ML 离线流水线（数据 → build_dataset → train → predictions.json → public/）；5.6 ERD | README、ml/README |
| 6 | **Maintenance Activities** | | |
| 6.1 | Code | 仓库结构；约定（双语文案、来源 + 核实日期必须有、不引入风险分）；如何新增物种 / 州 / 地区 / 措施行；补丁脚本合并计划；`archive/` 说明；依赖升级 | README §11 |
| 6.2 | Data | 各数据多久更新、怎么更新：投诉、占用记录（GBIF）、attractants、阈值（**改值要新决定编号**）、地区列表；ML 重训步骤（`build_dataset.py` → `train_and_export.py` → 对比 → 复制到 `public/` → 升 `?v=`）；区域模型 | `ml/README.md` Updating the model |
| 6.3 | Test | 6.3.1 Test Strategy（单元 / 验证脚本、AC 验收、可用性卡、ML 时间切分测试、发布门槛、AI 测试集）；6.3.2 Test Plan 表（用例 ID、对应 AC、步骤、预期、结果、执行人）；已有证据：`npm run test:i3`、`Iteration3_Release_Gate_Record.md`、`Iteration3_Usability_Cards_Status.md` | |
| 6.4 | Troubleshoot | 开发侧排错（与 Support 的排错区分：这里讲代码和数据问题） | |
| 7 | **Release & Change Management** | 发布流程、回滚、`?v=` 缓存版本、数据库迁移顺序、变更记录模板 | |
| 8 | **Known Issues & Backlog** | 来自 Status 第 3、6、7 节的问题和待决事项：阈值表为空；区级地图和区域模型是否部署；AC 11.3.1 正式测试记录；计数回退；表名与迁移脚本不一致；补丁脚本；Plan 重排不同步到打印；马来语未审；地区名统一；照片存储 | `Iteration3_Status.md` |
| 9 | **Compliance** | 安全措施汇总、隐私、行业标准、数据许可，与 Support §10 保持一致 | |
| App. | Appendices | 选项 id 表（附录 A–D）、术语表、脚本清单 | Data & API 文档 |

---

## 写之前要先处理的事

这些会让文档和事实对不上，建议在交接前修掉或在文档里如实写明。

1. **表名不一致**：迁移脚本和 `BACKEND_SETUP.md` 写 `community_report` / `community_review_log`，代码和线上用 `community_post` / `review_log`。Support 文档的"从零部署"依赖这一点。
2. **`signal_threshold` 空表**：影响 Support 的排错章节和 AC 1.3.1 / 1.3.2 的截图。
3. **README 仍以 Iteration 2 为主**：Support / Maintenance 里的架构描述要补上 Iteration 3 的接口。
4. **Epics 报告 ver.5 不在这个文件夹**：Maintenance §4.1 的 Epic / AC 原文要从它取，我这边只有 `Iteration3_Status.md` 里的 AC 编号和状态。
5. **团队信息、产品视频、线上密码、sponsor 签收单模板**：要从 PG folder 和 Moodle 取。
6. **敏感信息**：三份文档里不要出现真实 `REVIEWER_KEY`、`DATABASE_URL`、`MINIMAX_API_KEY`；用占位，并说明交接时由新 owner 重新生成。
