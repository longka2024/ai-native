# 发布前判断（cheat-score 盲评分内化）Spec

- 日期：2026-06-17（用户确认「确认就按这个」）
- 类型：开发 spec（content-coach-loop P1 第一刀;cheat 闭环融合第 1 片）
- 依据：`docs/strategy/cheat-on-content-productization-digest.md`、`external/cheat-on-content/skills/cheat-score-blind`、`starter-rubrics/opinion-video.md`、`memory/skill-productization-governance.md`(大白话标签)、`memory/rubric-dimensions.md`(增量价值维度)

## 背景
cheat 闭环 `评分→盲预测→发布→复盘→bump` 一整条不能一口吃。先落最值钱又立刻见效的头段：**发布前判断**（= cheat-score 的 channel-B 盲评分内化）。它同时**升级**现有硬编码 8 维启发式质检(`rewrite-engine.js` scoreTitleHook 等)→ 每账号一份会进化的 rubric + 隔离盲评分。

## 1. 名字
发布前判断（cheat-score 盲评分内化）

## 2. 触发词
「发布前判断」「这篇发出去行不行」「盲评分」「教练点评」「越改越好第一刀」

## 3. 范围（可执行动作）
1. **小红书内容种子 rubric**（7 维 0-5 + 加权综合,见 §附录),改造自 cheat opinion-video 7 维;**新增「增量价值/存在感」为核心维**(北极星)。
2. **每账号一份 rubric** 存 **122 PG**(多租户隔离);新账号从种子 rubric 起,冷启动等权。
3. **后端盲评分(channel B)**:隔离 LLM 调用,**只看 草稿正文 + 该账号 rubric**(硬拒实绩/历史/评论),输出严格 JSON:各维 0-5 + confidence + 一句理由 + 综合分 + 弱项 + 「具体改哪几句」建议。模型 DeepSeek,复用 skills-runner 模式,新 skill `precheck-xhs`。
4. **工作台「发布前判断」面板**:确认文案后展示——大白话总评 + 哪几维弱 + 改句建议;**绝不露** rubric/score/盲预测/cheat/channel 黑话。
5. **判断落库不可变**:本次判断(+置信度)写 PG,immutable(DB 约束,非 bash hook),给后续「复盘校准」留钩子。

## 4. 禁止范围
- ❌ 本刀不做复盘/retro、不做 bump/rubric 进化、不做跨模型审计(留后续刀)。
- ❌ 不暴露黑话/不让客户敲命令;盲评分输入**只允许 草稿+rubric**(实绩泄漏 = 退化成自欺)。
- ❌ 不硬编码赛道(rubric 必须 per-account,私校只是第一个账号);不动前端模块拆分;不碰 43 色彩小程序;不动 humanizer(发布前判断在其之后跑)。
- ❌ 不删现有启发式打分代码前先并行验证(灰度替换,别一刀切崩)。

## 5. 验收标准
- 私校账号「确认文案」后出现「发布前判断」:总评 + 弱项 + 改句建议,全大白话;
- rubric 存 PG、per-account 隔离(换账号 rubric 不同);
- 盲评分只吃 草稿+rubric、不吃实绩(代码可证隔离);本次判断写库不可改;
- 全程零黑话。

## 附录:小红书内容种子 rubric v0（等权起步,按号进化）
综合分 = (HP + ER + SV + IV + SP + HT + CV) / 7 × 2.0(0-10);校准后按号重设权重。
- **HP 钩子**(封面+标题+开头一眼/3秒抓不抓人)
- **ER 痛点共鸣**(戳中目标读者真实痛点/自我识别,不贩卖焦虑)
- **SV 收藏价值**(有用到想收藏:清单/干货/可执行——小红书核心信号)
- **IV 增量价值/存在感**(有没有"别人没有、只有你"的料;全是网上能搜到的通用内容=低分。北极星维度)
- **SP 具体可信**(真实细节/数字/场景,不空泛——诚实>焦虑、真人感)
- **HT 人味**(大白话、不 AI 腔,对接 humanizer/朱雀)
- **CV 转化路径**(自然的下一步:关注/收藏/私信/到店,不硬广)
每维 0/3/5 锚点写进 `skills/precheck-xhs/SKILL.md`。
