/**
 * LLM Review「查看原文」交互脚本（事件委托，约 50 行）
 * 触发点：正文里 [data-cite-id] 按钮；数据：页面 #llm-citations JSON。
 * 浮层范式与站内 SearchOverlay 一致（div + role=dialog），无新依赖。
 */
(() => {
  const overlay = document.querySelector("[data-llm-overlay]");
  const panel = document.querySelector("[data-llm-panel]");
  const meta = document.querySelector("[data-llm-meta]");
  const kickerEl = document.querySelector("[data-llm-kicker]");
  const bodyEl = document.querySelector("[data-llm-body]");
  const copyBtn = document.querySelector("[data-llm-copy]");
  const live = document.querySelector("[data-llm-live]");
  const scrim = document.querySelector("[data-llm-scrim]");
  const closeBtn = document.querySelector("[data-llm-close]");
  const payloadEl = document.getElementById("llm-citations");
  if (!overlay || !panel || !meta || !bodyEl || !payloadEl) return;

  let cites = [];
  try {
    cites = JSON.parse(payloadEl.textContent || "[]");
  } catch {
    cites = [];
  }

  let activeTrigger = null;
  let activeCiteId = 0;

  const findCite = (id) => cites.find((c) => c.citeId === id);

  function open(id) {
    const cite = findCite(id);
    if (!cite) return;
    activeCiteId = id;
    meta.innerHTML = [
      cite.modelId ? `<span class="llm-cite-model">${cite.modelId}</span>` : "",
      cite.track ? `<span class="llm-cite-track">${cite.track}</span>` : "",
      cite.scenario ? `<span>${cite.scenario}</span>` : "",
      cite.testedAt ? `<span>${cite.testedAt}</span>` : "",
    ].join("");
    bodyEl.textContent = cite.body;
    if (kickerEl) kickerEl.textContent = cite.kicker || "MODEL RESPONSE";
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (activeTrigger) activeTrigger.setAttribute("aria-expanded", "true");
    panel.focus({ preventScroll: true });
  }

  function close() {
    if (activeTrigger) activeTrigger.setAttribute("aria-expanded", "false");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (activeTrigger) activeTrigger.focus({ preventScroll: true });
    activeCiteId = 0;
  }

  // 触发点（事件委托，含"再次点击同一点关闭"）
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-cite-id]");
    if (!t) return;
    e.preventDefault();
    const id = Number(t.dataset.citeId);
    activeTrigger = t;
    if (overlay.hidden === false && activeCiteId === id) close();
    else open(id);
  });

  scrim?.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.hidden === false) {
      e.preventDefault();
      close();
      return;
    }
    // 简单焦点陷阱：弹窗打开期间 Tab 在面板内循环
    if (e.key === "Tab" && overlay.hidden === false) {
      const focusables = panel.querySelectorAll("button, [href], textarea, input, select");
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // 复制 + 1.5s 反馈 + aria-live 播报
  copyBtn?.addEventListener("click", async () => {
    const cite = findCite(activeCiteId);
    if (!cite) return;
    try {
      await navigator.clipboard.writeText(cite.body);
      copyBtn.classList.add("is-copied");
      copyBtn.textContent = "已复制";
      if (live) live.textContent = "原文已复制到剪贴板";
      setTimeout(() => {
        copyBtn.classList.remove("is-copied");
        copyBtn.textContent = "复制原文";
        if (live) live.textContent = "";
      }, 1500);
    } catch {
      if (live) live.textContent = "复制失败，请手动选择复制";
    }
  });
})();
