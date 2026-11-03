/**
 * 研究项目 DAG 工作台 — 设计令牌层（v3.4）。
 *
 * 设计语言来自三个参照项目的共同经验：
 *   - OliverLiy/projectHub：宿主令牌 → 本地别名 → 回退值 三段式；
 *   - gjz18342624299-arch/dsh-content-workbench：低饱和紫主色 + 半透明同色徽章 + 3px 焦点环；
 *   - cinderzhan/bianqu-workbench：容器查询断点 + 工具栏紧凑化 + 卡片栅格自适应。
 *
 * 核心原则：
 *   1. **一切颜色走变量**。组件里不再出现裸 hex / rgba，避免明暗主题下「配色不对」。
 *   2. **宿主优先**。能用 `--dsw-alias-*`（DSH Desktop 主题）表达的就用宿主变量，
 *      本地只定义「宿主没给但本工作台需要」的少量语义色，并给静态回退值。
 *   3. **三层结构**：宿主 token → `--rdw-*` 语义别名 → 组件内联样式。
 *   4. **形状参与语义**：圆点=状态、圆角方块=分类、3px 左竖条=分组强调（色弱友好）。
 */

/**
 * 令牌定义（挂在 `.rdw-shell` 上，覆盖整页与所有内联浮层）。
 *
 * 注意：宿主浅色主题下 `bg-base / layer-1 / layer-2 / layer-3` 全是纯白，
 * 靠 border 分层；因此「凹陷底色」需要自己用 color-mix 造（sunken）。
 */
/**
 * 研究项目 DAG 工作台 — 设计令牌层（v3.5 高阶学术美学版）。
 *
 * 作者：lineex (https://github.com/lineex)
 *
 * 融合顶尖工作台设计经验：
 *   - OliverLiy/projectHub：现代多维度看板、KPI 层次、手绘 SVG 数据图表、多层微弥散阴影；
 *   - gjz18342624299-arch/dsh-content-workbench：低饱和学术配色、优雅色块软底、三栏流式布局；
 *   - cinderzhan/bianqu-workbench：容器查询自适应、极窄工具栏唯一性、精致胶囊药丸；
 *   - sara2398/xiaohongshu-note-workbench：轻盈直观的卡片与微交互反馈。
 *
 * 核心审美原则：
 *   1. 【科学克制与层次】：冷灰底色（#f8fafc / #0f172a）配合科研靛蓝（#4f46e5 / #3b82f6），拒绝高饱和塑料感。
 *   2. 【语义双编码】：所有状态均由「颜色 + 形状 + 标签」三重表达，对色弱极度友好。
 *   3. 【微立体与弥散光影】：卡片采用 1px 发丝边线 + 悬停微微浮起（-2px），主支采用渐变管线与发光节点。
 *   4. 【全套明暗主题支持】：支持 DSH Desktop 原生深色主题自适应。
 */

