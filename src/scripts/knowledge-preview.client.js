/**
 * Knowledge Index 词条预览浮层脚本（事件委托）。
 * 触发点：正文关联区 [data-knowledge-idx]；数据：#knowledge-preview-data JSON。
 * 点击 chip → 浮层显示 summary + 「查看全部」按钮跳转词条页。
 * 浮层壳由 Overlay.astro 提供（站内 SearchOverlay 范式）。
 */
(() => {
  const overlay = document.querySelector("[data-site-overlay]");
  const panel = document.querySelector("[data-site-overlay-panel]");
  const summaryEl = document.querySelector("[data-knowledge-summary]");
  const linkEl = document.querySelector("[data-knowledge-link]");
  const scrim = document.querySelector("[data-site-overlay-scrim]");
  const closeBtn = document.querySelector("[data-site-overlay-close]");
  const payloadEl = document.getElementById("knowledge-preview-data");
  if (!overlay || !panel || !summaryEl || !linkEl || !payloadEl) return;

  let entries = [];
  try {
    entries = JSON.parse(payloadEl.textContent || "[]");
  } catch {
    entries = [];
  }

  let activeTrigger = null;

  function openByIdx(idx) {
    return entries[idx];
  }

  function openBySlug(slug) {
    return entries.find((e) => e && e.slug === slug);
  }

  function open(entry) {
    if (!entry) return;
    const summary = entry.summary && entry.summary.trim() ? entry.summary : "暂无摘要，点击「查看全部」阅读完整词条。";
    summaryEl.textContent = summary;
    linkEl.setAttribute("href", `/knowledge/${encodeURIComponent(entry.slug)}`);
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const article = document.querySelector("article");
    if (article) article.inert = true;
    if (activeTrigger) activeTrigger.setAttribute("aria-expanded", "true");
    panel.focus({ preventScroll: true });
  }

  function close() {
    if (activeTrigger) activeTrigger.setAttribute("aria-expanded", "false");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    const article = document.querySelector("article");
    if (article) article.inert = false;
    if (activeTrigger) activeTrigger.focus({ preventScroll: true });
  }

  document.addEventListener("click", (e) => {
    // 正文内联链接（data-knowledge-slug）：来自 RichText 自动匹配
    const tSlug = e.target.closest("[data-knowledge-slug]");
    if (tSlug) {
      e.preventDefault();
      activeTrigger = tSlug;
      open(openBySlug(tSlug.dataset.knowledgeSlug));
      return;
    }
    // 底部 RELATED KNOWLEDGE chips（data-knowledge-idx）：来自 KnowledgeReference
    const tIdx = e.target.closest("[data-knowledge-idx]");
    if (!tIdx) return;
    e.preventDefault();
    activeTrigger = tIdx;
    open(openByIdx(Number(tIdx.dataset.knowledgeIdx)));
  });

  scrim?.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.hidden === false) {
      e.preventDefault();
      close();
    }
  });
})();
