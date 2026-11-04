---
project: free-form
module: explore
branch: quick-check
stream: quick-check
version: 1
status: DRAFT
baseline: 无（探索性快速核查）
created_at: 2026-10-18
submitted_at:
decided_at:
decision_reason:
supersedes: 0
superseded_by:
---

## 1. 本分支解决的问题

在正式分支启动前，快速核查早期活动与谵妄相关数据字段的质量（记录形式、缺失、口径），判断能否支撑「24 h 内启动」暴露定义与 28 天谵妄主结局。

## 2. 输入

- `artifact protocol-draft v1`（已 ACCEPTED 的问题定义）
- ICU 护理记录与 ICU-CAM 评估记录（模拟数据快照）
- 本示例不收录原始数据，仅保留核查记录

## 3. 输出

- `outputs/quick-check.md`：字段核查表、缺失率、影响与下一步建议
- 本 handoff：快速核查记录（DRAFT，未提交）

## 4. 关键结果

- 首次活动时间字段：2019–2022 为自由文本，2023 起结构化；抽查 200 例缺失 11.5%。
- 部分记录只有「活动等级」没有开始时间，需要映射规则。
- ICU-CAM 覆盖率 2021 年起 >90%，此前约 62%，主结局早期年份可能漏诊。
- 结论：字段问题可控但需要抽取规则；建议归入 pilot 做抽取脚本后，再决定是否升格为正式分支。

## 5. 修改建议

- 把「首次活动时间」抽取规则写成可测试脚本，作为 pilot 的输入。
- 主结局设定最小评估覆盖率门槛（如 80%），否则调整研究窗口。
- 本探索结论成熟后，再决定归入 evidence（数据质量证据）或 pilot（先导方法）。

## 6. 限制

- 仅抽查 200 例（模拟），缺失率估计有抽样误差。
- 本分支为探索性质，结论未经验证，不能作为最终依据。
- 保持 DRAFT 意味着接口未冻结，其他模块不得引用。

## 7. 主项目需要做的决定

当前无需决定；这是一个「先探索、后归类」的示例：结论成熟后，主项目再决定该工作归入哪个模块、是否升格为正式分支。本 handoff 保持 DRAFT 以体现接口未冻结。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/explore/branches/quick-check/outputs/quick-check.md | 待计算 | 数据字段快速核查记录（DRAFT） |