export const RDW_THEME_CSS = `
.rdw-shell{
  /* —— 画布与面板表面 —— */
  --rdw-bg:var(--dsw-alias-bg-base,#f8fafc);
  --rdw-panel:var(--dsw-alias-bg-layer-1,#ffffff);
  --rdw-panel-2:var(--dsw-alias-bg-layer-2,#fbfcfd);
  --rdw-panel-3:var(--dsw-alias-bg-layer-3,#f1f5f9);
  --rdw-sunken:color-mix(in srgb,var(--rdw-text) 4%,var(--rdw-panel));
  --rdw-sunken-2:color-mix(in srgb,var(--rdw-text) 7%,var(--rdw-panel));
  --rdw-hover:color-mix(in srgb,var(--rdw-text) 5%,transparent);

  /* —— 文字排版层次 —— */
  --rdw-text:var(--dsw-alias-label-primary,#0f172a);
  --rdw-text-2:var(--dsw-alias-label-secondary,#475569);
  --rdw-text-3:var(--dsw-alias-label-tertiary,#64748b);
  --rdw-text-4:var(--dsw-alias-label-caption,#94a3b8);
  --rdw-on-brand:var(--dsw-alias-label-primary-foreground,#ffffff);

  /* —— 边框与发丝线 —— */
  --rdw-line:var(--dsw-alias-border-l1,rgba(15,23,42,.06));
  --rdw-line-2:var(--dsw-alias-border-l2,rgba(15,23,42,.10));
  --rdw-line-3:var(--dsw-alias-border-l3,rgba(15,23,42,.16));

  /* —— 品牌与核心语义 —— */
  --rdw-brand:var(--dsw-alias-brand-primary,#0f172a);
  --rdw-brand-hover:var(--dsw-alias-button-primary-hover,#1e293b);
  --rdw-brand-gradient:linear-gradient(135deg,#1e293b 0%,#3b82f6 100%);
  --rdw-accent:var(--dsw-alias-state-business-primary,#3b82f6);
  --rdw-accent-dark:#2563eb;
  --rdw-danger:var(--dsw-alias-state-error-primary,#e11d48);
  --rdw-warn:var(--dsw-alias-state-warn-primary,#d97706);
  --rdw-ok:var(--dsw-alias-state-success-primary,#059669);
  --rdw-idle:var(--dsw-alias-state-idle-primary,#94a3b8);

  /* 语义半透软底（明暗模式通透高级） */
  --rdw-accent-soft:color-mix(in srgb,var(--rdw-accent) 12%,transparent);
  --rdw-danger-soft:color-mix(in srgb,var(--rdw-danger) 12%,transparent);
  --rdw-warn-soft:color-mix(in srgb,var(--rdw-warn) 14%,transparent);
  --rdw-ok-soft:color-mix(in srgb,var(--rdw-ok) 13%,transparent);

  /* —— 科研状态色体系（学术级严谨配色）—— */
  --rdw-st-draft:var(--dsw-alias-label-tertiary,#64748b);
  --rdw-st-provisional:var(--dsw-alias-state-warn-primary,#d97706);
  --rdw-st-accepted:var(--dsw-alias-state-success-primary,#059669);
  --rdw-st-rejected:#e11d48;
  --rdw-st-superseded:#7c3aed;
  --rdw-st-blocked:#ea580c;

  --rdw-st-draft-soft:color-mix(in srgb,var(--rdw-st-draft) 12%,transparent);
  --rdw-st-provisional-soft:color-mix(in srgb,var(--rdw-st-provisional) 13%,transparent);
  --rdw-st-accepted-soft:color-mix(in srgb,var(--rdw-st-accepted) 13%,transparent);
  --rdw-st-rejected-soft:color-mix(in srgb,var(--rdw-st-rejected) 12%,transparent);
  --rdw-st-superseded-soft:color-mix(in srgb,var(--rdw-st-superseded) 12%,transparent);
  --rdw-st-blocked-soft:color-mix(in srgb,var(--rdw-st-blocked) 13%,transparent);

  /* —— 项目流程主线科研管线色 —— */
  --rdw-bone:color-mix(in srgb,var(--rdw-text) 24%,transparent);
  --rdw-bone-strong:color-mix(in srgb,var(--rdw-text) 44%,transparent);
  --rdw-spine:var(--rdw-accent);
  --rdw-spine-glow:color-mix(in srgb,var(--rdw-accent) 22%,transparent);
  --rdw-spine-soft:color-mix(in srgb,var(--rdw-accent) 14%,transparent);
  --rdw-plate:color-mix(in srgb,var(--rdw-accent) 8%,var(--rdw-panel));
  --rdw-plate-line:color-mix(in srgb,var(--rdw-accent) 28%,transparent);

  /* —— 圆角与规格 —— */
  --rdw-r-xs:var(--dsw-radius-xs,4px);
  --rdw-r-sm:var(--dsw-radius-sm,8px);
  --rdw-r-md:var(--dsw-radius-md,12px);
  --rdw-r-lg:var(--dsw-radius-lg,16px);
  --rdw-r-pill:999px;

  /* —— 现代弥散层级阴影（Tailwind / Linear 级）—— */
  --rdw-shadow-1:0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04);
  --rdw-shadow-2:0 6px 16px -2px rgba(15,23,42,.08),0 2px 6px -1px rgba(15,23,42,.04);
  --rdw-shadow-3:0 18px 36px -4px rgba(15,23,42,.12),0 6px 16px -2px rgba(15,23,42,.06);

  /* —— 缓动与动效 —— */
  --rdw-ease:cubic-bezier(.22,.61,.36,1);
  --rdw-dur:.2s;

  /* —— 字体 —— */
  --rdw-font:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Helvetica Neue','Segoe UI Variable Text','Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif);
  --rdw-font-mono:var(--ds-font-family-code,'SF Mono',SFMono-Regular,ui-monospace,Menlo,Monaco,Consolas,'Liberation Mono',monospace);

  /* ═══════════════════════════════════════════════════════════════════════
   * Apple / macOS 原生语汇层（v5）
   *
   * 用户反馈「排版太多密集的字体」——根因是旧版把 9px/9.5px/10px/10.5px/11px
   * 五级「微字号」混用，信息层级靠字号堆叠而非字重/灰度区分。
   *
   * 新规则（对齐 macOS 原生 App）：
   *   1. 【字号阶梯收敛到 4 级】11（辅助）/ 12（正文小）/ 13（正文）/
   *      15（区块标题）/ 20（页面标题）。不再出现 9px/9.5px/10px。
   *   2. 【层级靠字重 + 灰度】font-weight 只用 400 / 500 / 600；
   *      次要信息降到 label-3 灰度，而不是缩小字号。
   *   3. 【系统语义色】蓝/绿/橙/红/灰五色，全部用淡底 tinted capsule 表达。
   *   4. 【材质分层】毛玻璃（vibrancy）+ 白面 + 极轻阴影，不靠满屏边框。
   *   5. 【连续圆角】7 / 10 / 13 / 18 / pill——观感接近 Apple 连续曲率。
   * ═══════════════════════════════════════════════════════════════════════ */

  /* —— 系统语义色（macOS light）—— */
  --rdw-sys-blue:#007aff;
  --rdw-sys-green:#34c759;
  --rdw-sys-orange:#ff9500;
  --rdw-sys-red:#ff3b30;
  --rdw-sys-gray:#8e8e93;

  /* —— 表面与材质 —— */
  --rdw-organic-bg:#f2f2f7;              /* 系统 groupBackground */
  --rdw-organic-surface:#ffffff;         /* 内容面 */
  --rdw-organic-raised:#ffffff;
  --rdw-organic-input:#ffffff;
  --rdw-organic-hover:rgba(120,120,128,.08);
  --rdw-organic-strip:rgba(250,250,252,.78);
  --rdw-glass:rgba(246,246,248,.82);     /* 侧栏 vibrancy */
  --rdw-glass-strong:rgba(255,255,255,.86);

  /* —— 文字（Apple label 层级）—— */
  --rdw-organic-ink:#1d1d1f;
  --rdw-organic-ink-2:rgba(60,60,67,.72);
  --rdw-organic-ink-3:rgba(60,60,67,.50);
  --rdw-organic-ink-4:rgba(60,60,67,.32);

  /* —— 填充与分隔 —— */
  --rdw-fill-quat:rgba(120,120,128,.08);
  --rdw-fill-tert:rgba(120,120,128,.12);
  --rdw-fill-sec:rgba(120,120,128,.16);

  /* —— 语义色别名（旧令牌名保持不变，值切到系统色，避免改所有组件）—— */
  --rdw-sage:var(--rdw-sys-blue);
  --rdw-sage-hover:#0a6fdb;
  --rdw-sage-tint:#5ac8fa;
  --rdw-tan:var(--rdw-sys-orange);
  --rdw-tan-ink:#b25000;
  --rdw-mist:#f2f2f7;
  --rdw-teal:#5ac8fa;
  --rdw-teal-ink:#0071a4;
  --rdw-soil:var(--rdw-sys-blue);
  --rdw-warm-line:rgba(60,60,67,.10);
  --rdw-warm-line-2:rgba(60,60,67,.06);

  /* —— 圆角（Apple 连续曲率观感，非"有机不等角"）—— */
  --rdw-r-blob:18px;
  --rdw-r-blob-lg:22px;
  --rdw-r-pebble:13px;
  --rdw-r-pebble-sm:7px;
  --rdw-r-dot:50%;
  --rdw-r-bubble-ai:13px;
  --rdw-r-bubble-user:13px;

  /* —— 标题不再用衬线，改用系统 SF Pro 的紧凑字距 —— */
  --rdw-font-serif:var(--rdw-font);

  /* —— 动效：Apple 的缓动更顺，时长更短 —— */
  --rdw-ease-organic:cubic-bezier(.32,.72,0,1);
  --rdw-dur-organic:220ms;
  --rdw-dur-quick:140ms;

  /* —— 阴影：极轻（Apple 靠材质与边框分层，不用重投影）—— */
  --rdw-shadow-organic-1:0 1px 2px rgba(0,0,0,.05);
  --rdw-shadow-organic-2:0 4px 14px rgba(0,0,0,.08);
  --rdw-shadow-organic-3:0 12px 32px rgba(0,0,0,.14);

  /* ═══ 视觉重心：把注意力交给中栏主会话 ═══
   * 三栏原先同为纯白 + 同等边框，没有主次，眼睛不知道该看哪里。
   * 现在分三级：中栏（工作台面）= 纯白 + 稍强投影；
   * 侧栏（导航 / 产物）= 浅灰面 + 更弱边框 + 无投影。
   * 侧栏不再像「又一张卡片」，而是托住中栏的底板。 */
  --rdw-side-surface:color-mix(in srgb,var(--rdw-organic-bg) 68%,var(--rdw-organic-surface));
  --rdw-side-line:rgba(60,60,67,.042);
  --rdw-focus-surface:var(--rdw-organic-surface);
  --rdw-focus-line:rgba(60,60,67,.09);
  --rdw-focus-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.06);

  /* —— 侧栏状态色：降饱和，别让六种颜色同时抢戏 ——
   * 侧栏只用「一个小实心点 + 中性文字」，不铺彩色底。
   * 强色只留给真正需要你处理的地方（中栏警示、右栏待办）。 */
  --rdw-st-draft-mute:color-mix(in srgb,var(--rdw-st-draft) 55%,var(--rdw-organic-bg));
  --rdw-st-provisional-mute:color-mix(in srgb,var(--rdw-st-provisional) 52%,var(--rdw-organic-bg));
  --rdw-st-accepted-mute:color-mix(in srgb,var(--rdw-st-accepted) 52%,var(--rdw-organic-bg));
  --rdw-st-rejected-mute:color-mix(in srgb,var(--rdw-st-rejected) 52%,var(--rdw-organic-bg));
  --rdw-st-superseded-mute:color-mix(in srgb,var(--rdw-st-superseded) 52%,var(--rdw-organic-bg));
  --rdw-st-blocked-mute:color-mix(in srgb,var(--rdw-st-blocked) 52%,var(--rdw-organic-bg));

  /* —— 纹理：Apple 无纸纹，置空 —— */
  --rdw-organic-grain:none;
}

/* 深色模式全局调优 */
body[data-ds-dark-theme] .rdw-shell{
  --rdw-bg:var(--dsw-alias-bg-base,#0b0f19);
  --rdw-panel:var(--dsw-alias-bg-layer-1,#131b2e);
  --rdw-panel-2:var(--dsw-alias-bg-layer-2,#17223b);
  --rdw-panel-3:var(--dsw-alias-bg-layer-3,#1e293b);
  --rdw-line:var(--dsw-alias-border-l1,rgba(255,255,255,.08));
  --rdw-line-2:var(--dsw-alias-border-l2,rgba(255,255,255,.12));
  --rdw-line-3:var(--dsw-alias-border-l3,rgba(255,255,255,.18));
  --rdw-text:var(--dsw-alias-label-primary,#f8fafc);
  --rdw-text-2:var(--dsw-alias-label-secondary,#cbd5e1);
  --rdw-text-3:var(--dsw-alias-label-tertiary,#94a3b8);
  --rdw-text-4:var(--dsw-alias-label-caption,#64748b);
  --rdw-st-accepted:#10b981;
  --rdw-st-provisional:#f59e0b;
  --rdw-st-rejected:#f43f5e;
  --rdw-st-superseded:#a78bfa;
  --rdw-st-blocked:#fb923c;
  --rdw-shadow-1:0 1px 3px rgba(0,0,0,.4);
  --rdw-shadow-2:0 6px 18px rgba(0,0,0,.5);
  --rdw-shadow-3:0 20px 40px rgba(0,0,0,.65);

  /* —— Apple 深色语义色 —— */
  --rdw-sys-blue:#0a84ff;
  --rdw-sys-green:#30d158;
  --rdw-sys-orange:#ff9f0a;
  --rdw-sys-red:#ff453a;
  --rdw-sys-gray:#98989d;

  /* —— 表面与材质（深）—— */
  --rdw-organic-bg:#000000;
  --rdw-organic-surface:#1c1c1e;
  --rdw-organic-raised:#2c2c2e;
  --rdw-organic-input:#1c1c1e;
  --rdw-organic-hover:rgba(120,120,128,.18);
  --rdw-organic-strip:rgba(28,28,30,.80);
  --rdw-glass:rgba(30,30,32,.82);
  --rdw-glass-strong:rgba(44,44,46,.92);

  /* —— 文字（深）—— */
  --rdw-organic-ink:#f5f5f7;
  --rdw-organic-ink-2:rgba(235,235,245,.72);
  --rdw-organic-ink-3:rgba(235,235,245,.50);
  --rdw-organic-ink-4:rgba(235,235,245,.30);

  /* —— 填充与分隔（深）—— */
  --rdw-fill-quat:rgba(120,120,128,.18);
  --rdw-fill-tert:rgba(120,120,128,.26);
  --rdw-fill-sec:rgba(120,120,128,.34);

  /* —— 语义别名 —— */
  --rdw-sage:var(--rdw-sys-blue);
  --rdw-sage-hover:#409cff;
  --rdw-sage-tint:#64d2ff;
  --rdw-tan:var(--rdw-sys-orange);
  --rdw-tan-ink:#ffb340;
  --rdw-mist:#2c2c2e;
  --rdw-teal:#64d2ff;
  --rdw-teal-ink:#9ee7ff;
  --rdw-soil:var(--rdw-sys-blue);
  --rdw-warm-line:rgba(84,84,88,.48);
  --rdw-warm-line-2:rgba(84,84,88,.32);
  --rdw-shadow-organic-1:0 1px 2px rgba(0,0,0,.40);
  --rdw-shadow-organic-2:0 4px 14px rgba(0,0,0,.50);
  --rdw-shadow-organic-3:0 12px 32px rgba(0,0,0,.60);

  /* —— 视觉重心（深色）：侧栏更暗、中栏更亮 ——
   * 深色下不能靠「白得更白」制造对比，改为侧栏沉到 #141416、
   * 中栏提到 #1c1c1e 之上，靠明度阶梯而不是描边。 */
  --rdw-side-surface:#141416;
  --rdw-side-line:rgba(255,255,255,.035);
  --rdw-focus-surface:#1c1c1e;
  --rdw-focus-line:rgba(255,255,255,.10);
  --rdw-focus-shadow:0 1px 2px rgba(0,0,0,.45),0 8px 24px rgba(0,0,0,.42);
  --rdw-st-draft-mute:color-mix(in srgb,var(--rdw-st-draft) 60%,#141416);
  --rdw-st-provisional-mute:color-mix(in srgb,var(--rdw-st-provisional) 58%,#141416);
  --rdw-st-accepted-mute:color-mix(in srgb,var(--rdw-st-accepted) 58%,#141416);
  --rdw-st-rejected-mute:color-mix(in srgb,var(--rdw-st-rejected) 58%,#141416);
  --rdw-st-superseded-mute:color-mix(in srgb,var(--rdw-st-superseded) 58%,#141416);
  --rdw-st-blocked-mute:color-mix(in srgb,var(--rdw-st-blocked) 58%,#141416);

  --rdw-organic-grain:none;
}
`

