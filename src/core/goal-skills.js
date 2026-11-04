/**
 * 研究项目 DAG 工作台 — 研究目标 · 智能体会话的两套「思考脚手架」（v3.10）。
 *
 * 研究目标不该是一句话拍脑袋。这里把两项技能的方法论**内联**成
 * 可以在会话里注入的提示词，让 AI 按固定结构把「模糊兴趣」压成「可验证的好问题」：
 *
 *   1. /zhuanz-thinking-framework —— 八层假设审计（G/R/E/D/M/O/T/W）
 *      作用：**诊断**。找出你没意识到自己做了假设的那一层，并把它翻过来。
 *      输出：八层矩阵（层 / 隐含假设 / 翻转后的问题）。
 *
 *   2. good-question（Rimagination/good-question）—— 好问题卡
 *      作用：**收敛**。把候选用六条标准打分、用 kill rule 砍掉不合格的，
 *      最后压成一张含「竞争性解释 / 判别证据 / 推翻条件 / 两周 pilot」的卡。
 *
 * 为什么内联而不是引用外部 skill：
 *   工作台要能在没装这两个 skill 的机器上照常跑。提示词是方法论的
 *   最小可执行子集，写法上保留各自的核心约束（不堆砌装饰性想法、
 *   没有 falsifier 就不是好问题），而不是假装拥有完整技能。
 *
 * 注意：这些文本只进入**AI 会话的上下文**，不改变任何协议文件。
 */

/** 八层框架：从最深到最浅。与 host 的 THINKING_LAYERS 保持一致。 */
export const THINKING_LAYERS = [
  {
    id: '-3',
    name: '几何维度',
    question: '研究对象是几维的？',
    hint: '0维单值 / 1维个体轨迹 / 2维群体分布 / 3维联合分布 / ∞维分布间变换 / 关系维',
  },
  {
    id: '-2',
    name: '参照系',
    question: '我假设了什么是静止的？',
    hint: '惯性参照系↔反事实基线↔对照组；真实世界没有静止参照，只剩不变量/鲁棒/反馈',
  },
  {
    id: '-1',
    name: '端点动力学',
    question: '端点本身在做什么运动？',
    hint: '固定端点 / 开放端点 / 端点运动 / 两端不规则运动 → 异质性治疗效应',
  },
  {
    id: '0',
    name: '端点结构',
    question: '起终点是怎么设定的？',
    hint: 'time zero 在哪、入组规则、终点定义；纵向问题，贯穿全生命周期',
  },
  {
    id: '1',
    name: '默认态',
    question: '假设了什么不需要解释？',
    hint: '科学革命 = 翻转默认态（牛顿翻静止、费马翻度量）',
  },
  {
    id: '2',
    name: '度量',
    question: '在哪个「距离」下找最优？',
    hint: '没有普遍最优，只有某个度量下的最优；换 endpoint 就换答案',
  },
  {
    id: '3',
    name: '导数阶',
    question: '原因作用在哪一阶？',
    hint: '水平值 / 变化率 / 加速度；临床 90% 是找策略，方法 90% 在找参数',
  },
  {
    id: '4',
    name: '时间角色',
    question: '时间是什么？',
    hint: '均匀背景 / 优化对象 / 积分维度 / 私有度量 / 弯曲几何 / 因果方向 / estimand / 关系时间',
  },
  {
    id: '5',
    name: '观察窗口',
    question: '时间的哪段我看不见？',
    hint: '随访损失、截尾、泛化、transportability、HTE',
  },
]

/** good-question 的六条打分标准。 */
export const GOOD_QUESTION_CRITERIA = [
  { key: 'importance', name: '重要性', meaning: '对理论、实践、政策或方法的后果' },
  { key: 'feasibility', name: '可行性', meaning: '用现有资源能产出的可信证据' },
  { key: 'falsifiability', name: '可证伪性', meaning: '有可观测结果能削弱或杀死这个想法' },
  { key: 'leverage', name: '证据杠杆', meaning: '小规模 pilot 就能明显改变信念' },
  { key: 'originality', name: '原创性', meaning: '挑战假设，或非平凡地组合领域' },
  { key: 'downside', name: '负面学习', meaning: '即使阴性结果也有发表或实用价值' },
]

