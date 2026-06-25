/**
 * skills-runner.mjs — 把 ~/.claude/skills/ 里的技能变成可调用的运行时 API
 *
 * 设计原则：
 * - 每个技能的 SKILL.md 整体作为 system prompt 使用（剥离 YAML 前置元数据）
 * - 每次调用都是无状态的单轮 LLM 请求
 * - 输出格式通过追加到用户消息末尾的 outputInstruction 控制
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SKILLS_DIR = join(homedir(), '.claude', 'skills');

// ─── 技能输出规范（每个技能对应的输出格式指令）───────────────────────────
const SKILL_OUTPUT_SPECS = {
  'cover-from-content': {
    model: 'main',
    maxTokens: 1500,
    temperature: 0.7,
    outputInstruction: `
## 本次任务

通读上面的「标题 + 正文」，按 SKILL 方法做一张独立小红书封面：从正文提炼**诚实钩子**(不贩卖焦虑)，再产出一段**真实拍摄感**的封面生图提示词(无人脸、米金大字、单焦点)。

**输出格式要求：JSON，不要 Markdown 代码块**

\`\`\`
{
  "coverHookOptions": ["诚实钩子1", "诚实钩子2", "诚实钩子3"],
  "coverPrompt": "可直接喂 gpt-image-2 的封面提示词，用 coverHookOptions[0] 作主钩子，真实拍摄感、无人脸、米金大字、一个具象物、单焦点、手机端可读",
  "archetype": "大数字 | 痛点提问 | 认知差 | 清单",
  "aspectRatio": "3:4",
  "notes": "选了哪个钩子和具象物，一句话"
}
\`\`\``,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^\`\`\`json\s*/i, '').replace(/^\`\`\`\s*/i, '').replace(/\`\`\`$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { coverHookOptions: [], coverPrompt: '', notes: text.slice(0, 200) };
      }
    },
  },

  'cover-designer': {
    model: 'main',
    maxTokens: 1500,
    temperature: 0.7,
    outputInstruction: `
## 本次任务

按上面「封面规范库」给这篇出一张**独立小红书封面**（不是内容卡第一页）：从标题/钩子提取最强钩子 → 按四原型（大数字冲击 / 痛点提问 / 清单数字 / 对比）选型 → 定一个具象支撑物（保证单焦点）→ 产出可直接喂出图的**封面提示词**（超大字钩子逐字给、版式位置层级、字体气质、具象物、高对比、3 米可读、无人脸、简洁不堆砌）。**颜色与画风留给系统按所选配图风格统一，你重点给「版式结构」。**

**输出格式要求：JSON，不要 Markdown 代码块**

\`\`\`
{
  "coverHookOptions": ["超大字钩子1", "超大字钩子2", "超大字钩子3"],
  "coverPrompt": "封面版式提示词（用 coverHookOptions[0] 作主钩子，覆盖原型/具象物/大字层级/对比/留白/无人脸）",
  "archetype": "大数字冲击型 | 痛点提问型 | 清单数字型 | 对比型",
  "aspectRatio": "3:4",
  "notes": "选了哪个原型/具象物，一句话"
}
\`\`\``,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^\`\`\`json\s*/i, '').replace(/^\`\`\`\s*/i, '').replace(/\`\`\`$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { coverHookOptions: [], coverPrompt: '', archetype: '', notes: text.slice(0, 200) };
      }
    },
  },

  'seedance-prompt': {
    model: 'main',
    maxTokens: 3200,
    temperature: 0.7,
    outputInstruction: `
## 本次任务(Need Model)

把【已确认的优质文案 + 主角偏好 + 业务线 + 时长 + 画幅】变成**一条可直接出片(Kie/即梦)的多镜头故事分镜 + 干净旁白**。
- **使用场景**:运营在工作台第10步选好文案后一键生成,喂 Kie 出片 + 配音字幕。用户不懂分镜术语,要拿来即用。
- **成功标准(必须同时满足,否则算失败)**:① 有完整故事弧(不是"一个人待着+旁白念稿");② 有一个看得见的冲突/反差;③ show don't tell——道理藏在角色动作和结果里,旁白绝不直接说教;④ 开头3秒是悬念/反差钩子,不是结论;⑤ 角色和画风跨镜一致且可控(不放任默认日漫/写实)。

### 强制故事结构(治"没故事")
storyboard 必须挑一个故事骨架,在 storyStructure 标注,每一镜都推进它。**禁止"一个人躺着/坐着 + 旁白讲道理"**。可选骨架:
- **立flag→打脸→微反转**(豪言要自律 → 反手瘫倒躺平 → 只做了一件最小的事)
- **误以为→真相反转**
- **钩子悬念→冲突升级→顿悟落点**
必须有**一个看得见的冲突/反差**,写进 conflict 字段。

### show don't tell(硬禁,治"念道理=电子垃圾")
- 旁白/字幕**绝不直接说结论/建议/方法论**。**禁词(旁白里绝不许出现)**:其实、第一步、记住、建议你、你要、真正的、关键是、所以我们、应该。
- 旁白只能是:场景内的话 / 内心独白 / 自嘲吐槽 / 一句留白。道理由角色"做了什么、结果怎样"自己浮现。
- 抽象状态(摆烂/颓废)用**角色身体**演(瘫成一摊、融进沙发、被子里只露半张脸),禁字面实物比喻、禁"(象征X)"注释。

### 风格可控(治"千篇一律日漫,没特色")
- styleLock 字段**写死画风,绝不留空让模型自由发挥**。主角是「小妹」时:\`2D 扁平矢量插画(flat vector),干净线条、平涂、限定动画感,NOT anime、NOT 3D 写实,珊瑚橘短袖T恤夏装、黑色低马尾,跨镜一致\`。其它主角也要写死一个明确画风。

### 分镜要求(保留)
硬切分镜,每镜标 **景别**+**具体动作**(越细越真)+**运镜**(推/拉/摇/跟拍/环绕)+**旁白**(标音色)。**@图片N 引用**锁角色/场景一致;10秒以上**分时段**(0-3/3-6/6-10/10-15秒);**绝不编真实数据/案例**(铁律3),没有留占位。

### 输出前自检门(全部 true 才输出;任一 false 必须改写到 pass)
1. story_arc:有完整故事骨架、每镜推进(非情绪空镜+念稿)
2. visible_conflict:有一个看得见的冲突/反差
3. show_not_tell:旁白零禁词、不说教
4. hook_is_suspense:3秒钩子是悬念/反差,不是结论
5. style_locked:styleLock 明确、角色一致

**输出 JSON,不要 Markdown 代码块:**

\`\`\`
{
  "character": "主角设定(跟随主角偏好,一句话外形)",
  "styleLock": "画风锁定(写死,绝不留默认)",
  "storyStructure": "用的故事骨架(如 立flag→打脸→反转)",
  "conflict": "本条核心可见冲突/反差(一句话)",
  "storyboardPrompt": "可直接出片的完整多镜头故事分镜(硬切/景别/@图片N/运镜/具体动作/旁白音色/分时段)",
  "voiceover": "干净旁白(纯口播、无镜头描述、无禁词、不说教,可直接TTS)",
  "referenceImages": [{"slot": "图片1", "desc": "这张该是什么"}],
  "durationSec": 15,
  "aspect": "9:16",
  "hook3s": "开头3秒悬念/反差钩子",
  "selfCheck": {"story_arc": true, "visible_conflict": true, "show_not_tell": true, "hook_is_suspense": true, "style_locked": true},
  "notes": "故事一句话梗概"
}
\`\`\``,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^\`\`\`json\s*/i, '').replace(/^\`\`\`\s*/i, '').replace(/\`\`\`$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { storyboardPrompt: text.slice(0, 4000), referenceImages: [], notes: 'parse_fallback' };
      }
    },
  },

  'compliance-rewrite': {
    model: 'main',
    maxTokens: 3000,
    temperature: 0.4,
    outputInstruction: `
## 本次任务(Need Model)

把传入的草稿(标题+正文)改成**小红书合规可发版**。
- **成功标准(必须全满足)**:改完 ① 无任何联系方式 ② 无承诺夸大词(搞定/逆袭/必过/包/100%/稳过/速成) ③ 无中介/顾问招揽身份(改成**过来人/亲历者分享**) ④ 高危行业(留学/私校/医美等)转中性经验分享 ⑤ **真实信息价值保留、绝不编造**(铁律3) ⑥ 这篇的观点和人设声音不丢。

按 SKILL.md 的改写铁律执行,**身份转换最关键:招揽/顾问口吻 → 过来人/家长亲历口吻**(同一份信息换个立场就从"卖服务"变"分享经历")。

**输出 JSON,不要 Markdown 代码块:**

\`\`\`
{
  "riskBefore": "high|medium|low(改前风险判断)",
  "title": "改后标题(合规)",
  "body": "改后正文(合规,保留真实价值,过来人口吻)",
  "changes": [{"from": "原招揽/承诺句", "to": "改后过来人句", "why": "删联系方式/去承诺/身份转换"}],
  "removedContacts": ["删掉的联系方式(若有)"],
  "residualRisk": "改完仍需注意的(如行业本身敏感→导流只走平台官方工具)",
  "compliant": true
}
\`\`\``,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^\`\`\`json\s*/i, '').replace(/^\`\`\`\s*/i, '').replace(/\`\`\`$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { compliant: false, body: text.slice(0, 3000), changes: [], residualRisk: 'parse_fallback' };
      }
    },
  },

  'xiaomei-scenes': {
    model: 'main',
    maxTokens: 3500,
    temperature: 0.7,
    outputInstruction: `
## 本次任务

把用户给的【本篇优质文案/观点/步骤 + 业务线 + 模式(配图 scenes / 漫画 comic) + 平台画幅】,按角色圣经和方法铁律,转译成一组「小妹 + 真实物件」配图,或一条 2-4 格小妹漫画。

- **角色圣经(锁死)**:每张都是同一个小妹 —— 2D 扁平矢量插画、黑色低马尾+碎发、圆脸暖笑、招牌珊瑚橘短袖T恤+牛仔短裤+白鞋(夏季清凉装,不穿羽绒服)、明确卡通化非真人脸。
- **方法铁律**:只一个核心物理动作 + 只一个真实主物件;≤4 个手写感中文短标签(优先3);白底近白棚;3 秒读懂;抽象状态用小妹身体演不用字面实物比喻;禁截图/UI/Logo/PPT信息图/箭头流程/商业海报/大段文字/元素清单化;事实锚定不编(没有的用概括标签)。
- **配图模式**:3-6 张单张,每张一个物理冲突。**漫画模式**:2-4 格连续,同一个小妹用连续动作讲钩子→冲突→转折/解法的小故事,第1格=3秒钩子,每格一句短对白。
- **imagePrompt 用英文**,固定包含这段角色描述 + 白底 + 真实物件 + 小妹物理动作 + 中文短标签 + 负面约束:\`2D flat vector illustration of the SAME recurring character "Xiaomei": young East-Asian woman, black low ponytail with loose strands, round gentle face, warm smile, signature coral/terracotta short-sleeve T-shirt, denim shorts, white sneakers (summer outfit); clean flat style, clearly cartoon not a real face. Plain white studio background. [real object + her physical action]. A few short handwritten Chinese labels. No UI, no logo, no PPT, no heavy text.\`

**输出 JSON,不要 Markdown 代码块:**

\`\`\`
{
  "mode": "scenes",
  "aspect": "3:4",
  "shots": [
    {
      "title": "这张/这格主题",
      "resonance": "读者共鸣点(谁·被什么拉扯)",
      "action": "小妹核心物理动作",
      "mainObject": "真实主物件",
      "labels": ["短标签1", "短标签2"],
      "caption": "漫画模式这格的对白/旁白(配图模式留空)",
      "imagePrompt": "可直接出图的完整英文提示词"
    }
  ],
  "notes": "一句话说明这组怎么连起来"
}
\`\`\``,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^\`\`\`json\s*/i, '').replace(/^\`\`\`\s*/i, '').replace(/\`\`\`$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { mode: 'scenes', shots: [], notes: 'parse_fallback', raw: text.slice(0, 2000) };
      }
    },
  },

  'humanizer-zh': {
    model: 'main',          // 结构层改写需要强模型，fast 模型只会做词汇替换
    maxTokens: 4000,
    temperature: 0.8,       // 提高温度，增加句长/结构方差
    outputInstruction: `
## 本次任务

对上面提供的文本执行去 AI 化处理。除上述词汇层规则外，必须执行以下**结构层手术**（AI 检测器识别的是统计特征，只换词无效）：

1. **句长方差拉到最大**：3-6 字的超短句必须独立成段（如"行不了。"），紧跟 40 字以上、用逗号串联的流水长句。禁止全文句长均匀。
2. **段落长短剧烈交错**：一句话的段落和五六行的段落混排。禁止每段长度相近、每段一个论点的标准结构。
3. **加入"没必要但真实"的细节颗粒度**：具体价格、具体时间、具体人说的原话（如"她原话是'咬咬牙也行吧'"）。宁可琐碎，不可概括。
4. **列表故意不列完**：连续列举时用"然后是……"中断，禁止整齐的编号清单和排比句。
5. **删光升华和金句**：删除所有"关键不是…而是…"、"X 是长跑不是短跑"类总结句。结尾可以戛然而止或留下次再写的钩子，禁止点题段。
6. **允许插叙和跑题**：用破折号插入临时想起的内容（如"——这个她之前压根没想到——"），保留思维跳跃感。
7. **保留不完美**：可以有自问自答（"不去？不去孩子融不进去"）、未说完的话、口语化重复。完美的逻辑链条是 AI 的最大特征。

**改写后字数遵循下方"平台规则"；原文的事实、数字、人物关系一律保留。**
**只返回改写后的纯文本内容，段落之间用真实的空行分隔（直接换行，禁止输出 \\n 这样的转义字符），不要加任何解释、标题或格式标记。**`,
    parseResponse: (text) => ({
      // 模型偶尔会输出字面 \n 转义符而非真实换行，统一清洗
      text: text.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(),
    }),
  },

  'dbs-ai-check': {
    model: 'main',
    maxTokens: 2000,
    temperature: 0.3,
    outputInstruction: `
## 本次任务

对上面提供的文案执行 AI 写作特征检测。

**输出格式要求：JSON，不要 Markdown 代码块**

\`\`\`
{
  "hitCount": <命中特征数量>,
  "items": [
    {
      "featureId": <特征编号>,
      "featureName": "<特征名>",
      "quote": "<原文引用>",
      "issue": "<问题说明>"
    }
  ],
  "genreGuess": "<体裁判断>",
  "summary": "<总结：一句话>"
}
\`\`\``,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { hitCount: 0, items: [], summary: text.slice(0, 200) };
      }
    },
  },

  'dbs-xhs-title': {
    model: 'main',
    maxTokens: 1200,
    temperature: 0.7,
    outputInstruction: `
## 本次任务

根据提供的话题和行业信息，从公式库中匹配最合适的公式，生成 5 个候选标题。

**输出格式要求：JSON，不要 Markdown 代码块**

\`\`\`
{
  "choices": [
    {
      "formulaId": "<公式编号，如 #12>",
      "formulaName": "<公式名称>",
      "title": "<生成的标题>",
      "reason": "<为什么选这个公式>"
    }
  ]
}
\`\`\``,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { choices: [] };
      }
    },
  },

  'precheck-xhs': {
    model: 'main',          // 盲评分要稳要准，用强模型
    maxTokens: 2000,
    temperature: 0.3,       // 低温，打分尽量稳定可复盘
    outputInstruction: `
## 本次任务

对上面的「标题 + 正文草稿」做发布前判断：按 SKILL 里的小红书 7 维 rubric 各打 0-5 分（只看草稿本身，忽略任何实绩/历史数字），给综合分、最弱 2-3 维、和「具体改哪几句」的建议。

**输出格式要求：JSON，不要 Markdown 代码块**（schema 见 SKILL.md Phase 输出段）`,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { dimensions: {}, composite: 0, verdict: text.slice(0, 200), weakest: [], fixes: [], honest_flags: [] };
      }
    },
  },

  'video-script-restructure': {
    model: 'main',           // 内容重构需要强模型
    maxTokens: 3500,
    temperature: 0.7,
    outputInstruction: `
## 本次任务

把上面的「原帖 / 选题」按 SKILL 里的**爆款结构**(黄金3秒钩子 → 痛点放大 → 解决方案 → 行动指令)重构成口播脚本骨架，并切成分镜。平台/行业见上方；数字、品牌名、成分一律照搬不改；口语化、好念；一镜一个重点；点睛画面要具体可执行。

**只输出 JSON(用 SKILL.md 里的 schema)，不要 Markdown 代码块、不要任何解释文字。**`,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { shots: [], notes: text.slice(0, 300) };
      }
    },
  },

  'benchmark-deconstruct': {
    model: 'main',           // 拆解要准
    maxTokens: 2000,
    temperature: 0.4,
    outputInstruction: `
## 本次任务

把上面的「对标作品(稿子 + 数据 + 印象)」按 SKILL 拆透:钩子类型/原句、≤3 段主体结构、双声道、金句、可复刻写法、7 维定性信号(强/中/弱 + 引原文理由)、选题方向。**只定性不给权重。**

**只输出 JSON(用 SKILL.md 的 schema),不要 Markdown 代码块、不要解释。**`,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { hookType: '', structure: [], rubricSignals: {}, patterns: [], notes: text.slice(0, 300) };
      }
    },
  },

  'comment-miner': {
    model: 'main',           // 提炼真实料要准，低温防脑补
    maxTokens: 2000,
    temperature: 0.3,
    outputInstruction: `
## 本次任务

把上面的「精选评论」按 SKILL 提炼成真实料:真实痛点(带复现度)、真实欲望、异议(最珍贵别漏)、可直接进文案的真人金句(原样摘录)、情绪信号、选题缺口(反复问但没答的)。

**铁律:所有内容必须来自给定评论原话,严禁脑补/编造/泛化;评论里没有的字段留空数组,宁缺毋滥。**

**只输出 JSON(用 SKILL.md 的 schema),不要 Markdown 代码块、不要解释。**`,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        const obj = JSON.parse(clean);
        return {
          painPoints: Array.isArray(obj.painPoints) ? obj.painPoints : [],
          desires: Array.isArray(obj.desires) ? obj.desires : [],
          objections: Array.isArray(obj.objections) ? obj.objections : [],
          goldenQuotes: Array.isArray(obj.goldenQuotes) ? obj.goldenQuotes : [],
          emotions: Array.isArray(obj.emotions) ? obj.emotions : [],
          topicGaps: Array.isArray(obj.topicGaps) ? obj.topicGaps : [],
        };
      } catch {
        return { painPoints: [], desires: [], objections: [], goldenQuotes: [], emotions: [], topicGaps: [], notes: text.slice(0, 300) };
      }
    },
  },

  'acquisition-video-script': {
    model: 'main',           // 获客脚本要会写、要会用真实料
    maxTokens: 3000,
    temperature: 0.7,
    outputInstruction: `
## 本次任务

按 SKILL 的「电子传单/成交型」三步框架,结合上面给的真实料,产出一条获客短视频脚本:开篇前3秒戳最痛的真实痛点锁住精准人群、中间高密度堆卖点(回答为什么选你产品/服务/同行多偏偏选你/不可替代优势)、结尾给立刻找你的钩子;带上行业关键词;倒推分镜;真人原话可一字不改嵌入。

**只输出 JSON(用 SKILL.md 的 schema),不要 Markdown 代码块、不要解释。**`,
    parseResponse: (text) => {
      try {
        const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        return JSON.parse(clean);
      } catch {
        return { hook: '', sellingPoints: {}, body: text.slice(0, 400), cta: '', shots: [], notes: text.slice(0, 200) };
      }
    },
  },
};