/**
 * 组件样式片段（内联样式用；全部只引用 var(--rdw-*)，不出现裸色值）。
 */
export const RDW_TOKENS = {
  /** 通用面板（卡片/区块）。 */
  panel: {
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-md)',
    background: 'var(--rdw-panel)',
    boxShadow: 'var(--rdw-shadow-1)',
  },
  /** 凹陷区块（提示框/引用块）。 */
  sunken: {
    border: '1px solid var(--rdw-line)',
    borderRadius: 'var(--rdw-r-sm)',
    background: 'var(--rdw-sunken)',
  },
  /** 分组标题（11.5px / 600 / 字距 / 三级字色）。 */
  sectionTitle: {
    margin: '0',
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: '.01em',
    color: 'var(--rdw-text)',
  },
  /** 分组小标题（弱化）。 */
  groupTitle: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: 'var(--rdw-text-3)',
  },
  /** 数字列等宽对齐。 */
  num: {
    fontVariantNumeric: 'tabular-nums',
  },
  /** 焦点环（3px 同色软底，不使用 outline）。 */
  focusRing: '0 0 0 3px var(--rdw-accent-soft)',
}

/**
 * 语义色 → tone 映射。
 * tone 贯穿徽章 / 进度条 / 圆点 / 时间轴圆点 / 图表切片，全链路一致。
 */
