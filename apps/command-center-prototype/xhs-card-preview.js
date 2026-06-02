const params = new URLSearchParams(location.search);
const assetId = params.get("asset");
const allowCollectedImages = params.get("allowCollectedImages") === "1";

const els = {
  title: document.querySelector("#previewTitle"),
  meta: document.querySelector("#previewMeta"),
  stage: document.querySelector("#xhsCardStage"),
  copy: document.querySelector("#copyCardCopy"),
};

const PAGE_ROLES = [
  { label: "封面", eyebrow: "01 / FIRST LOOK", mode: "cover" },
  { label: "痛点场景", eyebrow: "02 / REAL SCENE", mode: "scene" },
  { label: "判断依据", eyebrow: "03 / EVIDENCE", mode: "evidence" },
  { label: "方法路径", eyebrow: "04 / METHOD", mode: "method" },
  { label: "边界提醒", eyebrow: "05 / BOUNDARY", mode: "result" },
  { label: "行动清单", eyebrow: "06 / ACTION", mode: "action" },
];

loadPreview().catch((error) => {
  console.error(error);
  els.stage.innerHTML = `<article class="preview-error"><b>卡片组加载失败</b><p>${escapeHtml(error.message || "未知错误")}</p></article>`;
});

async function loadPreview() {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const state = await res.json();
  const asset = findPreviewAsset(state.assets || []);
  if (!asset) throw new Error("没有找到可预览的小红书卡片组。");

  const data = asset.structured || {};
  if (!Array.isArray(data.cardPlan) || !data.cardPlan.length) {
    throw new Error("这个发布包还没有结构化卡片方案，请先确认文案并生成卡片计划。");
  }

  const deck = normalizeDeck(data, asset);
  const visualSources = collectStateVisualSources(state, asset, data);
  const sourceLine = buildSourceLine(visualSources, data, asset);

  els.title.textContent = asset.title || "小红书卡片组预览";
  els.meta.textContent = `${data.selectedTitle || asset.title || "已确认文案"} · ${deck.length} 张 1080x1440 卡片 · ${sourceLine}`;
  els.stage.innerHTML = deck.map((card, index) => renderCard(card, data, asset, index)).join("");
  els.copy?.addEventListener("click", () => copyText(asset.copy || data.bodyDraft?.join("\n") || ""));
}

function findPreviewAsset(assets) {
  if (assetId) return assets.find((item) => item.id === assetId) || null;
  return [...assets].reverse().find((item) => Array.isArray(item.structured?.cardPlan) && item.structured.cardPlan.length) || null;
}

function normalizeDeck(data, asset) {
  const rawCards = data.cardPlan.map((card, index) => ({
    page: card.page || index + 1,
    role: clean(card.role || card.type || PAGE_ROLES[index]?.label || "内容卡"),
    title: clean(card.title || (index === 0 ? data.selectedTitle || asset.title : PAGE_ROLES[index]?.label)),
    copy: clean(card.copy || card.text || ""),
  })).filter((card) => card.title || card.copy);

  const cards = rawCards.length >= 4 ? rawCards : buildDeckFromBody(data, asset);
  return cards.slice(0, 8).map((card, index) => ({
    ...card,
    role: card.role || PAGE_ROLES[index]?.label || "内容卡",
    title: card.title || PAGE_ROLES[index]?.label || "内容重点",
    copy: card.copy || "把这一页做成一个清楚、可收藏、可执行的小结论。",
  }));
}

function buildDeckFromBody(data, asset) {
  const bodyLines = Array.isArray(data.bodyDraft) ? data.bodyDraft : String(asset.copy || "").split(/\n+/);
  const useful = bodyLines.map(clean).filter(Boolean).slice(0, 8);
  const title = data.selectedTitle || data.coverText || asset.title || "把问题先判断清楚";
  return [
    { role: "封面", title, copy: useful[0] || "先把客户最关心的问题讲清楚。" },
    { role: "痛点场景", title: "为什么很多人会卡住", copy: useful[1] || useful[0] || "用户不是不想行动，而是不知道第一步该怎么判断。" },
    { role: "判断依据", title: "先看这几个判断点", copy: useful.slice(2, 5).join(" / ") || "把模糊问题拆成能自查的标准。" },
    { role: "方法路径", title: "下一步怎么做", copy: useful.slice(5, 7).join(" / ") || "先判断，再选择更稳的行动路径。" },
    { role: "行动清单", title: "先收藏，再对照", copy: useful.at(-1) || "发布前确认事实、合规和转化入口。" },
  ];
}

