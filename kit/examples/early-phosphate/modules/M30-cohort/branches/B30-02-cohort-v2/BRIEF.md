# B30-02 · 队列定义 v2

## 要解决的问题

修正 v1 的暴露污染、ECMO 排除与血磷定义问题，重建 2018-01 至 2024-12 队列，作为全部统计分析的唯一队列，替代 v1。

## 输入

- baseline：`artifact cohort-definition v1`（被取代）
- 主项目接受意见（D-0005）与数据快照 2025-01-15（模拟）
- `work/cohort_build_v2.sql`

## 允许修改

- 仅本分支目录 `modules/M30-cohort/branches/B30-02-cohort-v2/` 内文件

## 禁止修改

- 不得覆盖 v1 分支的任何文件（旧版本留档）
- 不得修改已 ACCEPTED handoff 与其他模块文件

## 完成标准

- 新增排除（入 ICU 前 6h 补磷、ECMO/体外循环）逐条可复算
- 逐级入选计数闭合，最终 n 与暴露/对照分组明确
- 同一 stream（cohort-definition）版本号 = 2、supersedes = 1

## 必须交付

- `modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md`
- `outputs/cohort_definition_v2.md`
- `outputs/attrition_flow_v2.csv`
