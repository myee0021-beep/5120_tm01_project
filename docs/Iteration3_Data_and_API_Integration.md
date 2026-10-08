# Iteration 3：需要链接的数据和 API 接口

写于 2026-10-03。内容来自当前前端代码（`public/` 下的 `community.js`、`signal-thresholds.js`、`plan-how-computed.js`、`plan-signals-client.js`、`ecosystem-forecast.js`、`encounter-log.js`）和 ver.5 Epics 报告。

**读这份文档之前先知道三件事**

1. 前端现在**不依赖任何新接口也能打开**：Community 用内存里的假数据，阈值读 `signal_threshold.json`，预测页读 `forecast_predictions.json`，访问日记只用浏览器 localStorage。接好后端后才会换成真数据。
2. 本文只写**前端已经按什么形状在读、在调**。后端如果要改形状，请告诉前端，不要默默改。
3. 凡是带 **（待定）** 的，是团队还没有决定的事项，列在第 9 节。

---

## 1. 一览

| 编号 | 类型 | 名称 | 谁用 | 状态 |
|---|---|---|---|---|
| A1 | 新 API | `GET /api/i3/signal-thresholds` | 说明页（AC 1.3.1）、Plan 的档位和合并等级（AC 1.3.2）、预测页（AC 11.1.2）、月度图（AC 1.2.4） | 未建，前端先读 JSON |
| A2 | 新 API | `GET /api/community/reports` | Community 列表（AC 5.2.1） | 未建 |
| A3 | 新 API | `GET /api/community/reports/:id` | 帖子详情（AC 5.2.1） | 未建 |
| A4 | 新 API | `POST /api/community/reports` | 分享的最后一步（AC 5.3.1） | 未建 |
| A5 | 新 API | `POST /api/community/review/session` | 审核页登录（AC 5.6.1） | 未建 |
| A6 | 新 API | `GET /api/community/review/queue` | 审核队列（AC 5.6.1） | 未建 |
| A7 | 新 API | `POST /api/community/review/:id` | 发布、保留、删除（AC 5.6.1） | 未建 |
| A8 | 新 API | `GET /api/community/review/log` | 审核日志（AC 5.6.1） | 未建 |
| A9 | 新 API | `POST /api/community/parse` **（路由名待定）** | 一句话填表（AC 5.4.1，AI 3） | 未建，前端有关键词替身 |
| S1 | 静态文件 | `forecast_predictions.json` | 预测页（AC 11.1.1 到 11.2.1） | 已有，来自旧模型 |
| S2 | 静态文件 | 评估报告文件 | "How this was made and tested"（AC 11.2.2） | 页面和文件都还没有 |
| E1 | 已有 API | `GET /api/i2/complaints?state=` | Plan 的投诉数、档位 | 已有 |
| E2 | 已有 API | `GET /api/i2/attractants` | Plan 的 attractants 数、档位 | 已有 |
| E3 | 已有 API | `POST /api/i2/plan` | Plan 的预防措施；访问日记的重排依赖它的返回字段 | 已有 |
| E4 | 已有 API | `POST /api/identify-describe` | AI 1 | 已有，需要加固 |
| L1 | 浏览器本地 | localStorage `roomForBoth.encounterLog` | 访问日记（AC 2.3.1 到 2.3.4） | 不需要后端 |

---

## 2. A1：`GET /api/i3/signal-thresholds`

**用途**：一张表管所有阈值（D34、D46），前端不写死任何档位数字。

**请求**：无参数。

**返回**

```json
{
  "ok": true,
  "rows": [
    { "signal": "records",     "band": "low",    "lower_bound": 1,   "score": 1, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "records",     "band": "medium", "lower_bound": 50,  "score": 2, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "records",     "band": "high",   "lower_bound": 500, "score": 3, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "complaints",  "band": "low",    "lower_bound": 1,   "score": 1, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "complaints",  "band": "medium", "lower_bound": 50,  "score": 2, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "complaints",  "band": "high",   "lower_bound": 500, "score": 3, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "attractants", "band": "low",    "lower_bound": 1,   "score": 1, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "attractants", "band": "medium", "lower_bound": 2,   "score": 2, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "attractants", "band": "high",   "lower_bound": 4,   "score": 3, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "combined",    "band": "low",    "lower_bound": 0,   "score": 1, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "combined",    "band": "medium", "lower_bound": 3,   "score": 2, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "combined",    "band": "high",   "lower_bound": 6,   "score": 3, "decision": "D46", "signed_date": "2026-09-26" },
    { "signal": "min_records", "band": "minimum","lower_bound": 30,  "score": 0, "decision": "D46", "signed_date": "2026-09-26" }
  ]
}
```

