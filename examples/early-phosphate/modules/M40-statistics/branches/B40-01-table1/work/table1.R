# Table 1 生成脚本（B40-01 work，模拟）
library(dplyr)
library(tableone)

cohort <- readr::read_csv("cohort_v2_analysis.csv", show_col_types = FALSE)

vars <- c(
  "age", "sex", "bmi", "icu_type", "apache_ii", "sofa", "phosphate",
  "calcium", "magnesium", "creatinine", "albumin", "lactate", "ph",
  "mech_vent", "vasopressor", "crrt", "diabetes", "liver_disease",
  "malignancy", "immunosuppression", "early_enteral", "fluid_6h"
)

tab <- CreateTableOne(
  vars = vars, strata = "exposed", data = cohort,
  factorVars = c("sex", "icu_type", "mech_vent", "vasopressor", "crrt",
                 "diabetes", "liver_disease", "malignancy", "immunosuppression",
                 "early_enteral"),
  addOverall = FALSE
)

print(tab, smd = TRUE, digits = 1, printToggle = FALSE)
readr::write_csv(as.data.frame(print(tab, smd = TRUE, printToggle = FALSE)),
                 "table1_baseline.csv")
