# B40-02 · 主分析

## 要解决的问题

在队列 v2 上执行主分析：估计早期补磷对 30 天全因死亡的 ATE（风险差 + 加权 HR），并完成预设敏感性分析。

## 输入

- baseline：`artifact cohort-definition v2`（已 ACCEPTED）
- `IPTW 诊断 v1`（PROVISIONAL，仅用于确定权重方案，不引用其数字入党）
- 主分析计划与脚本（`work/main_analysis.R`）

## 允许修改

- 仅本分支目录 `modules/M40-statistics/branches/B40-02-main/` 内文件

## 禁止修改

- 不得修改队列 v2、Table 1 与 IPTW 诊断 handoff
- 不得修改 `control/` 与其他模块文件

## 完成标准

- 主结局给出加权风险、风险差与 HR（含 95% CI）、加权 KM 曲线数据
- 敏感性分析：截尾方案、overlap weights、E-value、排除 2024H2
- 所有数字可由 `work/main_analysis.R` 重跑复现，并标注模拟数据

## 必须交付

- `modules/M40-statistics/handoffs/HANDOFF-B40-02-MAIN-v1.md`（当前 DRAFT）
- `outputs/main_analysis_plan.md`
- `outputs/table2_primary_draft.csv`