**规则**

- 表名 `signal_threshold`，一行一个信号加一个档位。
- `signal` 的取值：`records`、`complaints`、`attractants`、`combined`、`min_records`。
- **没有 `signed_date` 的行，前端一律忽略**（AC 1.3.2：没有签字值就不显示档位，只显示计数）。
- `min_records`（30）是月度图（AC 1.2.4）和预测页（AC 11.1.2）共用的最少记录数。**这是两个页面用同一个值的唯一依据，不能拆成两行。**
- 任何值的修改都需要新的决定编号（D46 的规定）。

**前端的读取顺序**：先请求这个接口，失败才读 `public/signal_threshold.json`（同样的形状）。页面底部会写明当前读的是数据库还是文件。

---

## 3. A2 到 A8：Community 接口

### 3.1 前端怎么接（先读这一段）

`community.js` 里所有 Community 数据都经过一层 `CommunityAPI`。**目前只有 `parse` 有内置的真实请求，其余方法没有。** 接后端要新写一个很小的适配文件，在 `community.js` 加载**之前**定义 `window.CommunityAPI`，方法名和返回值如下，每个方法都返回 Promise：

| 方法 | 对应接口 | 返回 |
|---|---|---|
| `listPublished({state, district})` | A2 | 报告数组 |
| `getReport(id)` | A3 | 报告或 `null` |
| `submit(report, photoBlob \| null)` | A4 | `{ref}` |
| `verifyKey(key)` | A5 | `true` / `false` |
| `listQueue(key)` | A6 | 报告数组（所有状态） |
| `decide(key, id, decision, reason)` | A7 | 更新后的报告 |
| `listLog(key)` | A8 | 日志行数组 |
| `parse(sentence)` | A9 | 见第 4 节 |
| `stateRecordSummary(state)` | 来自站内 GBIF 数据 | `{total, top, topCount}` 或 `null`（空地区那一页用，目前只有 Perlis 是写死的） |

找到真实的 `CommunityAPI` 后，列表页顶部那行 "Sample reports…" 的假数据提示会自动消失。

### 3.2 报告对象（前端读写的形状）

```json
{
  "id": "R-2026-0912",
  "species": "macaque",
  "kind": "turned-up",
  "state": "selangor",
  "district": "hulu-langat",
  "week": "2026-08-24",
  "time": "early-morning",
  "did": ["took-food"],
  "worked": ["latching-lid", "picked-fruit"],
  "note": "Troop of about eight on the roof line at breakfast time.",
  "photo": false,
  "status": "submitted",
  "submitted": "2026-09-12",
  "decidedAt": null,
  "holdUntil": null,
  "reason": null
}
```

- `week`：发生那一周的**周一**的日期（`YYYY-MM-DD`）。前端的 "when" 只有四个选项，换算成周由前端做；后端存周一。
- `status`：`submitted`、`held`、`published`、`deleted`。
- `holdUntil`：被保留的报告在这一天之后删除（保留日期加 15 天，D49）。
- `state` 用站内的 key（见附录 B），`district` 是地区名的小写连字符形式（例如 `hulu-langat`）。
- **绝不存**：姓名、地址、精确位置、IP、设备标识、任何能识别报告人的东西（AC 5.2.1、5.6.1，完成定义）。

### 3.3 A2：`GET /api/community/reports?state=&district=`

- 只返回 `status = published` 的报告，按 `week` 倒序。
- 不返回备注以外的自由文本；不返回任何报告人信息。
- 没有帖子时返回空数组，前端会显示"No reports yet"并说明这不代表没有动物。**不要用州或邻近地区的数字顶替。**

### 3.4 A3：`GET /api/community/reports/:id`

