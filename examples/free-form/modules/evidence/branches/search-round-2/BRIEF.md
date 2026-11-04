# search-round-2 · 证据检索第二轮

## 要解决的问题

按第一轮拒绝意见重做证据检索：补同义词与数据库、记录逐条去重日志、闭合 PRISMA 计数。

## 输入

- 第一轮拒绝决定（`control/DECISIONS.md`）与 `search-round-1` 的检索式与 outputs
- `protocol-draft v1`（ACCEPTED）

## 允许修改

- 仅本分支目录 `modules/evidence/branches/search-round-2/` 内文件

## 禁止修改

- 不得修改 `search-round-1` 已 REJECTED 的 handoff 与 outputs（终态只能新建版本）
- 不得修改其他模块文件

## 完成标准

- 检索式含全部同义词，CINAHL / PEDro 已检索
- 去重逐条日志齐全，PRISMA 计数闭合
- 沿用 stream `evidence-search`，新 handoff 版本号为 2

## 必须交付

- `modules/evidence/handoffs/HANDOFF-search-round-2-v1.md`（计划；本示例暂未创建）
- `outputs/search-log-r2.md`
- `outputs/included-r2.csv`
