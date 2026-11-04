# M10 · 研究问题与方案

## 职责

把临床问题转成可执行的 target trial emulation 方案与可估计的 estimand，冻结研究设计，为数据、统计与写作模块提供唯一设计依据。

## 输入约定

- 项目目标（`control/PROJECT_STATE.md`）与临床团队 PICO 草案
- 伦理批件与数据使用许可摘要（模拟文件，放各分支 `work/`）

## 输出约定

- 对外只通过 `handoffs/HANDOFF-*.md`；交付文件写入分支 `outputs/`
- 方案与 estimand 必须逐条可核对（入选条件、策略、时间零点、随访、结局、对比），否则下游不启动

## 分支

- B10-01-protocol · 研究方案
- B10-02-estimand · estimand 与时点

## 约定

- 所有数字须标注「模拟数据」；不接受「大概」「约」等无法核对的表述
- 已 ACCEPTED 的 handoff 不得修改，重做只能新建版本
