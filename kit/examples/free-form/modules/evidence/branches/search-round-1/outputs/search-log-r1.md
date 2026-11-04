# 第一轮证据检索（v1，模拟）

> 模拟数据。第一轮仅作范围探索，后来被主项目 REJECTED（见 handoff 的 decision_reason）。

## 检索式（PubMed，2026-10-18）

```
("early mobilization"[tiab] OR "early ambulation"[tiab])
AND (delirium[tiab] OR "intensive care delirium"[tiab])
AND ("2019/01/01"[dp] : "2024/12/31"[dp])
```

## 计数（v1）

| 步骤 | 计数 |
|---|---|
| 数据库命中 | 612 |
| 去重删除 | 118 |
| 题录筛选 | 494 |
| 全文筛选 | 31 |
| 最终纳入 | 18 |

## 已知问题（被拒原因）

1. 检索式只用了 `early mobilization` / `early ambulation` 两个同义词，漏掉 `mobility therapy`、`rehabilitation` 等同义表达。
2. 去重步骤没有记录去重规则与逐条删除日志，612−118=494 与后续筛选数无法逐条复核。
3. CINAHL 与 PEDro 未检索，证据池偏小。