// ─── 读取 SKILL.md，剥离 YAML 前置元数据 ────────────────────────────────
async function loadSkillPrompt(skillName) {
  // 技能目录名可能有 @ 后缀（符号链接），尝试精确匹配或带 @ 的路径
  const candidates = [
    join(SKILLS_DIR, skillName, 'SKILL.md'),
    join(SKILLS_DIR, skillName + '@', 'SKILL.md'),
  ];
  for (const p of candidates) {
    const content = await readFile(p, 'utf8').catch(() => null);
    if (content) {
      // 剥离 YAML frontmatter（--- ... ---），兼容 CRLF 和 LF 行尾
      return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
    }
  }
  throw new Error(`技能 "${skillName}" 的 SKILL.md 未找到（搜索路径：${candidates.join(', ')}）`);
}

// ─── 平台字数/调性规则（humanizer-zh 用）────────────────────────────────
// 依据行业公开结论（2026-06 调研）：小红书正文硬上限 1000 字，运营实操建议 500 字内
// 短篇保证读完率、干货向可放宽到 800 换收藏；公众号无硬性字数上限，800-2000 字阅读
// 体验最佳，核心要求是言之有物。后续应由爆款指纹库的数据回流取代这份静态规则。
const PLATFORM_RULES = {
  xhs: `## 平台规则（小红书）
- 平台硬上限 1000 字。叙事/共鸣向正文以 400-600 字为宜，保证读完率；干货清单向最多 800 字，篇幅换收藏。
- 不足 350 字时通过补充细节颗粒度扩写；接近上限时删次要内容，禁止为凑字注水。
- 互动钩子放在结尾一句话内完成，不要连环三问。`,
  wechat: `## 平台规则（公众号）
- 无硬性字数上限，800-2000 字阅读体验最佳；深度长文可以更长，但每一段都必须言之有物：有新信息、新细节或新判断才保留，凑字数的段落直接删。
- 允许完整叙事和多个案例展开，但禁止注水式铺垫和重复观点。`,
};

