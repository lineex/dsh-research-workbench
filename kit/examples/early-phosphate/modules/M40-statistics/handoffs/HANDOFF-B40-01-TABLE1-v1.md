---
project: early-phosphate
module: M40
branch: B40-01
stream: descriptive-tables
version: 1
status: ACCEPTED
baseline: artifact cohort-definition v2
created_at: 2026-10-12
submitted_at: 2026-10-14
decided_at: 2026-10-15
decision_reason: Table 1 与队列 v2 一致，加权前 SMD 可复现
supersedes: 0
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

基于队列 v2 生成按暴露分组的基线表（Table 1），核对两组可比性与加权前 SMD，为 IPTW 建模提供协变量清单，并作为论文 Table 1 的基础版本。

## 2. 输入

- baseline：`artifact cohort-definition v2`（已 ACCEPTED，n=3,847）
- 队列表与 22 个预设协变量清单（来自 protocol-charter v1 的因果图）
- 制表脚本 `work/table1.R`（R 4.4.1，`tableone`/`dplyr`）

## 3. 输出

- `outputs/table1_baseline.csv`：按暴露分组的基线特征与加权前 SMD
- `outputs/table1_notes.md`：统计口径、22 个协变量清单、SMD 计算方法
- 本 handoff：论文 Table 1（供写作模块引用）

## 4. 关键结果

- 队列 n=3,847：暴露 1,462（38.0%）、对照 2,385（62.0%）。
- 年龄 62.4（15.8）vs 63.1（16.2）岁；男性 58.2% vs 57.4%；BMI 24.8（4.9）vs 25.0（5.1）。
- APACHE II 22.1（6.8）vs 21.4（6.9）；SOFA 8.3（3.5）vs 8.0（3.4）。
- 基线血磷 0.52（0.10）vs 0.51（0.10）mmol/L；白蛋白 28.9（4.6）vs 29.4（4.5）g/L；乳酸中位数 2.8 vs 2.7 mmol/L。
- 机械通气 47.6% vs 45.9%；血管活性药 38.1% vs 37.2%；CRRT 9.8% vs 9.1%。
- 22 个协变量中 **14 个加权前 |SMD|>0.1**，最大为机械通气 0.31，其次 6 h 液体量 0.27、血管活性药 0.24、乳酸 0.21、血磷 0.18——必须做倾向评分加权。

## 5. 修改建议

- 建议 IPTW 分支以本表 22 个协变量为模型输入；不要把 eGFR 与肌酐同时入模（共线）。
- 建议敏感性模型额外纳入「入 ICU 类型 × 机械通气」交互，检验模型设定稳健性。
- 建议写作模块在 Table 1 脚注注明「未加权、缺失 <11%，连续变量以均值（SD）或中位数（IQR）表示」。

## 6. 限制

- Table 1 为未加权描述，不能解释为因果效应。
- 分类变量缺失 <1%，未单列缺失类别；连续变量缺失（pH 10.7% 等）在均值计算中按完整案例分析，未插补。
- 基于队列 v2；若队列再出 v3，本表须重跑并新建版本，不得直接改数字。

## 7. 主项目需要做的决定

是否接受 Table 1 作为论文表 1 基础版本（本次 accept 即完成，记录 D-0009）。接受后写作模块可引用本表数字。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M40-statistics/branches/B40-01-table1/outputs/table1_baseline.csv | cbaad4f0514fee6478fab0b03b7b1e308771e6250f4a748ac9e38c50bf8414ad | Table 1 基线特征（按暴露分组，含加权前 SMD） |
| modules/M40-statistics/branches/B40-01-table1/outputs/table1_notes.md | 11a8ca9441a8e94566d517a0fe35b43bb09614e3828042530e28c12272a3ca2b | 制表说明、统计口径与 22 个协变量清单 |