export const RDW_TONE = {
  idle: { color: 'var(--rdw-st-draft)', bg: 'var(--rdw-st-draft-soft)' },
  info: { color: 'var(--rdw-accent)', bg: 'var(--rdw-accent-soft)' },
  warn: { color: 'var(--rdw-warn)', bg: 'var(--rdw-warn-soft)' },
  ok: { color: 'var(--rdw-ok)', bg: 'var(--rdw-ok-soft)' },
  danger: { color: 'var(--rdw-danger)', bg: 'var(--rdw-danger-soft)' },
  draft: { color: 'var(--rdw-st-draft)', bg: 'var(--rdw-st-draft-soft)' },
  provisional: { color: 'var(--rdw-st-provisional)', bg: 'var(--rdw-st-provisional-soft)' },
  accepted: { color: 'var(--rdw-st-accepted)', bg: 'var(--rdw-st-accepted-soft)' },
  rejected: { color: 'var(--rdw-st-rejected)', bg: 'var(--rdw-st-rejected-soft)' },
  superseded: { color: 'var(--rdw-st-superseded)', bg: 'var(--rdw-st-superseded-soft)' },
  blocked: { color: 'var(--rdw-st-blocked)', bg: 'var(--rdw-st-blocked-soft)' },
}

/**
 * tone → 徽章样式（胶囊 + 5px 圆点，形状参与语义）。
 * @param {string} tone tone 名（见 RDW_TONE）
 */