- 只返回已发布的报告；未发布或不存在返回空，前端显示"Report not found"。

### 3.5 A4：`POST /api/community/reports`

**请求体**（字段同 3.2，前端不会发 `id`、`status`、`submitted`、`decidedAt`、`holdUntil`、`reason`）：

```json
{ "species": "macaque", "kind": "turned-up", "state": "selangor", "district": "hulu-langat",
  "week": "2026-09-14", "time": "early-morning", "did": ["took-food"], "worked": [], "note": "" }
```

- 照片可选，建议用 multipart 一起上传。浏览器里已经用 canvas 重绘过，**EXIF（位置、相机）已去掉**，最长边 1600 像素，JPEG。后端仍要：打码人脸和车牌；含人、车牌、门牌的照片移除，报告不带照片继续走（AC 5.3.1 的说明）。
- 蛇的报告**不会带照片**，也**不会是 `invasive` 类型**（前端不提供），后端也应拒绝。
- `invasive` 只对 `house-crow`、`common-myna` 有效（GRIIS Malaysia 里这两种是外来种）。
- **后端收到后：** 生成 `R-年份-序号` 的引用号；状态设为 `submitted`；对备注做同样的个人信息检查（电话、姓名、门牌、街道），命中就直接设为 `held`，理由 `personal-detail`。**这个检查只能增加保留，绝不能发布、批准或放行（AC 5.5.1）。**
- **返回**：`{ "ref": "R-2026-0912" }`。
- **限流**：必须有（完成定义），用于限流的地址不能存储。

### 3.6 A5：`POST /api/community/review/session`

- 请求 `{ "key": "..." }`，返回通过与否。
- key 放在 Cloudflare secret 里，前端只在内存里保存，**不写 localStorage、不写 cookie**，刷新页面就要重新输入。
- 之后的 A6 到 A8 前端都会把 key 带上（形式由后端定，header 或 body 均可，前端适配文件里改一处即可）。

### 3.7 A6：`GET /api/community/review/queue`

- 返回所有状态的报告（`submitted`、`held`、`published`、`deleted`）。
- `deleted` 的报告**只保留** 引用号、决定、理由和时间，内容清空（前端会按"内容已删除"显示）。

### 3.8 A7：`POST /api/community/review/:id`

- 请求 `{ "decision": "publish" | "hold" | "delete", "reason": "<理由 id>" }`。
- `decision` 和状态的对应：`publish` → `published`；`hold` → `held`（设置 `holdUntil` = 今天加 15 天）；`delete` → `deleted`。
- **理由必须从固定列表里选，且每个决定必须有一个**（附录 C）。
- **没有经过审核的报告永远不能是 `published`**（AC 5.6.1）。
- 每次决定都写一行 A8 的日志。

### 3.9 A8：`GET /api/community/review/log`

```json
{ "ref": "R-2026-0912", "decision": "published", "reason": "published", "at": "2026-09-13", "role": "Reviewer" }
```

- 只存：引用号、决定、理由、时间、**审核人的角色，不是姓名**。
- 不存任何能识别报告人的信息。

### 3.10 定时删除（D49）

- 被保留的报告在 15 天后自动删除，**除非在这期间被发布**。
- 由定时任务（Cloudflare Cron Trigger）执行，**每次删除都要记入日志**。
- 15 天这个数字要同时出现在：数据管理计划、AC 5.1.1 的 How review works 页面（已更新）、AC 5.6.1。

---

## 4. A9：一句话填表（AI 3，AC 5.4.1）

**路由名（待定）**：文档里有 `/api/community/fill`、`/api/share-fill` 两个说法，前端现在用 `/api/community/parse`。**开测前必须统一成一个**，测试脚本和结果记录都会写这个名字。

**请求**：`POST`，`{ "text": "<一句话，最长 300 字符>" }`。

**返回**（每个值都是表单里的选项 id，没说的字段就不要返回）：

```json
{
  "species": "macaque",
  "kind": "worked",
  "when": "this-week",
  "time": "early-morning",
  "did": ["took-food", "onto-roof"],
  "worked": ["latching-lid"],
  "blank_reasons": { "worked": ["shutting windows or doors is not one of the options", "menutup tingkap atau pintu bukan salah satu pilihan"] }
}
```

