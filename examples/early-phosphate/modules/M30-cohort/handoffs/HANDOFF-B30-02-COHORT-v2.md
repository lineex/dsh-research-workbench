---
project: early-phosphate
module: M30
branch: B30-02
stream: cohort-definition
version: 2
status: ACCEPTED
baseline: artifact cohort-definition v1
created_at: 2026-10-09
submitted_at: 2026-10-10
decided_at: 2026-10-11
decision_reason: 修正入 ICU 前 6 小时补磷排除与 ECMO 排除后接受，替代 v1
supersedes: 1
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

修正 v1 的暴露污染、ECMO 排除与血磷定义问题，重建 2018-01 至 2024-12 的 ICU 低磷血症队列，作为全部统计分析的唯一队列，并取代 v1。

## 2. 输入

- baseline：`artifact cohort-definition v1`（已被本版取代）
- 主项目接受意见 D-0005 与数据快照 2025-01-15（模拟）
- 队列构建脚本 `work/cohort_build_v2.sql`
- estimand v1 的 5 条边界规则

## 3. 输出

- `outputs/cohort_definition_v2.md`：修正项对照表、逐级入选、分组定义
- `outputs/attrition_flow_v2.csv`：逐级入选流程（每步 n 与排除原因）
- 本 handoff：当前唯一分析队列（n=3,847）

## 4. 关键结果

- 44,090 例次 ICU 入院 → 成人 42,676 → 首次入住且停留 ≥6 h 37,742 → 24 h 内血磷 13,058 → 24 h 最低血磷 <0.65 4,712。
- 新增排除：入 ICU 前 6 h 内补磷 331 例、补磷时点缺失/记录矛盾 454 例、ECMO/体外循环 80 例。
- 最终队列 3,847 例：暴露 1,462（38.0%）、对照 2,385（62.0%）。
- 与 v1（4,126 例）的差异主要来自暴露定义修正、时间窗延长与 2024H2 记录核查，差异逐项可复算。
- 与 v1 相同的分析口径保持不变：时间零点 = 首次 ICU 入科，主结局 = 30 天全因死亡。

## 5. 修改建议

- 2024H2 补磷时点记录精度下降（B30-03 阻塞），建议主分析把「排除 2024H2」列为预设敏感性分析。
- 建议 Table 1 与 IPTW 分支以本版 n=3,847 和暴露分组 1,462/2,385 为唯一口径，废弃基于 v1 的旧表。
- 建议在论文流程图中按 `attrition_flow_v2.csv` 逐步展示排除人数。

## 6. 限制

- 暴露依赖医嘱时间戳；2024H2 时点仅日期精度者按 08:00 默认纳入（96 例，见缺失审计）。
- 单中心数据，暴露与结局判定依赖院内记录与区域死亡登记匹配质量。
- 血磷 24 h 最低值依赖检测频次，检测不足者可能被低估。

## 7. 主项目需要做的决定

是否接受 v2 并替代 v1（本次 accept 即完成，记录 D-0006；v1 转 SUPERSEDED 由 D-0007 说明）。下游所有模块必须切换到本版本，不得引用 v1 数字。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M30-cohort/branches/B30-02-cohort-v2/outputs/cohort_definition_v2.md | c3bcd1e106cbdabe554dea662b6f7219ff296a18f078c3844dca19cf1eac5ef2 | 队列定义 v2、修正项与限制 |
| modules/M30-cohort/branches/B30-02-cohort-v2/outputs/attrition_flow_v2.csv | 676de8560d73121b8350dfc322713afd625ce87d6fbcf9249e7f1f37dec3edb9 | v2 逐级入选流程（44,090→3,847） |
