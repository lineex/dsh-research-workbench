# B50-02 · 方法学章节

## 要解决的问题

按大纲与 TARGET 清单撰写方法学章节草稿，确保设计、estimand、权重与分析方案可复现，并标出待主分析定稿后回填的数字。

## 输入

- baseline：`artifact manuscript-outline v1`（已 ACCEPTED）
- `protocol-charter v1`、`estimand-spec v1`（已 ACCEPTED）
- `IPTW 诊断 v1`（PROVISIONAL，仅作背景，不引用数字）
- TARGET 清单（`work/methods_notes.md`）

## 允许修改

- 仅本分支目录 `modules/M50-writing/branches/B50-02-methods/` 内文件

## 禁止修改

- 不得修改已 ACCEPTED 的 handoff、其他模块文件与 `control/`
- 不得引用 PROVISIONAL/DRAFT handoff 中的估计值

## 完成标准

- TARGET 清单逐项对照（覆盖/未覆盖及原因）
- 设计、时间零点、暴露、结局、权重、敏感性分析写清且可复现
- 待回填数字统一占位，不写死未接受结果

## 必须交付

- `modules/M50-writing/handoffs/HANDOFF-B50-02-METHODS-v1.md`
- `outputs/methods_section_draft.md`
- `outputs/target_checklist.md`
