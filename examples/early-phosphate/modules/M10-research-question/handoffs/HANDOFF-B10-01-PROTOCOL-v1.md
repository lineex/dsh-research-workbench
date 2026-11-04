---
project: early-phosphate
module: M10
branch: B10-01
stream: protocol-charter
version: 1
status: ACCEPTED
baseline: project-init
created_at: 2026-09-18
submitted_at: 2026-09-19
decided_at: 2026-09-22
decision_reason: 方案覆盖 estimand、时间零点与随访窗口，可作为项目基准
supersedes: 0
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

把「早期补磷是否降低 ICU 低磷血症患者 30 天死亡」的临床问题转成可执行的 target trial emulation 方案：固定入选条件、两种治疗策略、时间零点、随访窗口、结局与因果对比，供数据与统计模块按同一规范执行。

## 2. 输入

- `control/PROJECT_STATE.md` 项目目标与范围
- `work/tte_protocol_notes.md` 临床团队 PICO 草案与伦理批件摘要（模拟，IRB-2026-0912）
- 既往补磷相关 RCT 与观察性研究的初步印象（正式检索由 M20 完成）

## 3. 输出

- `outputs/target_trial_protocol.md`：目标试验六要素、预设分析、22 个预设混杂与 4 个中介变量
- `outputs/causal_diagram.md`：因果图与调整集
- 本 handoff：作为 `estimand-spec`、`cohort-definition` 等下游分支的设计输入

## 4. 关键结果

- 目标试验摘要：人群 = 成人 ICU、入 ICU 24 h 内血磷 <0.65 mmol/L；策略 A = 24 h 内启动静脉补磷，策略 B = 24 h 内不启动；时间零点 = 首次 ICU 入科；随访 30 天；主结局 = 30 天全因死亡；因果对比 = ATE。
- 22 个预设基线混杂写入方案第 2 节；补磷后血磷变化、尿磷排泄、心律失常为中介变量，明确不调整。
- 模拟预估样本约 3,800 例（后续 cohort-definition v2 实际为 3,847 例，模拟）。
- 报告清单固定为 TARGET + STROBE。

## 5. 修改建议

- 建议 estimand 分支把「24 h 内」按整小时精确定义，并写出时间零点对齐规则（跨科转移、外院转入）。
- 建议数据模块在构建队列时核对 2018 年前电子病历字段可用性，并在队列 handoff 中披露数据快照日期。
- 建议统计模块坚持「时间零点后变量不入权重模型」，避免治疗相关混杂。

## 6. 限制

- 方案基于观察性 EHR 假设，暴露判定依赖医嘱记录精度；2024-07 后医嘱表结构可能变化（当时尚未评估，后续在 B30-03 暴露）。
- 未测量混杂（医师补磷的主观触发原因、营养支持细节）无法在方案阶段消除，计划用 E-value 量化稳健性。
- 单中心三级医院数据，外推性有限。

## 7. 主项目需要做的决定

是否接受本方案作为项目设计基准并锁定版本；接受后，estimand 与数据模块方可启动。本次 accept 即完成该决定，理由记录于 `control/DECISIONS.md` 的 D-0001。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M10-research-question/branches/B10-01-protocol/outputs/target_trial_protocol.md | 17f24a4db654762c98655e91aa0c43319b810b25e7c9a148635d702b5ddac609 | 目标试验方案 v1（六要素、分析计划、调整集） |
| modules/M10-research-question/branches/B10-01-protocol/outputs/causal_diagram.md | 057663a3b6bd56ed1cf81df8ad7a7c3c8ea06e3be45ce880c2b4d32595b6d547 | 因果图与调整集说明（mermaid） |
