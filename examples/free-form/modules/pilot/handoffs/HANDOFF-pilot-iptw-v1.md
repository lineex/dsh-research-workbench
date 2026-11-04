---
project: free-form
module: pilot
branch: pilot-iptw
stream: pilot-iptw
version: 1
status: PROVISIONAL
baseline: artifact protocol-draft v1
created_at: 2026-10-18
submitted_at: 2026-10-18
decided_at:
decision_reason:
supersedes: 0
superseded_by:
---

## 1. 本分支解决的问题

在先导子样本上验证「入 ICU 24 h 内启动早期活动」这一暴露定义是否可得、IPTW 权重诊断是否可行，为是否启动正式分析提供依据；本分支不产出最终效应结论。

## 2. 输入

- `artifact protocol-draft v1`（已 ACCEPTED 的问题定义）
- 模拟先导子样本 412 例（暴露 168 / 对照 244），由 `work/` 脚本生成（本示例未收录脚本）
- 8 个先导协变量清单

## 3. 输出

- `outputs/pilot-balance.csv`：8 个协变量加权前后 SMD
- `outputs/pilot-note.md`：权重分布、ESS 与待主项目决定的问题
- 本 handoff：先导诊断 v1（PROVISIONAL，等待主项目决定）

## 4. 关键结果

- 加权前 6/8 个协变量 |SMD|>0.1，最大为镇静药物使用 0.31；加权后全部 <0.1，最大 0.09。
- 权重：最大 14.2，第 99 百分位 5.1，ESS 保留约 74%。
- 暴露定义（24 h 内启动）在模拟子样本中可执行；但 2019–2022 的活动记录为自由文本，需要抽取规则（见 explore/quick-check）。
- 结论：先导阶段方法可行，建议主分析采用 99% 截尾；先导效应值不稳定，不建议报告。

## 5. 修改建议

- 主项目先确认暴露窗口（24 h vs 48 h）与截尾规则，再授权正式分析分支。
- 先导样本量小，正式分析前应重估权重分布与 ESS。
- 把「镇静药物使用」加入正式协变量清单（先导中失衡最明显）。

## 6. 限制

- 先导子样本仅 412 例（模拟），权重与 SMD 估计不稳定。
- 未做结局模型、未处理缺失；仅检验方法可行性。
- 暴露抽取依赖尚未定稿的自由文本解析规则。

## 7. 主项目需要做的决定

- 是否接受「入 ICU 24 h 内启动早期活动」作为唯一暴露定义（备选 48 h）？
- 是否在主分析中采用 99% 截尾？
- 是否确认先导仅作方法学验证、不报告效应值？

本版保持 PROVISIONAL，等待主项目决定后转 ACCEPTED 或新建版本。

## 8. 文件清单

| 文件 | SHA-256 | 说明 |
| --- | --- | --- |
| modules/pilot/branches/pilot-iptw/outputs/pilot-balance.csv | 3f2c21926a16b6c5f046eb48b0970443e7f0642649d182c71debb9e0c4f2ef29 | 8 个先导协变量加权前后 SMD |
| modules/pilot/branches/pilot-iptw/outputs/pilot-note.md | 07c4d073fdc2773dbe42d4a492ab57404daca2ada5371d63d24bbe184f7ea34f | 权重分布、ESS 与待决定问题 |
