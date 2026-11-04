# IPTW 诊断脚本（B40-03 work，模拟）
library(WeightIt)
library(cobalt)

cohort <- readr::read_csv("cohort_v2_analysis.csv", show_col_types = FALSE)
covariates <- readr::read_csv("covariate_list.csv")$covariate  # 22 个
fml <- as.formula(paste("exposed ~", paste(covariates, collapse = " + ")))

w <- weightit(fml, data = cohort, method = "glm", stabilize = TRUE)
bal <- bal.tab(w, stats = c("m"), un = TRUE)
print(bal)

w_trim <- trim(w$weights, at = quantile(w$weights, c(0.01, 0.99)))

summarise_weights <- function(x) {
  c(median = median(x), q1 = quantile(x, .25), q3 = quantile(x, .75),
    p1 = quantile(x, .01), p99 = quantile(x, .99), max = max(x),
    ess = sum(x)^2 / sum(x^2))
}
summarise_weights(cohort$w[cohort$exposed == 1])
summarise_weights(cohort$w[cohort$exposed == 0])
summarise_weights(w_trim)

# 三种截尾方案下的加权 Cox HR（见 iptw_diagnostics_report.md）
