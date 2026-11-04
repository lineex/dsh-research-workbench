---
project: early-phosphate
module: M30
branch: B30-03
stream: missing-audit
version: 1
status: BLOCKED
baseline: artifact cohort-definition v2
created_at: 2026-10-12
submitted_at: 2026-10-13
decided_at: 2026-10-13
decision_reason: 2024-07 起补磷医嘱表结构变更，补磷时点缺失率无法核实，等待数据管理员澄清
supersedes: 0
superseded_by:
blocked_from: PROVISIONAL
---

## 1. 本分支解决的问题

审计队列 v2 关键变量（补磷时点、血磷、协变量）的缺失模式，评估其对 IPTW 与主分析的影响，提出缺失处理建议；发现 2024H2 记录结构变更问题后请求阻塞，等待数据管理员澄清。

## 2. 输入

- baseline：`artifact cohort-definition v2`（已 ACCEPTED）
- 队列构建中间宽表（由 `work/` 脚本生成）与 `outputs/missingness_audit.csv`
- 2024-07 医嘱系统升级说明（数据管理员提供，尚不完整）

## 3. 输出

- `outputs/missingness_audit.csv`：关键变量缺失率（总体与 2024H2/此前分层）
- `outputs/missing_pattern_report.md`：缺失模式、影响评估、阻塞请求
- 本 handoff：PROVISIONAL 提交后因数据口径不明转为 BLOCKED，未进入下游

## 4. 关键结果

- 协变量缺失率均 ≤10.7%（pH 10.7%、乳酸 6.2%、白蛋白 5.4%），预设 MICE（m=20）可处理；结局不插补。
- 暴露时点：1,462 例暴露者中 96 例（6.6%）补磷医嘱仅精确到日期；按时段分层，2024H2 暴露组 82/206 = 39.8%，2018–2024H1 仅 14/1,256 = 1.1%。
- 缺失比例骤升与 2024-07 医嘱系统升级（补磷医嘱由「开始时间」迁移为「开立时间 + 执行记录」）时间吻合。
- 队列 v2 对仅日期精度者按 08:00 默认纳入；若按最晚可能时间 23:59 处理，18 例暴露可能转对照。
- 在字段迁移规则确认前，缺失处理主口径无法定稿，影响 IPTW 暴露判定与主分析敏感性分析。

## 5. 修改建议

- 请求数据管理员书面确认三点：旧字段 `order_start_dt` 是否有备份；护理执行记录能否恢复实际执行时间；2024H2 是否存在补磷批次号可交叉核对。
- 在主口径确认前，主分析先按「按 08:00 纳入 + 排除 2024H2 敏感性分析」运行并标注不确定性。
- 解除阻塞后，本分支应在同一 stream（missing-audit）新建 v2，不修改本版本正文。

## 6. 限制

- 阻塞点：2024H2 补磷时点缺失机制未知；若为非随机缺失（记录结构变更导致），完整病例分析可能有偏。
- 缺失审计未覆盖结局变量（死亡登记关联缺失 <0.5%，暂不处理）。
- 仅基于单中心数据，字段迁移规则可能不适用于其他年份以外的系统版本。

## 7. 主项目需要做的决定

是否等待数据管理员澄清（本次 block 即完成，记录 D-0008）；若两周内无法确认，主项目需决定是否将 2024H2 整体排除或按缺失处理并写入限制。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M30-cohort/branches/B30-03-missing/outputs/missingness_audit.csv | 247e6a3bd3e435f9de7474a5d2198fb7f29ef0fa51f062e0204ec3831b416cec | 关键变量缺失率与分层（总体/2024H2 前/后） |
| modules/M30-cohort/branches/B30-03-missing/outputs/missing_pattern_report.md | 28486868541bacd70be6db8e3e84e9e53859476de660c19bfd2cbd50953ad9d8 | 缺失模式、影响评估与阻塞请求 |
