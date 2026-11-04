# 方法学章节草稿（v1，PROVISIONAL）

> 示例项目模拟产物；稿件最终以英文投稿，本文件为中文工作稿。所有估计值以占位符表示，待主分析 v1 定稿后回填。

## 2. Methods

### 2.1 Study design and data source

We conducted a target trial emulation using prospectively collected electronic health record (EHR) data from adult intensive care units (ICUs) of a tertiary academic hospital between January 1, 2018 and December 31, 2024 (simulated). The study was reported following the TARGET framework for target trial emulation and STROBE. The institutional review board approved the study with waiver of informed consent (simulated).

### 2.2 Target trial specification

We specified the protocol components that would have been used in a randomized trial: eligibility criteria, treatment strategies, assignment, time zero, follow-up, outcome, causal contrast, and analysis plan (see protocol v1 and estimand v1).

- **Eligibility.** Adults (≥18 years) admitted to an ICU with the lowest serum phosphate <0.65 mmol/L within 24 h of ICU admission; first ICU stay ≥6 h. We excluded patients who had already received intravenous phosphate within 6 h before ICU admission and those receiving ECMO or cardiopulmonary bypass at admission.
- **Treatment strategies.** Strategy A: initiating intravenous phosphate repletion within 24 h after ICU admission. Strategy B: not initiating intravenous phosphate repletion within 24 h.
- **Time zero.** ICU admission.
- **Follow-up.** 30 days from time zero, censored at death, discharge, or transfer.
- **Outcome.** All-cause mortality within 30 days.
- **Causal contrast.** Average treatment effect (ATE) on the 30-day mortality risk difference and hazard ratio.
- **Analysis plan.** Inverse probability of treatment weighting (IPTW) with 22 baseline covariates, weighted Cox regression and weighted Kaplan-Meier estimation; sensitivity analyses using untruncated weights, overlap weights, E-value, and exclusion of the 2024H2 sub-cohort.

### 2.3 Cohort and exposure

The final cohort included 3,847 patients (exposed 1,462; unexposed 2,385) derived from 44,090 ICU admissions (cohort-definition v2, ACCEPTED). Exposure was defined by the start time of the first intravenous phosphate order within the 24-h window after ICU admission. Patients with phosphate orders recorded at date-level precision (96 exposed patients, 6.6%) were assigned a default time of 08:00; the sensitivity of this assumption is described in the missing-data analyses [待缺失审计定稿].

### 2.4 Propensity score and weighting

Propensity scores were estimated with logistic regression including 22 pre-specified baseline covariates measured at or before time zero. Weights were stabilized and truncated at the 1st and 99th percentiles; untruncated and overlap weights were used as sensitivity analyses [待 IPTW 诊断 v1 决定]. Covariate balance was assessed using standardized mean differences (SMD), with |SMD|<0.10 considered adequate. The effective sample size was calculated using Kish's formula.

### 2.5 Statistical analysis

The primary analysis estimated the 30-day mortality risk difference using a weighted marginal binomial model and the hazard ratio using a weighted Cox proportional hazards model with robust variance. Weighted Kaplan-Meier curves were used for graphical display. Secondary outcomes included duration of mechanical ventilation, ICU length of stay, and incident arrhythmia. Missing covariates (<11% missing) were handled with multiple imputation by chained equations (m=20), with the outcome included in imputation models; the outcome was not imputed. All analyses were performed in R 4.4.1 (simulated), with a two-sided α of 0.05.

### 2.6 Reporting and reproducibility

All analysis scripts are stored with the project; the analysis dataset will be available upon reasonable request. Protocol registration: not applicable (simulated).

## 待回填清单

| 位置 | 占位符 | 来源 |
|---|---|---|
| 2.4 权重截尾 | [待 IPTW 诊断 v1 决定] | iptw-diagnostics v1 |
| 2.2 敏感性分析数字 | [待主分析 v1] | main-analysis v1 |
| 2.6 结果与图 2 | [待主分析 v1] | main-analysis v1 |
| 2.3 缺失假设敏感性 | [待缺失审计定稿] | missing-audit v1（BLOCKED） |
