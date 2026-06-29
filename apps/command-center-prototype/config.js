// config.js — 产品配置：发布平台、信息源、视觉风格
// 依赖: 无

const TITLE_LOGIC_VERSION = "topic-bound-readable-v4";
const VISUAL_PROMPT_VERSION = "visual-v20260610-juju-bichon-lock";

const publishTargets = [
  { id: "xhs", title: "小红书图文", platform: "xiaohongshu", desc: "封面、标题、短正文、收藏点、标签" },
  { id: "douyin", title: "抖音短视频", platform: "douyin", desc: "3 秒钩子、口播、镜头、字幕、节奏" },
  { id: "video-account", title: "视频号短视频", platform: "video", desc: "信任感、口播、案例、转化动作" },
  { id: "wechat-article", title: "公众号长文", platform: "wechat", desc: "标题、开头、论证、案例、方法论" },
  { id: "moments", title: "朋友圈文案", platform: "moments", desc: "自然表达、信任建立、私聊引导" },
  { id: "topic-only", title: "只整理选题", platform: "asset", desc: "只把素材整理成可复用选题，暂不写成品" },
];

const sourceChannels = [
  { id: "same-platform", title: "同平台对标素材", desc: "在哪个平台发，就优先读取哪个平台的高表现素材。" },
  { id: "xhs", title: "小红书素材", desc: "学习小红书标题、封面、评论痛点和收藏结构。" },
  { id: "x-history", title: "历史资产", desc: "复用以前采集过的真实素材，找出今天能写的选题。" },
  { id: "x-live", title: "X 账号资产", desc: "读取 X/推特来源，适合提炼观点、洞察和方法论。" },
  { id: "hot30", title: "30天热点", desc: "读取样本库近 30 天高热度内容（按互动量×时效衰减打分），适合追当下热门方向。" },
  { id: "all-assets", title: "全库选题复用", desc: "从内容资产库里找好选题，再改写到目标平台。" },
  { id: "manual", title: "手动导入", desc: "粘贴你看到的好内容，整理成可写选题。" },
];
// 内容视角/角色(账号身份层):前端只需 id+label 做选择器;voice spec 在后端 content-roles.mjs。
// 角色锁账号身份(英锐=教育规划顾问),角度随选题。第一次成稿就固定,下游(改写/知识海报)全继承。
const CONTENT_ROLES = [
  { id: "edu-consultant", label: "教育规划顾问(机构号)", hint: "专业顾问身份·知识洞察·禁招揽导流" },
  { id: "peer-parent", label: "过来人 · 家长", hint: "个人号·真实经历分享" },
  { id: "observer", label: "行业观察者 · 主编", hint: "中立分析·趋势洞察" },
  { id: "reviewer", label: "素人体验分享", hint: "生活化种草·真实体验" },
];
const WRITING_ANGLES = ["破除误区", "时间线规划", "真实案例", "避坑清单", "数据洞察", "对比盘点"];
// 按赛道/行业给默认角色(与后端 content-roles.mjs defaultRoleForTrack 对齐)
function defaultRoleForTrack(track) {
  const t = String(track || "");
  if (/私校|留学|升学|教育|国际学校/.test(t)) return "edu-consultant";
  if (/女性成长|成长|情感|心理/.test(t)) return "peer-parent";
  if (/美容|护肤|好物|种草|美妆/.test(t)) return "reviewer";
  if (/AI|自媒体|科技|创业|投资/.test(t)) return "observer";
  return "edu-consultant";
}