**前端已经做的（后端不用重复，但要知道）**

- **蛇由前端规则处理，不调用这个接口**：句子里有蛇相关词（snake、ular、sawa、tedung、senduk、python、cobra、viper、krait 等）时，前端直接把动物设为"A snake"，去掉 Invasive 和照片，不发请求。文档要求这份词表放进 species 表的 `is_snake` 里由后端读，现在前端是占位列表。
- **返回值只保留表单里存在的选项 id**，其他一律丢弃，**绝不会被修正成最接近的选项**。
- 模型**永远不能**返回 `snake` 作为 `species`（前端会丢掉）；`invasive` 只对 `house-crow`、`common-myna` 有效，否则前端丢弃。
- 8 秒超时：前端放弃并提示"读不了，请直接选"。
- **州和地区永远不由模型填**（居民从列表里选，Safeguards 5.1 第 4 条）；备注和照片也不会发给模型。

**后端必须做的（Safeguards 第 2 和 5.1 节）**

- 输入 1 到 300 字符，去掉控制字符，不改写其他内容。
- 提示词是一个带版本号的固定文件（`ai3-v2`，接口返回里的 `prompt_version` 字段会写明），居民文字作为"要分类的数据"单独分块，提示里说明它不是指令。
- 温度 0，固定最大长度，模型名固定在配置里，超时 8 秒。
- 严格解析 JSON；多余的键、类型不对都算失败。
- **每个被填的字段必须带原文引用，Worker 检查引用确实出现在句子里，否则该字段留空。**
- 时间只能选固定选项，**模型不做日期计算**。
- 每个功能一个开关，关闭等于模型失败，页面回到手动表单。
- **句子不存储、不记日志、不发给备注检查、不复制进备注。** 日志只记录路由、提示词版本、结果代码、耗时。
- 限流，IP 不存。

---

## 5. 预测页：静态文件，不是 API

### 5.1 S1：`forecast_predictions.json`

现在是 `ml/output/predictions.json` 的复制。页面读取的字段：

```json
{
  "metadata": {
    "last_month_of_records_in_training": "2024-12",
    "training_years": "2015-2024",
    "model": "…", "date_trained": "…", "dataset": { "sha256": "…" }
  },
  "predictions": [
    { "state": "Selangor", "month": 10, "species": "Acridotheres tristis",
      "probability": 0.9899, "records_species_state": 2502, "groups_state": 120 }
  ]
}
```

- 16 个州 × 12 个月 × 7 个物种 = 1344 行，概率在 0 到 1 之间，不能有空值。
- `species` 用拉丁名，页面映射到 myna、crow、macaque、python、cobra、boar、monitor。州名用 `Pulau Pinang`、`Kuala Lumpur`（和站内 key 的对应由页面处理）。
- **概率只用来排序和分档，页面绝不显示**。分档切分点（0.67、0.34）是**临时规则**，在 `ecosystem-forecast.js` 开头的 `BAND_CUTS`，等团队决定后再改。
- **"记录不足"用记录数判断**：该州七种动物合计少于 `min_records`（30）整页显示"不够"；单个物种少于 30 不给档位、不进排名。两种蛇按两者记录之和判断，打开后各自判断。
- `metadata.last_month_of_records_in_training` 页面用来显示 "Built from records up to …"。

### 5.2 对新模型输出的要求

- **必须能给出"最后一个月"**，并且只能选模型有预测的月份（AC 11.1.1 第 5 点）。现有文件固定 2024 年，没有按月区分。
- 模型要按 AC 用**前十二个月**的记录（AC 11.2.2、11.3.2），现有模型不用，要重做或修改 AC（待定）。
- 构建脚本发现用到未来月份必须报错；同月的记录数、占比、是否有记录绝不能作为特征（AC 11.3.2）。

### 5.3 S2：评估报告文件（页面还没做）

