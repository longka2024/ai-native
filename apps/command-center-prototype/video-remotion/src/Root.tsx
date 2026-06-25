import React from "react";
import { Composition } from "remotion";
import { MizanAd, mizanSchema } from "./MizanAd";
import { FxDemo } from "./FxDemo";
import { Factory, factorySchema } from "./Factory";
import { Showcase } from "./Showcase";
import { EffectEngine, scriptZ } from "./EffectEngine";
import { S3_DATA, FACTORY_DATA } from "./data";

const MIZAN_DEFAULT = {
  styleId: "datahard" as const, theme: "#19e3c8", brand: "源头供应链 · mizan",
  watermark: "longka 制作", voice: "voice.mp3", bgm: "bgm.mp3",
  beats: [{ text: "占位", startSec: 0, endSec: 2, kind: "intro" as const, clip: "s1.mp4", feature: "aisle" as const }],
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
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={990}
        calculateMetadata={({ props }) => {
          const end = Math.max(...(props.beats?.map((b: any) => b.endSec) ?? [33]));
          return { durationInFrames: Math.round((end + 0.3) * 30) };
        }}
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
