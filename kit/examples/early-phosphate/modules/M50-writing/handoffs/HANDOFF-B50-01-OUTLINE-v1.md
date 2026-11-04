---
project: early-phosphate
module: M50
branch: B50-01
stream: manuscript-outline
version: 1
status: ACCEPTED
baseline: artifact protocol-charter v1
created_at: 2026-10-16
submitted_at: 2026-10-16
decided_at: 2026-10-17
decision_reason: 论文大纲与目标期刊要求一致，接受为写作基准
supersedes: 0
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

确定论文结构、目标期刊、图表清单与字数预算，为方法学与结果写作提供骨架，并固定「只引用已接受 handoff 数字」的写作纪律。

## 2. 输入

- baseline：`artifact protocol-charter v1`（已 ACCEPTED）
- `descriptive-tables v1` 与 `literature-search v2`（已 ACCEPTED）
- 目标期刊 Critical Care Medicine 作者指南（模拟：正文 ≤3,500 词、图表 ≤5、结构式摘要 ≤300 词）

## 3. 输出

- `outputs/paper_outline.md`：工作标题、章节结构与要点、图表清单、TARGET 报告要求、写作纪律
- `outputs/word_budget.csv`：各章节字数预算与当前草稿字数
- 本 handoff：写作模块基准（供方法学与结果分支引用）

## 4. 关键结果

- 目标期刊：Critical Care Medicine（原创研究）；备选 Intensive Care Medicine。
- 章节预算：引言 650、方法 1,050、结果 950、讨论 750、结论 100，合计 3,500 词（期刊上限）。
- 图表 5 个：Table 1 基线、Table 2 主/次要结局、Figure 1 流程图、Figure 2 加权 KM、Table S1–S4 在线补充。
- 摘要按结构式 7 段（Objective/Design/Setting/Patients/Interventions/Measurements/Results/Conclusions）。
- 明确写作纪律：只引用 ACCEPTED handoff；未接受数字用 `[待主分析 v1]` 占位；文献只用 literature-search v2 的 23 篇。

## 5. 修改建议

- 建议方法学章节把「截尾方案」写成「预设 + 敏感性」，待主分析 final 后回填；不要在大纲阶段写死。
- 建议结果部分先搭表格骨架，等 main-analysis v1 接受后一次性填入，避免版本错配。
- 建议讨论部分预留 200 词用于「2024H2 时点缺失」的局限性说明。

## 6. 限制

- 大纲基于主分析尚未定稿的状态；CCM 图表限额可能迫使合并补充表。
- 字数预算按期刊上限，若选择备选期刊需重算。
- 工作标题为暂定，投稿前需作者组确认。

## 7. 主项目需要做的决定

是否接受本大纲作为写作模块基准（本次 accept 即完成，记录 D-0010）；接受后 B50-02 方法学章节按此结构撰写。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M50-writing/branches/B50-01-outline/outputs/paper_outline.md | 9c96587bab6217e66a1859785c65fe288eeed99c65817a5912564be378da907b | 论文大纲（结构、图表、写作纪律） |
| modules/M50-writing/branches/B50-01-outline/outputs/word_budget.csv | b8a49b5d54cd3381b02e6889372f1faa44e8dd1f904a21564062c37e0bd30c84 | 章节字数预算与当前进度 |
