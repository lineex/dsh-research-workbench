---
project: free-form
module: question
branch: protocol-draft
stream: protocol-draft
version: 1
status: ACCEPTED
baseline: 无（项目首个交付）
created_at: 2026-10-18
submitted_at: 2026-10-18
decided_at: 2026-10-18
decision_reason: 问题定义清晰、范围边界明确，接受为全项目基准
supersedes: 0
superseded_by:
---

## 1. 本分支解决的问题

把「早期活动是否降低 ICU 谵妄」的临床兴趣收敛成可执行的研究问题与范围边界，为证据、先导与探索模块提供统一的问题定义。这是本项目第一个交付，用于证明模块/分支命名自由时，协议仍按同一状态门控与接口规范工作。

## 2. 输入

- 项目 `README.md` 与 `control/PROJECT_STATE.md`（init 生成）
- 临床团队的研究兴趣记录（口头讨论，无上游 handoff；本项目首个分支）
- 无上游 handoff 可依赖

## 3. 输出

- `outputs/research-question.md`：PICO、时间零点、暴露窗口、主/次结局与当前决定
- `outputs/scope-boundaries.md`：做/不做清单，以及「为什么不按论文固定阶段分模块」的说明
- 本 handoff：问题定义 v1，供下游引用

## 4. 关键结果

- 锁定 PICO：成人 ICU（首次停留 ≥24 h）；入 ICU 24 h 内启动早期活动 vs 未启动；主结局 28 天谵妄发生率，次要结局 28 天死亡、ICU 住院天数。
- 时间零点 = 首次 ICU 入科；暴露窗口 = (t0, t0+24h]；因果对比 = ATE。
- 明确不做器官移植 / ECMO / 儿童亚组，避免后续分支反复扩大范围。
- 结构说明：本示例没有 M10/M20 编号，也没有「文献→数据→统计→写作」固定阶段；模块按实际工作包命名（`question`/`evidence`/`pilot`/`explore`），`archive` 暂时没有分支。

## 5. 修改建议

- 建议 evidence 模块把「早期活动定义差异」作为检索重点，并在纳入标准中写明活动剂量与执行者。
- 建议 pilot 模块先验证 24 h 暴露窗口的数据可得性，再决定是否做正式 IPTW。
- 建议 explore/quick-check 的结论成熟后再决定归入 evidence 或 pilot，当前保持 DRAFT。

## 6. 限制

- 主结局依赖 ICU-CAM 评估覆盖率，早期年份可能漏诊（由 quick-check 核查）。
- 暴露依赖护理记录字段，2019–2022 为自由文本，抽取规则尚未定稿。
- 本分支只定义问题，不产生任何效应估计。

## 7. 主项目需要做的决定

是否接受本问题定义作为全项目基准；接受后 evidence 与 pilot 方可引用（本次 accept 即完成，理由记录于 `control/DECISIONS.md`）。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/question/branches/protocol-draft/outputs/research-question.md | 4a6ca345160e4628ff7f60d1eae39c85305791942996cd69987e77da987474ff | 研究问题（PICO、时间轴、主/次结局） |
| modules/question/branches/protocol-draft/outputs/scope-boundaries.md | d199b07a21144633775cd7cddadd3b50d1305a2059f3789a7c4e2f1ebb8ecffa | 范围边界与模块划分说明 |
