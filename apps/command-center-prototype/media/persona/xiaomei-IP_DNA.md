# 小妹 IP DNA

> Longka 全线配图/漫画的**唯一真相**档案。格式融合自 comic-ip-onboarder;风格/质检纪律内化自小黑 2.0(`ian-xiaohei-illustrations`,**原版保留备用、不删**),外貌为 Longka 自有。
> 小妹长相**以本档案为准**;`skills/xiaomei-scenes` 与 `config.js` 的 `xiaohei-metaphor` 都引用此档案,**不再各写一份**(去冗余)。
> 图像路线:只用图像生成/编辑(Kie `gpt-image-2` 文生图 + `nano-banana-edit` 参考图);**禁 HTML/CSS/SVG/截图当最终图**。

## 基础信息
- 主角色:小妹(Xiaomei)—— 女性成长博主人设,Longka 自有 IP
- 来源:真人照片(`media/persona/xiaomei-src.jpg`)→ 风格化扁平卡通(非写实肖像)
- 血缘:小黑 2.0 → 手工改 → 小妹;onboarder 把这个"改"标准化
- 目标风格:2D 扁平矢量插画,白棚真实物件叙事,3 秒读懂,反 PPT/信息图
- 一致性参考图(出图时 `image_urls` 引用):
  - 正面全身基准:`media/persona/full_flat.jpg`
  - 表情:`media/persona/sheet/sheet_expr.jpg`
  - 姿势:`pose_point.jpg`(指向讲解)/ `pose_heart.jpg`(比心)/ `pose_facepalm.jpg`(扶额)/ `pose_sign.jpg`(举空白牌可加字)

## 身份锚点(锁死·不可漂移)
- 整体轮廓:年轻东亚女性,圆润温和
- 头发:黑色低马尾 + 额前几缕碎发
- 脸:圆润温和、温暖浅笑;**明确卡通化,非真人脸**(护隐私 + 过平台)
- 服装(默认夏季清凉装):**珊瑚橘(coral/terracotta)短袖 T 恤【招牌色·品牌锚点】+ 牛仔短裤 + 白色运动鞋**
- 季节规则:默认夏装,**不穿羽绒服/厚外套**;按内容季节可微调
- 颜色锚点:珊瑚橘
- 气质:真诚、温暖、有同理心、不端着、不说教(把自己踩过的坑讲给你听的姐姐)

## 简化规则
- 扁平 2D 矢量,干净线条 + 极简阴影;**不是 3D、不写实、不厚涂**
- 删掉:照片质感、真实光影、皮肤毛孔、碎发丝、复杂布料纹理
- 细节密度:简,留白足

## 表情与动作范围
- 表情:微笑 / 惊讶 / 思考 / 欢呼(见 `sheet_expr`)
- 动作:讲解指向 / 比心 / 扶额无奈 / 举空白牌(可加字);核心 = 对一个代表主题的真实物件做一个清晰物理动作
- 参与方式:白棚里对真实物件做动作,3 秒读懂;红色只用来标问题

## 与目标风格的适配(风格 DNA,可被下游共享)
- 背景:纯白影棚(真实物件现场)· 线条:干净扁平 · 色彩:低饱和扁平色块 + 珊瑚橘锚点
- 文字:几条手写中文短标签 · 装饰:克制留白

## 提示词胶囊(每次生图直接用)
```text
2D flat vector illustration of the SAME recurring character "Xiaomei": young East-Asian woman, black low ponytail with loose strands, round gentle face, warm smile, signature coral/terracotta short-sleeve T-shirt, denim shorts, white sneakers (summer outfit); clean flat style, clearly cartoon not a real face. Plain white studio background. [real object + her physical action]. A few short handwritten Chinese labels.
```

## 负向规则
- 不要:黑色火柴人 / 卷卷小狗 / 写实人脸·真人脸 / 羽绒服·厚外套(夏天)
- 不要:PPT / dashboard / 正式流程图 / 儿童插画 / 商业 stock 插画 / 密集文字 / 渐变装饰
- 不要:HTML / SVG / 网页截图 当最终图

## 质检清单(出图前过)
1. 同一个小妹(轮廓 / 黑低马尾 / 圆脸 / 珊瑚橘 T 恤 / 牛仔短裤 / 白鞋 全一致)
2. 卡通脸,非真人脸
3. 夏装(无羽绒服)
4. 白棚 + 一个真实物件 + 一个清晰物理动作
5. 数字 / 金额 / 事实不改(数字事实铁律)
6. 最终图来自图像生成/编辑,不是 HTML/截图

## IP 资产包(已出齐 2026-06-23)
出图时按需把这些当 `image_urls` 参考,锁死小妹形象:
- 正面全身基准:`media/persona/full_flat.jpg`
- **三视图**:`media/persona/xiaomei-three-view.png` ✅(nano-banana-edit 以 full_flat 锁一致)
- **8 张表情动作包**:`media/persona/xiaomei-expr/01-wave|02-think|03-surprise|04-cheer|05-heart|06-facepalm|07-point|08-sign.png` ✅(以三视图为参考逐张出,8 张独立、跨图一致)
- 可选母版图(质量锚点):暂借 `external/ian-xiaohei-scenes/examples/`;小妹专属母版待生成。