function buildPlatformRules(platform) {
  return PLATFORM_RULES[platform] || PLATFORM_RULES.xhs;
}

// ─── 个人语料注入（humanizer-zh 用）─────────────────────────────────────
// 真人手写样本改变的是 token 分布（用词搭配/口头禅/标点癖好），这是结构规则
// 覆盖不到的检测维度。语料文件按平台存放：data/voice-corpus/<platform>.md
// 文件不存在时静默跳过，不影响管线。
const VOICE_CORPUS_DIR = join(process.cwd(), 'data', 'voice-corpus');

async function loadVoiceCorpus(platform) {
  const candidates = [
    join(VOICE_CORPUS_DIR, `${platform || 'xhs'}.md`),
    join(VOICE_CORPUS_DIR, 'default.md'),
  ];
  for (const p of candidates) {
    const content = await readFile(p, 'utf8').catch(() => null);
    if (content && content.trim()) return content.trim().slice(0, 6000);
  }
  return '';
}

function buildVoiceCorpusSection(corpus) {
  if (!corpus) return '';
  return `## 真人语料样本（最高优先级）

以下是这个账号作者亲手写的真实文案。改写时必须模仿 TA 的用词习惯、口头禅、标点癖好和说话节奏——遇到规则与样本风格冲突时，以样本为准。禁止抄袭样本内容本身，只学语感。

${corpus}`;
}

