// hanzi-poster.mjs — 「知识海报」配图风格组装模块
// 把一张卡的结构化数据(num/标题/导语/blocks/插画键 + 可选Pexels背景) 组装成
// frame-render/templates/hanzi-poster-card.html 的槽位值(已组装好的 HTML 串)。
// 渲染走 frame-render/render.mjs(生产 playwright)。设计定稿见记忆 yingrui-html-card-template。

const N = "#15244f", N2 = "#1b2a55", G = "#d8bd6e", GD = "#cba85a", PAPER = "#fdfcf7";

// 英锐学院风主题(知识海报首个主题)。以后可加别的主题色。
export const THEMES = {
  yingrui: {
    cream:"#faf6ec", cream2:"#fdfcf7", cream3:"#f4efe2", navy:N, gold:G, bronze:GD, gold2:"#e8d49a",
    logoTop:"ED", logoBottom:"INSIGHT", brandName:"英锐", brandTag:"升学规划 · 学术提升 · 背景成长",
    slogan:"SMART PREPARE,<br>STAND OUT", crestLetter:"E",
    v1:"真实表达", v1en:"BE YOURSELF", v2:"可信经历", v2en:"BE CREDIBLE", v3:"脱颖而出", v3en:"STAND OUT",
  },
};

export const ICON = {
  book:`<svg viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5a2 2 0 0 1 2-2h6v17H5a2 2 0 0 0-2 2z"/><path d="M21 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 1 2 2z"/></svg>`,
  palette:`<svg viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="9.5" r="1.2" fill="${G}"/><circle cx="15" cy="9" r="1.2" fill="${G}"/><circle cx="16.5" cy="13.5" r="1.2" fill="${G}"/><path d="M12 21c2 0 2-2 3.5-2.5"/></svg>`,
  mic:`<svg viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>`,
  pen:`<svg viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17z"/><path d="M14 7l3 3"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M8 12.5l2.8 2.7L16.2 9"/></svg>`,
  arrow:`<svg viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M8.5 12h7"/><path d="M12.5 8.5L16 12l-3.5 3.5"/></svg>`,
  star:`<svg viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.3L12 17.8 6.4 20.5l1.2-6.3L3 9.6l6.3-.8z"/></svg>`,
  shield:`<svg viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>`,
};
const DEFAULT_ICON = "check";

