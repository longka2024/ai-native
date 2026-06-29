// image-studio/image-styles.js
// Longka 出图工作台 —— 统一风格注册表(P1 骨架数据)
// 设计:按"用途(IMAGE_USES)"进 → 每个风格标 { 引擎 engine · 是否花钱 paid · 适配用途 uses · 比例 · 后端 route }
// 两引擎:html=归藏/frame-render(Playwright渲染·免费·字不糊·可放真实截图) | ai=Kie/gpt-image(有冲击·花钱·字可能糊·先报价)
// 内化来源:归藏(guizang-social-card-skill) / 宝玉全家桶 / 小黑·卷卷 / punk(已内化 image-studio/cover-styles/punk) / gpt-image现13(config.js)
// 纪律:UI 不暴露 skill名/服务商;花钱动作先报价等点头;第三方引流/水印一律不带。

// ── 8 类运营用途 ──
const IMAGE_USES = [
  { id: "xhs-cover",       name: "小红书封面",     aspect: "3:4",      note: "竖版·钩子大字" },
  { id: "xhs-inner",       name: "小红书内图/轮播", aspect: "3:4",      note: "多页·一页一点" },
  { id: "wechat-cover",    name: "公众号封面",     aspect: "21:9 + 1:1", note: "长图+方图配套对" },
  { id: "wechat-inner",    name: "公众号内图",     aspect: "16:9",     note: "正文配图/信息图" },
  { id: "douyin-cover",    name: "抖音视频封面",   aspect: "9:16",     note: "竖版强钩子" },
  { id: "shipinhao-cover", name: "视频号封面",     aspect: "16:9 / 竖", note: "横或竖" },
  { id: "poster",          name: "海报",          aspect: "选",       note: "强主视觉" },
  { id: "ppt",             name: "PPT 图",        aspect: "16:9",     note: "演示页" },
];

