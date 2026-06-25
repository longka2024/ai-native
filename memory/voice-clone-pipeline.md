# 语音克隆管线(自建 IndexTTS2)

Date: 2026-06-22

完整 spec:`docs/specs/2026-06-22-voice-clone-pipeline-spec.md`

## 决策
- 投资人当面否了数字人语音(MiniMax 克隆"做作、刻意咬字、不像本人")→ **弃 MiniMax 克隆,转自建 IndexTTS2**(本地、零按次,对齐"自建降本"北极星)。
- 引擎:**IndexTTS2 选定**(本机 `G:\index-tts_v2.5`,FastAPI `:8849`,`POST /tts`)。VoxCPM2(更好但本地无集成包,暂搁)、LongCat-AudioDiT(相似度 SOTA,备选)、MiniMax(弃)。
- Claude 命令行跑在用户本机 → 可直接 requests 调 localhost 的 TTS,本地出音再传 122。生产化需把 IndexTTS2 上端脑云/GPU 服务器供 122 调。

## 调好的配方(每条治一个"不像真人"的毛病)
- **保身份**:默认克隆;**绝不开 `use_emo_text`/高 emo_alpha**(会丢音色、不像本人)。
- **声调起伏**(治机械平调):`emo_audio_prompt = 她本人声`(学她自己语调)+ `temperature 0.85~0.92`。
- **去朗读腔**:文案口语化(加"其实吧/咱/呢/我跟你说"+短停顿,去书面长句)。
- **治"空灵/飘"**:暖声压实 EQ(不动音色):
  `highpass=f=75,equalizer=f=210:t=q:w=1.2:g=2.8,equalizer=f=3500:t=q:w=2:g=-1.5,equalizer=f=9000:t=h:g=-3.5,acompressor=threshold=-20dB:ratio=3.5:attack=8:release=180:makeup=2,atempo=1.06,alimiter=limit=0.95`
- **语速**:atempo 1.05~1.07(变速不变调)。

## 失败策略(踩过的坑,别再犯)
1. MiniMax 克隆做作刻意咬字 → 弃。
2. `use_emo_text` / 高 emo_alpha 加情感 → **丢说话人身份**。身份第一。
3. `temperature` 降到 0.6 求"平和" → **变单调机械音**;平和≠压平,真人要有起伏。
4. 后期检测停顿插换气声 → 停顿点常全挤到结尾(脆弱),造不出自然不均匀节奏。
5. "空灵/机械"根因 = **参考音有混响/偏平/朗读腔**,不是参数能根治的。

## 根本杠杆(天花板)
零样本克隆的起伏/换气/节奏几乎全继承自参考音。**最大提升 = 让小妹重录一段自然聊天原声**(20~30s,像唠嗑、有快慢/换气/起伏;安静不空旷、贴麦、关空调音乐、别降噪美颜、别念稿)。参考音自然 → 克隆才自然,胜过调一百个参数。当前进度:已让小妹重录,待新参考音重跑。