// ─── 构造用户消息 ────────────────────────────────────────────────────────
async function buildUserMessage(skillName, content, vars = {}) {
  const spec = SKILL_OUTPUT_SPECS[skillName];
  if (!spec) throw new Error(`未注册的技能：${skillName}`);

  // 通用部分：用户内容
  let msg = '';

  if (skillName === 'dbs-xhs-title') {
    // 标题技能需要话题+行业
    msg = `话题：${vars.topic || content || '（未提供）'}`;
    if (vars.industry) msg += `\n行业：${vars.industry}`;
    if (vars.keywords) msg += `\n关键词：${vars.keywords}`;
    if (vars.targetLength) msg += `\n标题字数要求：${vars.targetLength}`;
  } else {
    msg = `---\n以下是需要处理的文本内容：\n\n${content}`;
    if (skillName === 'humanizer-zh') {
      const corpusSection = buildVoiceCorpusSection(await loadVoiceCorpus(vars.platform));
      if (corpusSection) msg += '\n\n' + corpusSection;
      msg += '\n\n' + buildPlatformRules(vars.platform);
    }
    if (skillName === 'video-script-restructure') {
      if (vars.platform) msg += `\n\n目标平台：${vars.platform}`;
      if (vars.industry) msg += `\n行业：${vars.industry}`;
    }
  }

  msg += '\n\n' + spec.outputInstruction;
  return msg;
}