AC 11.2.2 的 "How this was made and tested" 页需要一份机器可读的评估记录，字段至少包括：三份数据文件各自的来源、许可、取得日期；训练年份和测试年份；模型与三个基线（只看物种、物种×州历史平均、最近两年平均）的结果；训练日期；当前显示的是模型还是"过去十二个月的记录占比"回退。**按 D50，页面上不能出现不在记录在案的测试里的任何数字，在执行人（不是训练者）填完之前，表格里应显示"尚未测试"。**

---

## 6. 已有的 Iteration 2 接口（Iteration 3 继续依赖）

| 接口 | 被谁用 | 注意 |
|---|---|---|
| `GET /api/i2/complaints?state=` | Plan 的"Conflict complaints"和档位；说明页的算例 | 返回 `rows`（含 `species_id`、`year`、`cases`）和 `summary`。**没有投诉行的物种和州，前端显示"没有投诉行"，不用州总数代替**；家鸦、家八哥、Sabah、Sarawak 本来就没有 |
| `GET /api/i2/attractants` | Plan 的"Documented attractants matched"和档位；说明页的算例 | 返回 `rows`（含 `species_id`、来源和 `date_verified`） |
| `POST /api/i2/plan` | Plan 的预防措施 | **访问日记的重排依赖返回里的 `prevention_id` 和 `cause_group`**（已有，不能去掉）；`cause_group` 的取值见附录 D |
| `POST /api/identify-describe` | AI 1 | 现有；需要补全蛇词表、legless 规则、Matched on 证据检查 |
| `iteration2_map_aggregated.json`（静态） | 地图、Plan 的记录数、说明页算例 | 前端用 `window.OCCURRENCES_ALL_YEARS`，不是 API |

**本地调试提示**：`wrangler dev` 没有配 `DATABASE_URL`，上面几个接口本地都会报错，页面会退回"没有数据"的说明。要在本地看到完整效果，需要数据库连接，或使用假数据。

---

## 7. 访问日记：不需要任何接口

- 数据只存在这个浏览器的 localStorage，键名 `roomForBoth.encounterLog`，**不发出任何请求**（AC 2.3.2；完成定义要求在网络面板里确认）。
- 每条记录：`{id, animal[], date, approx?, time[], place[], did[], response[], note, created}`；除日期外每个问题都是选项 id 列表（多选）。
- 唯一和后端有关的地方：Plan 重排读取 `POST /api/i2/plan` 返回的 `prevention_id`、`cause_group`（见第 6 节）。
- 位置到措施组的对应（我定的，待确认），在 `encounter-log.js` 的 `PLACE_CAUSE`：

| 位置 | cause_group |
|---|---|
| fruit-tree | fruit-trees |
| bins、kitchen | food-waste-and-bins |
| roof、garden、drain | clutter-and-shelter |
| balcony | open-doors-windows |
| other | （不对应任何措施） |

---

## 8. 需要的密钥、服务和数据文件

| 项 | 用途 | 状态 |
|---|---|---|
| `DATABASE_URL`（Neon） | 所有数据库接口 | 已有，本地没有 |
| `MINIMAX_API_KEY` | AI 1、AI 3 的模型调用 | 已有 |
| reviewer key（新 secret） | A5 | 要新建 |
| 限流（Cloudflare 限流绑定或类似） | A4、A9，以及每个模型路由；IP 不存储 | 要新建 |
| AI 开关（每个功能一个配置项） | 关闭等于模型失败 | 要新建 |
| 定时触发器（Cron Trigger） | 15 天删除（D49） | 要新建 |
| 照片存储（R2 或其他） | A4 的可选照片 | **待定** |
| 地区列表（DOSM、geoBoundaries） | Community 的州和地区下拉 | 前端现在是我手写的 133 个，**要换成官方来源**，并记录来源、许可、取得日期 |
| DOSM `population_state`、`forest_reserve_state` | 仅用于训练模型，运行时不读 | 来源、许可、取得日期要先写进数据管理计划（AC 11.x、Safeguards 6.2 第 1 条）；森林保护区 2022 年之后沿用 2022 值 |

---

## 9. 待团队决定（影响接口形状）