function renderCard(card, data, asset, index) {
  const role = PAGE_ROLES[index] || PAGE_ROLES[PAGE_ROLES.length - 1];
  const layout = ["cover-photo", "magazine-split", "data-proof", "step-board", "quote-result", "checklist-action"][index] || "magazine-split";
  const proof = buildProofLines(card, data, index);
  return `
    <article class="xhs-preview-card premium-card mode-${role.mode} layout-${layout}">
      <div class="xhs-card-inner">
        <header class="xhs-card-topline">
          <span>${role.eyebrow}</span>
          <em>${String(index + 1).padStart(2, "0")}</em>
        </header>
        <section class="xhs-card-hero">
          <div class="xhs-card-kicker">${escapeHtml(card.role || role.label)}</div>
          <h2>${escapeHtml(limitText(card.title, index === 0 ? 34 : 28))}</h2>
          <p>${escapeHtml(limitText(card.copy, 92))}</p>
        </section>
        ${renderVisualPanel(card, data, asset, index)}
        <section class="xhs-card-proof">
          ${proof.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join("")}
        </section>
        <footer class="xhs-card-footer">
          <span>LONGKA AI NATIVE</span>
          <span>${escapeHtml(data.sourceSummary?.validation || "文案已人工确认")}</span>
        </footer>
      </div>
    </article>
  `;
}

function renderVisualPanel(card, data, asset, index) {
  const images = collectImages(data, asset);
  const image = images[index % Math.max(images.length, 1)];
  if (image && shouldRenderPhoto(data)) {
    return `
      <section class="xhs-card-visual with-image pending-ratio fit-${index === 0 ? "hero" : "wide"}">
        <img src="${escapeAttr(image)}" alt="" onload="markImageRatio(this)" />
        <div class="visual-side">
          <b>${escapeHtml(visualCaption(index))}</b>
          <span>${escapeHtml(limitText(card.copy, 36))}</span>
        </div>
        <div class="visual-caption">${escapeHtml(visualCaption(index))}</div>
      </section>
    `;
  }
  return `
    <section class="xhs-card-visual generated-visual visual-${index % 6}">
      <div class="visual-grid-mark"></div>
      <div class="visual-chip">${escapeHtml(visualCaption(index))}</div>
      ${renderDesignedVisual(card, data, index)}
    </section>
  `;
}

function renderDesignedVisual(card, data, index) {
  if (index === 0) {
    return `
      <div class="report-phone">
        <div class="phone-bar"></div>
        <div class="face-map"></div>
        <div class="swatch-row"><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="result-ticket"><b>先判断</b><span>${escapeHtml(limitText(data.sourceSummary?.saveMotive || card.copy, 22))}</span></div>
    `;
  }
  if (index === 1) {
    return `
      <div class="before-after">
        <div><span>用户卡点</span><b>${escapeHtml(limitText(card.copy, 18))}</b></div>
        <div><span>内容任务</span><b>把问题说成人话</b></div>
      </div>
      <div class="pain-note">来自已选源头帖和确认文案，不照搬竞品原图。</div>
    `;
  }
  if (index === 2) {
    return `
      <div class="evidence-board">
        <div><span>来源</span><b>真实素材</b></div>
        <div><span>价值</span><b>${escapeHtml(String(data.sourceSummary?.validationScore || 90))}</b></div>
        <div><span>动机</span><b>收藏对照</b></div>
      </div>
    `;
  }
  if (index === 3) {
    return `
      <div class="step-flow">
        <div><em>1</em><span>看问题</span></div>
        <div><em>2</em><span>看证据</span></div>
        <div><em>3</em><span>定下一步</span></div>
      </div>
    `;
  }
  if (index === 4) {
    return `
      <div class="value-stack">
        <div>不夸大效果</div>
        <div>不照搬案例</div>
        <div>不替代专业判断</div>
      </div>
    `;
  }
  return `
    <div class="action-panel">
      <b>下一步</b>
      <span>${escapeHtml(limitText(data.sourceSummary?.conversion || card.copy, 34))}</span>
    </div>
  `;
}

