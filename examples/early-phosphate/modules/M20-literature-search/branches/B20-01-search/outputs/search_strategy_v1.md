# 文献检索式 v1（2018-01-01 — 2024-06-30）

> 示例项目模拟产物；检索计数为演示用模拟结果。

## PubMed（2026-09-28 执行）

```
("hypophosphatemia"[MeSH Terms] OR hypophosphat*[tiab])
AND (phosphate[tiab] OR phosphorus[tiab] OR repletion[tiab])
AND (critical illness[MeSH] OR critically ill[tiab] OR ICU[tiab] OR intensive care[tiab])
AND (mortality[tiab] OR death[tiab] OR outcome*[tiab] OR length of stay[tiab])
AND ("2018/01/01"[dp] : "2024/06/30"[dp])
```
- 命中 486 条

## Embase（2026-09-28 执行）

```
('hypophosphatemia'/exp OR hypophosphat*:ti,ab)
AND ('phosphate'/exp OR phosphate:ti,ab OR phosphorus:ti,ab)
AND ('intensive care'/exp OR 'critically ill':ti,ab)
AND (mortality:ti,ab OR death:ti,ab OR 'length of stay':ti,ab)
AND [2018-2024]/py
```
- 命中 512 条

## CENTRAL（2026-09-28 执行）

```
(hypophosphat* OR phosphate repletion) AND (critical* OR ICU)
```
- 命中 208 条，试验记录 78 条，其余为综述/评论

## 汇总与去重

| 步骤 | 计数 |
|---|---|
| 数据库命中合计 | 1,206 |
| 其他来源（参考文献追溯） | 78 |
| 去重前合计 | 1,284 |
| 去重删除（v1 报告值） | 312 |
| 题录筛选（v1 报告值） | 968 |
| 全文筛选 | 47 |
| 最终纳入 | 23 |

## 备注

去重脚本 `work/dedup_v1.py`（v1）仅按标题精确匹配 + DOI 原样字符串比较，未做大小写/空格归一化；见 `dedup_log_v1.csv`。
