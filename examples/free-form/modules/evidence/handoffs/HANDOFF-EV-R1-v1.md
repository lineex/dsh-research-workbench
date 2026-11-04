---
project: free-form
module: evidence
branch: search-round-1
stream: evidence-search
version: 1
status: REJECTED
baseline: artifact protocol-draft v1
created_at: 2026-10-18
submitted_at: 2026-10-18
decided_at: 2026-10-18
decision_reason: 第一轮检索式覆盖不足且去重不可审计（612→18 链路无法复核），退回 search-round-2 重做
supersedes: 0
superseded_by:
---

## 1. 本分支解决的问题

梳理早期活动与 ICU 谵妄的已有证据：给出第一轮检索式、计数与纳入清单，识别证据缺口，为后续设计提供依据。本分支为「第一轮」检索，若被拒绝，由 search-round-2 沿用同一 stream 重做。

## 2. 输入

- `artifact protocol-draft v1`（已 ACCEPTED 的问题定义）
- PubMed / Embase 访问权限（模拟）
- 检索式草稿与筛选笔记（`work/`，本示例未收录）

## 3. 输出

- `outputs/search-log-r1.md`：第一轮检索式、数据库计数与已知问题
- `outputs/included-r1.csv`：18 篇纳入研究清单（含模拟 DOI）
- 本 handoff：第一轮证据梳理（拟供设计引用）

## 4. 关键结果

- PubMed 命中 612 条，去重删除 118 条，题录筛选 494 条，全文 31 篇，最终纳入 18 篇。
- 证据缺口：18 篇中仅 1 项 RCT（n=96），其余为队列或准实验；主结局定义差异大（CAM-ICU vs 病历诊断）。
- 2 篇 2024 年队列报告早期活动与谵妄负相关，但均未固定时间零点，存在 immortal time 风险。
- 未检索 CINAHL / PEDro，检索式仅含 2 个同义词。

## 5. 修改建议

- 重做时补齐同义词（mobility therapy / rehabilitation / out-of-bed）并增加 CINAHL、PEDro。
- 去重必须逐条记录删除日志，用 PRISMA 计数闭合校验（612 − 去重数 = 筛选数）。
- 纳入标准写明活动剂量（次数/分钟）与谵妄评估工具，减少异质性。

## 6. 限制

- 第一轮检索式覆盖不足、去重过程不可审计，计数无法逐条复核，不能作为论文证据依据。
- 未检索中文数据库与会议摘要。
- 纳入研究以单中心为主，外推有限。

## 7. 主项目需要做的决定

是否退回重做（本次 reject 即完成，理由记录于 `control/DECISIONS.md`）；建议在 `search-round-2` 分支沿用 stream `evidence-search` 新建版本重做，不覆盖本版本。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/evidence/branches/search-round-1/outputs/search-log-r1.md | a866b1eaff97819f48820d48bf3d2a48f7b67344ca1281cce92bc8cd8b957f21 | 第一轮检索式、计数与已知问题 |
| modules/evidence/branches/search-round-1/outputs/included-r1.csv | 60fa79168c0e40204cc718fc0fb33325b5469fada195f08580edaa9a9b8ffecb | 18 篇纳入研究清单 |