const visualStyles = [
  {
    id: "xiaohei-metaphor",
    title: "小妹实物场景",
    desc: "适合观点、避坑、反差和情绪场景。用小妹卡通形象 + 真实物件把观点讲明白。",
    route: "xiaomei-scenes",
    assetLabel: "小妹实物场景图 / 观点隐喻",
  },
  {
    id: "juju-organizing",
    title: "卷卷整理插画",
    desc: "适合把复杂方法、复盘和教程整理成白底纸面手绘现场。",
    route: "juju-content-illustrations",
    assetLabel: "卷卷整理研究所 / 内容插画",
  },
  {
    id: "xhs-knowledge-card",
    title: "宝玉知识卡",
    desc: "适合清单、步骤、对比和收藏型内容。一页一个重点。",
    route: "baoyu-xhs-images / baoyu-infographic",
    assetLabel: "小红书知识卡 / 信息图",
  },
  {
    id: "guizang-editorial",
    title: "归藏杂志风",
    desc: "适合方法论、行业洞察和投资人演示。更像高级 Deck。",
    route: "open-design / guizang deck",
    assetLabel: "归藏编辑风 / 杂志 Deck",
  },
  {
    // 知识海报(HTML 精排·字永准·免费):文案自动拆成系列卡,双语标题+要点小注+线描配图,可叠实景背景。
    // 走 HTML 渲染引擎(非 AI 出图),中文永远清晰。前端按 id 走专属流程(拆卡→渲染)。
    id: "hanzi-poster",
    title: "知识海报",
    desc: "中文排版密集的设计感海报:双语标题+分点+线描配图,字永远清晰。适合升学/行业知识、干货洞察成系列发。",
    route: "hanzi-poster",
    engine: "html",
    assetLabel: "知识海报 / 系列卡",
  },
  // 以下来自 awesome-gpt-image-2 提示词库(EvoLink/freestylefly),走 Kie gpt-image-2 出图
  { id: "poster-cinematic", title: "高级海报", desc: "严肃高端话题首选:大标题+一个主视觉+大留白,电影感、有质感。替掉狗。", route: "gpt-image-2 / poster", assetLabel: "高级海报 / 封面" },
  { id: "typography-poster", title: "字体海报", desc: "强观点、金句、态度类。标题文字本身就是主视觉,克制配色。", route: "gpt-image-2 / typography", assetLabel: "概念字体海报" },
  { id: "infographic-engine", title: "信息图", desc: "干货、步骤、教程、对比:结构化图解+短标签+色块箭头,收藏率高。", route: "gpt-image-2 / infographic", assetLabel: "信息图 / 知识图解" },
  { id: "realistic-photo", title: "写实摄影", desc: "人像、商品、生活纪实:真实镜头光线质感,可信、有现场感。", route: "gpt-image-2 / photography", assetLabel: "写实摄影" },
  { id: "art-illustration", title: "艺术插画", desc: "治愈、情感、故事:水彩/水墨/动漫艺术风,温度感强。", route: "gpt-image-2 / illustration", assetLabel: "艺术插画" },
  { id: "ink-poster", title: "水墨意境", desc: "文化、诗意、深度话题:水墨双重曝光+人像剪影+留白,高级。", route: "gpt-image-2 / ink", assetLabel: "水墨意境海报" },
  { id: "product-commerce", title: "商品种草", desc: "美容/好物/电商:商品主图+卖点排版+材质光线,带货向。", route: "gpt-image-2 / product", assetLabel: "商品商业视觉" },
  { id: "cute-3d-toy", title: "3D 潮玩", desc: "萌系、IP、反差可爱:盲盒公仔质感(可按参考图转 3D)。", route: "gpt-image-2 / 3d", assetLabel: "3D 收藏潮玩" },
  { id: "svarbova-poster", title: "极简杂志海报", desc: "高端封面/海报:极简公共空间+几何构图+克制粉调+一抹番茄红+巨型标题(Svarbova风),图文一体、杂志封面感。", route: "gpt-image-2 / poster", assetLabel: "极简杂志海报(Svarbova风)" },
  // ── punk 导演级封面风格(内化自 image-studio/cover-styles/punk,已剥第三方引流)──
  { id: "punk-biz-magazine", title: "商业杂志头版", desc: "AI/创业/投资/趋势:大胆锐利大标题+商业隐喻(迷宫/增长曲线/飞轮)+高饱和色块,有商业判断的传播封面。", route: "gpt-image-2 / punk", assetLabel: "商业杂志头版" },
  { id: "punk-consulting", title: "咨询报告视觉", desc: "商业策略/方法论/产品分析:麦肯锡式理性网格+结构化隐喻(价值链/战略地图/漏斗)+克制专业配色。", route: "gpt-image-2 / punk", assetLabel: "咨询报告视觉" },
  { id: "punk-giant-title", title: "巨型透视中文标题", desc: "强冲击社媒封面:超大中文标题+强透视空间(立面/隧道/路牌)+速度阴影,通用爆款钩子。", route: "gpt-image-2 / punk", assetLabel: "巨型透视中文标题" },
  { id: "punk-bw-concept", title: "黑白极简概念", desc: "观点/战略/哲学/批判:黑白灰+巨型可读标题+一个准确图像隐喻,现代主义展览海报感。", route: "gpt-image-2 / punk", assetLabel: "黑白极简概念海报" },
  { id: "punk-semantic", title: "语义转译极简", desc: "单词/金句/概念:文字+主体+空间关系共构成一个表达语义的视觉句子,高级极简。", route: "gpt-image-2 / punk", assetLabel: "语义转译极简海报" },
  { id: "punk-collage", title: "复古手撕拼贴", desc: "文化/街头/女性成长:旧报纸撕边+胶带+半调网点+手写批注,独立杂志拼贴叙事。", route: "gpt-image-2 / punk", assetLabel: "复古手撕拼贴" },
  { id: "punk-block-world", title: "方块世界", desc: "教程/工具/系统/游戏化:Minecraft式高饱和体素世界,标题被方块化成建筑/传送门/地形。", route: "gpt-image-2 / punk", assetLabel: "方块世界海报" },
  { id: "punk-brick-world", title: "积木世界", desc: "搭建/团队/教育/亲子:颗粒积木微缩场景,主题被'正在搭建'成桥/塔/系统,亲和有秩序。", route: "gpt-image-2 / punk", assetLabel: "积木世界海报" },
  { id: "punk-research-journal", title: "科研期刊概念", desc: "科研/医学/材料/机制:学术期刊封面感,干净网格+机制示意图+克制配色,理性可信。", route: "gpt-image-2 / punk", assetLabel: "科研期刊概念" },
  { id: "punk-retro-gradient", title: "复古弥散渐变", desc: "艺术/设计/品牌/情绪:柔和颗粒弥散渐变+复古暖调,情绪化杂志封面。", route: "gpt-image-2 / punk", assetLabel: "复古弥散渐变" },
  { id: "punk-avant-geometry", title: "黑白灰先锋几何", desc: "实验/现代主义/AI自媒体:黑白灰几何构成+强对比,先锋实验视觉。", route: "gpt-image-2 / punk", assetLabel: "黑白灰先锋几何" },
];

// 打法(产出形态)——配图方案 = 风格 × 打法
const VISUAL_PLAYS = [
  { id: "cover", name: "封面主视觉", emoji: "🖼️", desc: "一张冲击力主图,留标题位" },
  { id: "magazine", name: "杂志海报", emoji: "📰", desc: "图 + 巨型标题图文一体" },
  { id: "carousel", name: "轮播图文", emoji: "📑", desc: "多页卡:封面/痛点/案例/方法/行动" },
];

