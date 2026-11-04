# B20-02 · 文献检索 v2（去重修正）

## 要解决的问题

修复 v1 的去重与 PRISMA 计数问题，重做检索与筛选，给出可复现的纳入证据集，替代 v1。

## 输入

- baseline：`artifact protocol-charter v1`（设计未变）
- v1 拒绝理由（D-0003）与 v1 分支 `work/` 脚本
- 新增 CINAHL 数据库权限（模拟）

## 允许修改

- 仅本分支目录 `modules/M20-literature-search/branches/B20-02-search-v2/` 内文件

## 禁止修改

- 不得修改 v1 handoff 与 v1 outputs（已 REJECTED，留档不覆盖）
- 不得修改已 ACCEPTED 的 handoff

## 完成标准

- DOI 归一化 + 标题相似度去重脚本可重跑，每一步计数闭合
- PRISMA 计数与 `dedup_v2.py` 输出一致（records→dedup→screened→fulltext→included）
- 同一 stream（literature-search）版本号 = 2

## 必须交付

- `modules/M20-literature-search/handoffs/HANDOFF-B20-02-SEARCH-v2.md`
- `outputs/search_strategy_v2.md`
- `outputs/prisma_flow_counts.csv`
- `outputs/included_studies.csv`