// 线描学术场景插画(viewBox 480x500)。illoKey 按卡主题自动配。
export const ILLO = {
  desk:`
    <g stroke="${N}" stroke-width="3" fill="${PAPER}" stroke-linejoin="round"><path d="M360 36 h86 a12 12 0 0 1 12 12 v40 a12 12 0 0 1 -12 12 h-50 l-18 18 v-18 h-18 a12 12 0 0 1 -12 -12 v-40 a12 12 0 0 1 12 -12 z"/></g>
    <path d="M403 58 c-9 -10 -23 -3 -23 8 c0 10 23 22 23 22 c0 0 23 -12 23 -22 c0 -11 -14 -18 -23 -8z" fill="${G}" stroke="${G}"/>
    <g stroke="${N}" stroke-width="3" stroke-linecap="round" fill="none"><path d="M120 150 C120 116 100 106 86 102 M120 150 C120 120 140 110 158 108 M120 165 C120 136 104 126 94 122"/></g>
    <path d="M104 166 h34 l-6 40 h-22 z" fill="${N2}" stroke="${N}" stroke-width="3"/>
    <g stroke="${N}" stroke-width="3"><rect x="60" y="232" width="180" height="30" rx="4" fill="${N2}"/><rect x="48" y="262" width="190" height="30" rx="4" fill="${G}"/><rect x="70" y="292" width="176" height="30" rx="4" fill="${N2}"/></g>
    <text x="150" y="253" font-size="17" fill="#fff" text-anchor="middle" font-family="Georgia" letter-spacing="1">READING</text>
    <text x="143" y="313" font-size="16" fill="#fff" text-anchor="middle" font-family="Georgia" letter-spacing="1">WRITING</text>
    <g stroke="${N}" stroke-width="3" stroke-linejoin="round" fill="${PAPER}"><rect x="250" y="150" width="200" height="128" rx="8"/><rect x="266" y="166" width="168" height="96" rx="4" fill="#eef2f9"/><path d="M232 278 h236 l16 26 h-268 z" fill="${N2}"/></g>
    <text x="282" y="190" font-size="16" fill="${N}" font-family="Georgia" font-weight="bold">My Passion Project</text>
    <polyline points="280,244 312,214 340,232 372,196 414,212" stroke="${G}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="414" cy="212" r="4" fill="${G}"/>
    <g stroke="${N}" stroke-width="3" stroke-linejoin="round"><path d="M120 432 L226 412 V346 L120 364 Z" fill="${PAPER}"/><path d="M332 432 L226 412 V346 L332 364 Z" fill="${PAPER}"/><path d="M226 346 V412"/></g>
    <g stroke="${G}" stroke-width="2" fill="none"><path d="M140 380 h70 M140 396 h70 M244 380 h70 M244 396 h70"/></g>
    <g stroke="${N}" stroke-width="3.5" stroke-linecap="round"><path d="M262 420 l116 -32"/></g><path d="M378 388 l9 -11 6 4 -6 12z" fill="${G}"/>
    <g stroke="${N}" stroke-width="3" fill="${N2}" stroke-linejoin="round"><rect x="392" y="330" width="52" height="56" rx="8"/></g><path d="M444 343 c20 0 20 28 0 28" fill="none" stroke="${N}" stroke-width="3"/>`,

  research:`
    <g stroke="${N}" stroke-width="3" fill="${PAPER}" stroke-linejoin="round"><rect x="250" y="34" width="180" height="120" rx="8"/></g>
    <text x="266" y="64" font-size="17" fill="${N}" font-family="Georgia" font-weight="bold">Research Question</text>
    <text x="340" y="130" font-size="58" fill="${G}" text-anchor="middle" font-family="Georgia" font-weight="bold">?</text>
    <g stroke="${N}" stroke-width="3" fill="${PAPER}" stroke-linejoin="round"><rect x="270" y="178" width="180" height="140" rx="8"/></g>
    <text x="286" y="206" font-size="16" fill="${N}" font-family="Georgia" font-weight="bold">Data Analysis</text>
    <path d="M292 296 V256 M316 296 V232 M340 296 V268" stroke="${G}" stroke-width="13" stroke-linecap="butt"/><path d="M286 296 h70" stroke="${N}" stroke-width="3"/>
    <g stroke="${N}" stroke-width="3" fill="none"><circle cx="406" cy="262" r="28"/></g><path d="M406 262 L406 234 A28 28 0 0 1 431 274 Z" fill="${G}" stroke="${N}" stroke-width="2"/>
    <g stroke="${N}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M70 470 h150"/><path d="M100 470 v-26 h70 v26" fill="${N2}"/><path d="M135 444 c-46 0 -70 -40 -54 -78"/><rect x="100" y="296" width="34" height="92" rx="10" fill="${N2}" transform="rotate(18 117 342)"/><circle cx="100" cy="294" r="16" fill="${PAPER}"/><path d="M100 388 h44" stroke-width="6"/></g><circle cx="155" cy="424" r="5" fill="${G}"/>
    <g stroke="${N}" stroke-width="3"><rect x="250" y="404" width="200" height="30" rx="4" fill="${N2}"/><rect x="262" y="434" width="190" height="30" rx="4" fill="${G}"/></g>
    <text x="350" y="425" font-size="16" fill="#fff" text-anchor="middle" font-family="Georgia" letter-spacing="1">RESEARCH</text>
    <text x="357" y="455" font-size="15" fill="${N}" text-anchor="middle" font-family="Georgia" letter-spacing="1">ACADEMIC JOURNAL</text>`,

  community:`
    <g stroke="${N}" stroke-width="3" fill="none" stroke-linejoin="round"><path d="M250 60 L330 96 H170 Z"/><path d="M190 96 V190 M230 96 V190 M270 96 V190 M310 96 V190"/><path d="M160 96 H340 M152 190 H348"/><rect x="236" y="120" width="28" height="70" fill="${PAPER}" stroke="${N}"/></g>
    <g stroke="${N}" stroke-width="3" fill="${PAPER}" stroke-linejoin="round"><rect x="368" y="150" width="100" height="78" rx="6"/><path d="M418 228 v40"/></g>
    <text x="418" y="178" font-size="14" fill="${N}" text-anchor="middle" font-family="Georgia" font-weight="bold">COMMUNITY</text>
    <text x="418" y="200" font-size="14" fill="${N}" text-anchor="middle" font-family="Georgia" font-weight="bold">ACTION</text>
    <text x="418" y="220" font-size="13" fill="${GD}" text-anchor="middle" font-family="Georgia">REAL IMPACT</text>
    <g stroke="${N}" stroke-width="3.2" stroke-linejoin="round" fill="none"><path d="M120 250 c34 0 54 24 54 54 c0 38 -54 82 -54 82 c0 0 -54 -44 -54 -82 c0 -30 20 -54 54 -54z" fill="${N2}"/></g>
    <path d="M120 326 c-12 -14 -29 -5 -29 10 c0 14 29 29 29 29 c0 0 29 -15 29 -29 c0 -15 -17 -24 -29 -10z" fill="${G}" stroke="${G}"/>
    <g stroke="${N}" stroke-width="3.2" stroke-linecap="round" fill="none"><circle cx="220" cy="380" r="20" fill="${PAPER}" stroke="${N}"/><path d="M192 440 c0 -32 56 -32 56 0"/><circle cx="300" cy="368" r="22" fill="${G}" stroke="${N}"/><path d="M268 440 c0 -36 64 -36 64 0"/><circle cx="382" cy="380" r="20" fill="${PAPER}" stroke="${N}"/><path d="M354 440 c0 -32 56 -32 56 0"/></g>
    <g stroke="${N}" stroke-width="3" stroke-linecap="round" fill="none"><path d="M150 460 v-40"/><path d="M150 430 c-20 -2 -28 -18 -26 -32 c16 -2 28 14 26 32z" fill="${G}" stroke="${N}"/><path d="M150 440 c18 -4 28 -20 26 -34 c-16 0 -28 16 -26 34z" fill="${G}" stroke="${N}"/></g>
    <path d="M70 470 h360" stroke="${N}" stroke-width="3" stroke-linecap="round"/>`,

  job:`
    <g stroke="${N}" stroke-width="3" fill="${N2}" stroke-linejoin="round"><path d="M250 110 h140 l16 150 h-172 z"/></g>
    <text x="320" y="150" font-size="18" fill="#fff" text-anchor="middle" font-family="Georgia" font-weight="bold">Hard Work</text>
    <text x="320" y="178" font-size="18" fill="${G}" text-anchor="middle" font-family="Georgia" font-weight="bold">Builds</text>
    <text x="320" y="206" font-size="18" fill="#fff" text-anchor="middle" font-family="Georgia" font-weight="bold">Character</text>
    <g stroke="${N}" stroke-width="3.2" fill="none" stroke-linecap="round"><circle cx="120" cy="120" r="56" fill="${PAPER}"/><path d="M120 120 V82 M120 120 l28 16" stroke-width="4"/></g><circle cx="120" cy="120" r="5" fill="${G}"/>
    <g stroke="${N}" stroke-width="3.4" stroke-linejoin="round"><rect x="60" y="250" width="210" height="140" rx="14" fill="${N2}"/><path d="M132 250 v-20 a14 14 0 0 1 14 -14 h38 a14 14 0 0 1 14 14 v20" fill="none" stroke="${N}"/><path d="M60 306 h210" stroke="${PAPER}" stroke-width="3"/><rect x="142" y="294" width="46" height="24" rx="5" fill="${G}" stroke="${N}"/></g>
    <g stroke="${N}" stroke-width="3"><rect x="300" y="300" width="160" height="28" rx="4" fill="${N2}"/><rect x="312" y="328" width="150" height="28" rx="4" fill="${G}"/><rect x="300" y="356" width="160" height="28" rx="4" fill="${N2}"/></g>
    <text x="380" y="320" font-size="14" fill="#fff" text-anchor="middle" font-family="Georgia" letter-spacing="1">LEADERSHIP</text>
    <text x="387" y="348" font-size="13" fill="${N}" text-anchor="middle" font-family="Georgia" letter-spacing="1">RESPONSIBILITY</text>
    <text x="380" y="376" font-size="14" fill="#fff" text-anchor="middle" font-family="Georgia" letter-spacing="1">EXCELLENCE</text>
    <g stroke="${N}" stroke-width="3" fill="${PAPER}" stroke-linejoin="round"><path d="M300 410 h70 l-7 64 a8 8 0 0 1 -8 7 h-40 a8 8 0 0 1 -8 -7z"/></g><path d="M370 422 c20 0 20 30 0 30" fill="none" stroke="${N}" stroke-width="3"/>
    <path d="M312 402 c0 -10 6 -14 6 -22 M334 402 c0 -10 6 -14 6 -22 M356 402 c0 -10 6 -14 6 -22" stroke="${G}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
};
const DEFAULT_ILLO = "desk";

// 关键词 → 插画键（拆卡时按卡主题自动配；DeepSeek 也可直接给 illoKey）
const ILLO_KEYWORDS = [
  ["research", ["research","科研","论文","实验","学术","publication","paper"]],
  ["community", ["community","社区","公益","志愿","impact","服务","支教"]],
  ["job", ["job","打工","兼职","实习","work","职业","创业","intern"]],
  ["desk", ["passion","写作","读书","创作","podcast","艺术","项目","project"]],
];
export function pickIllo(text = "") {
  const t = String(text).toLowerCase();
  for (const [key, kws] of ILLO_KEYWORDS) if (kws.some(k => t.includes(String(k).toLowerCase()))) return key;
  return DEFAULT_ILLO;
}

function titleHtml(card) {
  const enClass = card.enNavy ? "en navy" : "en";
  let cn = card.titleCn || "";
  if (card.cnGold) cn = cn.replace(card.cnGold, `<span class="gd">${card.cnGold}</span>`);
  const cnDiv = cn ? `<div class="cn">${cn}</div>` : "";
  const enDiv = card.titleEn ? `<div class="${enClass}">${card.titleEn}</div>` : "";
  return (card.titleOrder === "en-cn") ? (enDiv + cnDiv) : (cnDiv + enDiv);
}

function itemHtml(it) {
  const icon = ICON[it.icon] || ICON[DEFAULT_ICON];
  const sub = it.sub ? `<span class="sub">${it.sub}</span>` : "";
  return `<div class="li">${icon}<div class="t">${it.title}${sub}</div></div>`;
}

function bodyHtml(card) {
  const blocks = card.blocks || [];
  return blocks.map((b, i) => {
    if (b.quote) return `<div class="quote">${b.quote}</div>`;
    const pill = b.pill ? `<span class="pill"${i > 0 ? ' style="margin-top:22px"' : ""}>${b.pill}</span>` : "";
    const list = (b.items && b.items.length) ? `<div class="list">${b.items.map(itemHtml).join("")}</div>` : "";
    return pill + list;
  }).join("");
}

function bgLayer(bg) {
  if (!bg || !bg.url || bg.treatment === "none") return "";
  const cls = bg.treatment === "blur" ? "blur" : "sketch";
  return `<div class="bgwrap ${cls}"><img class="bgph" src="${bg.url}"></div>`;
}

// 主入口：一张卡 → render.mjs 的 data 对象（含主题色 + 组装好的 HTML 槽位）
export function composeCardData(card, opts = {}) {
  const theme = THEMES[opts.theme || card.theme || "yingrui"] || THEMES.yingrui;
  const illoKey = card.illoKey && ILLO[card.illoKey] ? card.illoKey
    : pickIllo([card.titleCn, card.titleEn, card.lead].filter(Boolean).join(" "));
  return {
    ...theme,
    num: card.num || "",
    titleHtml: titleHtml(card),
    leadBlock: card.lead ? `<div class="lead">${card.lead}</div>` : "",
    bodyHtml: bodyHtml(card),
    illoSvg: ILLO[illoKey] || ILLO[DEFAULT_ILLO],
    bgLayer: bgLayer(opts.bg || card.bg),
  };
}

export const TEMPLATE_REL = "frame-render/templates/hanzi-poster-card.html";
export const CARD_W = 1080, CARD_H = 1350;