const VISUAL_STYLE_REGISTRY = {
  // ════ punk 导演级封面(内化 image-studio/cover-styles/punk;只取方法/风格,绝不带第三方引流/水印/真实品牌名)════
  "punk-biz-magazine": {
    route: "gpt-image-2 / punk biz-magazine",
    character: "No mascot. ONE strong business metaphor dominates (market maze / torn white-paper / growth curve / capital flow / funnel / flywheel / system UI / strategy map); the giant title is reconstructed BY that metaphor, not a plain word with an icon beside it.",
    styleBrief: "Bold business-tech magazine front-page cover. Channel the temperament of premium business/tech editorial and data-journalism (NEVER render any real media name, logo or masthead). ONE strong commercial metaphor leads the frame (market maze / torn white-paper / warning sign / growth curve / capital flow / order flow / funnel / flywheel / system interface / strategy map / industry territory). High-saturation color blocks, high-contrast giant title, odd-ratio crops, sharp graphics, a few structure lines / arrows / coordinates / data points / path lines. Few words but like a real editorial system: main title + subtitle + 2-4 column tags + one short conclusion. Bold, sharp, shareable, with a sense of business judgment and trend reporting. 3:4.",
    styleLock: "ONE metaphor only; the title must be reconstructed by it (cut by a market curve, pierced by a path, embedded in a matrix, a system node) — never a plain big word + decorative icon. 1-2 accent colors. Sharp editorial impact, restrained info.",
    negativePrompt: "No real media name/logo/masthead, no fake magazine header, no cheap finance template, no stock-ticker wall, no irrelevant businesspeople/handshake photo, no robot head, no blue-purple cyber glow, no dense small text, no garbled text, no watermark.",
    actions: { cover: "ONE business metaphor reconstructing the hook title + 2-4 column tags + high-saturation blocks.", problem: "The tension as a sharp business metaphor.", case: "One emblematic proof graphic.", method: "The idea as a clean business structure (path/funnel/flywheel).", action: "The next move as one decisive graphic." },
  },
  "punk-consulting": {
    route: "gpt-image-2 / punk consulting",
    character: "No mascot. ONE structured business metaphor (growth flywheel / value chain / strategy map / funnel / org network / market fault line / path choice / system nodes) built on a rational modernist grid.",
    styleBrief: "High-end management-consulting report cover. Rational McKinsey-like temperament: modernist grid, structure lines, coordinates, matrix, paths and a few data symbols. ONE core business metaphor leads (growth flywheel / value chain / strategy map / funnel / org network / market fault / path choice / system nodes). Restrained professional palette: white ground + black type, deep blue-grey, silver-grey, cold black, a little red-orange or blue accent. Graphics are clean and precise like abstract business structure, NOT a full explainer page. A few hairlines / arrows / zones / labels / axes / nodes / annotations. 3:4.",
    styleLock: "The title interlocks with the structure (pierced by a path, split by coordinates, embedded in a matrix, a system node, a strategy-map border). Subtitle/labels are a restrained small-text system. Graphics serve the argument, never pure decoration.",
    negativePrompt: "No fabricated detailed data, no fake complex charts, no dense tiny text, no cheap business template, no handshake photo, no irrelevant office scene, no real brand logo, no garbled text, no watermark.",
    actions: { cover: "ONE consulting metaphor interlocked with the hook title on a rational grid.", problem: "The tension as a structural diagram.", case: "One clean framework standing in for proof.", method: "The method as a precise structure (chain/funnel/flywheel).", action: "The next step as one clear node/path." },
  },
  "punk-giant-title": {
    route: "gpt-image-2 / punk giant-title",
    character: "No mascot. The GIANT Chinese title IS the architecture — built with perspective, depth, speed lines, heavy shadow or volume (facade / block / mountain / tunnel mouth / speeding road sign / stage rig / object rushing at the viewer).",
    styleBrief: "High-impact poster led by a huge Chinese title in strong perspective space. The title carries speed, pressure, depth, conflict and spatial drama — like a facade, street block, mountain, tunnel entrance, speeding signboard or stage installation. Strong contrast colors, coarse grain, motion blur, old-print marks, impact lines, diagonal slabs, dramatic light. Small figures / vehicles / city edge / signage / debris / dust / light as scale references. Bold, tense, like an event poster or large Chinese-type poster. 3:4.",
    styleLock: "The Chinese title is the FIRST visual; subtitle and aux info only build hierarchy around it. Perspective/occlusion add impact but must NOT break legibility. English aux only as edge labels / speed marks.",
    negativePrompt: "No weakening of the Chinese title, no plain title-over-background-photo, no garbled / broken / unreadable decorative characters, no robot head, no cyber neon, no watermark.",
    actions: { cover: "The hook as a giant perspective Chinese title rushing at the viewer.", problem: "A tense phrase as looming type.", case: "A key number/quote as monumental type.", method: "Step keywords as a built type structure.", action: "The next-step phrase as bold driving type." },
  },
  "punk-bw-concept": {
    route: "gpt-image-2 / punk bw-concept",
    character: "No mascot. ONE precise image metaphor (1-3 anchors: tiny figure / path / door / bridge / stairs / window / archive / terminal / fault / light beam / mechanism / data path) growing out of the typographic structure.",
    styleBrief: "Black-white-grey modern editorial concept poster. Mostly black/white/grey with only a tiny semantic accent color. Large negative space, clear order, strong grid, sharp edges, light paper grain. The main title is monumental — like architecture, a wall, a container, a screen, an archive cabinet, a harbor facade or a mental landscape. The image metaphor is limited to 1-3 key anchors and grows from inside the type (embedded in glyphs, piercing them, clinging to edges, becoming their shadow/crack/ground). Like a high-end portfolio cover or modernist exhibition poster. 3:4.",
    styleLock: "Giant type is the skeleton; full title / subtitle / category tag / year / index / account ID only as a small-text system. Chinese in heavy modern/geometric/condensed sans; English in bold grotesk. The metaphor must be meaningful, not just big type.",
    negativePrompt: "No plain ad page, no cheap commercial illustration, no empty big-type-only, no fancy decoration, no busy palette, no over-distorted fonts, no garbled text, no watermark.",
    actions: { cover: "Monumental B&W title + one precise metaphor anchor growing from the type.", problem: "The tension as one stark B&W metaphor.", case: "One emblematic B&W proof anchor.", method: "The idea as a clean grid structure.", action: "The next step as one focal B&W anchor." },
  },
  "punk-semantic": {
    route: "gpt-image-2 / punk semantic",
    character: "No mascot. 1-3 key subjects/objects/actions plus a giant core word that becomes the architecture (wall / stage / barrier / terrain / container / pressure plane); the subject relates to the word (stands before / inside / through / blocked by it).",
    styleBrief: "Translate the core word/phrase into a high-end minimal graphic poster — text, subject, supporting plane, spatial relation and a little color together form ONE visual sentence that expresses the meaning. Minimal main scene, clear supporting plane, 1-3 key subjects. The giant core text is the skeleton. 2-4 main colors, paper/print/woodcut feel, light grain, restrained texture. Large negative space allowed but must serve semantic tension. 3:4.",
    styleLock: "Core text is legible and the FIRST visual; image and text are fused (not a word pasted on an illustration). Aux text only if it deepens the theme — no random numbering / fake publication info / decorative sentences.",
    negativePrompt: "No word-as-caption-on-illustration, no image-text separation, no element pile-up, no busy background, no cheap gradient, no meaningless decoration, no garbled text, no watermark.",
    actions: { cover: "The hook word as a giant plane with the subject relating to it.", problem: "The tension as a word-subject spatial relation.", case: "One concrete object carrying the proof meaning.", method: "The idea as a clean word-object sentence.", action: "The next step as one decisive word-subject relation." },
  },
  "punk-collage": {
    route: "gpt-image-2 / punk collage",
    character: "No mascot. Torn-paper / old-newspaper / magazine-cut collage: object slices, partial figures, city fragments, symbols, handwritten notes, editor's marks, cut-out headline, magnifier.",
    styleBrief: "Retro hand-torn collage editorial poster: old newspaper, torn paper edges, tape, photocopy grain, halftone dots, stickers, ink mis-registration and paper shadows. Deliberately-casual-but-balanced order: rich layers, clear hierarchy. Like an indie zine, street poster wall, retro film poster or art-show poster. High contrast OR retro low saturation — but always with old-print texture. 3:4.",
    styleLock: "Main title printed on torn paper / partly covered / mis-registered / overprinted / cut / handwritten-over but still prominent. Small-text like column names / dates / numbers / captions / handwritten notes serving the theme. Image + title + paper + labels tell ONE story, not random scatter; keep paper/tear/print marks (never a clean vector puzzle).",
    negativePrompt: "No disordered scatter, no every-element-competing, no clean flat vector, no missing print texture, no garbled text, no watermark.",
    actions: { cover: "A torn-collage hook headline with one strong cut-out image.", problem: "The pain as a torn newspaper fragment.", case: "Proof as a clipped/annotated cutting.", method: "The steps as taped note cards.", action: "The next step as a handwritten sticker note." },
  },
  "punk-block-world": {
    route: "gpt-image-2 / punk block-world",
    character: "No mascot. Everything voxel/block/pixel-built; the title is reconstructed as a real structure in the block world (sky island / portal / mine wall / block road / quest panel / floating build / terrain).",
    styleBrief: "Minecraft-style high-saturation voxel-world poster. Bright, clean, sunny, with the spatial feel of a game key-art. All elements built from blocks/pixels/voxels. The main title becomes a real structure in the world (sky island / entrance / mine wall / block road / quest board / floating building / portal / explorable terrain). Block figures, tools, props, paths, maps, signboards, energy blocks, ore, clouds, grass, water, stairs and small scene details. Clean layered lighting (dawn/noon/sunset/indoor). 3:4.",
    styleLock: "The title must look like it really exists in the block world. Subtitle/labels as pixel signboards / quest panels / game menus / minimaps / inventory. Perspective, figure scale and paths lead the eye back to the title.",
    negativePrompt: "No title-scene separation, no kids' stickers, no low-quality cartoon, no plain pixel-icon collection, no block pile-up that loses spatial depth, no garbled text, no watermark.",
    actions: { cover: "The hook title built as a block-world structure with leading paths.", problem: "The problem as a block obstacle/gap.", case: "Proof as a built block scene.", method: "The steps as a block path/stairs.", action: "The next step as a block portal/door." },
  },
  "punk-brick-world": {
    route: "gpt-image-2 / punk brick-world",
    character: "No mascot. Brick/toy-block miniature world being assembled; mini brick figures and parts perform the theme action (building, collaborating, fixing, planning, upgrading, connecting).",
    styleBrief: "Toy brick-block world poster. Brick studs, baseplates, modular connections, mini figures, instruction-style small arrows and miniature-photography finish. The theme is BUILT into a brick structure (bridge / tower / city / factory / lab bench / classroom / map / machine / team scene / growth path). Bright, friendly, clean toy colors (red/yellow/blue/green/white/grey) with design control. Miniature studio lighting, clear object edges, plastic sheen and brick-stud texture. Looks like a running mini system, not scattered parts. 3:4.",
    styleLock: "Main title as a brick nameplate / building blocks / baseplate label / instruction title / structure built from bricks. Small text as instruction-manual labels / part numbers / quest hints. Figures and parts serve the metaphor.",
    negativePrompt: "No title-scene separation, no scattered loose parts, no low-quality cartoon, no messy pile, no garbled text, no watermark.",
    actions: { cover: "The hook built as a brick structure with mini figures assembling it.", problem: "The problem as a half-built / broken brick structure.", case: "Proof as a finished brick model.", method: "The steps as a brick build sequence.", action: "The next step as the next brick being placed." },
  },
  "punk-research-journal": {
    route: "gpt-image-2 / punk research-journal",
    character: "No mascot. ONE clean mechanism/diagram metaphor (molecular/material/biological/system schematic) as the hero, like a science-journal cover illustration.",
    styleBrief: "Academic science-journal concept cover (research / medicine / materials / biology / mechanism). Clean, rational, credible: a refined mechanism or schematic illustration as the hero (molecular structure, cell, material lattice, system diagram, cross-section), precise thin lines, a calm restrained palette (deep ink / teal / one cool accent), subtle grid, generous order. Looks like a high-end journal cover, not a busy infographic. 3:4.",
    styleLock: "ONE clear mechanism/diagram metaphor; refined and accurate-looking; restrained palette; title as a clean journal-cover headline + small subtitle/issue-style labels. Credible and rational, never fake-dense data.",
    negativePrompt: "No fabricated data/charts, no dense tiny text, no cheap sci-fi neon, no robot head, no cluttered diagram, no real journal name/logo, no garbled text, no watermark.",
    actions: { cover: "ONE refined mechanism/diagram hero + clean journal-style title.", problem: "The problem as a schematic of what's broken.", case: "Proof as a clean diagram/cross-section.", method: "The mechanism shown as a precise diagram.", action: "The next step as one clear schematic." },
  },
  "punk-retro-gradient": {
    route: "gpt-image-2 / punk retro-gradient",
    character: "No mascot required. Soft diffuse grainy gradient field + one simple emotive subject/shape; mood-led, art/design/brand feel.",
    styleBrief: "Retro diffuse-gradient poster (art / design / brand / emotional content). Soft, grainy, blurred diffuse color gradients (warm retro tones — peach / amber / dusty rose / muted teal), gentle film grain, a calm emotive composition with one simple subject or abstract shape. Refined, atmospheric, magazine-cover mood. Restrained, elegant, NOT a busy graphic. 3:4.",
    styleLock: "Soft diffuse gradient as the ground; one simple emotive subject/shape; warm retro grainy palette; clean refined title integrated calmly. Mood over information.",
    negativePrompt: "No harsh hard edges everywhere, no clip-art, no busy collage, no PPT, no neon cyber, no dense text, no garbled text, no watermark.",
    actions: { cover: "A diffuse-gradient field + one emotive subject + a calm integrated title.", problem: "The feeling as a moody gradient scene.", case: "One emblematic emotive image.", method: "The idea as a soft simple visual.", action: "A calm closing gradient image." },
  },
  "punk-avant-geometry": {
    route: "gpt-image-2 / punk avant-geometry",
    character: "No mascot. Black-white-grey avant-garde geometric composition; abstract geometric shapes, strong contrast, experimental modernist layout.",
    styleBrief: "Black-white-grey avant-garde geometric poster (experimental / modernist / AI-self-media). Bold abstract geometric construction — circles, slabs, diagonals, grids, negative-space cuts — strong high contrast, Swiss/Bauhaus-experimental rigor, light grain. Title integrated into the geometric structure. Confident, sharp, modernist, gallery-experimental. 3:4.",
    styleLock: "B&W/grey only (tiny accent at most); geometry is the structure; title interlocks with the shapes; strong contrast and order. Experimental but legible.",
    negativePrompt: "No rainbow colors, no clip-art, no busy decoration, no cheap template, no garbled text, no watermark.",
    actions: { cover: "The hook title interlocked with a bold B&W geometric construction.", problem: "The tension as a stark geometric clash.", case: "Proof as one emblematic geometric form.", method: "The idea as a clean geometric system.", action: "The next step as one decisive geometric shape." },
  },
  "poster-cinematic": {
    route: "gpt-image-2 / poster",
    character: "No mascot. A high-end poster: ONE strong hero subject or a symbolic visual metaphor for the topic, with large negative space.",
    styleBrief: "Premium cinematic 3D-render poster with REAL visual impact. Build from 7 elements: (1) ONE monumental sculptural HERO METAPHOR object at center that physically embodies the topic's core idea (e.g. an ascending spiral staircase for growth, an infinity loop for a closed cycle, a giant tree breaking through stone); (2) an ultra-minimal high-end architectural space — tall glass walls / pale marble / shallow reflecting water — cool palette, deep perspective; (3) soft volumetric daylight + shallow depth of field + light atmospheric haze (cinematic); (4) restrained white & pale mint-green palette with EXACTLY ONE small high-saturation accent color as the focal pop; (5) a tiny lone human figure for epic scale; (6) realistic matte-stone / glass / mirror materials (never flat); (7) generous negative space at the top reserved for the headline. Photorealistic 3D render, editorial, dreamlike, premium. 3:4.",
    styleLock: "Impact must come from the 3D hero-metaphor object + cinematic light + scale contrast — NOT from layout. One monumental subject + lots of breathing room + one bold accurate headline in the top negative space. NEVER a flat vector graphic, NEVER a knowledge card, NEVER a moodboard/collage, NEVER a PPT.",
    negativePrompt: "No cartoon mascot, no dog, no flat vector / knowledge-card / clip-art look, no cluttered collage, no PPT/dashboard, no dense paragraph, no childish illustration, no garbled text, no watermark, no multiple competing accent colors.",
    actions: { cover: "ONE monumental 3D hero-metaphor sculpture for the topic in a minimal cinematic space, tiny figure for scale, one accent color, headline space on top.", problem: "A single striking image of the reader's problem/tension.", case: "One emblematic proof image, minimal supporting marks.", method: "A clean visual of the key idea/path, sparse labels.", action: "One focal image landing the next step." },
  },
  "svarbova-poster": {
    route: "gpt-image-2 / poster (Svarbova)",
    character: "No mascot. A few CALM human figures as ORDER SYMBOLS inside a minimal public space (not protagonists) — they only serve composition and metaphor.",
    styleBrief: "Premium editorial poster — minimalist art-photography + magazine-cover feel + integrated image-text. Learn Maria Svarbova's COLOR and COMPOSITION logic (do NOT copy any specific work): calm, restrained, geometric public space. Build the scene from minimal public-space geometry — tiles, steps, doorframes, colonnades, seats, corridors, walls, water reflections — clean, generous negative space, strong order. Few figures, calm, not smiling, not performing. Color: mint green / ice blue / cream white / light wood base, with ONLY a tiny amount of tomato-red / coral as the single visual anchor; overall clean, bright, retro, restrained. Core metaphor = one concrete action or object. 3:4.",
    styleLock: "High-end feel comes from the FOUNDATIONS — space, order, negative space, color — NOT fonts/effects. The GIANT main title (tomato-red or deep teal) is part of the composition (integrated poster); subtitle one size smaller, once only. Calm, geometric, restrained.",
    negativePrompt: "No info bar, no numbering, no data icons, no barcode, no percentages, no side caption column, no decorative English, no stacked magazine small-text; no PPT feel, no cheap-tech feel, no element pile-up; no exaggerated/performing/smiling figures; no extra accent colors (anchor color one spot only); no garbled text, no watermark.",
    actions: { cover: "Minimal public space (tiles/steps/colonnade/water reflection) + a few calm figures as order symbols + one core metaphor action/object + GIANT main title integrated into the composition + one tomato-red anchor.", problem: "A calm geometric public-space image embodying the tension; restrained.", case: "One emblematic ordered scene as proof; minimal.", method: "A clean geometric layout of the key idea; sparse labels.", action: "One focal ordered image landing the next step." },
  },
  "typography-poster": {
    route: "gpt-image-2 / typography",
    character: "No mascot. The headline TEXT itself is the main visual; supporting imagery serves the words.",
    styleBrief: "Conceptual typographic poster: bold expressive headline as the focal structure, restrained palette, clean background, premium type design, the spelling must be exact. 3:4.",
    styleLock: "Headline is the hero; correct Chinese characters; few supporting elements; restrained colors. NOT default text effects, NOT random icons, NOT busy.",
    negativePrompt: "No mascot, no garbled/misspelled text, no random clip-art icons, no rainbow colors, no cluttered layout, no watermark.",
    actions: { cover: "The hook headline as a striking type composition.", problem: "A short tension phrase set as bold type.", case: "A key quote/number set as type.", method: "Step keywords as a typographic system.", action: "The next-step phrase as bold type." },
  },
  "infographic-engine": {
    route: "gpt-image-2 / infographic",
    character: "No mascot. A structured information graphic: 3-5 modules with flow, hierarchy and short labels.",
    styleBrief: "Clean infographic: 3-5 modules, clear information flow and hierarchy, color blocks + arrows + simple icons + generous whitespace, short handwritten-feel labels, highly screenshot-able/collectible. 3:4.",
    styleLock: "Limit to 3-5 modules first, then add detail; short labels only; readable at a glance. NOT long paragraphs crammed in, NOT a wall of tiny text.",
    negativePrompt: "No mascot, no dense paragraphs, no tiny unreadable text, no decorative clutter, no PPT template, no watermark, no garbled text.",
    actions: { cover: "A clean title module + one key visual anchor.", problem: "A before/after or wrong/right comparison block.", case: "A 3-card or quadrant evidence layout.", method: "A numbered step-flow with 3-5 connected nodes.", action: "A short checklist with one highlighted next step." },
  },
  "realistic-photo": {
    route: "gpt-image-2 / photography",
    character: "No mascot. Realistic documentary photography: a believable real subject/scene.",
    styleBrief: "Realistic photography: specified camera angle, lens, light source, texture and background; cinematic documentary feel; subtle believable imperfections for authenticity. 3:4.",
    styleLock: "Real, believable scene; consistent light and perspective; a few natural imperfections. NOT over-smoothed, NOT studio-ad-fake unless intended, NOT cartoon.",
    negativePrompt: "No cartoon/mascot, no over-retouched plastic skin, no extra fingers/limbs, no garbled signage text, no watermark.",
    actions: { cover: "A real, evocative photo of the topic moment.", problem: "A candid photo of the pain/situation.", case: "A real photo standing in for the proof.", method: "A real photo of the step/action being done.", action: "A real photo of the next concrete step." },
  },
  "art-illustration": {
    route: "gpt-image-2 / illustration",
    character: "No mascot required. An art illustration (watercolor / ink / soft anime) carrying mood.",
    styleBrief: "Art illustration: defined composition + subject + palette + brush/texture + mood + finish; warm, emotional, hand-made feel (watercolor, ink wash, or soft anime). 3:4.",
    styleLock: "Composition first, then style; clear focal subject; cohesive palette and mood. NOT style-only with no composition, NOT messy.",
    negativePrompt: "No PPT, no dashboard, no stock clip-art, no garbled text, no overcrowding, no watermark.",
    actions: { cover: "An evocative illustrated scene for the hook.", problem: "An illustrated moment of the feeling/problem.", case: "An illustrated vignette of the example.", method: "An illustrated simple path of the idea.", action: "An illustrated gentle next-step scene." },
  },
  "ink-poster": {
    route: "gpt-image-2 / ink",
    character: "No mascot. Ink-wash double-exposure: a portrait silhouette blended with ink texture and atmosphere.",
    styleBrief: "Ink-wash double-exposure poster: portrait silhouette + ink texture + layered atmosphere + negative space; restrained, refined, poetic, cultural. 3:4.",
    styleLock: "Restrained, high-end, readable; blend silhouette + ink + mood. NOT cheap fantasy collage, NOT scenery pile-up; minimal text.",
    negativePrompt: "No mascot, no cheap fantasy collage, no cluttered scenery, no neon, no garbled text, no watermark.",
    actions: { cover: "An ink-wash silhouette evoking the theme.", problem: "An ink composition of the inner tension.", case: "An ink vignette of the turning point.", method: "An ink flow suggesting the path.", action: "A calm ink closing image." },
  },
  "product-commerce": {
    route: "gpt-image-2 / product",
    character: "No mascot. The product is the hero: clean product shot with selling-point layout.",
    styleBrief: "Product commerce visual: defined product, selling points, material, scene, lighting and layout blocks; distinguish main product, selling-point labels and supporting props. 3:4.",
    styleLock: "Product clearly the focus; clean selling-point labels; believable material/light. NOT irrelevant props drowning the product, NOT messy.",
    negativePrompt: "No mascot, no clutter that hides the product, no garbled packaging text, no fake medical claims, no watermark.",
    actions: { cover: "Hero product shot + one key selling point.", problem: "The need/pain the product solves, shown simply.", case: "Before/after or result of using it.", method: "How to use / key features laid out cleanly.", action: "A clear 'try this' product close-up." },
  },
  "cute-3d-toy": {
    route: "gpt-image-2 / 3d",
    character: "A cute 3D collectible-toy character (blind-box/figure look); if a reference image is given, keep its face & outfit anchors.",
    styleBrief: "Premium 3D collectible toy render: soft rounded forms, big expressive eyes, blind-box aesthetic, specified material, base, packaging and soft studio lighting. 3:4.",
    styleLock: "Adorable, premium toy finish; keep identity anchors if a reference is given; packaging text minimal and accurate. NOT a generic faceless toy.",
    negativePrompt: "No flat 2D, no dense text, no garbled packaging text, no cluttered scene, no watermark.",
    actions: { cover: "The toy character posed for the topic hook.", problem: "The toy character acting out the problem.", case: "The toy character with a simple proof prop.", method: "The toy character showing the step.", action: "The toy character doing the next small action." },
  },
  "xiaohei-metaphor": {
    route: "xiaomei-scenes",
    referenceImageUrl: "http://122.51.218.154/ai-native-v2/media/persona/full_flat.jpg",
    character: "Xiaomei: the SAME recurring 2D flat vector cartoon character — a young East-Asian woman with a black low ponytail and loose front strands, round gentle face, warm soft smile, wearing her signature coral/terracotta short-sleeve T-shirt, denim shorts and white sneakers (summer outfit). Clearly cartoon, NOT a real face. Xiaomei must be the single main actor performing ONE concrete physical action with a real everyday object.",
    styleBrief: "Xiaomei real-object scene illustration: clean white studio background, 2D flat vector style with simple clean lines, ONE real everyday object + Xiaomei's one clear physical action, only a few supporting details, tasteful light color accents, simple and elegant, clear at a glance, not a poster, not a busy collage.",
    styleLock: "3:4 social image. ONE single Xiaomei as the one clear focal point performing one core physical action with one real main object — do NOT scatter multiple Xiaomei or several mini-scenes. Generous white breathing room. About 3-4 short handwritten Chinese labels and only a few supporting props; clean, readable at a glance, never cluttered. Keep Xiaomei's face/hair/outfit consistent with the reference.",
    negativePrompt: "No black stick figure, no Juju dog, no realistic human face / no photo face, no winter coat / no puffer jacket (it is summer), no PPT, no dashboard, no formal flowchart, no children's illustration, no commercial stock illustration, no dense text, no gradient decoration.",
    qa: ["Xiaomei (coral tee girl) is visible", "one concrete physical action with a real object", "white background", "no poster/dashboard/PPT"],
    actions: {
      cover: "Xiaomei performs a clear physical action on a real object representing the current topic.",
      problem: "Xiaomei faces a broken device, gap, trap, or problem mark representing the reader pain.",
      case: "Xiaomei breaks the source case into a few simple real objects instead of a table.",
      method: "Xiaomei lays out a simple path or mechanism with real objects that shows the method steps.",
      action: "Xiaomei completes one small executable action and lands the next step on a real object.",
    },
  },
  "juju-organizing": {
    route: "juju-content-illustrations",
    character: "Juju: a white bichon dog organizer with fluffy white fur, black eyes, black nose, clear eye-nose triangle, floppy ears, short legs, small-dog proportions, and an optional orange scarf or badge.",
    styleBrief: "Original JUJU visual language: white or near-white paper background, light black hand-drawn linework, low-saturation accents, visible paper-world props, generous whitespace. Chinese labels must be integrated into note cards, tabs, arrows, tools, frames, or props.",
    styleLock: "paper practice field + small working props + clear Juju action + low-saturation color shifts. One image = one cognitive action. Juju must physically perform the main action in every card.",
    negativePrompt: "No sheep, no wool ball, no generic plush toy, no pet portrait, no Xiaohei, no black stick figure, no human/girl/student/teacher protagonist, no hand-only protagonist, no slide template, no dashboard, no pasted subtitle, no dense paragraph, no watermark, no big-character poster.",
    qa: ["Juju white bichon is visible", "Juju performs the main action", "no human/girl protagonist", "paper-world props carry labels"],
    actions: {
      cover: "Juju stands in the paper practice field and pins one main note about the current topic.",
      problem: "Juju uses a magnifying glass to inspect a pain-point note.",
      case: "Juju sorts three case cards into who / what worked / result.",
      method: "Juju draws a route map with a pencil and four small stations.",
      action: "Juju stamps a checklist as ready.",
    },
  },
  "xhs-knowledge-card": {
    route: "card-xiaohongshu / baoyu-xhs-images",
    character: "No fixed mascot. Use icons, highlighted keywords, layout blocks, comparisons, flows, checklists, or hand-drawn information objects.",
    styleBrief: "Xiaohongshu high-save knowledge card: concise information, clear hierarchy, ample whitespace, highlighted keywords, useful checklist/comparison/flow when relevant.",
    styleLock: "One card one purpose. Auto-select layout from content: list, comparison, flow, quadrant, mindmap, or checklist. Mobile readability is mandatory.",
    negativePrompt: "No Xiaohei metaphor, no Juju dog protagonist, no Guizang magazine deck, no dense article paragraph, no unreadable tiny text, no meaningless stickers.",
    qa: ["one card one point", "mobile-readable labels", "clear layout type", "not a wall of text"],
    actions: {
      cover: "Sparse hook card with one strong title and one visual anchor.",
      problem: "Comparison or warning card showing before/after, wrong/right, or hidden problem.",
      case: "Dense/list or quadrant card extracting 3-5 reusable source points.",
      method: "Flow/list card turning the method into 3-5 steps.",
      action: "Checklist/ending card giving one practical next step.",
    },
  },
  "guizang-editorial": {
    route: "guizang-social-card-skill / open-design",
    character: "No cartoon mascot. Use editorial layout, evidence blocks, screenshots, titles, pull quotes, marginal notes, data rows, or grids.",
    styleBrief: "Guizang premium editorial social card with a warm ivory/beige paper background and elegant gold + soft olive accents, refined serif Chinese headlines, thin gold line icons, strict grid, strong hierarchy, one sharp visual argument — a high-end magazine / premium-consulting look that stays consistent across a brand account's posts.",
    styleLock: "Expression comes first. Content shape decides layout. Every page needs a clear focal point and visual relation to the selected topic. Do not mix Editorial and Swiss in one set.",
    negativePrompt: "No Xiaohei, no Juju dog, no Baoyu hand-drawn info card, no children's cartoon, no ordinary big-character poster, no random blobs/stickers, no nested cards, no text overflow.",
    qa: ["clear editorial focal point", "premium grid", "no cartoon mascot", "text does not overflow"],
    actions: {
      cover: "Swiss or editorial cover with restrained big title and one evidence/atmosphere block.",
      problem: "Tension page using contrast, marginalia, or separated evidence rows.",
      case: "Feature/evidence page using proof block, ledger row, matrix, or pull quote.",
      method: "Structured method page with numbered statements, KPI tower, h-bar, ledger, or magazine column.",
      action: "Closing takeaway page with refined quote/checklist/issue strip.",
    },
  },
};

