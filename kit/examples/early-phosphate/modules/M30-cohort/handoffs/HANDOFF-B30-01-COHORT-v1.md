---
project: early-phosphate
module: M30
branch: B30-01
stream: cohort-definition
version: 1
status: SUPERSEDED
baseline: artifact estimand-spec v1
created_at: 2026-10-05
submitted_at: 2026-10-06
decided_at: 2026-10-07
decision_reason: 队列定义与入选流程一致，先接受以启动基线表
supersedes: 0
superseded_by: modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md
blocked_from:
---

## 1. 本分支解决的问题

按方案与 estimand v1 构建 2018-01 至 2024-06 的 ICU 低磷血症队列，给出入选流程、暴露分组与已知问题，作为基线表与统计分析的输入。

## 2. 输入

- baseline：`artifact estimand-spec v1`（已 ACCEPTED）
- 医院 EHR 数据快照 2024-07-01（模拟，只读）
- 队列构建脚本 `work/cohort_build_v1.sql`

## 3. 输出

- `outputs/cohort_definition_v1.md`：队列定义、逐级入选、已知问题清单
- `outputs/cohort_counts_v1.csv`：逐级入选计数（暴露 2,038 / 对照 2,088）
- 本 handoff：v1 队列（后由 v2 取代）

## 4. 关键结果

- 42,318 例次 ICU 入院 → 成人 40,915（排除 1,403）→ 首次入住且停留 ≥6 h 36,204（排除 4,711）→ 24 h 内有血磷检测 12,536（排除 23,668）→ 首次血磷 <0.65 mmol/L 4,126（排除 8,410）。
- 最终队列 4,126 例：暴露（24 h 内补磷）2,038 例，对照 2,088 例。
- 已知问题：未排除入 ICU 前 6 h 补磷（暴露污染，v2 可识别 331 例）；未排除 ECMO/体外循环（80 例）；血磷用「首次检测」而非「24 h 最低值」。

## 5. 修改建议

- 修正血磷定义为「24 h 最低值」；排除入 ICU 前 6 h 补磷与 ECMO/体外循环。
- 数据窗口延长至 2024-12-31（数据快照 2025-01-15），并单独评估 2024H2 记录质量。
- 建议下游基线表先按 v1 生成、待 v2 接受后必须重跑，不得混用两个队列版本。

## 6. 限制

- 数据快照截止 2024-06，未覆盖 2024H2。
- 血磷定义与 estimand 不一致，低磷血症判定偏少；暴露污染可能使效应估计有偏。
- 暴露依赖医嘱时间戳精度，2018 年前部分记录仅有开立时间。

## 7. 主项目需要做的决定

是否先接受 v1 以启动基线表（本次 accept 即完成，记录 D-0005）。注意：v1 已被 v2 取代（D-0006/D-0007），仅作历史留档，下游不得再使用。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M30-cohort/branches/B30-01-cohort/outputs/cohort_definition_v1.md | 5591e692bacedb0770ee1cb77bc637a2a4bc866b1d23c15eff9c924a4e037625 | 队列定义 v1 与已知问题 |
| modules/M30-cohort/branches/B30-01-cohort/outputs/cohort_counts_v1.csv | d3e8926b9e7035667c08defd834b496573b6836cc13d71623a286854ffdde10a | v1 逐级入选计数与分组 |
