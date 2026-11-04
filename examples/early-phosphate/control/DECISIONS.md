# 决策日志 — 重症低磷血症患者早期补磷的 target trial emulation

<!-- 追加式日志：编号 D-0001 起递增；由 dag accept/reject/block 追加，历史条目不修改。 -->

## D-0001 · 接受研究方案 v1
- 时间: 2026-09-22
- 动作: ACCEPT
- 对象: modules/M10-research-question/handoffs/HANDOFF-B10-01-PROTOCOL-v1.md
- 状态: ACCEPTED
- 理由: 方案覆盖 estimand、时间零点与随访窗口，可作为项目基准

## D-0002 · 接受 estimand 规格 v1
- 时间: 2026-09-25
- 动作: ACCEPT
- 对象: modules/M10-research-question/handoffs/HANDOFF-B10-02-ESTIMAND-v1.md
- 状态: ACCEPTED
- 理由: estimand 与方案一致，同意以 ATE、30 天全因死亡为主对比

## D-0003 · 拒绝文献检索 v1
- 时间: 2026-09-30
- 动作: REJECT
- 对象: modules/M20-literature-search/handoffs/HANDOFF-B20-01-SEARCH-v1.md
- 状态: REJECTED
- 理由: 去重流程不可复现、PRISMA 计数与附件不一致（1,284−312≠968），退回按 DOI 归一化重做

## D-0004 · 接受文献检索 v2
- 时间: 2026-10-04
- 动作: ACCEPT
- 对象: modules/M20-literature-search/handoffs/HANDOFF-B20-02-SEARCH-v2.md
- 状态: ACCEPTED
- 理由: 去重与 PRISMA 计数可复现，接受 23 篇纳入文献作为引言依据

## D-0005 · 接受队列定义 v1
- 时间: 2026-10-07
- 动作: ACCEPT
- 对象: modules/M30-cohort/handoffs/HANDOFF-B30-01-COHORT-v1.md
- 状态: ACCEPTED
- 理由: 队列定义与入选流程一致，先接受以启动基线表

## D-0006 · 接受队列定义 v2
- 时间: 2026-10-11
- 动作: ACCEPT
- 对象: modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md
- 状态: ACCEPTED
- 理由: 修正入 ICU 前 6 小时补磷排除与 ECMO 排除后接受，替代 v1

## D-0007 · 队列定义 v1 由 v2 取代
- 时间: 2026-10-11
- 动作: NOTE
- 对象: modules/M30-cohort/handoffs/HANDOFF-B30-01-COHORT-v1.md
- 状态: SUPERSEDED
- 理由: 同一 stream 新版本被接受，v1 自动转 SUPERSEDED；下游统一改用 cohort-definition v2
- 关联: D-0006

## D-0008 · 阻塞缺失审计 v1
- 时间: 2026-10-13
- 动作: BLOCK
- 对象: modules/M30-cohort/handoffs/HANDOFF-B30-03-MISSING-v1.md
- 状态: BLOCKED
- 理由: 2024-07 起补磷医嘱表结构变更，补磷时点缺失率无法核实，等待数据管理员澄清

## D-0009 · 接受基线表 v1
- 时间: 2026-10-15
- 动作: ACCEPT
- 对象: modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md
- 状态: ACCEPTED
- 理由: Table 1 与队列 v2 一致，加权前 SMD 可复现

## D-0010 · 接受论文大纲 v1
- 时间: 2026-10-17
- 动作: ACCEPT
- 对象: modules/M50-writing/handoffs/HANDOFF-B50-01-OUTLINE-v1.md
- 状态: ACCEPTED
- 理由: 论文大纲与目标期刊要求一致，接受为写作基准

## D-0011 · 接受 IPTW 诊断 v1
- 时间: 2026-10-19
- 动作: ACCEPT
- 对象: modules/M40-statistics/handoffs/HANDOFF-B40-03-IPTW-v1.md
- 状态: ACCEPTED
- 理由: 自动通过：verify 全绿

## D-0012 · 接受 方法学章节 v1
- 时间: 2026-10-19
- 动作: ACCEPT
- 对象: modules/M50-writing/handoffs/HANDOFF-B50-02-METHODS-v1.md
- 状态: ACCEPTED
- 理由: 自动通过：verify 全绿
