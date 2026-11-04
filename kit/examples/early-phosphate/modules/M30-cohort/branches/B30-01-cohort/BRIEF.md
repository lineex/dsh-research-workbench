# B30-01 · 队列定义 v1

## 要解决的问题

按方案与 estimand 构建 2018-01 至 2024-06 的 ICU 低磷血症队列，给出入选流程与分组计数，作为基线表与统计分析的输入。

## 输入

- baseline：`artifact estimand-spec v1`（已 ACCEPTED）
- EHR 数据快照 2024-07-01（模拟，只读）
- 队列构建草案（`work/cohort_build_v1.sql`）

## 允许修改

- 仅本分支目录 `modules/M30-cohort/branches/B30-01-cohort/` 内文件

## 禁止修改

- 不得修改原始数据快照与已 ACCEPTED handoff

## 完成标准

- 逐级入选计数可复算，暴露/对照分组数字与队列表一致
- 暴露定义、时间窗与血磷阈值与 estimand v1 逐条对应
- 局限节披露定义与方案的差异

## 必须交付

- `modules/M30-cohort/handoffs/HANDOFF-B30-01-COHORT-v1.md`
- `outputs/cohort_definition_v1.md`
- `outputs/cohort_counts_v1.csv`