// ── 风格库(engine=html 免费 / ai 花钱)──
const IMAGE_STYLES = [
  // ════════ HTML 渲染(免费·确定性·字不糊·可放真实截图)════════
  {
    id: "guizang-editorial", name: "杂志墨水卡", engine: "html", paid: false, src: "guizang",
    uses: ["xhs-cover", "xhs-inner", "wechat-cover", "wechat-inner"],
    aspects: ["3:4", "21:9", "1:1", "16:9"], route: "guizang-social-card-skill:editorial",
    desc: "杂志×电子墨水,6配色(墨色/靛青瓷/林墨/牛皮纸/沙丘/午夜墨),serif版式+纸纹,深度知识/方法论/人物;专做公众号 21:9+1:1 封面对",
  },
  {
    id: "guizang-swiss", name: "瑞士数据卡", engine: "html", paid: false, src: "guizang",
    uses: ["xhs-cover", "xhs-inner", "wechat-cover", "wechat-inner", "ppt"],
    aspects: ["3:4", "21:9", "1:1", "16:9"], route: "guizang-social-card-skill:swiss",
    desc: "瑞士国际风,4强调色(IKB蓝/柠黄/柠绿/安全橙),网格+KPI塔+横条图,商业/数据/系统感,字大留白",
  },
  {
    id: "longka-magazine", name: "极简杂志海报", engine: "html", paid: false, src: "longka",
    uses: ["xhs-cover", "wechat-cover", "poster"], aspects: ["3:4", "16:9", "1:1"],
    route: "frame-render:magazine-cover", desc: "无字底图 + 得意黑红字叠层(Svarbova风),图文一体,本地渲染≈¥0.03",
  },

  // ════════ AI 出图 · punk 导演级封面(已内化 cover-styles/punk)════════
  { id: "punk-biz-magazine", name: "商业杂志头版", engine: "ai", paid: true, src: "punk",
    uses: ["poster", "wechat-cover", "douyin-cover", "xhs-cover"], aspects: ["3:4", "16:9", "2.35:1", "1:1"],
    route: "punk/templates/business-magazine-front-page.md",
    desc: "Bloomberg/McKinsey气质,三层标题+商业隐喻自动选,高饱和色块,AI/创业/投资/趋势" },
  { id: "punk-consulting", name: "咨询报告视觉", engine: "ai", paid: true, src: "punk",
    uses: ["poster", "wechat-cover", "ppt", "xhs-cover"], aspects: ["3:4", "16:9"],
    route: "punk/templates/consulting-report-visual.md", desc: "麦肯锡式结构,商业策略/方法论/产品分析/矩阵流程" },
  { id: "punk-giant-title", name: "巨型透视中文标题", engine: "ai", paid: true, src: "punk",
    uses: ["xhs-cover", "douyin-cover", "shipinhao-cover", "poster"], aspects: ["3:4", "9:16", "16:9"],
    route: "punk/templates/giant-perspective-chinese-title.md", desc: "中文标题主导·强冲击,通用爆款社媒封面" },
  { id: "punk-bw-concept", name: "黑白极简概念", engine: "ai", paid: true, src: "punk",
    uses: ["xhs-cover", "poster", "wechat-cover"], aspects: ["3:4", "16:9", "1:1"],
    route: "punk/templates/black-white-minimal-concept.md", desc: "抽象观点/战略/哲学/批判性主题" },
  { id: "punk-semantic", name: "语义转译极简", engine: "ai", paid: true, src: "punk",
    uses: ["xhs-cover", "poster"], aspects: ["3:4", "1:1"],
    route: "punk/templates/semantic-minimal-translation.md", desc: "单词/短句/口号/概念转译" },
  { id: "punk-collage", name: "复古手撕拼贴", engine: "ai", paid: true, src: "punk",
    uses: ["xhs-cover", "poster", "douyin-cover"], aspects: ["3:4", "9:16"],
    route: "punk/templates/retro-torn-collage.md", desc: "社交传播/文化议题/街头感/复古杂志" },
  { id: "punk-block-world", name: "方块世界", engine: "ai", paid: true, src: "punk",
    uses: ["xhs-cover", "poster", "wechat-cover"], aspects: ["3:4", "16:9"],
    route: "punk/templates/block-world.md", desc: "教程/工具/系统搭建/游戏化" },
  { id: "punk-brick-world", name: "积木世界", engine: "ai", paid: true, src: "punk",
    uses: ["xhs-cover", "poster", "wechat-cover"], aspects: ["3:4", "16:9"],
    route: "punk/templates/brick-world.md", desc: "搭建/团队/计划/教育/亲子/系统隐喻" },
  { id: "punk-research-journal", name: "科研期刊概念", engine: "ai", paid: true, src: "punk",
    uses: ["poster", "wechat-cover", "ppt"], aspects: ["3:4", "16:9"],
    route: "punk/templates/research-journal-concept.md", desc: "科研/医学/材料/生物/机制类" },
  { id: "punk-retro-gradient", name: "复古弥散渐变", engine: "ai", paid: true, src: "punk",
    uses: ["xhs-cover", "poster"], aspects: ["3:4", "1:1"],
    route: "punk/templates/retro-diffuse-gradient.md", desc: "艺术/设计/品牌/情绪化/杂志封面" },
  // (极简公共空间摄影 与现有 svarbova-poster 重叠,不重复纳入)
  { id: "punk-avant-geometry", name: "黑白灰先锋几何", engine: "ai", paid: true, src: "punk",
    uses: ["xhs-cover", "poster"], aspects: ["3:4", "16:9", "1:1"],
    route: "punk/templates/black-white-gray-avant-geometry.md", desc: "实验性/现代主义/几何构成/AI自媒体" },

  // ════════ AI 出图 · 宝玉全家桶(prompt→Kie/gpt-image)════════
  { id: "baoyu-infographic", name: "信息图(20版式×17风格)", engine: "ai", paid: true, src: "baoyu",
    uses: ["xhs-inner", "wechat-inner", "poster", "ppt"], aspects: ["16:9", "9:16", "1:1"],
    route: "baoyu-infographic", desc: "20结构版式×17视觉风格(含手绘纸艺/水彩/粉笔/积木等)自由组合,数据/流程/对比/层级" },
  { id: "baoyu-cover", name: "文章封面(5维组合)", engine: "ai", paid: true, src: "baoyu",
    uses: ["xhs-cover", "wechat-cover", "douyin-cover", "poster"], aspects: ["16:9", "2.35:1", "3:4", "1:1"],
    route: "baoyu-cover-image", desc: "类型6×配色9×渲染6×文字×情绪×字体 组合,含 hand-drawn/painterly/chalk 渲染" },
  { id: "baoyu-article-illustrator", name: "文章配图(类型×风格·含手绘)", engine: "ai", paid: true, src: "baoyu",
    uses: ["wechat-inner", "xhs-inner"], aspects: ["16:9", "4:3", "1:1"],
    route: "baoyu-article-illustrator", desc: "6类型(信息图/场景/流程/对比/框架/时间线)×风格(hand-drawn/minimal-flat/sci-fi/editorial/scene)" },
  { id: "baoyu-slide-deck", name: "演示页/PPT图", engine: "ai", paid: true, src: "baoyu",
    uses: ["ppt", "wechat-inner"], aspects: ["16:9"], route: "baoyu-slide-deck", desc: "成套演示页" },

  // ════════ AI 出图 · 手绘系(longka 已接)════════
  { id: "xiaohei-metaphor", name: "小黑怪诞手绘配图", engine: "ai", paid: true, src: "longka",
    uses: ["wechat-inner", "xhs-inner", "xhs-cover"], aspects: ["3:4", "16:9"],
    route: "ian-xiaohei-illustrations", desc: "小黑IP·纯白手绘+红橙蓝批注,观点/隐喻/正文配图,清爽天马行空" },
  { id: "juju-organizing", name: "卷卷整理插画", engine: "ai", paid: true, src: "longka",
    uses: ["xhs-inner", "wechat-inner"], aspects: ["3:4", "16:9"],
    route: "juju-content-illustrations", desc: "白底纸面手绘整理现场,复杂方法/复盘/教程" },

  // ════════ AI 出图 · gpt-image 现有(config.js,精选保留)════════
  { id: "poster-cinematic", name: "高级海报", engine: "ai", paid: true, src: "gpt-image",
    uses: ["poster", "xhs-cover", "wechat-cover"], aspects: ["3:4", "16:9"], route: "gpt-image-2:poster",
    desc: "严肃高端话题:大标题+一个主视觉+大留白,电影感3D" },
  { id: "typography-poster", name: "字体海报", engine: "ai", paid: true, src: "gpt-image",
    uses: ["poster", "xhs-cover"], aspects: ["3:4", "1:1"], route: "gpt-image-2:typography",
    desc: "强观点/金句/态度,标题文字即主视觉" },
  { id: "realistic-photo", name: "写实摄影", engine: "ai", paid: true, src: "gpt-image",
    uses: ["xhs-cover", "poster", "douyin-cover"], aspects: ["3:4", "16:9", "9:16"], route: "gpt-image-2:photography",
    desc: "人像/商品/生活纪实,真实镜头光线" },
  { id: "art-illustration", name: "艺术插画", engine: "ai", paid: true, src: "gpt-image",
    uses: ["xhs-cover", "xhs-inner"], aspects: ["3:4", "1:1"], route: "gpt-image-2:illustration",
    desc: "治愈/情感/故事,水彩/水墨/动漫" },
  { id: "ink-poster", name: "水墨意境", engine: "ai", paid: true, src: "gpt-image",
    uses: ["poster", "xhs-cover"], aspects: ["3:4", "16:9"], route: "gpt-image-2:ink",
    desc: "文化/诗意/深度,水墨双重曝光+留白" },
  { id: "product-commerce", name: "商品种草", engine: "ai", paid: true, src: "gpt-image",
    uses: ["xhs-cover", "xhs-inner", "poster"], aspects: ["3:4", "1:1"], route: "gpt-image-2:product",
    desc: "美容/好物/电商,商品主图+卖点+材质光线" },
  { id: "cute-3d-toy", name: "3D 潮玩", engine: "ai", paid: true, src: "gpt-image",
    uses: ["xhs-cover", "xhs-inner"], aspects: ["3:4", "1:1"], route: "gpt-image-2:3d",
    desc: "萌系/IP/反差可爱,盲盒公仔质感" },

  // 备注:config.js 原 13 中"宝玉知识卡/归藏杂志风/svarbova/小妹/卷卷"已被上面更准确的条目取代或归并;
  //       infographic-engine 归并入 baoyu-infographic;guizang-editorial(config)升级为本表 guizang 双体系。
];

// 前端 classic script:IMAGE_USES / IMAGE_STYLES 为全局(与 config.js 的 visualStyles 一致)。
// Node 侧(server.mjs)需要时可改 import;此处保持与现有前端加载方式一致。
if (typeof module !== "undefined" && module.exports) module.exports = { IMAGE_USES, IMAGE_STYLES };
