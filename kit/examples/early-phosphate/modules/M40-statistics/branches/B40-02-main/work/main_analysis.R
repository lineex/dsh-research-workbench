# 主分析脚本（B40-02 work，模拟；DRAFT）
library(survival)
library(WeightIt)
library(sandwich)

cohort <- readr::read_csv("cohort_v2_analysis.csv", show_col_types = FALSE)
cohort$exposed <- as.integer(cohort$exposed)

covariates <- c(
  "age", "sex", "bmi", "icu_type", "apache_ii", "sofa", "phosphate",
  "calcium", "magnesium", "creatinine", "albumin", "lactate", "ph",
  "mech_vent", "vasopressor", "crrt", "diabetes", "liver_disease",
  "malignancy", "immunosuppression", "early_enteral", "fluid_6h"
)
fml <- as.formula(paste("exposed ~", paste(covariates, collapse = " + ")))

w <- weightit(fml, data = cohort, method = "glm", stabilize = TRUE)
cohort$w <- trim(w$weights, at = quantile(w$weights, c(0.01, 0.99)))

fit <- coxph(Surv(time30, death30) ~ exposed, data = cohort,
             weights = w, robust = TRUE)
summary(fit)

# 加权风险（边际标准化）
marg <- glm(death30 ~ exposed, data = cohort, weights = w,
            family = binomial())
predict(marg, newdata = data.frame(exposed = c(0, 1)), type = "response")

# 加权 KM（图 2 数据）
km <- survfit(Surv(time30, death30) ~ exposed, data = cohort, weights = w)
write.csv(data.frame(time = km$time, surv = km$surv, strata = km$strata),
          "km_weighted.csv", row.names = FALSE)