// ── 视频出片档位（成本可配）────────────────────────────────────────────
// Hailuo 2.3 图生视频按「次」计费（不是按秒），喂关键帧图(image_url)。后台改价只改这里。
// 客户界面只显示 label / 大白话，不暴露模型名/服务商。
const VIDEO_CREDIT_TO_RMB = 0.036;   // 你的账号：5000 点 = 180 元 → 0.036 元/点
const VIDEO_KEYFRAME_CREDITS = 3;    // 每张关键帧图（出图）扣点
const VIDEO_DEFAULT_CLIP_SECONDS = 6; // Hailuo 单段只支持 6 或 10 秒
// 根源控成本：口播视频按"关键画面"出，不要一句一镜。归并成固定几个分镜（关键帧少→片段少→成本低）。
const VIDEO_TARGET_SHOTS = 5;        // 默认归并成 5 个关键画面（hook/问题/答案/对比/收尾）
const VIDEO_TIERS = [
  {
    id: "economy",
    label: "省钱档 · 标清",
    hint: "出片快、最省，适合走量",
    model: "hailuo/2-3-image-to-video-standard",
    resolution: "768P",
    defaultSeconds: 6,
    clipCreditsBySeconds: { 6: 30, 10: 50 }, // Hailuo 标准 768P 按次价
  },
  {
    id: "premium",
    label: "精品档 · 高清",
    hint: "更清晰，重点视频用",
    model: "hailuo/2-3-image-to-video-pro",
    resolution: "1080P",
    defaultSeconds: 6,
    clipCreditsBySeconds: { 6: 80 }, // Hailuo Pro 1080P 6s 按次价
  },
];
function videoTierById(id) {
  return VIDEO_TIERS.find((t) => t.id === id) || VIDEO_TIERS[0];
}
// 每段视频扣点（按次价表查；找不到精确秒数取最接近档）
function videoClipCredits(tier, seconds) {
  const tbl = (tier && tier.clipCreditsBySeconds) || {};
  const keys = Object.keys(tbl).map(Number).sort((a, b) => a - b);
  if (!keys.length) return 0;
  if (tbl[seconds] != null) return tbl[seconds];
  const nearest = keys.reduce((p, c) => (Math.abs(c - seconds) < Math.abs(p - seconds) ? c : p), keys[0]);
  return tbl[nearest];
}
// 估算一条视频成本：关键帧图 + N 段视频。返回 {credits, rmb}。
function estimateVideoCost(tierId, shotCount, seconds) {
  const tier = videoTierById(tierId);
  const n = Math.max(0, Number(shotCount) || 0);
  const dur = Number(seconds) || tier.defaultSeconds || VIDEO_DEFAULT_CLIP_SECONDS;
  const credits = n * VIDEO_KEYFRAME_CREDITS + n * videoClipCredits(tier, dur);
  return { credits: Math.round(credits), rmb: Math.round(credits * VIDEO_CREDIT_TO_RMB * 10) / 10 };
}

