/**
 * 鱼刺上下文档案：分刺时把主骨「到此为止」的完整脉络打包进新分支，
 * 让鱼刺智能体（和打开鱼刺的人）带着主骨的完整记忆去解决子问题。
 *
 * 本模块由 dag.mjs（根工具）与 control/dag.mjs（项目副本）共同引用，
 * 只能依赖 Node 内置模块与 dag.mjs 导出的核心函数（不引入第三方依赖）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, todayLocal, writeFileAtomic, buildInheritanceChain } from './dag-core.mjs';

export function writeSpurContext(root, opts) {
  const { state, ledger } = loadProject(root);
  const moduleId = opts.moduleId;
  const branchId = opts.branchId;
  const now = todayLocal();

  // ---- 收集主骨上下文
  const moduleRec = (state.modules || []).find((m) => m && m.id === moduleId);
  const moduleRibs = (state.branches || []).filter((b) => b && b.module === moduleId);
  const moduleRibsSet = new Set(moduleRibs.map((b) => b.id));

  // ---- 父刺上下文（鱼刺之间分叉时）：先读父刺的 CONTEXT.md 摘要与工作产出
  //      这样「从某根刺再长一根刺」时，新刺默认带着父刺的来龙去脉。
  let parentSection = null;
  if (opts.parentRib && opts.parentRib !== branchId) {
    const parent = (state.branches || []).find((b) => b && b.id === opts.parentRib) || null;
    if (parent) {
      const parentDirAbs = path.join(root, ...String(parent.dir || '').split('/'));
      let parentBrief = '';
      try {
        const p = path.join(parentDirAbs, 'BRIEF.md');
        if (fs.existsSync(p)) parentBrief = fs.readFileSync(p, 'utf8');
      } catch {
        parentBrief = '';
      }
      const parentWorkFiles = listWorkFiles(parentDirAbs, parent.dir);
      parentSection = {
        id: parent.id,
        name: parent.name || parent.id,
        dir: parent.dir,
        brief: parentBrief,
        workFiles: parentWorkFiles,
        outputs: listWorkFiles(path.join(parentDirAbs, 'outputs'), `${parent.dir}/outputs`),
        hasContext: fs.existsSync(path.join(parentDirAbs, 'CONTEXT.md')),
      };
    }
  }

  // ---- 同伴鱼刺（同一主骨下的其他刺）：供智能体互相参考/通讯
  const siblings = moduleRibs
    .filter((b) => b && b.id !== branchId)
    .map((b) => {
      const workCount = listWorkFiles(path.join(root, ...String(b.dir || '').split('/')), b.dir).length;
      const outCount = listWorkFiles(path.join(root, ...String(b.dir || '').split('/'), 'outputs'), `${b.dir}/outputs`).length;
      return { id: b.id, name: b.name || b.id, dir: b.dir, workCount, outputCount: outCount };
    });

  // 该模块相关的所有 handoff（按创建时间）
  const handoffRows = (ledger.handoffs || [])
    .filter((entry) => entry && moduleRibsSet.has(entry.branch))
    .map((entry) => ({
      path: entry.path,
      branch: entry.branch,
      stream: entry.stream,
      version: entry.version,
      status: entry.status,
      created: entry.created_at || '',
      submitted: entry.submitted_at || '',
      title: entry.title || '',
    }));

  // 全项目 ACCEPTED（下游可用的稳定输入）
  const acceptedRows = (ledger.handoffs || [])
    .filter((entry) => entry && entry.status === 'ACCEPTED')
    .map((entry) => ({ stream: entry.stream, version: entry.version, path: entry.path }));

  // 裁决记录（DECISIONS.md 原文——追加式，直接引用）
  let decisionsText = '';
  try {
    decisionsText = fs.readFileSync(path.join(root, 'control', 'DECISIONS.md'), 'utf8');
  } catch {
    decisionsText = '';
  }

  // 项目状态（阶段/下一步/阻塞）
  let stateMd = '';
  try {
    stateMd = fs.readFileSync(path.join(root, 'control', 'PROJECT_STATE.md'), 'utf8');
  } catch {
    stateMd = '';
  }

  const decisionsCount = (decisionsText.match(/^## D-\d+/gm) || []).length;
  const acceptedCount = acceptedRows.length;

  // ---- v2.4 继承链：点开任意一级分支，上下文固定为
  //      前序主支成稿 → 本主支成稿 → 祖先分支成果（根→直接父）→ 本分支任务。
  let inheritance = null;
  try {
    inheritance = buildInheritanceChain(root, state, ledger, moduleId, branchId);
  } catch {
    inheritance = null;
  }

  const parts = [];
  parts.push(`# 鱼刺上下文档案 — ${branchId}（${opts.branchName || branchId}）`);
  parts.push('');
  if (opts.backfilled) {
    parts.push(`> ⚠ 本文件由 \`dag context\` 于 ${now} **补建**（这根鱼刺创建于 CONTEXT 档案机制之前）。`);
    parts.push('> 下面记录的是**补建时刻**的主骨状态，不是分刺当时的历史快照；请按此理解。');
  } else {
    parts.push(`> 由 \`dag sprout\` 于 ${now} 自动生成。`);
    parts.push(`> 本文件是主骨在分刺时刻的**完整快照**：打开鱼刺分析问题时，先读这份档案。`);
  }
  parts.push('');
  // ---- v2.4 继承链（放在最前：这是本分支唯一允许的上下文来源，顺序即契约）----
  if (inheritance) {
    parts.push('## 继承链（本分支上下文的唯一来源，顺序即契约）');
    parts.push('');
    parts.push('读取顺序固定为：**前序主支成稿 → 本主支成稿 → 祖先分支成果（根→直接父）→ 本分支任务**。');
    parts.push('不读其它主支、不读旁系分支，避免污染。');
    parts.push('');
    let step = 0;
    for (const stage of inheritance.precedingStages) {
      step += 1;
      parts.push(`### ${step}. 前序主支 ${stage.order}「${stage.title}」（${stage.status} · v${stage.revision}）`);
      if (stage.draftRel) parts.push(`- 成稿：\`${stage.draftRel}\``);
      for (const h of stage.conclusions) parts.push(`- ${h}`);
      parts.push('');
    }
    if (inheritance.ownStage) {
      step += 1;
      const own = inheritance.ownStage;
      parts.push(`### ${step}. 本主支「${own.title}」（${own.status} · v${own.revision}）`);
      if (own.draftRel) parts.push(`- 成稿：\`${own.draftRel}\``);
      for (const h of own.conclusions) parts.push(`- ${h}`);
      parts.push('');
    }
    for (const ancestor of inheritance.ancestors) {
      step += 1;
      parts.push(
        `### ${step}. 祖先分支「${ancestor.name}」${
          ancestor.revision > 0 ? `（成果 v${ancestor.revision}）` : '（尚无成果）'
        }`,
      );
      if (ancestor.resultRel) parts.push(`- 成果档案：\`${ancestor.resultRel}\``);
      if (ancestor.acceptedStreams.length > 0) {
        parts.push(`- 已回连成果：${ancestor.acceptedStreams.join('、')}`);
      }
      for (const h of ancestor.highlights) parts.push(`- ${h}`);
      parts.push('');
    }
    step += 1;
    parts.push(`### ${step}. 本分支「${opts.branchName || branchId}」（当前任务）`);
    parts.push('');
    parts.push('> 回连规则：本级成果回连到上一级时，**上一级原有内容先备份**，再写入本次最新结果；');
    parts.push('> 需要一次做完时用 `dag graft <handoff> --chain`，它会按反向顺序逐级更新到主支成稿。');
    parts.push('');
  }

  parts.push('## 0. 这根刺为什么存在');  parts.push('');
  parts.push(`- 所属主骨：${moduleId}${moduleRec && moduleRec.name ? `（${moduleRec.name}）` : ''}`);
  if (opts.prompt) {
    parts.push(`- 任务意图：${opts.prompt}`);
  } else if (opts.backfilled) {
    // 补建件没有当时的 prompt：退而用该分支的交接标题/简述，让上下文不至于空洞
    const own = (ledger.handoffs || []).filter((entry) => entry && entry.branch === branchId);
    const titled = own.find((entry) => entry && entry.title);
    const streamOf = own[0] && own[0].stream;
    if (titled) parts.push(`- 任务意图（据交接记录推断）：${titled.title}`);
    else if (streamOf) parts.push(`- 任务意图（据交接 stream 推断）：产出 \`${streamOf}\``);
    else parts.push('- 任务意图：（补建时无法还原；请以 BRIEF.md 与本刺工作记录为准）');
  }
  parts.push(`- 主骨当前阶段：${state.phase || '（未设置）'}`);
  parts.push('');
  parts.push('## 1. 主骨当前意图（分刺时刻）');
  parts.push('');
  const nextSteps = Array.isArray(state.next_steps) ? state.next_steps : [];
  const blockers = Array.isArray(state.blockers) ? state.blockers : [];
  parts.push('### 下一步');
  if (nextSteps.length === 0) parts.push('-（无）');
  for (const step of nextSteps) parts.push(`- ${step}`);
  parts.push('');
  parts.push('### 阻塞');
  if (blockers.length === 0) parts.push('-（无）');
  for (const item of blockers) parts.push(`- ${item}`);
  parts.push('');
  parts.push('## 2. 本模块已有的全部鱼刺与交接');
  parts.push('');
  parts.push('| 分支 | stream | 版本 | 状态 | 交接文件 |');
  parts.push('|---|---|---|---|---|');
  if (handoffRows.length === 0) parts.push('|（本模块还没有交接）| | | | |');
  for (const row of handoffRows) {
    parts.push(`| ${row.branch} | ${row.stream} | v${row.version} | ${row.status} | ${row.path} |`);
  }
  parts.push('');
  // 按模块归类的全部鱼刺（含没有交接的探索刺）
  const ribRows = moduleRibs.map((rib) => {
    const count = handoffRows.filter((row) => row.branch === rib.id).length;
    return `| ${rib.id}${rib.id === branchId ? '（本刺）' : ''} | ${rib.name || ''} | ${rib.mode || 'standard'} | ${count} 条交接 |`;
  });
  parts.push(`本模块名下的鱼刺（按模块归类，共 ${moduleRibs.length} 根）：`);
  parts.push('');
  parts.push('| 鱼刺 id | 名称 | 模式 | 交接数 |');
  parts.push('|---|---|---|---|');
  for (const row of ribRows) parts.push(row);
  parts.push('');
  parts.push(`（本模块共 ${handoffRows.length} 条交接记录；分刺时刻本项目已接受 ${acceptedCount} 个 stream。）`);
  parts.push('');
  parts.push('## 3. 全项目已接受的稳定输入（accepted/）');
  parts.push('');
  parts.push('| stream | 版本 | 交接文件 |');
  parts.push('|---|---|---|');
  if (acceptedRows.length === 0) parts.push('|（暂无）| | |');
  for (const row of acceptedRows) {
    parts.push(`| ${row.stream} | v${row.version} | ${row.path} |`);
  }
  parts.push('');
  parts.push('> 下游只能消费 ACCEPTED 结果；脚本统一读取 `<root>/accepted/<stream>/`。');
  parts.push('');
  parts.push('## 4. 项目状态板快照（PROJECT_STATE.md）');
  parts.push('');
  parts.push('```markdown');
  parts.push(stateMd.trim() || '（PROJECT_STATE.md 缺失）');
  parts.push('```');
  parts.push('');
  parts.push('## 5. 决策日志（DECISIONS.md）');
  parts.push('');
  parts.push('```markdown');
  parts.push(decisionsText.trim() || '（DECISIONS.md 缺失）');
  parts.push('```');
  parts.push('');
  parts.push(`（分刺时刻快照：决策 ${decisionsCount} 条。）`);
  parts.push('');
  parts.push('---');
  parts.push('');
  // ---- 父刺溯源（鱼刺之间分叉）
  if (parentSection) {
    parts.push('## 6. 这根刺从哪来（父刺）');
    parts.push('');
    parts.push(`- 父刺：${parentSection.id}（${parentSection.name}）`);
    parts.push('- 父刺目录：' + parentSection.dir);
    parts.push('');
    if (parentSection.brief.trim()) {
      parts.push('父刺简报（摘要）：');
      parts.push('');
      parts.push('```markdown');
      parts.push(truncateBlock(parentSection.brief, 20));
      parts.push('```');
      parts.push('');
    }
    const parentFiles = [...parentSection.workFiles.map((f) => `work/${f.name}`), ...parentSection.outputs.map((f) => `outputs/${f.name}`)];
    if (parentFiles.length > 0) {
      parts.push(`父刺产出（可只读参考，勿修改）：${parentFiles.slice(0, 20).join('、')}`);
      parts.push('');
    }
    parts.push('');
  }

  // ---- 同伴鱼刺（通讯名单）
  if (siblings.length > 0) {
    parts.push(`## ${parentSection ? 7 : 6}. 同一主骨下的其他鱼刺（同伴）`);
    parts.push('');
    parts.push('这些刺与你解决同一主骨的不同侧面。需要与它们交换信息时，用 `dag message` 投递。');
    parts.push('');
    parts.push('| 鱼刺 id | 名称 | 目录 | work | outputs |');
    parts.push('|---|---|---|---|---|');
    for (const row of siblings) {
      parts.push(`| ${row.id} | ${row.name} | \`${row.dir}\` | ${row.workCount} | ${row.outputCount} |`);
    }
    parts.push('');
    parts.push('投递消息：`dag message --to <鱼刺id> --from <你的id> --text "<内容>"`');
    parts.push('');
  }

  parts.push('## 使用说明（给鱼刺智能体）');
  parts.push('');
  parts.push('1. 先通读上文，理解主骨为什么需要这根刺、此前已经决定了什么。');
  parts.push('2. 只写本分支 `work/` 与 `outputs/`；不要改 `control/`、其他模块或任何 ACCEPTED handoff。');
  parts.push('3. 输入一律取自 `accepted/<stream>/` 稳定路径；不要读兄弟分支的未接受草稿。');
  parts.push('4. 需要同伴的信息时用 `dag message` 投递/查看，不要直接改别人的目录。');
  parts.push('5. 完成后填 handoff 第 1–7 节 → `dag submit`；主项目满意后 `dag graft` 回连主骨。');

  const rel = path
    .join(...(moduleRec && moduleRec.dir ? moduleRec.dir.split('/') : ['modules', moduleId]), 'branches', opts.branchDir || branchId, 'CONTEXT.md')
    .split(path.sep)
    .join('/');
  writeFileAtomic(path.join(root, ...rel.split('/')), `${parts.join('\n')}\n`);

  return { files: [{ name: 'CONTEXT.md', rel, bytes: parts.join('\n').length + 1 }], decisionsCount, acceptedCount };
}

/** 列目录下的文件（仅一层，不递归），返回 [{ name, rel }]。 */
function listWorkFiles(dirAbs, dirRel) {
  let names = [];
  try {
    names = fs.readdirSync(dirAbs);
  } catch {
    return [];
  }
  return names
    .filter((name) => {
      try {
        return fs.statSync(path.join(dirAbs, name)).isFile();
      } catch {
        return false;
      }
    })
    .sort()
    .map((name) => ({ name, rel: `${dirRel}/${name}` }));
}

/** 截断 markdown 块到前 N 行。 */
function truncateBlock(text, maxLines) {
  const rows = String(text || '').split('\n');
  if (rows.length <= maxLines) return rows.join('\n');
  return rows.slice(0, maxLines).join('\n') + `\n…（共 ${rows.length} 行，已截断）`;
}
