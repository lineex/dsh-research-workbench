# 文献检索式 v2（2018-01-01 — 2024-12-31，去重修正版）

> 示例项目模拟产物；检索计数为演示用模拟结果，可由 `work/dedup_v2.py --verify` 复算。

## 数据库与检索日期

| 数据库 | 检索日期 | 命中 |
|---|---|---|
| PubMed | 2026-10-01 | 486 |
| Embase | 2026-10-01 | 512 |
| CENTRAL | 2026-10-01 | 208 |
| CINAHL（新增） | 2026-10-01 | 96 |
| 合计 |  | 1,302 |

## 检索式（PubMed 示例，其余库等价改写）

```
("hypophosphatemia"[MeSH Terms] OR hypophosphat*[tiab])
AND (phosphate[tiab] OR phosphorus[tiab] OR repletion[tiab] OR supplementation[tiab])
AND (critical illness[MeSH] OR critically ill[tiab] OR ICU[tiab] OR intensive care[tiab])
AND (mortality[tiab] OR death[tiab] OR outcome*[tiab] OR length of stay[tiab] OR arrhythmia[tiab])
AND ("2018/01/01"[dp] : "2024/12/31"[dp])
```

## 去重规则（v2 修正）

1. DOI 归一化：去 `https://doi.org/` 前缀，统一小写、去首尾空白与末尾标点。
2. 无 DOI 记录：标题归一化（去标点、小写、压缩空白）后 Jaro-Winkler ≥ 0.92 判重。
3. 每条删除都写日志（保留的 record_id + 删除原因），可逐条审计。

## PRISMA 计数（脚本输出）

| 步骤 | 计数 |
|---|---|
| 数据库合计 | 1,302 |
| 去重删除（DOI 432 + 标题 9） | 441 |
| 题录筛选 | 861 |
| 题录排除 | 814 |
| 全文筛选 | 47 |
| 全文排除 | 24 |
| 最终纳入 | 23 |

计数闭合校验：1,302 − 441 = 861；861 − 814 = 47；47 − 24 = 23。
