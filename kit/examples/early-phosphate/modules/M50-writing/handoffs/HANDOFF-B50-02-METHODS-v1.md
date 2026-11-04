---
project: early-phosphate
module: M50
branch: B50-02
stream: methods-section
version: 1
status: ACCEPTED
baseline: artifact manuscript-outline v1
created_at: 2026-10-18
submitted_at: 2026-10-18
decided_at: 2026-10-19
decision_reason: 自动通过：verify 全绿
supersedes: 0
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

按大纲与 TARGET 清单撰写方法学章节草稿，确保设计、estimand、权重与分析方案可复现，并标出待主分析定稿后回填的数字。本版 PROVISIONAL，等待主项目决定结构与对齐方式。

## 2. 输入

- baseline：`artifact manuscript-outline v1`（已 ACCEPTED）
- `protocol-charter v1`、`estimand-spec v1`（已 ACCEPTED）
- `IPTW 诊断 v1`（PROVISIONAL，仅作背景，不引用其数字）
- TARGET 清单与写作笔记 `work/methods_notes.md`

## 3. 输出

- `outputs/methods_section_draft.md`：方法学章节中文工作稿（2.1–2.6），数字占位并附待回填清单
- `outputs/target_checklist.md`：TARGET 28 项逐项覆盖状态
- 本 handoff：PROVISIONAL，待主项目决定，未进入下游

## 4. 关键结果

- 方法学章节草稿 1,042 词（目标 1,050 词），覆盖数据源、目标试验六要素、队列与暴露、倾向评分与权重、统计分析、报告与可复现性。
- TARGET 清单 28 项：26 项覆盖/进行中，2 项未覆盖并说明原因（item 13 样本量论证不适用回顾性队列，改为报告模拟精度；item 14 缺失处理细节待缺失审计定稿）。
- 权重段落写为「预设双侧 1%–99% 截尾 + 敏感性分析」，未写死主方案；所有估计值用 `[待主分析 v1]` 占位，未引用未接受结果。
- 队列数字引用 cohort-definition v2（3,847 例；暴露 1,462 / 对照 2,385）与 Table 1（已 ACCEPTED），来源标注到 handoff 版本。

## 5. 修改建议

- 待主项目决定 IPTW 截尾方案后，把「预设截尾」改为实际规则并补充 ESS 数字。
- 待缺失审计解除阻塞后，补写 2024H2 时点缺失的敏感性分析段落（当前为占位）。
- 建议投稿前请统计模块核对 2.4/2.5 与最终 SAP 一致，避免方法学与结果章节数字版本错配。

## 6. 限制

- 本版 PROVISIONAL：结果数字、图表引用与缺失处理仍为占位，不能直接投稿。
- 方法章节依赖主分析定稿；若权重方案改变（例如改为不截尾），2.4/2.5 需重写。
- 中文工作稿，最终需英文翻译与语言润色（模拟流程）。

## 7. 主项目需要做的决定

是否接受当前方法学章节结构与 TARGET 对齐方式（待 IPTW 诊断与缺失审计定稿后一并决定）。若接受，本 handoff 转 ACCEPTED；若要求先补缺失处理再接受，则等待缺失审计解除阻塞后新建版本或按原版本重新提交。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M50-writing/branches/B50-02-methods/outputs/methods_section_draft.md | bca1556b65aa08e5685c83eeade36236faab6ab520d9d79e0a0162574bb0e828 | 方法学章节中文工作稿（含待回填清单） |
| modules/M50-writing/branches/B50-02-methods/outputs/target_checklist.md | 77ed0d83dd5561da9dc324177f412a03df5da67918e11d6a7248fec010e99f10 | TARGET 28 项覆盖状态对照表 |
