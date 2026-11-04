# 鱼刺上下文档案 — B40-02（主分析）

> ⚠ 本文件由 `dag context` 于 2026-10-20 **补建**（这根鱼刺创建于 CONTEXT 档案机制之前）。
> 下面记录的是**补建时刻**的主骨状态，不是分刺当时的历史快照；请按此理解。

## 0. 这根刺为什么存在

- 所属主骨：M40（统计分析）
- 任务意图（据交接 stream 推断）：产出 `main-analysis`
- 主骨当前阶段：analysis

## 1. 主骨当前意图（分刺时刻）

### 下一步
- 与数据管理员确认 2024-07 起补磷医嘱表结构变更，解除 B30-03 缺失审计阻塞
- 主项目决定 IPTW 诊断 v1 的权重截尾方案（99% 截尾 vs 不截尾）
- 完成主分析 v1（加权 Cox、加权 KM 与敏感性分析）并提交
- 方法学章节按 TARGET 清单核对后提交决定

### 阻塞
- B30-03 缺失审计 v1：2024-07 起补磷医嘱表结构变更，补磷时点缺失率无法核实，等待数据管理员澄清

## 2. 本模块已有的全部鱼刺与交接

| 分支 | stream | 版本 | 状态 | 交接文件 |
|---|---|---|---|---|
| B40-01 | descriptive-tables | v1 | ACCEPTED | modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md |
| B40-02 | main-analysis | v1 | DRAFT | modules/M40-statistics/handoffs/HANDOFF-B40-02-MAIN-v1.md |
| B40-03 | iptw-diagnostics | v1 | ACCEPTED | modules/M40-statistics/handoffs/HANDOFF-B40-03-IPTW-v1.md |

本模块名下的鱼刺（按模块归类，共 3 根）：

| 鱼刺 id | 名称 | 模式 | 交接数 |
|---|---|---|---|
| B40-01 | 基线表 | standard | 1 条交接 |
| B40-02（本刺） | 主分析 | standard | 1 条交接 |
| B40-03 | IPTW 诊断 | standard | 1 条交接 |

（本模块共 3 条交接记录；分刺时刻本项目已接受 8 个 stream。）

## 3. 全项目已接受的稳定输入（accepted/）

| stream | 版本 | 交接文件 |
|---|---|---|
| protocol-charter | v1 | modules/M10-research-question/handoffs/HANDOFF-B10-01-PROTOCOL-v1.md |
| estimand-spec | v1 | modules/M10-research-question/handoffs/HANDOFF-B10-02-ESTIMAND-v1.md |
| literature-search | v2 | modules/M20-literature-search/handoffs/HANDOFF-B20-02-SEARCH-v2.md |
| cohort-definition | v2 | modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md |
| descriptive-tables | v1 | modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md |
| iptw-diagnostics | v1 | modules/M40-statistics/handoffs/HANDOFF-B40-03-IPTW-v1.md |
| manuscript-outline | v1 | modules/M50-writing/handoffs/HANDOFF-B50-01-OUTLINE-v1.md |
| methods-section | v1 | modules/M50-writing/handoffs/HANDOFF-B50-02-METHODS-v1.md |

> 下游只能消费 ACCEPTED 结果；脚本统一读取 `<root>/accepted/<stream>/`。

## 4. 项目状态板快照（PROJECT_STATE.md）

```markdown
# 项目状态 — 重症低磷血症患者早期补磷的 target trial emulation

## 研究总目标

在成人 ICU 低磷血症患者中，采用 target trial emulation 评估「入 ICU 24 小时内启动静脉补磷」相较「24 小时内不补磷」对 30 天全因死亡的影响，并按 TARGET 清单报告。

## 项目约定

- 控制层只读 `control/` 与各模块 `handoffs/`；下游只消费 `ACCEPTED` 结果。
- 重做产生新版本，不覆盖旧版本；同一 stream 只保留一个 `ACCEPTED`。
- 提交后正文冻结（`body_hash`），PROVISIONAL 之后只允许改状态字段。
- 本状态板 AUTO 区块由 `dag report` 生成，手工内容仅在 AUTO 区块外维护。

<!-- BEGIN AUTO -->

## 当前阶段
analysis

## 下一步
- 与数据管理员确认 2024-07 起补磷医嘱表结构变更，解除 B30-03 缺失审计阻塞
- 主项目决定 IPTW 诊断 v1 的权重截尾方案（99% 截尾 vs 不截尾）
- 完成主分析 v1（加权 Cox、加权 KM 与敏感性分析）并提交
- 方法学章节按 TARGET 清单核对后提交决定

## 阻塞
- B30-03 缺失审计 v1：2024-07 起补磷医嘱表结构变更，补磷时点缺失率无法核实，等待数据管理员澄清

## 待主项目决定
| 模块 | 分支 | 版本 | 要决定的问题 |
|---|---|---|---|

## 已接受结果（下游可用）
| stream | 版本 | 位置 |
|---|---|---|
| cohort-definition | 2 | modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md |
| descriptive-tables | 1 | modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md |
| estimand-spec | 1 | modules/M10-research-question/handoffs/HANDOFF-B10-02-ESTIMAND-v1.md |
| iptw-diagnostics | 1 | modules/M40-statistics/handoffs/HANDOFF-B40-03-IPTW-v1.md |
| literature-search | 2 | modules/M20-literature-search/handoffs/HANDOFF-B20-02-SEARCH-v2.md |
| manuscript-outline | 1 | modules/M50-writing/handoffs/HANDOFF-B50-01-OUTLINE-v1.md |
| methods-section | 1 | modules/M50-writing/handoffs/HANDOFF-B50-02-METHODS-v1.md |
| protocol-charter | 1 | modules/M10-research-question/handoffs/HANDOFF-B10-01-PROTOCOL-v1.md |

## 模块概览
| 模块 | 名称 | 分支 | 草稿 | 待决定 | 已接受 |
|---|---|---|---|---|---|
| M10 | 研究问题与方案 | 2 | 0 | 0 | 2 |
| M20 | 文献检索 | 2 | 0 | 0 | 1 |
| M30 | 数据与队列 | 3 | 0 | 0 | 1 |
| M40 | 统计分析 | 3 | 1 | 0 | 2 |
| M50 | 论文写作 | 2 | 0 | 0 | 2 |
| M60 | 审稿修订 | 1 | 0 | 0 | 0 |

<!-- END AUTO -->
```

## 5. 决策日志（DECISIONS.md）

```markdown
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
```

（分刺时刻快照：决策 12 条。）

---

## 使用说明（给鱼刺智能体）

1. 先通读上文，理解主骨为什么需要这根刺、此前已经决定了什么。
2. 只写本分支 `work/` 与 `outputs/`；不要改 `control/`、其他模块或任何 ACCEPTED handoff。
3. 输入一律取自 `accepted/<stream>/` 稳定路径；不要读兄弟分支的未接受草稿。
4. 完成后填 handoff 第 1–7 节 → `dag submit`；主项目满意后 `dag graft` 回连主骨。
