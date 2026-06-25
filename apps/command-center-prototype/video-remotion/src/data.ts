// 样片3(数字钩子)数据 —— 数据驱动:换一组数据=换一条片
export type Seg = [number, number, string, boolean]; // [startSec, endSec, 文字, 是否数字强调]
export const S3_DATA = {
  durationSec: 33,
  theme: "#19e3c8",
  brand: "源头供应链 · mizan",
  segs: [
    [0, 2.24, "十万多种货 工厂价", true],
    [2.24, 3.72, "八成一件起订", true],
    [3.72, 5.12, "海外开店进货", false],
    [5.12, 6.8, "别再飞中国跑市场", false],
    [6.8, 9.28, "米站平台 mizan", false],
    [9.28, 11.0, "26个大类全覆盖", true],
    [11.0, 12.24, "五金 厨房", false],
    [12.24, 13.48, "家居 玩具", false],
    [13.48, 14.12, "美妆", false],
    [14.12, 14.68, "服装", false],
    [14.68, 15.8, "箱包 家电", false],
    [15.8, 17.16, "华人商超要卖的", false],
    [17.16, 18.2, "基本都有", false],
    [18.2, 19.56, "包装多国语言", false],
    [19.56, 21.28, "当地直接上架", false],
    [21.28, 21.84, "西", false],
    [21.84, 22.36, "葡", false],
    [22.36, 22.76, "智", false],
    [22.76, 23.2, "墨", false],
    [23.2, 24.36, "自营海外仓", false],
    [24.36, 25.64, "就近补货不用等", false],
    [25.64, 26.36, "在欧洲", false],
    [26.36, 27.6, "南美开店做批发", false],
    [27.6, 28.8, "手机下个 mizan", false],
    [28.8, 29.96, "中国站下单", false],
    [29.96, 30.92, "源头直发", false],
    [30.92, 33.0, "找货源 认准 mizan", false],
  ] as Seg[],
};

// ───────── 混剪工厂数据行(满配:转场 b-roll + 大数字卡 + 逐字字幕)─────────
// clips march through video.mp4(已与配音窗口对齐),转场叠在镜间;numCards 在数字钩子处弹大数字
export const FACTORY_DATA = {
  durationSec: 33,
  theme: "#19e3c8",
  brand: "源头供应链 · mizan",
  video: "video.mp4",
  voice: "voice.mp3",
  bgm: "bgm.mp3",
  watermark: "longka 制作",
  clips: [
    { fromSec: 0, durSec: 5 },
    { fromSec: 5, durSec: 4.3 },
    { fromSec: 9.3, durSec: 3.2 },
    { fromSec: 12.5, durSec: 3.3 },
    { fromSec: 15.8, durSec: 5.5 },
    { fromSec: 21.3, durSec: 2.7 },
    { fromSec: 24, durSec: 4 },
    { fromSec: 28, durSec: 5 },
  ],
  segs: S3_DATA.segs,
  numCards: [
    { at: 0.2, dur: 2.0, to: 10, unit: "万", label: "SKU 工厂价", decimals: 0 },
    { at: 2.3, dur: 1.4, to: 80, unit: "%", label: "一件起订", decimals: 0 },
    { at: 9.4, dur: 1.6, to: 26, unit: "", label: "大类全覆盖", decimals: 0 },
  ],
};