export function toneBadgeStyle(tone) {
  const theme = RDW_TONE[tone] || RDW_TONE.idle
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    height: 21,
    padding: '0 8px',
    borderRadius: 'var(--rdw-r-pill)',
    border: '1px solid color-mix(in srgb,' + theme.color + ' 26%,transparent)',
    background: theme.bg,
    color: theme.color,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  }
}

/** tone → 状态圆点样式（圆点=状态）。 */
export function toneDotStyle(tone, size) {
  const theme = RDW_TONE[tone] || RDW_TONE.idle
  const px = typeof size === 'number' && size > 0 ? size : 7
  return {
    width: px,
    height: px,
    borderRadius: 'var(--rdw-r-pill)',
    background: theme.color,
    flex: '0 0 auto',
    display: 'inline-block',
  }
}

/**
 * 空状态：虚线边框 + 圆形图标槽 + 标题 + 提示 + 可选操作。
 * 做法来自 dsh-content-workbench：空状态必须给出明确的下一步动作。
 */
export function emptyStateStyle() {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: '44px 20px',
    border: '1px dashed var(--rdw-line-3)',
    borderRadius: 'var(--rdw-r-md)',
    background: 'var(--rdw-sunken)',
    color: 'var(--rdw-text-3)',
    textAlign: 'center',
  }
}

/** 空状态图标槽（42px 圆形）。 */
export function emptyIconStyle() {
  return {
    display: 'grid',
    placeItems: 'center',
    width: 42,
    height: 42,
    borderRadius: 'var(--rdw-r-pill)',
    background: 'var(--rdw-panel)',
    border: '1px solid var(--rdw-line)',
    color: 'var(--rdw-text-3)',
    fontSize: 18,
    lineHeight: 1,
  }
}

/** 空状态标题。 */
export function emptyTitleStyle() {
  return {
    fontSize: 13.5,
    fontWeight: 600,
    color: 'var(--rdw-text)',
    lineHeight: 1.5,
  }
}

/** 空状态提示正文。 */
export function emptyBodyStyle() {
  return {
    fontSize: 11.5,
    lineHeight: 1.75,
    color: 'var(--rdw-text-3)',
    maxWidth: '52ch',
  }
}

/**
 * 骨架屏：透明度脉冲（不用位移，位移在 flex 栅格里会抖）。
 * 配合 prefers-reduced-motion 已在 SHELL_CSS 里降级。
 */
export function skeletonStyle(height, width) {
  return {
    height: typeof height === 'number' ? height : 10,
    width: typeof width === 'string' ? width : '100%',
    borderRadius: 'var(--rdw-r-pill)',
    background: 'var(--rdw-sunken-2)',
    animation: 'rdw-pulse 1.4s ease-in-out infinite',
  }
}

/** 骨架屏关键帧。 */
export const RDW_SKELETON_CSS = `
@keyframes rdw-pulse{0%,100%{opacity:1}50%{opacity:.5}}
`

/* =========================================================================== *
 * v3.9 主题预设（Theme Presets）
 *
 * 设计要点：
 *   1. 只覆盖「配色」不覆盖「结构」——圆角/字号/间距保持同一套，避免主题之间
 *      版式跳动；换主题 = 换色相、明度基调与强调色。
 *   2. 全部通过 `[data-rdw-theme="<id>"]` 挂在 `.rdw-shell` 上，
 *      所以内联浮层、SVG（都在 shell 内部）自动跟随。
 *   3. 每个主题都同时给出浅色与深色版本（深色用 body[data-ds-dark-theme] 前缀），
 *      保证用户在系统深色模式下切主题不会「一半亮一半暗」。
 *   4. 强调色语义（--rdw-sage 主色 / --rdw-tan 次强调）不变，只换具体色相，
 *      这样所有「主支=sage、分支状态=语义色」的既有语义继续成立。
 * =========================================================================== */

/**
 * 主题清单（顺序即菜单顺序）。
 * swatch 用于菜单里的三色预览点：主色 / 次强调 / 底色。
 */
export const RDW_THEME_PRESETS = [
  {
    id: 'apple',
    name: '系统原生',
    hint: 'macOS 系统色，蓝为主、橙为辅（默认）',
    swatch: ['#007aff', '#ff9500', '#f2f2f7'],
  },
  {
    id: 'sage',
    name: '鼠尾草',
    hint: '低饱和绿灰，长时间阅读最省眼',
    swatch: ['#6b8f71', '#c9a227', '#f4f5f1'],
  },
  {
    id: 'ink',
    name: '墨蓝学术',
    hint: '深墨蓝 + 砖红，期刊排版的克制感',
    swatch: ['#2f4b7c', '#b5643a', '#f5f6f8'],
  },
  {
    id: 'plum',
    name: '梅子暮色',
    hint: '紫灰调，适合夜间写作',
    swatch: ['#7c5cbf', '#c76b8a', '#f6f4f8'],
  },
  {
    id: 'sand',
    name: '沙岩暖调',
    hint: '暖沙与陶土，纸质手稿观感',
    swatch: ['#a8752f', '#7f8f5e', '#f7f4ee'],
  },
  {
    id: 'slate',
    name: '冷岩灰',
    hint: '中性灰蓝，最克制的无彩选项',
    swatch: ['#4a5568', '#8b7355', '#f1f3f5'],
  },
]

