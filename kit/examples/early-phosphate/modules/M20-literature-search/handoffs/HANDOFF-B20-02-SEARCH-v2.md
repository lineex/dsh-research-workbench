---
project: early-phosphate
module: M20
branch: B20-02
stream: literature-search
version: 2
status: ACCEPTED
baseline: artifact estimand-spec v1
created_at: 2026-10-01
submitted_at: 2026-10-03
decided_at: 2026-10-04
decision_reason: 去重与 PRISMA 计数可复现，接受 23 篇纳入文献作为引言依据
supersedes: 0
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

修复 v1 的去重与 PRISMA 计数问题，重做检索与筛选，给出可由脚本复现的纳入证据集，替代被拒绝的 v1 作为项目文献依据。

## 2. 输入

- baseline：`artifact estimand-spec v1`（设计未变，无需重新接受）
- v1 的拒绝理由（D-0003）与 v1 分支 `work/` 脚本、检索式
- 新增 CINAHL 数据库权限（模拟）

## 3. 输出

- `outputs/search_strategy_v2.md`：四个数据库检索式、DOI 归一化与标题相似度去重规则
- `outputs/prisma_flow_counts.csv`：PRISMA 逐步计数（脚本输出，计数闭合）
- `outputs/included_studies.csv`：23 篇纳入研究（含模拟 DOI）
- `work/dedup_v2.py`：可重跑去重脚本（工作稿，不对外）
- 本 handoff：v2 证据集，供引言与讨论引用

## 4. 关键结果

- 检索命中：PubMed 486 + Embase 512 + CENTRAL 208 + CINAHL 96 = 1,302 条。
- 去重删除 441 条（DOI 归一化 432 + 标题相似 9），题录筛选 861 条；861−814=47 篇全文；47−24=23 篇纳入。
- 计数闭合校验：1,302−441=861；861−814=47；47−24=23，与 `work/dedup_v2.py` 输出一致。
- 全文排除 24 篇：人群不符 14、无目标结局 5、仅研究方案 3、重复队列 2。
- 纳入 23 篇：RCT 3、队列研究 18、病例对照 2；其中 3 项 RCT 提示补磷可能降低心律失常风险，但死亡率证据不足（模拟结果）。

## 5. 修改建议

- 建议写作模块在引言引用 23 篇中的 17 篇直接证据，其余 6 篇（机制、指南类）放补充表。
- 建议讨论部分把「补磷对死亡率无显著效应」与纳入研究中 3 项 RCT 的阴性/中性结果对照。
- 建议下次更新检索时沿用 v2 去重脚本，避免再次出现计数不可复现问题。

## 6. 限制

- 检索截止 2024-12-31；未检索中文数据库与会议摘要。
- 纳入研究以成人 ICU 为主，儿童与特殊人群证据不足，外推需谨慎。
- 纳入研究间暴露定义差异大（任意时间 vs 24 h 内），效应估计异质性高。

## 7. 主项目需要做的决定

是否接受 v2 作为项目文献依据并替代 v1（本次 accept 即完成，记录 D-0004）。v1 为终态 REJECTED，不转 SUPERSEDED；同 stream 仅允许本版本为 ACCEPTED。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M20-literature-search/branches/B20-02-search-v2/outputs/search_strategy_v2.md | c5f555fc9f7c74cc773d85c43b40ed3d8cbdbdf1de4e709bcc270807344e312f | v2 检索式、去重规则与计数闭合说明 |
| modules/M20-literature-search/branches/B20-02-search-v2/outputs/prisma_flow_counts.csv | 545cbdd2a8f386976cf6addeac385f55fe3463de0f719dbb1c578d289a2b2c2f | PRISMA 逐步计数（脚本输出） |
| modules/M20-literature-search/branches/B20-02-search-v2/outputs/included_studies.csv | c97a3ab51d6b4399c926abb689e4092668fb7078a84d8eb833da9b430c7f4b29 | 23 篇纳入研究清单 |
