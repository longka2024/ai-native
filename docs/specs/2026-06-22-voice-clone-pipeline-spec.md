# Spec — 数字人语音克隆管线(自建 IndexTTS2) 2026-06-22

## 1. 背景与目标
- 投资人当面否了数字人的语音(MiniMax 克隆"做作、刻意咬字、不像本人")。
- 目标:克隆出**像小妹本人自然聊天**的声音(有音色还原 + 声调起伏 + 换气 + 不均匀节奏),喂数字人(OmniHuman / 终局 ComfyUI)。
- 原则:**自建、零按次**(对齐"自建降本"北极星);质量第一(投资人就看"像不像真人")。

## 2. 引擎选型
| 引擎 | 结论 | 理由 |
|---|---|---|
| **IndexTTS2**(B站,本机 `G:\index-tts_v2.5`) | ✅ **选定** | 本地免费、已打通、实测比 MiniMax 自然;带情感/采样控制 |
| VoxCPM2(OpenBMB) | 备选(暂搁) | 用户称更好+多人对话+方言,但**本地无集成包**,要搭环境 |
| LongCat-AudioDiT(美团,HF) | 备选 | 相似度 SOTA,值得比天花板;需自建 |
| MiniMax | ❌ 弃 | 做作刻意咬字,质量不够(普通旁白可兜底,克隆别用) |

## 3. 接口(本地 IndexTTS2 FastAPI)
- 地址:`http://127.0.0.1:8849`;`GET /test` 测连通;`POST /tts`。
- body(`TTSRequest`):`{audio_path(参考音本机路径), output_path(输出本机路径), text, verbose, setings(dict→**kwargs 传给 infer())}`。
- `infer()` 关键参:`spk_audio_prompt, text, output_path, emo_audio_prompt, emo_alpha(默认1.0), emo_vector, use_emo_text, emo_text, use_random, interval_silence(默认200)`;采样默认 `do_sample=True, top_p=0.8, top_k=30, temperature=0.8, repetition_penalty=10.0, num_beams=3`。
- **Claude 命令行跑在用户本机 → 能直接 requests 调 localhost 驱动**;参考音本机:`E:\shipany-template-two\public\voices\GMbR1IqUyO.wav`(待换新录)。

## 4. 调好的配方(逐条对应一个真人特征)
| 目标 | 做法 | 注意 |
|---|---|---|
| **保身份(像本人)** | 默认克隆;**绝不开 `use_emo_text` / 高 emo_alpha** | 实测会丢音色,变不像本人 |
| **声调起伏(治机械平调)** | `emo_audio_prompt = 她本人声`(学她自己的语调)+ `temperature 0.85~0.92` | **别把 temperature 降到 0.6** → 会压成单调机械音 |
| **去朗读腔(像聊天)** | **文案口语化**:加"其实吧/咱/呢/我跟你说"+短停顿,去书面长句 | 朗读感主要来自书面稿,不是参数 |
| **治"空灵/飘"** | 暖声压实 EQ(加低中频身体感、削高频空气感、压缩"站住") | EQ 不动音色,身份安全 |
| **语速** | `atempo 1.05~1.07`(变速不变调) | |
| **不均匀顿挫 + 换气** | 句间插**不等长停顿**;治本靠参考音(后期硬插换气脆弱、易全挤到结尾) | 见 §6 |

**暖声 EQ 链(ffmpeg):**
`highpass=f=75,equalizer=f=210:t=q:w=1.2:g=2.8,equalizer=f=3500:t=q:w=2:g=-1.5,equalizer=f=9000:t=h:g=-3.5,acompressor=threshold=-20dB:ratio=3.5:attack=8:release=180:makeup=2,atempo=1.06,alimiter=limit=0.95`

## 5. 踩过的坑(别再犯)
1. MiniMax 克隆做作 → 弃。
2. `use_emo_text` / 高 emo_alpha 加情感 → **丢说话人身份**(不像本人)。身份第一。
3. `temperature` 降到 0.6 求"平和" → **变单调机械音**。平和≠压平;真人要有起伏。
4. 后期检测停顿插换气 → 停顿点常**全挤到结尾**(脆弱),造不出自然不均匀节奏。
5. "空灵感"根因 = **参考音有混响 / 偏平 / 朗读腔**。

## 6. 根本杠杆:参考音质量(天花板)
零样本克隆的起伏/换气/节奏几乎全从参考音继承。**最大提升 = 小妹重录一段自然聊天原声**(20~30s,像唠嗑、有快慢/换气/起伏;安静不空旷房间、贴麦15-30cm、关空调音乐、别降噪美颜、别念稿)。参考音自然 → 克隆才自然,胜过调一百个参数。

## 7. 成本与部署
- **实验/出音:全本地零按次**(IndexTTS2 GPU + 本机 ffmpeg)→ 出音传 122 用。
- **生产化(小妹自助用)**:122 无 GPU,够不到本机 IndexTTS2 → 需把 IndexTTS2 放**端脑云 / 有 GPU 的服务器**,暴露 API 供 122 调。待验证音质后再搭。

## 8. 验收
给一段文案 → 自动产出"像小妹自然聊天"的音(她的音色 + 声调起伏 + 换气 + 不均匀节奏),零花费 → 喂数字人替掉 MiniMax。

## 9. 待办
1. ⏳ 等小妹**自然聊天新参考音** → 用本配方重克隆(预期质的提升)。
2. 之后可选:VoxCPM2 / LongCat 比相似度与自然度。
3. 生产化:IndexTTS2 上端脑云 + 接进产线 + 数字人(OmniHuman 付费/ComfyUI 自建)。
