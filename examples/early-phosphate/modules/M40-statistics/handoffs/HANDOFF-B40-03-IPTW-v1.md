---
project: early-phosphate
module: M40
branch: B40-03
stream: iptw-diagnostics
version: 1
status: ACCEPTED
baseline: artifact cohort-definition v2
created_at: 2026-10-13
submitted_at: 2026-10-16
decided_at: 2026-10-19
decision_reason: 自动通过：verify 全绿
supersedes: 0
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

为队列 v2 构建 IPTW 权重并完成诊断：加权后协变量平衡、权重极端值与有效样本量，提出截尾方案供主项目决定。本版为 PROVISIONAL，等待主项目决定权重方案，尚未进入下游。

## 2. 输入

- baseline：`artifact cohort-definition v2`（已 ACCEPTED，n=3,847）
- `descriptive-tables v1` 的 22 个协变量与加权前 SMD（已 ACCEPTED）
- IPTW 脚本 `work/iptw.R`（R 4.4.1，`WeightIt`/`cobalt`）

## 3. 输出

- `outputs/balance_smd.csv`：22 个协变量加权前后 |SMD|
- `outputs/weight_distribution.csv`：分组/合并权重分位数与有效样本量
- `outputs/iptw_diagnostics_report.md`：模型、平衡、权重、三种截尾方案与建议
- 本 handoff：待主项目决定（PROVISIONAL）

## 4. 关键结果

- 加权前 14/22 个协变量 |SMD|>0.1（最大机械通气 0.31）；加权后最大 |SMD| = 0.087（乳酸），其余均 <0.1，平均 |SMD| 从 0.13 降至 0.036。
- 暴露组权重：中位数 1.01（IQR 0.62–1.73），最大 28.4，第 99 百分位 7.8；对照组中位数 1.00（0.72–1.42），最大 24.9，第 99 百分位 3.2。
- 有效样本量（ESS）：暴露 1,208/1,462、对照 1,977/2,385，合计 3,185（保留 82.8%）。
- 三种截尾方案的加权 Cox：不截尾 HR 0.84（0.68–1.05）；双侧 1%–99% 截尾 HR 0.88（0.71–1.09）；固定 0.1–10 截尾 HR 0.89（0.72–1.10）。

## 5. 修改建议

- 建议主分析采用**双侧 1%–99% 截尾**（最大权重 7.8），并保留不截尾与 overlap weights 作为敏感性分析。
- 不建议固定 0.1–10 截尾：会丢弃 3.1% 的暴露组权重，且 HR 方向与主方案不一致风险更高。
- 建议主分析在方法学章节明确写出截尾规则与 ESS，供审稿人复核。

## 6. 限制

- 权重模型为 logistic 主效应，未纳入非线性项（如血磷 × 乳酸交互）；可能存在残余不平衡（乳酸 0.087 接近阈值）。
- 2024H2 暴露时点缺失（B30-03 BLOCKED）可能带来少量暴露误分类，本诊断未单独剔除 2024H2。
- 权重诊断基于当前队列 v2 与分析宽表；若队列再出新版本，本诊断须重跑并新建版本。

## 7. 主项目需要做的决定

是否接受「双侧 1%–99% 截尾」作为主分析权重方案（本次待决定）：

- 若接受：主分析按 99% 截尾重跑，本 handoff 由主项目 ACCEPT，进入下游；
- 若不接受：请说明采用不截尾或其他方案，主分析相应调整；本 handoff 可按原方案 ACCEPT 或新建版本。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M40-statistics/branches/B40-03-iptw/outputs/balance_smd.csv | d8a65e5b999a9e734e2f41bedd6507b7ef1d2f57b8c90d987dc634c701be3a28 | 22 个协变量加权前后 SMD |
| modules/M40-statistics/branches/B40-03-iptw/outputs/weight_distribution.csv | 926b8937019a462d94fcb750f2131de8b384b42261e65e848a8a1937d29893a2 | 权重分位数、极值与有效样本量 |
| modules/M40-statistics/branches/B40-03-iptw/outputs/iptw_diagnostics_report.md | 7085f95caa622c798ba65be372bb926b57c0fbd0e5f32b31a0898d884fcb54ac | IPTW 诊断报告与截尾方案建议 |
