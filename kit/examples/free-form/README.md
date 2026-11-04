# 自由结构演示：无固定模块清单

这是 research-dag 的「自由结构」示例项目。它**刻意不使用 M10/M20 编号、不按论文固定阶段拆分**：结构完全由研究需要决定——`question`（研究问题）、`evidence`（已有证据梳理）、`pilot`（先导分析）、`explore`（探索性分析）是按实际工作包出现的模块名，`archive`（归档与复用）暂时没有分支；分支名 `protocol-draft`、`search-round-1`、`search-round-2`、`pilot-iptw`、`quick-check` 也完全自由，没有任何编号或前后缀要求。

> 内容为模拟数据，仅用于演示协议；不代表真实研究。

## 演示要点

- **模块/分支 id 自由**：模块 `question`、`evidence`、`pilot`、`explore`、`archive` 无需编号；显示名可用中文（`--name`）。
- **模块可以暂时没有分支**：`archive` 目前只有 `MODULE.md`，没有分支，协议合法（verify 不要求模块必须有分支）。
- **先探索后归类**：`explore/quick-check` 的 handoff 保持 DRAFT，待结论成熟后再决定归入 `evidence` 或 `pilot`。
- **handoff 文件名可自定义 label**：默认 `HANDOFF-<branchId>-v1.md`；`evidence/search-round-1` 用 `--slug EV-R1` 生成了 `HANDOFF-EV-R1-v1.md`。
- **哈希由工具回填**：`submit` 重算并回写清单 SHA-256，并写入 `control/ledger.json`；本示例没有手写任何哈希。
- **状态覆盖**：ACCEPTED（question/protocol-draft）、REJECTED（evidence/search-round-1，附理由）、PROVISIONAL（pilot/pilot-iptw）、DRAFT（explore/quick-check）。

## 结构

```text
free-form/
├── modules/
│   ├── question/     分支 protocol-draft    → handoff ACCEPTED
│   ├── evidence/     分支 search-round-1    → handoff REJECTED（label=EV-R1）
│   │                 分支 search-round-2    → 无 handoff（等待按拒绝意见重做）
│   ├── pilot/        分支 pilot-iptw        → handoff PROVISIONAL
│   ├── explore/      分支 quick-check       → handoff DRAFT（先探索后归类）
│   └── archive/      无分支（合法）
├── control/          init 生成，工具维护（含 control/dag.mjs 副本）
└── releases/         快照目录
```

## 常用命令（在项目根执行）

```bash
node control/dag.mjs status
node control/dag.mjs list
node control/dag.mjs verify
```