// ─── 执行技能（核心调用） ────────────────────────────────────────────────
async function runSkill(skillName, content, vars = {}, cfg = {}) {
  const spec = SKILL_OUTPUT_SPECS[skillName];
  if (!spec) {
    return { ok: false, error: 'unknown_skill', message: `未注册的技能：${skillName}` };
  }

  if (!cfg.apiKey) {
    return { ok: false, error: 'missing_ai_key', message: '缺少 AI API Key' };
  }

  let systemPrompt;
  try {
    systemPrompt = await loadSkillPrompt(skillName);
  } catch (err) {
    return { ok: false, error: 'skill_load_failed', message: err.message };
  }

  // 选择模型：fast = titleModel/flash，main = draftModel
  const model = spec.model === 'fast'
    ? (cfg.titleModel || cfg.draftModel || cfg.model)
    : (cfg.draftModel || cfg.model);

  const userMessage = await buildUserMessage(skillName, content, vars);

  const controller = new AbortController();
  const timeoutMs = vars.timeoutMs || 30000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: spec.maxTokens,
      temperature: spec.temperature,
    };
    if (cfg.provider === 'deepseek') {
      requestBody.thinking = { type: 'disabled' };
    }

    const response = await fetch(
      `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${cfg.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      },
    );

    const raw = await response.text();
    if (!response.ok) {
      return { ok: false, error: 'api_error', status: response.status, message: raw.slice(0, 300) };
    }

    const data = JSON.parse(raw);
    const rawText = data.choices?.[0]?.message?.content || '';
    const result = spec.parseResponse(rawText);

    return { ok: true, skill: skillName, model, result, rawText };
  } catch (err) {
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'timeout' : 'request_error',
      message: err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── 列出已注册的技能 ────────────────────────────────────────────────────
function listSkills() {
  return Object.entries(SKILL_OUTPUT_SPECS).map(([name, spec]) => ({
    name,
    model: spec.model,
    maxTokens: spec.maxTokens,
  }));
}

export { runSkill, loadSkillPrompt, listSkills };
