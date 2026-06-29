import React from "react";
import { Composition } from "remotion";
import { MizanAd, mizanSchema } from "./MizanAd";
import { FxDemo } from "./FxDemo";
import { Factory, factorySchema } from "./Factory";
import { Showcase } from "./Showcase";
import { EffectEngine, scriptZ } from "./EffectEngine";
import { CoverShot, coverZ } from "./CoverShot";
import { S3_DATA, FACTORY_DATA } from "./data";

const MIZAN_DEFAULT = {
  styleId: "datahard" as const, theme: "#19e3c8", brand: "源头供应链 · mizan",
  watermark: "longka 制作", voice: "voice.mp3", bgm: "bgm.mp3",
  beats: [{ text: "占位", startSec: 0, endSec: 2, kind: "intro" as const, clip: "s1.mp4", feature: "aisle" as const }],
};

const COVER_DEFAULT = {
  bg: "brand/mizan-logo.png", title: "海外华人超市\n货从哪进？", titleHl: ["货从哪进"],
  sub: "三条进货路 + 第四条", tags: ["工厂价", "一件起订", "10-15天到"], locale: "🌍 海外开店", theme: "#F2B33D",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MizanAd"
        component={MizanAd}
        schema={mizanSchema}
        defaultProps={S3_DATA}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={Math.round(S3_DATA.durationSec * 30)}
      />
      <Composition
        id="Factory"
        component={Factory}
        schema={factorySchema}
        defaultProps={FACTORY_DATA}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={Math.round(FACTORY_DATA.durationSec * 30)}
      />
      <Composition
        id="Mizan"
        component={EffectEngine}
        schema={scriptZ}
        defaultProps={MIZAN_DEFAULT}
        fps={60}
        width={1080}
        height={1920}
        durationInFrames={990}
        calculateMetadata={({ props }) => {
          const FPS = 60;  // 必须和上面 fps={60} 一致;改帧率两处要同步,否则时长砍半
          const end = Math.max(...(props.beats?.map((b: any) => b.endSec) ?? [33]));
          // 片尾窗口 1.2s:让末镜画面+渐渐模糊+logo 收尾(EffectEngine END_TAIL 同值),不再黑屏。
          return { durationInFrames: Math.round((end + 1.2) * FPS), fps: FPS };
        }}
      />
      <Composition
        id="CoverShot"
        component={CoverShot}
        schema={coverZ}
        defaultProps={COVER_DEFAULT}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={1}
      />
      <Composition
        id="Showcase"
        component={Showcase}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={514}
      />
      <Composition
        id="FxDemo"
        component={FxDemo}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={246}
      />
    </>
  );
};
