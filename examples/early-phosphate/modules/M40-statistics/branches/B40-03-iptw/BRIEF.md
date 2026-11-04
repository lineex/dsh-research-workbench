# B40-03 · IPTW 诊断

## 要解决的问题

为队列 v2 构建 IPTW 权重并完成诊断：加权后协变量平衡、权重极端值、有效样本量，提出截尾方案供主项目决定。

## 输入

- baseline：`artifact cohort-definition v2`（已 ACCEPTED）
- `descriptive-tables v1` 的 22 个协变量与加权前 SMD
- IPTW 脚本（`work/iptw.R`）

## 允许修改

- 仅本分支目录 `modules/M40-statistics/branches/B40-03-iptw/` 内文件

## 禁止修改

- 不得修改队列 v2、Table 1 handoff 与 `control/`
- 不得直接改写主分析 handoff（主分析由 B40-02 负责）

## 完成标准

- 22 个协变量加权前后 |SMD| 全部列出，加权后最大 |SMD| < 0.1
- 权重分布（中位数、IQR、极值、第 1/99 百分位）与 ESS 给出
- 截尾方案至少 2 种并给出对应加权 HR，明确「待主项目决定」

## 必须交付

- `modules/M40-statistics/handoffs/HANDOFF-B40-03-IPTW-v1.md`
- `outputs/balance_smd.csv`
- `outputs/weight_distribution.csv`
- `outputs/iptw_diagnostics_report.md`
