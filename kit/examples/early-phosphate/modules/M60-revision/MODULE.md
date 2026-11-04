# M60 · 审稿修订

## 职责

论文投稿后的审稿意见分派、修订执行与回复信撰写；维护修订版本与稿件快照，确保每条审稿意见有对应修改与证据。

## 输入约定

- 投稿稿件与目标期刊审稿意见（投稿前本模块不启动分析工作）
- 已 ACCEPTED 的各模块 handoff（修订中只能引用已接受版本）

## 输出约定

- 修订计划、逐条意见回复表、修订稿 diff 说明写入分支 `outputs/`
- 对外通过 `handoffs/`；修订稿快照放入项目 `releases/`

## 分支

- B60-01-revision-plan · 审稿修订计划（分支已建，等待首轮审稿意见）

## 约定

- 审稿意见编号固定（R1-C1…），每条意见必须落到「修改位置 + 证据 + 回复」
- 逐条意见用 `templates/REVIEW-ISSUE.md` 建立问题卡（reviewer_comment / interpretation / required_action / analysis_changed / estimand_changed / manuscript_sections_changed / new_output / response_letter_text / status），放在审稿分支 `outputs/review-issues/`，关键结论同步进该分支 handoff
- 任何需要重跑分析的修订，退回对应模块新建版本，不在本模块内改数字