/** 好问题卡的字段（顺序即填写顺序）。与 host 的 GOAL_CARD_FIELDS 对应。 */
export const GOAL_CARD_FIELDS = [
  { key: 'title', label: '暂定题目', hint: '一句能写进论文标题的话' },
  { key: 'question', label: '核心研究问题', hint: '一句话，含人群/暴露/对照/结局/时间窗' },
  { key: 'whyMatters', label: '为什么值得做', hint: '谁受益、理论或实践后果是什么' },
  { key: 'assumptionChallenged', label: '它挑战了什么默认假设', hint: '对应八层里的哪一层' },
  { key: 'hypotheses', label: '竞争性解释', hint: 'H1…；H2…；H3…   至少三条互相竞争' },
  { key: 'discriminatingTest', label: '关键判别证据或实验', hint: '什么观察能把这些解释分开' },
  { key: 'falsifier', label: '什么结果会推翻它', hint: '必填——没有这一项就不是好问题' },
  { key: 'pilot', label: '两周内可做的 pilot', hint: '最小可执行的验证动作' },
  { key: 'resources', label: '需要的数据/资源', hint: '数据源、样本量、算力、合作者' },
  { key: 'reviewerRisk', label: '最强评审质疑', hint: '审稿人最可能一句话拒掉你的理由' },
  { key: 'nextAction', label: '下一步动作', hint: '明天下班前能开始做的第一件事' },
]

/** good-question 的 kill rule：命中任意一条就该砍掉或搁置候选。 */
export const KILL_RULES = [
  '没有明确受益者、理论赌注或实践后果',
  '只说「没人做过 X」，没说清为什么 X 重要',
  '说不出一个可信的证伪条件',
  '所需资源远超现有约束',
  '在问题还没立住之前就先锁定方法',
  '只增加复杂度，说不清复杂度换来了什么',
]

/** 场景选择：框架的六种用法（来自 SKILL.md）。 */
export const FRAMEWORK_SCENARIOS = [
  { id: 'A', name: '审计已有研究', do: '逐层跑诊断，找盲区' },
  { id: 'B', name: '设计新研究', do: '逐层做选择，固化为 protocol' },
  { id: 'C', name: '找研究机会', do: '找最有杠杆的一层做翻转' },
  { id: 'D', name: '理论讨论', do: '把话题映射到对应层，深化讨论' },
  { id: 'E', name: '升级框架本身', do: '把新洞察固化进框架文件' },
  { id: 'F', name: '攻破难题/造工具', do: '走九步作战 SOP（生产模式）' },
]

/** 「一句话」压缩：避免提示词把会话挤爆。 */
const MAX_HINT_LINES = 40

/**
 * 八层审计的提示词片段。
 * @param {object} [context] { title, goal, field }
 * @returns {string}
 */
