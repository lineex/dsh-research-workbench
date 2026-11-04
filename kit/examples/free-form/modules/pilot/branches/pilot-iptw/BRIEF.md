# pilot-iptw · 先导 IPTW

## 要解决的问题

在先导子样本上验证「24 h 内启动早期活动」暴露定义与 IPTW 权重诊断是否可行，不产出最终效应结论。

## 输入

- `protocol-draft v1`（ACCEPTED 的问题定义）
- 模拟先导子样本 412 例（由 `work/` 脚本生成）

## 允许修改

- 仅本分支目录 `modules/pilot/branches/pilot-iptw/` 内文件

## 禁止修改

- 不得修改 `question` 模块的已 ACCEPTED handoff 与 outputs
- 不得直接改其他模块 outputs

## 完成标准

- 8 个协变量加权前后 SMD、权重分布与 ESS 给出
- 明确列出待主项目决定的问题，保持 PROVISIONAL 等待决定

## 必须交付

- `modules/pilot/handoffs/HANDOFF-pilot-iptw-v1.md`
- `outputs/pilot-balance.csv`
- `outputs/pilot-note.md`