function buildProofLines(card, data, index) {
  const summary = data.sourceSummary || {};
  if (index === 0) {
    return [
      { label: "收藏动机", value: summary.saveMotive || "用户可对照判断" },
      { label: "行动入口", value: summary.conversion || "先保存，再咨询或评估" },
    ];
  }
  if (index === 1) {
    return [
      { label: "用户问题", value: data.commentGuide?.[0] || "来自评论和源头痛点" },
      { label: "表达方式", value: "口语化、具体化" },
    ];
  }
  if (index === 2) {
    return [
      { label: "证据来源", value: summary.validation || "已确认素材" },
      { label: "内容目标", value: "帮用户做判断" },
    ];
  }
  if (index === 3) {
    return [
      { label: "方法", value: "拆成 3 步" },
      { label: "发布风险", value: "避免承诺结果" },
    ];
  }
  return [
    { label: "发布检查", value: data.publishChecklist?.[0] || "人工复核后发布" },
    { label: "来源边界", value: "原创卡片，不用竞品原图" },
  ];
}

function shouldRenderPhoto(data) {
  return allowCollectedImages || data.visualMode === "licensed" || data.visualPolicy?.renderLicensedImages === true;
}

function collectImages(data, asset) {
  const values = [
    ...(data.images || []),
    ...(data.visualAssets || []),
    ...(data.mediaAssets || []),
    ...(asset.images || []),
  ];
  return values.map((item) => typeof item === "string" ? item : item?.url || item?.src || item?.path).filter(Boolean);
}

function collectStateVisualSources(state, asset, data) {
  const topicId = asset.topicId;
  const candidate = (state.candidates || []).find((item) => item.id === topicId)
    || (state.topics || []).find((item) => item.id === topicId);
  const queryParts = [candidate?.title, candidate?.material?.[0], data.selectedTitle, asset.title]
    .filter(Boolean)
    .map((item) => String(item).slice(0, 18));
  return (state.contentSamples || [])
    .filter((sample) => {
      const hasImage = sample.cover || (Array.isArray(sample.images) && sample.images.length);
      const haystack = [sample.title, sample.content, sample.keyword].filter(Boolean).join(" ");
      return hasImage && queryParts.some((part) => part && haystack.includes(part));
    })
    .slice(0, 6)
    .map((sample) => ({
      title: sample.title || sample.keyword || "采集素材",
      platform: sample.platform || "xiaohongshu",
      url: sample.url || "",
      imageCount: (sample.images || []).length + (sample.cover ? 1 : 0),
    }));
}

function buildSourceLine(visualSources, data, asset) {
  if (visualSources.length) return `参考 ${visualSources.length} 条采集素材，不渲染竞品原图`;
  if (data.sourceSummary?.layer) return "来自已确认文案和源头拆解";
  return asset.topicId ? "来自当前选题发布包" : "手动确认文案";
}

function visualCaption(index) {
  return ["先看结果", "真实困扰", "判断依据", "操作路径", "风险边界", "行动入口"][index] || "内容证据";
}

function limitText(value, max) {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function copyText(text) {
  if (!navigator.clipboard?.writeText) return;
  await navigator.clipboard.writeText(text);
  toast("已复制图文文案");
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1800);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

window.markImageRatio = function markImageRatio(img) {
  const box = img.closest(".xhs-card-visual");
  if (!box) return;
  const ratio = img.naturalWidth / Math.max(img.naturalHeight, 1);
  box.classList.remove("pending-ratio", "portrait-image", "landscape-image", "square-image");
  if (ratio < 0.82) box.classList.add("portrait-image");
  else if (ratio > 1.2) box.classList.add("landscape-image");
  else box.classList.add("square-image");
};
