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
