# B30-03 · 缺失审计

## 要解决的问题

审计队列 v2 关键变量（补磷时点、血磷、协变量）的缺失模式，评估其对 IPTW 与主分析的影响，并给出缺失处理建议。

## 输入

- baseline：`artifact cohort-definition v2`（已 ACCEPTED）
- 队列构建中间宽表（`work/` 脚本生成）
- 2024-07 医嘱表结构变更说明（数据管理员提供，尚不完整）

## 允许修改

- 仅本分支目录 `modules/M30-cohort/branches/B30-03-missing/` 内文件

## 禁止修改

- 不得修改队列 v2 的任何已交付文件与 handoff
- 不得修改原始数据快照

## 完成标准

- 每个关键变量的缺失率、缺失机制初判、处理建议写入报告
- 2024H2 补磷时点缺失与医嘱表结构变更的关系可核对
- 阻塞点写清「需要谁提供什么信息才能继续」

## 必须交付

- `modules/M30-cohort/handoffs/HANDOFF-B30-03-MISSING-v1.md`
- `outputs/missingness_audit.csv`
- `outputs/missing_pattern_report.md`
