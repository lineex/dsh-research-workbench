---
project: early-phosphate
module: M40
branch: B40-02
stream: main-analysis
version: 1
status: DRAFT
baseline: artifact cohort-definition v2
created_at: 2026-10-17
submitted_at:
decided_at:
decision_reason:
supersedes: 0
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

在队列 v2 上执行主分析：估计早期补磷对 30 天全因死亡的 ATE（风险差 + 加权 HR），完成预设敏感性分析，并产出论文 Table 2 与图 2。本版为 DRAFT，尚未提交。

## 2. 输入

- baseline：`artifact cohort-definition v2`（已 ACCEPTED，n=3,847）
- `IPTW 诊断 v1`（PROVISIONAL，仅用于确定权重方案，不引用其数字入党）
- 主分析计划 `outputs/main_analysis_plan.md` 与脚本 `work/main_analysis.R`

## 3. 输出

- `outputs/main_analysis_plan.md`：SAP 摘要（estimand、权重、结局模型、敏感性分析、缺失处理）
- `outputs/table2_primary_draft.csv`：主结局与敏感性分析草稿（数字待权重方案冻结后复核）
- 本 handoff：DRAFT，未提交、未进入下游；主项目暂无需决定

## 4. 关键结果

> 本版为草稿（DRAFT），以下数字待权重方案冻结后复核。

- 当前按「双侧 1%–99% 截尾 IPTW + 加权 Cox」的初步结果：HR 0.88（95% CI 0.71–1.09），p=0.24。
- 加权 30 天死亡风险：暴露 17.1%、对照 18.9%；风险差 −1.8 个百分点（95% CI −4.1–0.5），p=0.13。
- 敏感性分析草稿：未截尾 HR 0.84（0.68–1.05）；overlap weights HR 0.86（0.69–1.07）；排除 2024H2 HR 0.90（0.72–1.12）；E-value 1.53。
- 尚未完成：加权 KM 曲线（图 2 数据）、次要结局（机械通气时长、ICU 天数、心律失常）、MICE 插补后的主结果。

## 5. 修改建议

- 待主项目决定 IPTW 截尾方案（B40-03）后，固定权重方案重跑全部表格并重算 E-value。
- 补充阴性对照结局（ICU 获得性肌无力）与阳性对照结局（机械通气），检验残余混杂。
- 结果数字与 Table 2 需与写作模块核对后再提交，禁止提前引用。

## 6. 限制

- 本版为 DRAFT：正文与数字均为工作稿，未完成缺失数据多重插补与加权 KM。
- 2024H2 暴露时点缺失（B30-03 BLOCKED）尚未纳入主分析口径，当前仅作为敏感性分析。
- 权重方案未冻结，所有估计值可能随截尾决策变化。

## 7. 主项目需要做的决定

本版为草稿，无需决定。完成加权 KM、次要结局、MICE 与权重方案复核后，由分支执行方提交（submit）转为 PROVISIONAL，再请主项目决定是否接受为论文主分析。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M40-statistics/branches/B40-02-main/outputs/main_analysis_plan.md | 6989eadb17030a18a9df5ab8d3d67fad2ba6104a62aad036c1b1e1539ee71974 | SAP 摘要（DRAFT） |
| modules/M40-statistics/branches/B40-02-main/outputs/table2_primary_draft.csv | 09c88739df288308111caeab78504003b781a14530487ac636bf3bbf2e75133e | 主结局与敏感性分析草稿表 |
