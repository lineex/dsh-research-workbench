# B20-01 · 文献检索 v1

## 要解决的问题

系统检索 2018-01 至 2024-06 关于 ICU 低磷血症与补磷/结局的已发表证据，为引言与讨论提供文献基础。

## 输入

- baseline：`artifact protocol-charter v1`（已 ACCEPTED）
- 检索式草稿（`work/`）
- PubMed、Embase、CENTRAL 访问权限（模拟）

## 允许修改

- 仅本分支目录 `modules/M20-literature-search/branches/B20-01-search/` 内文件

## 禁止修改

- 不得修改已 ACCEPTED 的 handoff 与其他模块文件

## 完成标准

- 检索式可逐字重跑，注明库、字段、日期与限制
- 去重、题录筛选、全文筛选每一步计数可复现
- 纳入文献清单含 DOI 与设计类型

## 必须交付

- `modules/M20-literature-search/handoffs/HANDOFF-B20-01-SEARCH-v1.md`
- `outputs/search_strategy_v1.md`
- `outputs/dedup_log_v1.csv`