/** 主题 id 合法集合，用于持久化时校验（防手改配置写进未知值）。 */
export const RDW_THEME_IDS = RDW_THEME_PRESETS.map((item) => item.id)

/**
 * 主题覆盖 CSS。默认主题（apple）不在这里重复定义——它就用上面 `.rdw-shell`
 * 的原生 Apple 令牌，避免两处维护同一份值。
 *
 * 每个主题只定义「会随主题变化的那些令牌」，其余（圆角、字体、动效、阴影）
 * 继承默认值。
 */
export const RDW_THEME_PRESET_CSS = `
/* ── 鼠尾草 sage：低饱和绿灰 ───────────────────────────────────────── */
.rdw-shell[data-rdw-theme="sage"]{
  --rdw-sys-blue:#5b8064;--rdw-sys-green:#5f9e6b;--rdw-sys-orange:#b98a2c;
  --rdw-organic-bg:#eef1ea;--rdw-organic-surface:#fbfcf9;--rdw-organic-raised:#ffffff;
  --rdw-organic-input:#fbfcf9;--rdw-organic-hover:rgba(91,128,100,.10);
  --rdw-organic-strip:rgba(243,246,240,.80);--rdw-glass:rgba(240,244,237,.82);
  --rdw-glass-strong:rgba(252,253,250,.90);
  --rdw-organic-ink:#22301f;--rdw-organic-ink-2:rgba(45,58,42,.72);
  --rdw-organic-ink-3:rgba(45,58,42,.50);--rdw-organic-ink-4:rgba(45,58,42,.32);
  --rdw-sage:#5b8064;--rdw-sage-hover:#4a6b52;--rdw-sage-tint:#8fb99a;
  --rdw-tan:#b98a2c;--rdw-tan-ink:#8a6415;
  --rdw-warm-line:rgba(45,58,42,.12);--rdw-warm-line-2:rgba(45,58,42,.07);
  --rdw-accent:#5b8064;--rdw-bg:#eef1ea;--rdw-panel:#fbfcf9;--rdw-panel-2:#f3f6f0;--rdw-panel-3:#e8ede4;
  --rdw-text:#22301f;--rdw-text-2:#41503c;--rdw-text-3:#5f6f59;--rdw-text-4:#8a9784;
  --rdw-line:rgba(45,58,42,.08);--rdw-line-2:rgba(45,58,42,.13);--rdw-line-3:rgba(45,58,42,.20);
}
body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="sage"]{
  --rdw-organic-bg:#0f1511;--rdw-organic-surface:#182019;--rdw-organic-raised:#222c23;
  --rdw-organic-input:#182019;--rdw-organic-hover:rgba(140,180,150,.16);
  --rdw-organic-strip:rgba(24,32,25,.82);--rdw-glass:rgba(22,30,23,.84);
  --rdw-glass-strong:rgba(34,44,35,.92);
  --rdw-organic-ink:#e8efe6;--rdw-organic-ink-2:rgba(220,232,216,.72);
  --rdw-organic-ink-3:rgba(220,232,216,.50);--rdw-organic-ink-4:rgba(220,232,216,.30);
  --rdw-sage:#8fb99a;--rdw-sage-hover:#a7cbb1;--rdw-sage-tint:#b9d8c1;
  --rdw-tan:#e0b455;--rdw-tan-ink:#f0cd82;
  --rdw-warm-line:rgba(180,200,175,.14);--rdw-warm-line-2:rgba(180,200,175,.09);
  --rdw-accent:#8fb99a;--rdw-bg:#0f1511;--rdw-panel:#182019;--rdw-panel-2:#1d2620;--rdw-panel-3:#222c23;
  --rdw-text:#e8efe6;--rdw-text-2:#c3d0bd;--rdw-text-3:#94a68d;--rdw-text-4:#6d7d67;
}

/* ── 墨蓝学术 ink：深墨蓝 + 砖红 ───────────────────────────────────── */
.rdw-shell[data-rdw-theme="ink"]{
  --rdw-sys-blue:#2f4b7c;--rdw-sys-green:#3f7a6a;--rdw-sys-orange:#b5643a;
  --rdw-organic-bg:#eef1f6;--rdw-organic-surface:#ffffff;--rdw-organic-raised:#ffffff;
  --rdw-organic-input:#ffffff;--rdw-organic-hover:rgba(47,75,124,.08);
  --rdw-organic-strip:rgba(246,248,252,.80);--rdw-glass:rgba(242,245,250,.82);
  --rdw-glass-strong:rgba(255,255,255,.90);
  --rdw-organic-ink:#1a2233;--rdw-organic-ink-2:rgba(30,42,64,.74);
  --rdw-organic-ink-3:rgba(30,42,64,.50);--rdw-organic-ink-4:rgba(30,42,64,.32);
  --rdw-sage:#2f4b7c;--rdw-sage-hover:#263d66;--rdw-sage-tint:#6f8cbd;
  --rdw-tan:#b5643a;--rdw-tan-ink:#8d4a2a;
  --rdw-warm-line:rgba(30,42,64,.11);--rdw-warm-line-2:rgba(30,42,64,.06);
  --rdw-accent:#2f4b7c;--rdw-bg:#eef1f6;--rdw-panel:#ffffff;--rdw-panel-2:#f6f8fb;--rdw-panel-3:#eaeef5;
  --rdw-text:#1a2233;--rdw-text-2:#38465f;--rdw-text-3:#5c6b85;--rdw-text-4:#8b97ad;
  --rdw-line:rgba(30,42,64,.08);--rdw-line-2:rgba(30,42,64,.13);--rdw-line-3:rgba(30,42,64,.20);
}
body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="ink"]{
  --rdw-organic-bg:#0c1017;--rdw-organic-surface:#151b26;--rdw-organic-raised:#1d2634;
  --rdw-organic-input:#151b26;--rdw-organic-hover:rgba(110,140,190,.16);
  --rdw-organic-strip:rgba(21,27,38,.84);--rdw-glass:rgba(19,25,34,.86);
  --rdw-glass-strong:rgba(29,38,52,.92);
  --rdw-organic-ink:#e6ebf5;--rdw-organic-ink-2:rgba(220,230,245,.72);
  --rdw-organic-ink-3:rgba(220,230,245,.50);--rdw-organic-ink-4:rgba(220,230,245,.30);
  --rdw-sage:#7f9dd4;--rdw-sage-hover:#9bb4e2;--rdw-sage-tint:#b3c7ea;
  --rdw-tan:#d68a5f;--rdw-tan-ink:#eaa887;
  --rdw-warm-line:rgba(150,175,215,.14);--rdw-warm-line-2:rgba(150,175,215,.09);
  --rdw-accent:#7f9dd4;--rdw-bg:#0c1017;--rdw-panel:#151b26;--rdw-panel-2:#1a212d;--rdw-panel-3:#1d2634;
  --rdw-text:#e6ebf5;--rdw-text-2:#bcc8dc;--rdw-text-3:#8d9bb2;--rdw-text-4:#66748c;
}

/* ── 梅子暮色 plum：紫灰 ───────────────────────────────────────────── */
.rdw-shell[data-rdw-theme="plum"]{
  --rdw-sys-blue:#7c5cbf;--rdw-sys-green:#5d8f7a;--rdw-sys-orange:#c76b8a;
  --rdw-organic-bg:#f2eff6;--rdw-organic-surface:#fdfcfe;--rdw-organic-raised:#ffffff;
  --rdw-organic-input:#fdfcfe;--rdw-organic-hover:rgba(124,92,191,.09);
  --rdw-organic-strip:rgba(248,246,251,.80);--rdw-glass:rgba(246,243,250,.82);
  --rdw-glass-strong:rgba(254,253,254,.90);
  --rdw-organic-ink:#241c33;--rdw-organic-ink-2:rgba(48,38,66,.72);
  --rdw-organic-ink-3:rgba(48,38,66,.50);--rdw-organic-ink-4:rgba(48,38,66,.32);
  --rdw-sage:#7c5cbf;--rdw-sage-hover:#684ba6;--rdw-sage-tint:#ab8fdc;
  --rdw-tan:#c76b8a;--rdw-tan-ink:#9d4d69;
  --rdw-warm-line:rgba(48,38,66,.11);--rdw-warm-line-2:rgba(48,38,66,.06);
  --rdw-accent:#7c5cbf;--rdw-bg:#f2eff6;--rdw-panel:#fdfcfe;--rdw-panel-2:#f8f6fb;--rdw-panel-3:#efeaf6;
  --rdw-text:#241c33;--rdw-text-2:#463a5c;--rdw-text-3:#6a5c84;--rdw-text-4:#968bab;
  --rdw-line:rgba(48,38,66,.08);--rdw-line-2:rgba(48,38,66,.13);--rdw-line-3:rgba(48,38,66,.20);
}
body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="plum"]{
  --rdw-organic-bg:#12101a;--rdw-organic-surface:#1b1826;--rdw-organic-raised:#262133;
  --rdw-organic-input:#1b1826;--rdw-organic-hover:rgba(170,140,225,.16);
  --rdw-organic-strip:rgba(27,24,38,.84);--rdw-glass:rgba(25,22,34,.86);
  --rdw-glass-strong:rgba(38,33,51,.92);
  --rdw-organic-ink:#eee9f5;--rdw-organic-ink-2:rgba(232,225,245,.72);
  --rdw-organic-ink-3:rgba(232,225,245,.50);--rdw-organic-ink-4:rgba(232,225,245,.30);
  --rdw-sage:#ab8fdc;--rdw-sage-hover:#c0a9e8;--rdw-sage-tint:#d2c0f0;
  --rdw-tan:#e091ae;--rdw-tan-ink:#f0b2c6;
  --rdw-warm-line:rgba(190,170,225,.14);--rdw-warm-line-2:rgba(190,170,225,.09);
  --rdw-accent:#ab8fdc;--rdw-bg:#12101a;--rdw-panel:#1b1826;--rdw-panel-2:#211d2d;--rdw-panel-3:#262133;
  --rdw-text:#eee9f5;--rdw-text-2:#cbc2db;--rdw-text-3:#a296b5;--rdw-text-4:#7a6e8c;
}

/* ── 沙岩暖调 sand：暖沙 + 陶土 ────────────────────────────────────── */
.rdw-shell[data-rdw-theme="sand"]{
  --rdw-sys-blue:#a8752f;--rdw-sys-green:#7f8f5e;--rdw-sys-orange:#b5633c;
  --rdw-organic-bg:#f5f1e9;--rdw-organic-surface:#fdfbf7;--rdw-organic-raised:#fffefb;
  --rdw-organic-input:#fdfbf7;--rdw-organic-hover:rgba(168,117,47,.09);
  --rdw-organic-strip:rgba(250,246,239,.80);--rdw-glass:rgba(248,244,236,.82);
  --rdw-glass-strong:rgba(255,254,251,.90);
  --rdw-organic-ink:#33291c;--rdw-organic-ink-2:rgba(62,50,36,.74);
  --rdw-organic-ink-3:rgba(62,50,36,.50);--rdw-organic-ink-4:rgba(62,50,36,.32);
  --rdw-sage:#a8752f;--rdw-sage-hover:#8d611f;--rdw-sage-tint:#d0a86a;
  --rdw-tan:#7f8f5e;--rdw-tan-ink:#5f6c43;
  --rdw-warm-line:rgba(62,50,36,.12);--rdw-warm-line-2:rgba(62,50,36,.07);
  --rdw-accent:#a8752f;--rdw-bg:#f5f1e9;--rdw-panel:#fdfbf7;--rdw-panel-2:#faf6ef;--rdw-panel-3:#f2ece1;
  --rdw-text:#33291c;--rdw-text-2:#54452f;--rdw-text-3:#7a694f;--rdw-text-4:#a3967d;
  --rdw-line:rgba(62,50,36,.09);--rdw-line-2:rgba(62,50,36,.14);--rdw-line-3:rgba(62,50,36,.21);
}
body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="sand"]{
  --rdw-organic-bg:#15120d;--rdw-organic-surface:#1e1a14;--rdw-organic-raised:#292419;
  --rdw-organic-input:#1e1a14;--rdw-organic-hover:rgba(200,165,105,.16);
  --rdw-organic-strip:rgba(30,26,20,.84);--rdw-glass:rgba(28,24,19,.86);
  --rdw-glass-strong:rgba(41,36,25,.92);
  --rdw-organic-ink:#f0e9dc;--rdw-organic-ink-2:rgba(236,226,208,.72);
  --rdw-organic-ink-3:rgba(236,226,208,.50);--rdw-organic-ink-4:rgba(236,226,208,.30);
  --rdw-sage:#d0a86a;--rdw-sage-hover:#dfbf8b;--rdw-sage-tint:#e9d2ab;
  --rdw-tan:#a8b884;--rdw-tan-ink:#c2cfa6;
  --rdw-warm-line:rgba(210,185,145,.14);--rdw-warm-line-2:rgba(210,185,145,.09);
  --rdw-accent:#d0a86a;--rdw-bg:#15120d;--rdw-panel:#1e1a14;--rdw-panel-2:#231f18;--rdw-panel-3:#292419;
  --rdw-text:#f0e9dc;--rdw-text-2:#cfc2ae;--rdw-text-3:#a2957f;--rdw-text-4:#7c7160;
}

/* ── 冷岩灰 slate：中性无彩 ────────────────────────────────────────── */
.rdw-shell[data-rdw-theme="slate"]{
  --rdw-sys-blue:#4a5568;--rdw-sys-green:#5f8a72;--rdw-sys-orange:#8b7355;
  --rdw-organic-bg:#eff1f3;--rdw-organic-surface:#ffffff;--rdw-organic-raised:#ffffff;
  --rdw-organic-input:#ffffff;--rdw-organic-hover:rgba(74,85,104,.08);
  --rdw-organic-strip:rgba(247,248,250,.80);--rdw-glass:rgba(243,245,247,.82);
  --rdw-glass-strong:rgba(255,255,255,.90);
  --rdw-organic-ink:#1c2229;--rdw-organic-ink-2:rgba(35,44,54,.72);
  --rdw-organic-ink-3:rgba(35,44,54,.50);--rdw-organic-ink-4:rgba(35,44,54,.32);
  --rdw-sage:#4a5568;--rdw-sage-hover:#3b4556;--rdw-sage-tint:#8593a8;
  --rdw-tan:#8b7355;--rdw-tan-ink:#69543b;
  --rdw-warm-line:rgba(35,44,54,.11);--rdw-warm-line-2:rgba(35,44,54,.06);
  --rdw-accent:#4a5568;--rdw-bg:#eff1f3;--rdw-panel:#ffffff;--rdw-panel-2:#f7f8fa;--rdw-panel-3:#eceff2;
  --rdw-text:#1c2229;--rdw-text-2:#39424e;--rdw-text-3:#5d6876;--rdw-text-4:#8c96a4;
  --rdw-line:rgba(35,44,54,.08);--rdw-line-2:rgba(35,44,54,.13);--rdw-line-3:rgba(35,44,54,.20);
}
body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="slate"]{
  --rdw-organic-bg:#0e1116;--rdw-organic-surface:#161a20;--rdw-organic-raised:#20252c;
  --rdw-organic-input:#161a20;--rdw-organic-hover:rgba(140,155,175,.16);
  --rdw-organic-strip:rgba(22,26,32,.84);--rdw-glass:rgba(20,24,29,.86);
  --rdw-glass-strong:rgba(32,37,44,.92);
  --rdw-organic-ink:#e9edf2;--rdw-organic-ink-2:rgba(222,229,238,.72);
  --rdw-organic-ink-3:rgba(222,229,238,.50);--rdw-organic-ink-4:rgba(222,229,238,.30);
  --rdw-sage:#8593a8;--rdw-sage-hover:#9dabc0;--rdw-sage-tint:#b0bdcd;
  --rdw-tan:#b39b78;--rdw-tan-ink:#cbb595;
  --rdw-warm-line:rgba(170,180,195,.14);--rdw-warm-line-2:rgba(170,180,195,.09);
  --rdw-accent:#8593a8;--rdw-bg:#0e1116;--rdw-panel:#161a20;--rdw-panel-2:#1b1f26;--rdw-panel-3:#20252c;
  --rdw-text:#e9edf2;--rdw-text-2:#c0c9d4;--rdw-text-3:#939dab;--rdw-text-4:#6d7683;
}
`
