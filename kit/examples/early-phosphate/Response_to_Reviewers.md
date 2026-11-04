# Response to Reviewers

> 项目：重症低磷血症患者早期补磷的 target trial emulation
> 审稿分支：B60-01 · 审稿修订计划
> 自动汇编：dag review-compile（2026-10-19）

## Point 1 · R1-Major-01 · 暴露窗口与时间零点定义

**Review comment**

## reviewer_comment
The authors define the exposure window as (t0, t0+24h] where t0 is ICU admission. However, in patients receiving phosphate within 6 hours before ICU admission, treatment may have initiated prior to baseline. Please clarify how this potential immortality or misclassification bias was addressed.

## interpretation
审稿人指出入 ICU 前 6 小时已补磷的患者可能导致时间零点前暴露污染（immortality / misclassification bias），要求明确排除规则与敏感性分析。

## required_action
- 报告补充：在 Methods 中详述排除了入 ICU 前 6 h 补磷的 331 例患者
- 重新分析：队列定义 v2 已实施该排除规则，并在 attrition flow 中披露
- 正文修改：更新 Methods 第 2 节与补充材料 Figure S1 流程图

## analysis_changed
是。队列由 v1 升级至 v2，排除 331 例入 ICU 前补磷患者。

## estimand_changed
否。目标依然为 ATE（30 天全因死亡率）。

## manuscript_sections_changed
- Methods: Section 2.1 Study Population and Eligibility
- Supplement: Figure S1 Patient Flow Diagram

## new_output
- modules/M30-cohort/branches/B30-02-cohort-v2/outputs/attrition_flow_v2.csv
- modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md

## response_letter_text
We thank the reviewer for highlighting this critical methodological consideration. In our study design, time zero was strictly anchored at the exact time of ICU admission (t0). To avoid potential misclassification or immortal time bias, we explicitly excluded 331 patients who had received intravenous phosphate replacement within 6 hours prior to ICU admission. We have clarified this exclusion criterion in Methods (Section 2.1) and detailed the step-by-step patient flow in Figure S1.

## status
ACCEPTED

**Response**

（待补：逐条回应；如已修改请注明修改位置/版本）

