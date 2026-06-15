// copy-manager.js — 文案版本管理（记录、还原、确认版本）
// 依赖: state-manager.js, utils.js

function currentTarget() {
  return publishTargets.find((item) => item.id === state.publishTarget) || publishTargets[0];
}

function currentSource() {
  return sourceChannels.find((item) => item.id === state.sourceChannel) || sourceChannels[0];
}

function selectedTopic() {
  return state.topics.find((item) => item.id === state.selectedTopicId) || null;
}

function normalizeCopyText(value = "") {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function activeCopyText() {
  return normalizeCopyText(state.improvedDraft || state.draft || "");
}

function validCopyVersions() {
  return (state.copyVersions || []).filter((item) => normalizeCopyText(item?.copy || ""));
}

function repairCopyState() {
  state.copyVersions = validCopyVersions();
  if (state.currentCopyVersionId && !state.copyVersions.some((item) => item.id === state.currentCopyVersionId)) {
    state.currentCopyVersionId = "";
  }
  if (state.confirmedCopyVersionId && !state.copyVersions.some((item) => item.id === state.confirmedCopyVersionId)) {
    state.confirmedCopyVersionId = "";
    state.copyConfirmed = false;
  }
  if (!activeCopyText() && state.copyVersions.length) {
    const latest = state.copyVersions[state.copyVersions.length - 1];
    state.draft = latest.copy;
    state.improvedDraft = "";
    state.currentCopyVersionId = latest.id;
    state.draftReview = latest.review || runLongkaReview(latest.copy);
  }
}

function rememberCopyVersion(copy, label = "初稿") {
  const text = normalizeCopyText(copy);
  if (!text) return null;
  const last = state.copyVersions[state.copyVersions.length - 1];
  if (last && normalizeCopyText(last.copy) === text && last.title === state.selectedTitle) {
    state.currentCopyVersionId = last.id;
    return last;
  }
  const review = runLongkaReview(text);
  const version = {
    id: `copy-${Date.now()}-${state.copyVersions.length + 1}`,
    round: state.copyVersions.length + 1,
    title: state.selectedTitle,
    copy: text,
    score: review?.score || 0,
    label,
    review,
    createdAt: new Date().toISOString(),
    confirmed: false,
  };
  state.copyVersions = [...state.copyVersions, version].slice(-10);
  state.currentCopyVersionId = version.id;
  return version;
}

function currentCopySnapshot(label = "褰撳墠鐗堟湰") {
  repairCopyState();
  const current = state.copyVersions.find((item) => item.id === state.currentCopyVersionId);
  const copy = activeCopyText() || normalizeCopyText(current?.copy || "");
  if (!copy) return null;
  return {
    id: current?.id || "",
    round: current?.round || state.copyVersions.length,
    title: state.selectedTitle,
    copy,
    score: current?.score || runLongkaReview(copy)?.score || 0,
    label,
  };
}

function clearCopyConfirmation() {
  state.copyConfirmed = false;
  state.confirmedCopyVersionId = "";
  state.copyVersions = state.copyVersions.map((item) => ({ ...item, confirmed: false }));
}

function restoreCopyVersion(id, approve = false) {
  const version = state.copyVersions.find((item) => item.id === id);
  if (!version) return;
  state.selectedTitle = version.title || state.selectedTitle;
  state.draft = version.copy;
  state.improvedDraft = "";
  state.draftReview = version.review || runLongkaReview(version.copy);
  state.currentCopyVersionId = version.id;
  state.draftStatus = "done";
  state.draftError = "";
  if (approve) {
    state.copyConfirmed = true;
    state.confirmedCopyVersionId = version.id;
    state.copyVersions = state.copyVersions.map((item) => ({ ...item, confirmed: item.id === version.id }));
    setStep(10);
    return;
  }
  clearCopyConfirmation();
  renderToday();
}

function renderCopyVersionList() {
  repairCopyState();
  if (!state.copyVersions.length) return "";
  const best = state.copyVersions.reduce((winner, item) => (!winner || item.score > winner.score ? item : winner), null);
  return `<div class="copy-version-list">
    <b>版本记录</b>
    ${state.copyVersions.slice().reverse().map((item) => `<div class="copy-version-item ${item.id === state.currentCopyVersionId ? "active" : ""} ${item.id === state.confirmedCopyVersionId ? "confirmed" : ""}">
      <button type="button" data-copy-version="${escapeHtml(item.id)}">
        <span>第 ${item.round} 版${best?.id === item.id ? " · 当前最佳" : ""}${item.id === state.currentCopyVersionId ? " · 当前查看" : ""}${item.id === state.confirmedCopyVersionId ? " · 已确认" : ""}</span>
        <strong>${item.score}/100</strong>
        <small>${escapeHtml(item.label)}</small>
      </button>
      <div class="copy-version-actions">
        <button class="secondary" type="button" data-copy-restore="${escapeHtml(item.id)}">恢复此版</button>
        <button class="primary" type="button" data-copy-confirm="${escapeHtml(item.id)}">确认此版</button>
      </div>
    </div>`).join("")}
  </div>`;
}
function confirmedCopyText() {
  const confirmed = state.copyVersions.find((item) => item.id === state.confirmedCopyVersionId);
  return normalizeCopyText(confirmed?.copy || activeCopyText());
}

function cleanPublishBodyForCopy(raw = "") {
  const text = normalizeCopyText(raw);
  const lines = text.split(/\n/);
  const cutIndex = lines.findIndex((line) => /^\s*(配图建议|配图|图片建议|图片规划|标签|话题标签|hashtags?)\s*[:：]/iu.test(line));
  const withoutTail = cutIndex >= 0 ? lines.slice(0, cutIndex).join("\n") : text;
  return normalizeCopyText(withoutTail)
    .replace(/(?:^|\n)\s*(配图建议|配图|图片建议|图片规划|标签|话题标签|hashtags?)\s*[:：][\s\S]*$/iu, "")
    .replace(/\n\s*#\S+(?:\s+#\S+)*\s*$/u, "")
    .replace(/^\s*(标题|正文)\s*[:：]\s*/gmu, "")
    .trim();
}

