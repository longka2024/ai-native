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
