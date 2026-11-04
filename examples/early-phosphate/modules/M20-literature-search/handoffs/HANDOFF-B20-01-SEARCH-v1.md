---
project: early-phosphate
module: M20
branch: B20-01
stream: literature-search
version: 1
status: REJECTED
baseline: artifact estimand-spec v1
created_at: 2026-09-27
submitted_at: 2026-09-29
decided_at: 2026-09-30
decision_reason: 去重流程不可复现、PRISMA 计数与附件不一致（1,284−312≠968），退回按 DOI 归一化重做
supersedes: 0
superseded_by:
blocked_from:
---

## 1. 本分支解决的问题

系统检索 2018-01-01 至 2024-06-30 关于 ICU 低磷血症与补磷/结局的已发表证据，为引言与讨论提供文献基础，并给出可复现的 PRISMA 流程。

## 2. 输入

- baseline：`artifact estimand-spec v1`（已 ACCEPTED，确定结局与人群口径）
- 检索式草稿（`work/`）与 PubMed、Embase、CENTRAL 访问权限（模拟）
- 纳入/排除标准：成人 ICU、补磷暴露、死亡或住院结局；排除儿童、非 ICU、单纯病例报告

## 3. 输出

- `outputs/search_strategy_v1.md`：三个数据库检索式、执行日期与计数
- `outputs/dedup_log_v1.csv`：v1 去重与 PRISMA 计数（含发现的计数缺口）
- 本 handoff：v1 检索结果，拟作为引言证据（未获接受）

## 4. 关键结果

- 数据库命中 1,206 条（PubMed 486、Embase 512、CENTRAL 208），参考文献追溯 78 条，去重前合计 1,284 条。
- v1 报告删除重复 312 条、题录筛选 968 条，但 1,284−312=972≠968；去重日志可识别重复实为 371 条，缺口 59 条，无法审计。
- 去重脚本仅按标题精确匹配与 DOI 原样字符串比较，未做大小写/空格归一化（如 `10.1000/SIM.2018.001` 与 `10.1000/sim.2018.001` 被视为不同记录）。
- 全文筛选 47 篇，最终纳入 23 篇（RCT 3、队列 18、病例对照 2），但纳入过程不可复现。

## 5. 修改建议

- 重写去重脚本：DOI 归一化（去前缀、统一小写、去尾标点）+ 无 DOI 记录的标题相似度判重（Jaro-Winkler ≥0.92）。
- 把 PRISMA 每一步计数与脚本输出绑定，删除记录逐条写 `record_id + 删除原因`，使任何计数可回溯。
- 纳入文献名单在正文与补充材料中逐条给出 DOI，便于复核。

## 6. 限制

- v1 的去重与筛选不可复现，不能作为论文引言证据。
- 检索截止 2024-06-30，未覆盖 2024H2；未检索 CINAHL 与中文数据库。
- 纳入的 3 项 RCT 样本量小（186–320 例），效应估计不稳定。

## 7. 主项目需要做的决定

是否退回重做（本次 reject 即完成，记录 D-0003）；重做应复用同一 stream（literature-search）并产生版本 2，不得覆盖本版本文件。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/M20-literature-search/branches/B20-01-search/outputs/search_strategy_v1.md | 592ddede47f0c5ca9c135822a9aebffaa9beb426721a9699b94537493e082bf9 | v1 检索式与数据库计数 |
| modules/M20-literature-search/branches/B20-01-search/outputs/dedup_log_v1.csv | 2c185312cc646e2a7ba7ba55a01afd47f65a3e22f2495af7f84b4d881dc35ef8 | v1 去重与 PRISMA 计数（含缺口） |
