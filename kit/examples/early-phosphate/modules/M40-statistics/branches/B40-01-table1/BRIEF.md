# B40-01 · 基线表（Table 1）

## 要解决的问题

基于队列 v2 生成按暴露分组的基线表，核对两组可比性与加权前 SMD，为 IPTW 模型提供协变量清单。

## 输入

- baseline：`artifact cohort-definition v2`（已 ACCEPTED）
- 队列表（只读视图）与 22 个预设协变量清单（来自因果图）

## 允许修改

- 仅本分支目录 `modules/M40-statistics/branches/B40-01-table1/` 内文件

## 禁止修改

- 不得修改队列 v2 文件与 handoff；不得改已 ACCEPTED 的 handoff

## 完成标准

- 全部 22 个预设协变量入表，连续变量给出均值±SD 或中位数（IQR）
- 加权前 |SMD| 逐项给出，标出 >0.1 的变量
- 缺失用单独类别显示，不静默删除

## 必须交付

- `modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md`
- `outputs/table1_baseline.csv`
- `outputs/table1_notes.md`
