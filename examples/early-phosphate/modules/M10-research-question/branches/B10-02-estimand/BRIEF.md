# B10-02 · estimand 与时点

## 要解决的问题

把方案中的因果问题写成可估计的 estimand，并解决时间零点、24 小时暴露窗口与「入 ICU 前已补磷」的边界处理。

## 输入

- baseline：`artifact protocol-charter v1`（已 ACCEPTED）
- 方案文件 `B10-01-protocol/outputs/target_trial_protocol.md`
- `work/estimand_notes.md` 临床药师关于补磷医嘱时间戳的说明（模拟）

## 允许修改

- 仅本分支目录 `modules/M10-research-question/branches/B10-02-estimand/` 内文件

## 禁止修改

- 不得修改已 ACCEPTED 的 `HANDOFF-B10-01-PROTOCOL-v1.md` 与 `control/`

## 完成标准

- estimand 六要素（人群、策略、分配、时间零点、随访、结局）逐条落表
- 明确 ATE 主对比与 ATT 敏感性分析
- 24h 窗口、跨科转移、入 ICU 前补磷的处理写成可执行规则

## 必须交付

- `modules/M10-research-question/handoffs/HANDOFF-B10-02-ESTIMAND-v1.md`
- `outputs/estimand_spec.md`
- `outputs/time_zero_and_eligibility.csv`