export function buildFrameworkPrompt(context) {
  const source = context && typeof context === 'object' ? context : {}
  const title = String(source.title || '').trim()
  const goal = String(source.goal || '').trim()
  const header = [
    '你现在用 ZhuanZ 八层思考框架（G-R-E-D-M-O-T-W）审计这个研究目标。',
    '框架核心：科学发现的高度，等于你处理「时间、度量、默认态、参照系、几何维度」这几件事的成熟度。',
    '翻转下层，才能解放上层。',
    title ? `项目：${title}` : '',
    goal ? `当前目标：${goal}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const layers = THINKING_LAYERS.slice(0, MAX_HINT_LINES)
    .map((layer) => `  层 ${layer.id}｜${layer.name}：${layer.question}（${layer.hint}）`)
    .join('\n')

  return [
    header,
    '',
    '任务：逐层审计，输出三件事——诊断、盲区、翻转。',
    '',
    '八层（从最深到最浅）：',
    layers,
    '',
    '输出格式（不要罗列全部九层，只聚焦最有杠杆的 1–2 层）：',
    '1. 诊断：当前研究在这些层各处于什么位置（用一两句话）。',
    '2. 盲区：我在哪一层没意识到自己做了假设？为什么这一层是瓶颈？',
    '3. 翻转：把那一层翻过来会变成什么研究？给出一个**可执行**的改写。',
    '4. 杠杆：最值得推进的一层 + 具体动作（明天能开始做的那种）。',
    '',
    '约束：',
    '- 不要把每个研究都拉到「关系时间／∞维／无规则端点」，会不接地气；',
    '- 不要把它当 checklist 机械地跑，它是诊断工具；',
    '- 这一步只做诊断，不要急着给方法。',
  ].join('\n')
}

/**
 * 好问题卡的提示词片段。
 * @param {object} [context] { title, goal, draft, mode }
 * @returns {string}
 */
export function buildGoodQuestionPrompt(context) {
  const source = context && typeof context === 'object' ? context : {}
  const title = String(source.title || '').trim()
  const goal = String(source.goal || '').trim()
  const draft = String(source.draft || '').trim()
  const mode = String(source.mode || 'collaborator')

  const criteria = GOOD_QUESTION_CRITERIA.map(
    (item) => `  - ${item.name}：${item.meaning}`,
  ).join('\n')
  const fields = GOAL_CARD_FIELDS.map((field) => `  - ${field.label}：${field.hint}`).join('\n')
  const kills = KILL_RULES.map((rule) => `  - ${rule}`).join('\n')

  return [
    '你现在用 good-question 方法论，把上面诊断过的东西收敛成「一张可验证的好问题卡」。',
    title ? `项目：${title}` : '',
    goal ? `当前目标：${goal}` : '',
    draft ? `我的初步想法：${draft}` : '',
    `工作模式：${mode}（mentor / reviewer / collaborator / grant）`,
    '',
    '原则：',
    '- 宁愿一个锋利的问题，也不要一堆装饰性的想法；',
    '- 新颖性单独不够——还要重要；',
    '- 把「议题」「问题」「假设」「项目计划」区分开；',
    '- 先让隐藏假设显式化，再谈方法；',
    '- 没有 falsifier 的候选，直接淘汰，不要美化。',
    '',
    '第 1 步 · 发散：给 5–10 个候选问题，每个一句话，并注明它攻击的隐藏假设或张力。',
    '可用透镜：重要性/可行性、第一性原理兼容性、假设挑战、强推断（竞争假设）、',
    '边界探测（方法在哪失效）、什么变了（旧阴性结果该重访）、结构类比（邻域同构问题）、',
    '简化（复杂方法是否坍缩成更简单基线）、利益相关者轮换（谁在乎/谁受损/谁来运维）。',
    '',
    '第 2 步 · 收敛：按 1–5 分打分，不合格的直接砍掉。',
    criteria,
    '',
    'Kill rule（命中任意一条就砍或搁置）：',
    kills,
    '',
    '第 3 步 · 压成好问题卡（挑最强的 1 张，字段如下）：',
    fields,
    '',
    '最后给出一段「最强评审质疑 + 修复路径」，并明确说：这张卡现在能不能算可验证的好问题。',
    '如果 falsifier 还写不出来，直接说写不出来，不要编。',
  ]
    .filter((line) => line !== null)
    .join('\n')
}

/**
 * 把两段提示词合成一次完整会话的注入文本。
 * @param {object} [context]
 * @returns {string}
 */
export function buildGoalDiscussionPrompt(context) {
  return [
    '【研究目标 · 智能体协同推演与架构生成】',
    '',
    '我们要把一个研究选题推进成一张**可验证的好问题卡**，并进而**生成完整的课题主支流水线与探索分支架构**。按三步推进：',
    '',
    '— 第 1 步：诊断（ZhuanZ 个人思考框架 · 八层假设审计）—',
    buildFrameworkPrompt(context),
    '',
    '— 第 2 步：收敛（good-question 好问题卡与推翻条件）—',
    buildGoodQuestionPrompt(context),
    '',
    '— 第 3 步：生成总体主支与分支规划（Architecture & Branches）—',
    '在好问题卡收敛并明确「什么结果会推翻它」之后，请为本项目规划生成总体研究主支（Modules）与各阶段初始分支（Branches）：',
    '1. 总体主支（研究阶段链）：规划 3-6 个前后严密递进的主支（如方案设计、文献检索、队列清洗、统计建模、手稿汇编）；每个主支明确阶段 id（如 M10）、显示名与本阶段产出目标；',
    '2. 初始探索分支：为各主支提出第一批探路分支（如 B10-01 协议草案、B20-01 检索式）；',
    '3. 建构命令指引：直接给出可在本工作台或终端执行的 CLI 命令，供研究者一键创建落地：',
    '   node tools/dag.mjs module add --id <id> --name <名称>',
    '   node tools/dag.mjs sprout --module <moduleId> --id <branchId> --name <分支名> --prompt "<探索任务>"',
    '',
    '研究者对所创建的全部主支与分支拥有完整的修改权限（可自由增删、上下重排、重命名、阻断、一键回连），且每个节点都将自动拥有专属独立对话并继承前序成稿。',
    '',
    '要求：第 1 步做完请停下来等我确认，再进入第 2 步；第 2 步确立后再展开第 3 步主支与分支的完整建构规划。',
  ].join('\n')
}