1. **A9 的路由名**：`/api/community/fill`、`/api/share-fill`、还是 `/api/community/parse`。
2. **预测的档位词和切分点**：AC 和原型是 Very likely / Likely / Unlikely；Safeguards 原文是 recorded often / sometimes / rarely（我已在 v3 里改成与 AC 一致）。切分点现在是临时规则。
3. **模型是否按 AC 重做成用前十二个月的记录**，还是修改 AC 11.2.2（2）、11.3.1（2）、11.3.2（1）。
4. **发布门槛**：AC 11.3.1 和 D50 仍写着"对照门槛才部署"，而 Safeguards v3 改成了只记录、不设门槛。需要一个新的决定编号，同步改 AC 11.3.1。
5. **回退（"过去十二个月的记录占比"）怎么算**：静态文件不能随月份更新，要么构建时生成，要么页面用内置的记录文件现算。
6. **照片存哪里**，以及是否这一期就做。
7. **位置到措施组的对应表**（第 7 节）。
8. **Plan 重排要不要同步到打印页**（目前不同步，会和 U2-3 "屏幕和打印一致"冲突）。
9. **地图的年月筛选**：没有对应的 AC，文档明确不在 Iteration 3 范围；现在它和预测页的月份选择并存，要决定保留还是移除。
10. **AC 5.3.1 要求三步**：我把一句话填表放在第 1 步顶部，没有合成一页。如果要合成一页，需要先改 AC 5.3.1。

---

## 附录 A：Community 表单的选项 id

| 字段 | 取值 |
|---|---|
| `species` | `macaque`、`wild-boar`、`water-monitor`、`house-crow`、`common-myna`、`snake`、`not-sure` |
| `kind` | `turned-up`、`worked`、`invasive` |
| `when`（前端选项，后端存周一） | `this-week`、`last-week`、`earlier-month`、`longer-ago` |
| `time` | `early-morning`、`late-morning`、`midday`、`afternoon`、`evening`、`night` |
| `did`（多选） | `took-food`、`came-inside`、`onto-roof`、`damaged`、`passed-through`、`stayed-nearby` |
| `worked`（多选） | `latching-lid`、`picked-fruit`、`screens`、`cleared-undergrowth`、`stopped-feeding`、`pet-food-indoors`、`nothing-yet`（"nothing-yet" 与其他选项互斥） |

`worked` 的选项对应 `prevention_action` 表里有来源的行，所以每个"什么有效"都能在 Plan 里找到出处。

## 附录 B：州的 key

`johor`、`kedah`、`kelantan`、`melaka`、`negeri-sembilan`、`pahang`、`perak`、`perlis`、`penang`、`sabah`、`sarawak`、`selangor`、`terengganu`、`kl`、`labuan`、`putrajaya`。预测文件里的州名是 `Pulau Pinang`（对应 `penang`）和 `Kuala Lumpur`（对应 `kl`），其余是首字母大写的全名。

## 附录 C：审核的固定理由

| id | 英文 | 适用的决定 |
|---|---|---|
| `published` | Published as submitted | publish |
| `personal-detail` | Personal detail in the note | hold、delete |
| `photo-identifying` | Photo shows a person, a plate or a house | hold、delete |
| `exact-location` | Exact location given | hold、delete |
| `outside-seven` | Species outside the seven, not a snake | hold、delete |
| `harmful-advice` | Advice to trap, poison, feed or relocate | hold、delete |
| `duplicate` | Duplicate of a report already shown | hold、delete |
| `abuse` | Abuse or a complaint about a named person | hold、delete |
| `test` | Test report from the team | publish、hold、delete |

## 附录 D：`prevention_action.cause_group` 的取值

`food-waste-and-bins`、`clutter-and-shelter`、`personal-protection`、`deliberate-feeding`、`fruit-trees`、`open-doors-windows`、`reporting`。

---

## 附录 E：已知的前端局限（对接时会遇到）

- 前端的所有测试都在本机页面副本或 `wrangler dev` 上做过，**没有在部署的 Cloudflare 环境里跑过**；依赖数据库的部分只用测试假数据验证过。
- Community 目前只有 `parse` 会发真实请求，其他方法都要等适配文件。
- 马来语文案是前端自己写的，**没有人审过，也没有"未审核"标记**（完成定义要求每一条要么标已审、要么标未审）。
- 预测页读的是旧模型文件，页面上的档位只是展示效果的占位。
