/**
 * Inline Reference 展开脚本（事件委托，复用站内 Overlay 交互范式）。
 * 触发点：正文 [data-inline-ref-id] 按钮；内容：预渲染于页面 <template data-inline-ref-template>。
 * 点击 → 克隆对应 refId 的 template 进浮层 body，设置 kicker/标题。支持展开/收起、Esc、点击遮罩关闭。
 * 用 data-inline-ref-* 选择器，与 Knowledge 浮层（data-site-overlay）互不干扰。
 */
(() => {
  const overlay = document.querySelector("[data-inline-ref-overlay]");
  const panel = document.querySelector("[data-inline-ref-panel]");
  const bodyEl = document.querySelector("[data-inline-ref-body]");
  const kickerEl = document.querySelector("[data-inline-ref-kicker]");
  const scrim = document.querySelector("[data-inline-ref-scrim]");
  const closeBtn = document.querySelector("[data-inline-ref-close]");
  if (!overlay || !panel || !bodyEl) return;

  const TYPE_LABEL = {
    "agent-response": "AGENT RESPONSE",
    prompt: "PROMPT",
    data: "DATA",
    note: "NOTE",
  };

  let activeTrigger = null;

  function open(refId) {
    const tpl = document.querySelector(
      `template[data-inline-ref-template="${CSS.escape(refId)}"]`
    );
    if (!tpl) return;
    const label = tpl.getAttribute("data-inline-ref-label") || "";
    const type = tpl.getAttribute("data-inline-ref-type") || "";
    if (kickerEl) kickerEl.textContent = TYPE_LABEL[type] || "REFERENCE";
    bodyEl.innerHTML = "";
    bodyEl.appendChild(tpl.content.cloneNode(true));
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
    activeTrigger = null;
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-inline-ref-id]");
    if (!t) return;
    e.preventDefault();
    const refId = t.dataset.inlineRefId;
    if (!refId) return;
    const alreadyOpen = overlay.hidden === false && t.getAttribute("aria-expanded") === "true";
    activeTrigger = t;
    if (alreadyOpen) close();
    else open(refId);
  });

  scrim?.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.hidden === false) {
      e.preventDefault();
      close();
      return;
    }
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
})();
