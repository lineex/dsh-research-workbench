# M50 · 论文写作

## 职责

把已 ACCEPTED 的设计、队列、统计与文献结果组织成可投稿稿件：大纲、方法学章节、结果与讨论，并维护 TARGET/STROBE 报告清单对齐。

## 输入约定

- `manuscript-outline v1`、`protocol-charter v1`、`estimand-spec v1`
- 所有引用数字只来自 ACCEPTED handoff；PROVISIONAL/DRAFT 结果只能以占位符出现
- 目标期刊作者指南（模拟：Critical Care Medicine，正文 ≤3,500 词，≤5 个图表）

## 输出约定

- 章节草稿写入分支 `outputs/`，对外通过 `handoffs/`
- 每个数字必须标注来源 handoff 路径/版本（如 `cohort-definition v2`）
- 待回填数字统一用 `[待主分析 v1]` 标记，避免误引用

## 分支

- B50-01-outline · 论文大纲（已 ACCEPTED）
- B50-02-methods · 方法学章节（PROVISIONAL）

## 约定

- 不修改统计与队列模块的 handoff；发现数字矛盾时退回控制层
- 引用文献只用 `literature-search v2` 纳入清单
