---
project: early-phosphate
module: M10
branch: B10-02
stream: estimand-spec
version: 1
status: ACCEPTED
baseline: artifact protocol-charter v1
created_at: 2026-09-23
submitted_at: 2026-09-24
decided_at: 2026-09-25
decision_reason: estimand 与方案一致，同意以 ATE、30 天全因死亡为主对比
supersedes: 0
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

把方案中的因果问题写成可估计的 estimand，并解决时间零点、24 小时暴露窗口与「入 ICU 前已补磷」的边界处理，使数据与统计模块对整个项目只有一个因果对比口径。

## 2. 输入

- baseline：`artifact protocol-charter v1`（已 ACCEPTED）
- 方案文件 `modules/M10-research-question/branches/B10-01-protocol/outputs/target_trial_protocol.md`
- `work/estimand_notes.md` 临床药师关于补磷医嘱时间戳的说明（模拟）

## 3. 输出

- `outputs/estimand_spec.md`：estimand 六要素、统计量、5 条边界规则、敏感性 estimand（ATT/overlap weights）
- `outputs/time_zero_and_eligibility.csv`：10 条可执行边界规则
- 本 handoff：作为队列定义与统计模块的暴露/时点口径依据

## 4. 关键结果

- 目标人群：成人、首次 ICU 停留 ≥6 h、入 ICU 24 h 内最低血磷 <0.65 mmol/L；排除入 ICU 前 6 h 内补磷与 ECMO/体外循环者（后者由队列模块执行，v2 实际排除 331 与 80 例，模拟）。
- 策略 A：首次 ICU 入科后 24 h 内开始静脉补磷；策略 B：24 h 内不开始。
- 时间零点 = 首次 ICU 入科时间；随访 = 时间零点起 30 天，或死亡/转院/出院先到者。
- 主因果对比 = ATE，报告加权风险差与加权 Cox HR（均含 95% CI）；ATT 作为敏感性 estimand。
- 24 h 窗口按 (t0, t0+24h] 整小时对齐；补磷医嘱时间取「开始时间」，若仅有开立时间则按开立时间计并在限制中披露。

## 5. 修改建议

- 建议统计模块同时报告 ATE 与 ATT（overlap weights），并把权重截尾阈值放到 IPTW 诊断分支单独决定，不在 estimand 中预设。
- 建议队列模块在入选流程中单独列出「入 ICU 前补磷」排除行，便于下游核对暴露污染。
- 建议写作模块在方法学章节逐条对齐 TARGET 清单中的 estimand 报告项。

## 6. 限制

- ATE 依赖正性假设；极低概率暴露组的权重可能被放大（后续 IPTW 诊断第 99 百分位权重 7.8，模拟）。
- 时间零点后 24 h 内存在院内转科与医嘱停用/重启，暴露状态可能在 24 h 内变化，本 estimand 只按「是否启动」定义。
- 回顾性数据无法验证随机化假设，未测量混杂仍可能存在。

## 7. 主项目需要做的决定

是否接受本 estimand 作为统计模块唯一主对比（本次 accept 即完成，记录 D-0002）；后续如需更换主对比，必须新建版本而非修改本文件。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M10-research-question/branches/B10-02-estimand/outputs/estimand_spec.md | 5a48de5557d40e644d1b8f2f4d3e0a2c04209c84e67dbd24c236f6dde9b28f20 | estimand 六要素、边界规则与敏感性 estimand |
| modules/M10-research-question/branches/B10-02-estimand/outputs/time_zero_and_eligibility.csv | 470888d7fcee949487b27f6fa1e97fd66b8d9e21fd775fb1820bed692d429614 | 时间零点与纳入条件规则表（10 条） |
