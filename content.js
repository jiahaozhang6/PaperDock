(function () {
  if (!isRuntimeAvailable()) return;
  const I18N = window.PaperDockI18n;
  const PANEL_LAYOUT_STORAGE_KEY = "panelLayout";
  const WEBCHAT_PDF_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
  const embeddedPanelPaper = readEmbeddedPanelPaper();
  const isEmbeddedPanel = Boolean(embeddedPanelPaper);
  let paper = embeddedPanelPaper || extractPaper();
  const probePromise = !isEmbeddedPanel && !isSupportedReadingPage(paper) && shouldProbePdfUrl(location.href)
    ? probeCurrentPdfDocument()
    : null;
  if (!isEmbeddedPanel && !isSupportedReadingPage(paper) && !probePromise) return;
  if (probePromise) {
    probePromise
      .then((detectedPaper) => {
        if (!detectedPaper) return;
        paper = detectedPaper;
        if (!paper.id) paper = ensureDocumentIdentity(paper);
        if (!paper.id && !paper.title) return;
        removeExistingPaperDockRoots();
        installIframePanel(paper);
      })
      .catch(() => {});
    return;
  }
  if (!paper.id) paper = ensureDocumentIdentity(paper);
  if (!paper.id && !paper.title) return;

  removeExistingPaperDockRoots();
  document.getElementById("paperdock-panel-static-fallback")?.remove();

  if (!isEmbeddedPanel && isPdfPage()) {
    installIframePanel(paper);
    return;
  }

  let currentConversation = null;
  let currentResult = "";
  let currentMode = "quick";
  let isPanelOpen = false;
  let currentSettings = null;
  let lastKnownModelProfiles = [];
  let selectedProfileId = "";
  let selectedModelLabel = "";
  let lastAppliedPreferredModelProfileId = "";
  let renderTimer = 0;
  let activeStreamCancel = null;
  let isGenerating = false;
  let historyJumpIndex = -1;
  let shouldAutoScrollConversation = true;
  let settingsRefreshPromise = null;
  let modelSelectInteractionGuardUntil = 0;
  let activeAppearance = "system";
  let currentLanguage = "";
  let systemAppearanceQuery = null;
  let systemAppearanceListenerInstalled = false;
  let panelLayout = getDefaultPanelLayout();
  let panelLayoutSaveTimer = 0;
  let embeddedLayoutMode = "dock";
  let zoteroHoverCollapseTimer = 0;
  let zoteroState = {
    open: false,
    loading: false,
    saving: false,
    suggesting: false,
    targets: [],
    selectedTargetId: "",
    filter: "",
    expandedTargetIds: [],
    hoverExpandedTargetIds: [],
    note: "",
    tags: "",
    suggestions: [],
    status: ""
  };

  const host = document.createElement("div");
  host.id = "paperdock-companion-root";
  host.dataset.extensionId = chrome.runtime.id || "";
  const shadow = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);
  if (!isEmbeddedPanel) {
    installPageSplitStyles();
  }

  const mathStyle = document.createElement("link");
  mathStyle.rel = "stylesheet";
  mathStyle.href = runtimeUrl("vendor/katex/katex.min.css");
  shadow.appendChild(mathStyle);

  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = runtimeUrl("content.css");
  shadow.appendChild(style);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <button class="pd-fab" type="button" title="PaperDock">AI</button>
    <section class="pd-panel" aria-label="PaperDock">
      <header class="pd-header">
        <div class="pd-title-block">
          <div class="pd-kicker">PaperDock</div>
          <h2></h2>
          <div class="pd-meta"></div>
        </div>
        <div class="pd-header-actions">
          <button class="pd-icon-button pd-layout-toggle" type="button" title="浮动窗口" data-i18n-title="floatPanel">⇱</button>
          <button class="pd-icon-button pd-restore-layout" type="button" title="还原尺寸" data-i18n-title="restorePanel">↺</button>
          <button class="pd-icon-button pd-close" type="button" title="折叠分屏" data-i18n-title="closeSplit">×</button>
        </div>
      </header>

      <div class="pd-toolbar">
        <div class="pd-shortcuts">
          <button data-mode="quick" type="button" data-i18n="quick">速览</button>
          <button data-mode="deep" type="button" data-i18n="deep">深读</button>
          <button data-mode="study" type="button" data-i18n="study">学习卡</button>
        </div>
        <div class="pd-tools">
          <label class="pd-model-picker">
            <span data-i18n="chatModel">模型</span>
            <select class="pd-model-select" title="切换当前聊天模型" data-i18n-title="switchChatModel"></select>
          </label>
          <label class="pd-toggle" title="聊天会优先抽取 PDF/正文全文；arXiv 页面失败时可再尝试 ar5iv，速度会慢一些" data-i18n-title="fullTextTitle">
            <input class="pd-fulltext" type="checkbox" checked disabled>
            <span data-i18n="fullText">全文</span>
          </label>
          <button class="pd-copy" type="button" title="复制 Markdown" data-i18n="copy" data-i18n-title="copyMarkdown">复制</button>
          <button class="pd-save" type="button" title="保存最后一条回答" data-i18n="save" data-i18n-title="saveLastAnswer">保存</button>
          <button class="pd-zotero" type="button" title="保存到 Zotero" data-i18n="zotero" data-i18n-title="zoteroTitle">Zotero</button>
          <button class="pd-review" type="button" title="打开复盘库" data-i18n="history" data-i18n-title="openReview">历史</button>
          <button class="pd-clear-chat" type="button" title="清空本篇对话" data-i18n="clear" data-i18n-title="clearChat">清空</button>
          <button class="pd-options" type="button" title="设置" data-i18n="settings" data-i18n-title="settings">设置</button>
        </div>
      </div>

      <div class="pd-chat-shell">
        <div class="pd-update-banner" hidden></div>
        <div class="pd-chat" role="log" aria-live="polite"></div>
      </div>

      <aside class="pd-zotero-drawer" hidden>
        <header class="pd-zotero-head">
          <div>
            <strong data-i18n="zoteroTitle">保存到 Zotero</strong>
            <span class="pd-zotero-subtitle pd-zotero-status">选择分类，也可以让模型推荐。</span>
          </div>
          <button class="pd-zotero-close" type="button" title="关闭" data-i18n-title="collapse">×</button>
        </header>
        <div class="pd-zotero-current">
          <span data-i18n="zoteroCurrentTarget">保存到</span>
          <strong class="pd-zotero-current-path" data-i18n="zoteroNoTargets">没有读取到可用分类。请确认 Zotero Desktop 已打开。</strong>
          <button class="pd-zotero-primary pd-zotero-save" type="button" data-i18n="zoteroSave">保存到 Zotero</button>
        </div>
        <div class="pd-zotero-actions">
          <button class="pd-zotero-load" type="button" data-i18n="zoteroLoadTargets">读取分类</button>
          <button class="pd-zotero-suggest" type="button" data-i18n="zoteroSuggest">AI 推荐</button>
        </div>
        <div class="pd-zotero-expanded">
          <label class="pd-zotero-search">
            <input class="pd-zotero-filter" type="search" placeholder="搜索 Zotero 分类..." data-i18n-placeholder="zoteroSearchPlaceholder">
          </label>
          <div class="pd-zotero-library">
            <div class="pd-zotero-suggestions"></div>
            <div class="pd-zotero-library-title" data-i18n="zoteroAllCollections">全部分类</div>
            <div class="pd-zotero-targets" role="listbox"></div>
          </div>
          <textarea class="pd-zotero-note" rows="2" placeholder="Add a note" data-i18n-placeholder="zoteroNotePlaceholder"></textarea>
          <input class="pd-zotero-tags" type="text" placeholder="Tags, separated by commas" data-i18n-placeholder="zoteroTagsPlaceholder">
        </div>
      </aside>

      <footer class="pd-composer">
        <textarea rows="1" placeholder="问这篇论文：方法假设、实验设计、局限、和你的方向有什么关系..." data-i18n-placeholder="askPlaceholder"></textarea>
        <div class="pd-history-jump" title="快速翻阅当前对话" data-i18n-title="historyJump">
          <button class="pd-history-prev" type="button" title="上一条历史对话" data-i18n-title="historyPrev">↑</button>
          <button class="pd-history-next" type="button" title="下一条历史对话" data-i18n-title="historyNext">↓</button>
        </div>
        <button class="pd-send" data-mode="ask" type="button" data-i18n="send">发送</button>
      </footer>
      <div class="pd-status" role="status"></div>
      <div class="pd-resize-edge" title="拖拽调整面板宽度" data-i18n-title="resizePanel" aria-hidden="true"></div>
      <div class="pd-resize-corner" title="拖拽调整浮动窗口大小" data-i18n-title="resizeFloatingPanel" aria-hidden="true"></div>
    </section>
  `;
  shadow.appendChild(wrapper);

  const $ = (selector) => shadow.querySelector(selector);
  const fab = $(".pd-fab");
  const panel = $(".pd-panel");
  const panelHeader = $(".pd-header");
  const title = $("h2");
  const meta = $(".pd-meta");
  const input = $(".pd-composer textarea");
  const status = $(".pd-status");
  const chat = $(".pd-chat");
  const updateBanner = $(".pd-update-banner");
  const fullTextToggle = $(".pd-fulltext");
  const modelSelect = $(".pd-model-select");
  const sendButton = $(".pd-send");
  const historyPrevButton = $(".pd-history-prev");
  const historyNextButton = $(".pd-history-next");
  const layoutToggleButton = $(".pd-layout-toggle");
  const restoreLayoutButton = $(".pd-restore-layout");
  const resizeEdge = $(".pd-resize-edge");
  const resizeCorner = $(".pd-resize-corner");
  const zoteroDrawer = $(".pd-zotero-drawer");
  const zoteroStatus = $(".pd-zotero-status");
  const zoteroTargets = $(".pd-zotero-targets");
  const zoteroSuggestions = $(".pd-zotero-suggestions");
  const zoteroFilter = $(".pd-zotero-filter");
  const zoteroNote = $(".pd-zotero-note");
  const zoteroTags = $(".pd-zotero-tags");
  const zoteroCurrentPath = $(".pd-zotero-current-path");
  fullTextToggle.checked = true;
  fullTextToggle.disabled = true;
  chat.addEventListener("scroll", updateConversationAutoScrollFromScroll, { passive: true });

  applyLanguage(currentLanguage);
  installPanelEventGuards();
  installPanelLayoutControls();
  installSettingsChangeListener();

  renderPaperHeader();

  if (isEmbeddedPanel) {
    isPanelOpen = true;
    panel.classList.add("is-open", "is-embedded");
    fab.remove();
  } else {
    installFabOpenHandlers();
  }
  onClick(".pd-close", () => {
    if (isEmbeddedPanel) {
      parent.postMessage({ type: "pd-close-panel" }, "*");
      return;
    }
    togglePanel(false);
  });
  onClick(".pd-options", () => safeSendRuntimeMessage({ type: "openOptions" }));
  onClick(".pd-review", () => safeSendRuntimeMessage({ type: "openReview" }));
  onClick(".pd-copy", copyCurrentMarkdown);
  onClick(".pd-save", saveCurrentNote);
  onClick(".pd-zotero", openZoteroDrawer);
  onClick(".pd-zotero-close", closeZoteroDrawer);
  onClick(".pd-zotero-load", loadZoteroTargets);
  onClick(".pd-zotero-suggest", suggestZoteroTargets);
  onClick(".pd-zotero-save", saveToZotero);
  onClick(".pd-clear-chat", clearCurrentConversation);
  onClick(".pd-history-prev", () => jumpConversationMessage(-1));
  onClick(".pd-history-next", () => jumpConversationMessage(1));
  onClick(".pd-layout-toggle", togglePanelLayoutMode);
  onClick(".pd-restore-layout", restorePanelLayout);
  modelSelect.addEventListener("change", switchChatModel);
  ["pointerdown", "mousedown", "click", "focus", "keydown"].forEach((type) => {
    modelSelect.addEventListener(type, markModelSelectInteraction, { capture: true });
  });
  zoteroFilter?.addEventListener("input", () => {
    zoteroState.filter = zoteroFilter.value;
    renderZoteroTargets();
  });
  zoteroNote?.addEventListener("input", () => {
    zoteroState.note = zoteroNote.value;
  });
  zoteroTags?.addEventListener("input", () => {
    zoteroState.tags = zoteroTags.value;
  });
  zoteroTargets?.addEventListener("click", (event) => {
    const toggle = event.target?.closest?.(".pd-zotero-tree-toggle");
    if (toggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleZoteroTreeNode(toggle.dataset.targetId || "");
      return;
    }
    const button = event.target?.closest?.(".pd-zotero-target");
    if (!button) return;
    if (button.getAttribute("aria-disabled") === "true") return;
    zoteroState.selectedTargetId = button.dataset.targetId || "";
    renderZoteroDrawer();
  });
  zoteroTargets?.addEventListener("pointerover", (event) => {
    const row = event.target?.closest?.(".pd-zotero-target");
    if (!row) return;
    expandZoteroTargetOnHover(row.dataset.targetId || "");
  });
  zoteroTargets?.addEventListener("pointerout", (event) => {
    const row = event.target?.closest?.(".pd-zotero-target");
    if (!row) return;
    collapseZoteroTargetOnLeave(row.dataset.targetId || "", event);
  });
  zoteroTargets?.addEventListener("pointerleave", () => {
    clearZoteroHoverExpandedTargets();
  });
  zoteroSuggestions?.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-target-id]");
    if (!button) return;
    zoteroState.selectedTargetId = button.dataset.targetId || "";
    renderZoteroDrawer();
  });

  shadow.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("pd-send") && isGenerating) {
        stopCurrentGeneration();
        return;
      }
      runTurn(button.dataset.mode);
    });
  });
  if (!isEmbeddedPanel) {
    window.addEventListener("resize", () => {
      panelLayout = normalizePanelLayout(panelLayout);
      applyPanelLayout(false);
    });
  }
  window.addEventListener("focus", () => {
    if (isPanelOpen && !isPanelInteractionActive()) refreshSettings({ silent: true }).catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && isPanelOpen && !isPanelInteractionActive()) refreshSettings({ silent: true }).catch(() => {});
  });

  input.addEventListener("input", autoResizeInput);
  input.addEventListener("pointerdown", () => {
    setTimeout(() => input.focus(), 0);
  });
  input.addEventListener("click", () => {
    setTimeout(() => input.focus(), 0);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (isGenerating) {
        stopCurrentGeneration();
        return;
      }
      runTurn("ask");
      return;
    }
    scheduleKeyboardFallback(event);
  });

  loadInitialState();
  hydratePaperMetadata();
  notifyEmbeddedPanelReady();

  function togglePanel(force) {
    isPanelOpen = typeof force === "boolean" ? force : !isPanelOpen;
    panel.classList.toggle("is-open", isPanelOpen);
    fab.classList.toggle("is-hidden", isPanelOpen);
    applyPanelLayout(false);
    if (isPanelOpen) {
      refreshSettings({ silent: true }).catch(() => {});
      renderConversation(currentConversation);
      setTimeout(() => focusComposerInput(), 40);
    }
  }

  function installFabOpenHandlers() {
    if (!fab) return;
    const openFromEvent = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (typeof event?.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      togglePanel(true);
    };
    ["pointerdown", "pointerup", "mousedown", "mouseup", "click"].forEach((type) => {
      fab.addEventListener(type, openFromEvent, { capture: true });
    });
    fab.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      openFromEvent(event);
    }, { capture: true });
  }

  function focusComposerInput() {
    input.focus();
  }

  function onClick(selector, handler) {
    const node = $(selector);
    if (!node) return;
    node.addEventListener("click", (event) => {
      try {
        const result = handler(event);
        if (result && typeof result.catch === "function") {
          result.catch(showExtensionReloadNotice);
        }
      } catch (error) {
        showExtensionReloadNotice(error);
      }
    });
  }

  function applyPageSplit(open) {
    if (isEmbeddedPanel) return;
    panelLayout = normalizePanelLayout(panelLayout);
    const width = panelLayout.dockWidth;
    document.documentElement.style.setProperty("--pd-split-width", `${width}px`);
    document.documentElement.classList.toggle("pd-page-split-active", Boolean(open && panelLayout.mode !== "float"));
  }

  async function loadPanelLayout() {
    panelLayout = getDefaultPanelLayout();
    if (isEmbeddedPanel) {
      parent.postMessage({ type: "pd-request-layout" }, "*");
      applyEmbeddedPanelLayout();
      return;
    }
    try {
      const stored = await readStorageArea("local", PANEL_LAYOUT_STORAGE_KEY);
      panelLayout = normalizePanelLayout(stored?.[PANEL_LAYOUT_STORAGE_KEY]);
    } catch {
      panelLayout = getDefaultPanelLayout();
    }
    applyPanelLayout(false);
  }

  function installPanelLayoutControls() {
    resizeEdge?.addEventListener("pointerdown", startPanelResize);
    resizeCorner?.addEventListener("pointerdown", startPanelResize);
    panelHeader?.addEventListener("pointerdown", startPanelDrag);
    if (!isEmbeddedPanel) return;
    window.addEventListener("message", (event) => {
      if (event.source !== parent) return;
      if (event.data?.type !== "pd-panel-layout") return;
      embeddedLayoutMode = event.data.layout?.mode === "float" ? "float" : "dock";
      applyEmbeddedPanelLayout();
    });
  }

  function togglePanelLayoutMode() {
    if (isEmbeddedPanel) {
      parent.postMessage({ type: "pd-toggle-layout" }, "*");
      return;
    }
    panelLayout = normalizePanelLayout({
      ...panelLayout,
      mode: panelLayout.mode === "float" ? "dock" : "float"
    });
    applyPanelLayout(true);
  }

  function restorePanelLayout() {
    if (isEmbeddedPanel) {
      parent.postMessage({ type: "pd-restore-layout" }, "*");
      return;
    }
    panelLayout = getDefaultPanelLayout();
    applyPanelLayout(true);
  }

  function applyPanelLayout(shouldSave) {
    if (isEmbeddedPanel) {
      applyEmbeddedPanelLayout();
      return;
    }
    panelLayout = normalizePanelLayout(panelLayout);
    const floating = panelLayout.mode === "float";
    panel.classList.toggle("is-floating", floating);
    panel.style.setProperty("--pd-split-width", `${panelLayout.dockWidth}px`);
    panel.style.setProperty("--pd-float-width", `${panelLayout.floatWidth}px`);
    panel.style.setProperty("--pd-float-height", `${panelLayout.floatHeight}px`);
    panel.style.setProperty("--pd-float-top", `${panelLayout.floatTop}px`);
    panel.style.setProperty("--pd-float-right", `${panelLayout.floatRight}px`);
    applyPageSplit(isPanelOpen);
    updateLayoutButtons(floating);
    if (shouldSave) savePanelLayout();
  }

  function applyEmbeddedPanelLayout() {
    const floating = embeddedLayoutMode === "float";
    panel.classList.toggle("is-floating", floating);
    updateLayoutButtons(floating);
  }

  function updateLayoutButtons(floating) {
    if (layoutToggleButton) {
      layoutToggleButton.textContent = floating ? "▣" : "⇱";
      layoutToggleButton.dataset.i18nTitle = floating ? "dockPanel" : "floatPanel";
      layoutToggleButton.title = t(floating ? "dockPanel" : "floatPanel");
      layoutToggleButton.setAttribute("aria-pressed", floating ? "true" : "false");
    }
    if (restoreLayoutButton) {
      restoreLayoutButton.title = t("restorePanel");
    }
  }

  function savePanelLayout() {
    if (isEmbeddedPanel) return;
    clearTimeout(panelLayoutSaveTimer);
    panelLayoutSaveTimer = setTimeout(() => {
      try {
        chrome.storage?.local?.set({ [PANEL_LAYOUT_STORAGE_KEY]: panelLayout });
      } catch {
        // Layout persistence is best-effort; the panel still works for the current page.
      }
    }, 120);
  }

  function startPanelResize(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    if (isEmbeddedPanel) {
      const kind = panel.classList.contains("is-floating") || event.currentTarget?.classList.contains("pd-resize-corner")
        ? "corner"
        : "edge";
      postEmbeddedPointerGesture(event, "pd-resize", { kind });
      return;
    }
    const floating = panelLayout.mode === "float" || event.currentTarget?.classList.contains("pd-resize-corner");
    const start = {
      x: event.clientX,
      y: event.clientY,
      layout: { ...panelLayout },
      floating
    };
    panel.classList.add("is-resizing");
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    const onMove = (moveEvent) => {
      if (floating) {
        panelLayout = normalizePanelLayout({
          ...start.layout,
          mode: "float",
          floatWidth: start.layout.floatWidth + (start.x - moveEvent.clientX),
          floatHeight: start.layout.floatHeight + (moveEvent.clientY - start.y)
        });
      } else {
        panelLayout = normalizePanelLayout({
          ...start.layout,
          dockWidth: start.layout.dockWidth + (start.x - moveEvent.clientX)
        });
      }
      applyPanelLayout(false);
    };
    const onUp = () => {
      panel.classList.remove("is-resizing");
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
      savePanelLayout();
    };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
  }

  function startPanelDrag(event) {
    if (event.button !== 0) return;
    if (event.target?.closest?.("button, select, textarea, input, a")) return;
    if (!panel.classList.contains("is-floating")) return;
    event.preventDefault();
    if (isEmbeddedPanel) {
      postEmbeddedPointerGesture(event, "pd-drag");
      return;
    }
    const start = {
      x: event.clientX,
      y: event.clientY,
      layout: { ...panelLayout }
    };
    panel.classList.add("is-dragging");
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    const onMove = (moveEvent) => {
      panelLayout = normalizePanelLayout({
        ...start.layout,
        floatTop: start.layout.floatTop + (moveEvent.clientY - start.y),
        floatRight: start.layout.floatRight - (moveEvent.clientX - start.x)
      });
      applyPanelLayout(false);
    };
    const onUp = () => {
      panel.classList.remove("is-dragging");
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
      savePanelLayout();
    };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
  }

  function postEmbeddedPointerGesture(event, action, extra = {}) {
    const pointerId = event.pointerId;
    const post = (type, pointerEvent) => {
      parent.postMessage({
        type,
        pointerId,
        screenX: pointerEvent.screenX,
        screenY: pointerEvent.screenY,
        ...extra
      }, "*");
    };
    const onMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      post(`${action}-move`, moveEvent);
    };
    const onUp = (upEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      post(`${action}-end`, upEvent);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
    };
    event.currentTarget?.setPointerCapture?.(pointerId);
    post(`${action}-start`, event);
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
  }

  function removeExistingPaperDockRoots() {
    document.getElementById("paperdock-companion-root")?.remove();
    document.getElementById("paperdock-companion-frame-root")?.remove();
    document.documentElement.classList.remove("pd-page-split-active");
  }

  function renderPaperHeader() {
    title.textContent = displayPaperTitle(paper);
    meta.textContent = buildPaperMeta(paper);
  }

  async function hydratePaperMetadata() {
    if (!paper.id || hasUsefulPaperMetadata(paper)) return;
    try {
      const enriched = await fetchAbsPaperMetadata(paper.id);
      if (!enriched) return;
      paper = {
        ...paper,
        ...Object.fromEntries(
          Object.entries(enriched).filter(([, value]) => clean(value))
        ),
        pdfUrl: paper.pdfUrl || enriched.pdfUrl
      };
      renderPaperHeader();
    } catch {
      // Metadata enrichment is best-effort; the PDF text path still works with the arXiv ID.
    }
  }

  function installPanelEventGuards() {
    const guardedEvents = [
      "keydown",
      "keyup",
      "keypress",
      "beforeinput",
      "input",
      "compositionstart",
      "compositionupdate",
      "compositionend",
      "paste",
      "copy",
      "cut",
      "pointerdown",
      "pointerup",
      "mousedown",
      "mouseup",
      "click",
      "dblclick",
      "wheel",
      "touchstart",
      "touchmove"
    ];

    for (const type of guardedEvents) {
      shadow.addEventListener(type, guardPanelEvent, false);
      host.addEventListener(type, guardPanelEvent, false);
    }
  }

  function guardPanelEvent(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (!path.includes(host)) return;

    if (isNativeSelectOpenEvent(event, path)) {
      markModelSelectInteraction();
      return;
    }

    if (isTextInputEvent(event) && path.includes(input)) {
      if (event.type === "keydown" && event.key === "Enter" && !event.shiftKey && !event.isComposing && !event.defaultPrevented) {
        event.preventDefault();
        runTurn("ask");
      }
      setTimeout(autoResizeInput, 0);
    }

    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  }

  function scheduleKeyboardFallback(event) {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!isManualEditableKey(event)) return;

    const before = {
      value: input.value,
      start: input.selectionStart,
      end: input.selectionEnd
    };

    setTimeout(() => {
      if (document.activeElement !== input && shadow.activeElement !== input) return;
      const unchanged = input.value === before.value &&
        input.selectionStart === before.start &&
        input.selectionEnd === before.end;
      if (!unchanged) return;
      applyManualKeyToEditable(input, event, before);
    }, 0);
  }

  function isManualEditableKey(event) {
    return event.key.length === 1 ||
      event.key === "Backspace" ||
      event.key === "Delete" ||
      event.key === "Enter" ||
      event.key === "Tab";
  }

  function applyManualKeyToEditable(target, event, before = readEditableState(target)) {
    if (!target || typeof target.setRangeText !== "function") return;
    let text = "";
    let start = before.start;
    let end = before.end;

    if (event.key.length === 1) {
      text = event.key;
    } else if (event.key === "Enter") {
      if (target.tagName === "INPUT") return;
      text = "\n";
    } else if (event.key === "Tab") {
      text = "  ";
    } else if (event.key === "Backspace") {
      if (start === end && start > 0) start -= 1;
    } else if (event.key === "Delete") {
      if (start === end && end < before.value.length) end += 1;
    } else {
      return;
    }

    target.setSelectionRange(start, end);
    target.setRangeText(text, start, end, "end");
    target.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      composed: true,
      inputType: text ? "insertText" : "deleteContentBackward",
      data: text || null
    }));
    if (target === input) autoResizeInput();
  }

  function readEditableState(target) {
    const value = typeof target?.value === "string" ? target.value : "";
    const start = Number.isInteger(target?.selectionStart) ? target.selectionStart : value.length;
    const end = Number.isInteger(target?.selectionEnd) ? target.selectionEnd : start;
    return { value, start, end };
  }

  function isTextInputEvent(event) {
    return [
      "keydown",
      "keyup",
      "keypress",
      "beforeinput",
      "input",
      "compositionstart",
      "compositionupdate",
      "compositionend",
      "paste",
      "cut"
    ].includes(event.type);
  }

  async function runTurn(mode) {
    if (isGenerating) return;
    await refreshSettings({ silent: true });
    const selectedProfile = getSelectedProfile();
    if (!selectedProfile) {
      setStatus(t("noModelSelected"), true);
      renderModelSelect();
      return;
    }
    const userText = mode === "ask" ? input.value.trim() : modeToUserText(mode, currentLanguage);
    if (mode === "ask" && !userText) {
      setStatus(t("emptyQuestion"), true);
      return;
    }

    currentMode = mode;
    const contextMode = resolveTurnContextMode(mode);
    historyJumpIndex = -1;
    shouldAutoScrollConversation = true;
    setBusy(true);
    setStatus(withWebChatLoginReminder(contextMode === "full" ? t("preparingFull") : t("preparingFast"), selectedProfile));
    const preview = appendPreviewTurn(userText);
    let latestStreamMeta = null;
    if (mode === "ask") {
      input.value = "";
      autoResizeInput();
    }

    try {
      const paperPayload = await buildPaperPayloadForTurn(contextMode);
      if (paperPayload.fullText) {
        setStatus(`${t("preparingFull")} · ${t("pdfTextReady", { chars: formatTokenCount(paperPayload.fullText.length) })}`);
      } else if (paperPayload.contextSource) {
        setStatus(`${t("preparingFull")} · ${paperPayload.contextSource}`);
      }
      const response = await sendStreamMessage({
        type: "summarizePaper",
        paper: paperPayload,
        mode,
        question: userText,
        persist: false,
        contextMode,
        profileId: selectedProfileId,
        conversationMessages: getConversationMessagesForRequest(),
        webchatSessions: currentConversation?.webchatSessions || {},
        webchatSession: getSelectedWebChatSession()
      }, {
        onMeta(meta) {
          latestStreamMeta = meta || latestStreamMeta;
          const source = meta?.source ? ` · ${meta.source}` : "";
          const usage = formatContextUsage(meta, currentLanguage);
          setStatus(`${t("generating")}${source}${usage ? ` · ${usage}` : ""}`);
        },
        onWebChatStatus(status) {
          const label = status?.label || "WebChat";
          const statusText = formatWebChatStatus(status, label);
          if (statusText) setStatus(statusText);
        },
        onDelta(text) {
          updatePreviewAssistant(preview, text || t("generatedFallback"));
        }
      });
      currentResult = response.text;
      currentConversation = response.conversation || finalizePreviewConversation(preview, response.text, {
        webchatSession: response.webchatSession
      });
      flushScheduledRender();
      renderConversation(currentConversation);
      const usage = formatContextUsage(response, currentLanguage);
      setStatus(`${t("done")} · ${response.source}${usage ? ` · ${usage}` : ""}`);
    } catch (error) {
      if (error?.name === "AbortError" || error?.message === "generation-aborted") {
        await preserveStoppedGeneration({
          preview,
          mode,
          question: userText,
          meta: latestStreamMeta,
          partialText: error.partialText || getPreviewAssistantText(preview)
        });
      } else if (cleanPartialGenerationText(error?.partialText)) {
        await preserveStoppedGeneration({
          preview,
          mode,
          question: userText,
          meta: latestStreamMeta,
          partialText: error.partialText
        });
        setStatus(error.message || "流式连接已断开，已保留已生成内容。", true);
      } else if (isExtensionContextInvalidated(error)) {
        renderConversation(currentConversation);
        if (mode === "ask") input.value = userText;
        showExtensionReloadNotice(error);
      } else {
        renderConversation(currentConversation);
        if (mode === "ask") input.value = userText;
        setStatus(error.message || String(error), true);
      }
    } finally {
      fullTextToggle.checked = true;
      setBusy(false);
      autoResizeInput();
    }
  }

  function flushScheduledRender() {
    if (!renderTimer) return;
    clearTimeout(renderTimer);
    renderTimer = 0;
  }

  async function loadInitialState() {
    await loadPanelLayout();
    const loaded = await refreshSettings({ silent: true });
    if (!loaded && !lastKnownModelProfiles.length) {
      currentSettings = null;
      selectedProfileId = "";
      selectedModelLabel = "";
      applyLanguage("system");
      applyAppearance("system");
      renderModelSelect();
      renderUpdateBanner();
    } else if (!loaded) {
      renderModelSelect();
      renderUpdateBanner();
    }
    await loadConversation();
  }

  async function openZoteroDrawer() {
    zoteroState.open = true;
    zoteroDrawer.hidden = false;
    renderZoteroDrawer();
    if (!zoteroState.targets.length && !zoteroState.loading) {
      await loadZoteroTargets();
    }
  }

  function isNativeSelectOpenEvent(event, path) {
    if (!modelSelect || !path.includes(modelSelect)) return false;
    if (["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "touchstart", "touchmove", "wheel"].includes(event.type)) {
      return true;
    }
    if (event.type !== "keydown") return false;
    return ["ArrowDown", "ArrowUp", "Enter", " ", "Spacebar", "Escape", "Tab"].includes(event.key);
  }

  function markModelSelectInteraction() {
    modelSelectInteractionGuardUntil = Date.now() + 1500;
  }

  function isModelSelectInteractionActive() {
    const active = shadow.activeElement;
    return Date.now() < modelSelectInteractionGuardUntil ||
      active === modelSelect;
  }

  function isPanelEditingInteractionActive() {
    return isPanelEditable(shadow.activeElement);
  }

  function isPanelEditable(node) {
    if (!node) return false;
    if (node.isContentEditable) return true;
    const tagName = String(node.tagName || "").toLowerCase();
    return tagName === "textarea" ||
      tagName === "select" ||
      (tagName === "input" && node.type !== "button" && node.type !== "submit" && node.type !== "reset");
  }

  function isPanelInteractionActive() {
    return isModelSelectInteractionActive() || isPanelEditingInteractionActive();
  }

  function closeZoteroDrawer() {
    zoteroState.open = false;
    zoteroDrawer.hidden = true;
  }

  function renderZoteroDrawer() {
    zoteroDrawer.hidden = !zoteroState.open;
    zoteroStatus.textContent = zoteroState.status || "";
    zoteroStatus.classList.toggle("is-error", /^error:/i.test(zoteroState.status));
    const loadButton = $(".pd-zotero-load");
    const suggestButton = $(".pd-zotero-suggest");
    const saveButton = $(".pd-zotero-save");
    if (loadButton) loadButton.disabled = zoteroState.loading;
    if (suggestButton) suggestButton.disabled = zoteroState.loading || zoteroState.suggesting || !zoteroState.targets.length;
    if (saveButton) saveButton.disabled = zoteroState.loading || zoteroState.saving || !zoteroState.selectedTargetId;
    if (zoteroNote && zoteroNote.value !== zoteroState.note) zoteroNote.value = zoteroState.note;
    if (zoteroTags && zoteroTags.value !== zoteroState.tags) zoteroTags.value = zoteroState.tags;
    if (zoteroCurrentPath) {
      zoteroCurrentPath.textContent = getZoteroTargetPath(zoteroState.selectedTargetId) || t("zoteroNoTargets");
    }
    renderZoteroSuggestions();
    renderZoteroTargets();
  }

  async function loadZoteroTargets() {
    zoteroState = {
      ...zoteroState,
      loading: true,
      status: t("zoteroConnecting"),
      suggestions: []
    };
    renderZoteroDrawer();
    try {
      const payload = await sendMessage({ type: "zoteroGetTargets" });
      const targets = Array.isArray(payload?.targets) ? payload.targets : [];
      zoteroState = {
        ...zoteroState,
        loading: false,
        targets,
        selectedTargetId: payload?.selectedTargetId || targets[0]?.id || "",
        expandedTargetIds: getExpandedZoteroAncestorIds(targets, payload?.selectedTargetId || targets[0]?.id || ""),
        hoverExpandedTargetIds: [],
        status: targets.length ? t("zoteroTargetsLoaded", { count: targets.length }) : t("zoteroNoTargets")
      };
    } catch (error) {
      zoteroState = {
        ...zoteroState,
        loading: false,
        status: `error: ${error.message || String(error)}`
      };
    }
    renderZoteroDrawer();
  }

  function renderZoteroTargets() {
    if (!zoteroTargets) return;
    const rows = buildZoteroTargetTreeRows(zoteroState.targets, {
      expandedIds: getVisibleZoteroExpandedTargetIds(),
      activeId: zoteroState.selectedTargetId,
      filter: zoteroState.filter
    });
    if (!rows.length) {
      zoteroTargets.innerHTML = `<div class="pd-zotero-empty">${escapeHtml(t("zoteroNoTargets"))}</div>`;
      return;
    }
    zoteroTargets.innerHTML = rows.slice(0, 180).map((target) => {
      const isLibrary = target.id.startsWith("L");
      const selected = target.id === zoteroState.selectedTargetId;
      const path = getZoteroTargetPath(target.id) || target.name;
      const disabled = target.disabled || target.filesEditable === false;
      const expanded = target.isExpanded === true;
      const expandedAttr = target.hasChildren ? `aria-expanded="${expanded ? "true" : "false"}"` : "";
      return `
        <div class="pd-zotero-target${selected ? " is-selected" : ""}${isLibrary ? " is-library" : ""}${target.hasChildren ? " has-children" : ""}"
             data-target-id="${escapeHtml(target.id)}"
             data-has-children="${target.hasChildren ? "true" : "false"}"
             style="--level:${Math.min(5, Number(target.level) || 0)}"
             role="option"
             aria-disabled="${disabled ? "true" : "false"}"
             aria-selected="${selected ? "true" : "false"}"
             ${expandedAttr}>
          <button class="pd-zotero-tree-toggle"
                  type="button"
                  data-target-id="${escapeHtml(target.id)}"
                  aria-label="${expanded ? "Collapse collection" : "Expand collection"}"
                  ${target.hasChildren ? "" : "hidden"}>${expanded ? "▾" : "▸"}</button>
          <span class="pd-zotero-target-text">
            <span class="pd-zotero-target-name">${escapeHtml(target.name)}</span>
          </span>
          ${isLibrary ? "" : `<span class="pd-zotero-target-path">${escapeHtml(path)}</span>`}
        </div>
      `;
    }).join("");
  }

  function expandZoteroTargetOnHover(targetId) {
    const target = findZoteroTarget(targetId);
    if (!target || !hasZoteroTargetChildren(target.id)) return;
    if (zoteroState.expandedTargetIds.includes(target.id) || zoteroState.hoverExpandedTargetIds.includes(target.id)) return;
    zoteroState.hoverExpandedTargetIds = [...zoteroState.hoverExpandedTargetIds, target.id];
    renderZoteroTargets();
  }

  function collapseZoteroTargetOnLeave(_targetId, event) {
    scheduleCollapseZoteroHoverBranches(event);
  }

  function scheduleCollapseZoteroHoverBranches(event) {
    if (!zoteroState.hoverExpandedTargetIds.length) return;
    if (zoteroHoverCollapseTimer) clearTimeout(zoteroHoverCollapseTimer);
    const relatedRow = event?.relatedTarget?.closest?.(".pd-zotero-target");
    const point = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)
      ? { x: event.clientX, y: event.clientY }
      : null;
    zoteroHoverCollapseTimer = setTimeout(() => {
      zoteroHoverCollapseTimer = 0;
      const currentRow = getRelatedZoteroTargetRow(relatedRow) || getZoteroTargetRowAtPoint(point);
      const nextIds = pruneZoteroHoverExpandedTargetIds(currentRow?.dataset.targetId || "");
      if (arraysEqual(zoteroState.hoverExpandedTargetIds, nextIds)) return;
      zoteroState.hoverExpandedTargetIds = nextIds;
      renderZoteroTargets();
    }, 90);
  }

  function clearZoteroHoverExpandedTargets() {
    if (zoteroHoverCollapseTimer) {
      clearTimeout(zoteroHoverCollapseTimer);
      zoteroHoverCollapseTimer = 0;
    }
    if (!zoteroState.hoverExpandedTargetIds.length) return;
    zoteroState.hoverExpandedTargetIds = [];
    renderZoteroTargets();
  }

  function toggleZoteroTreeNode(targetId) {
    const target = findZoteroTarget(targetId);
    if (!target || !hasZoteroTargetChildren(target.id)) return;
    const expanded = zoteroState.expandedTargetIds.includes(target.id);
    zoteroState.expandedTargetIds = expanded
      ? zoteroState.expandedTargetIds.filter((id) => id !== target.id)
      : [...zoteroState.expandedTargetIds, target.id];
    zoteroState.hoverExpandedTargetIds = zoteroState.hoverExpandedTargetIds.filter((id) => id !== target.id);
    renderZoteroTargets();
  }

  function renderZoteroSuggestions() {
    if (!zoteroSuggestions) return;
    const rows = Array.isArray(zoteroState.suggestions) ? zoteroState.suggestions : [];
    if (!rows.length) {
      zoteroSuggestions.innerHTML = "";
      return;
    }
    zoteroSuggestions.innerHTML = `
      <div class="pd-zotero-suggestion-title">${escapeHtml(t("zoteroSuggestedTargets"))}</div>
      ${rows.map((row) => `
        <button class="pd-zotero-suggestion" type="button" data-target-id="${escapeHtml(row.targetId)}">
          <strong>${escapeHtml(row.path || row.name || row.targetId)}</strong>
          <span>${escapeHtml(row.reason || t("zoteroSuggestedReason"))}</span>
        </button>
      `).join("")}
    `;
  }

  async function suggestZoteroTargets() {
    if (!zoteroState.targets.length) await loadZoteroTargets();
    const selectedProfile = getSelectedProfile();
    zoteroState = {
      ...zoteroState,
      suggesting: true,
      status: t("zoteroSuggesting")
    };
    renderZoteroDrawer();
    try {
      const response = await sendMessage({
        type: "zoteroSuggestTargets",
        paper,
        targets: zoteroState.targets,
        profileId: selectedProfile?.id || selectedProfileId,
        selectedTargetId: zoteroState.selectedTargetId
      });
      const modelSuggestions = Array.isArray(response?.suggestions) ? response.suggestions : [];
      const suggestions = modelSuggestions.length
        ? modelSuggestions
        : createLocalZoteroSuggestionFallback();
      zoteroState = {
        ...zoteroState,
        suggesting: false,
        suggestions,
        selectedTargetId: suggestions[0]?.targetId || zoteroState.selectedTargetId,
        status: suggestions.length ? t("zoteroSuggestedCount", { count: suggestions.length }) : t("zoteroNoSuggestion")
      };
    } catch (error) {
      zoteroState = {
        ...zoteroState,
        suggesting: false,
        status: `error: ${error.message || String(error)}`
      };
    }
    renderZoteroDrawer();
  }

  function createLocalZoteroSuggestionFallback() {
    return window.PaperDockZotero?.createSuggestionFallback?.(paper, zoteroState.targets, {
      selectedTargetId: zoteroState.selectedTargetId
    }) || [];
  }

  async function saveToZotero() {
    if (!zoteroState.targets.length) await loadZoteroTargets();
    if (!zoteroState.selectedTargetId) {
      zoteroState.status = t("zoteroSelectTarget");
      renderZoteroDrawer();
      return;
    }
    zoteroState = {
      ...zoteroState,
      saving: true,
      status: t("zoteroSaving")
    };
    renderZoteroDrawer();
    try {
      const payload = { ...paper };
      await prepareZoteroPdfPayload(payload);
      await requestZoteroCookiePermission(payload);
      const response = await sendMessage({
        type: "zoteroSavePaper",
        paper: payload,
        targetId: zoteroState.selectedTargetId,
        summary: currentResult || findLastAssistantText(currentConversation),
        conversation: currentConversation,
        noteText: zoteroState.note,
        tags: parseZoteroTags(zoteroState.tags),
        attachPdf: true
      });
      const pdfText = response?.pdf?.saved
        ? t("zoteroPdfSaved")
        : response?.pdf?.requested
          ? t("zoteroPdfFailed", { error: response.pdf.error || "" })
          : "";
      zoteroState = {
        ...zoteroState,
        saving: false,
        status: [t("zoteroSaved", { target: response?.target?.path || response?.target?.name || "" }), pdfText].filter(Boolean).join(" · ")
      };
    } catch (error) {
      zoteroState = {
        ...zoteroState,
        saving: false,
        status: `error: ${error.message || String(error)}`
      };
    }
    renderZoteroDrawer();
  }

  async function prepareZoteroPdfPayload(payload) {
    const pdfUrl = getWebChatPdfCandidateUrl(payload);
    if (!canFetchPdfBytesInPage(pdfUrl)) return payload;
    const filename = buildPdfUploadFilename(payload);
    try {
      const result = await sendMessage({
        type: "fetchPdfAsBase64",
        url: pdfUrl,
        filename
      });
      if (result?.base64 && result.generated !== true) {
        payload.webchatPdf = {
          ...result,
          source: result.source || "background-fetch"
        };
        return payload;
      }
    } catch (error) {
      payload.zoteroPdfPrepareError = error.message || String(error);
    }
    try {
      const result = await fetchPdfAsBase64InPage(pdfUrl, filename);
      if (result?.base64 && result.generated !== true) {
        payload.webchatPdf = {
          ...result,
          source: result.source || "page-session-fetch"
        };
      }
    } catch (error) {
      payload.zoteroPdfPrepareError = [payload.zoteroPdfPrepareError, error.message || String(error)].filter(Boolean).join("；");
    }
    return payload;
  }

  async function requestZoteroCookiePermission(payload) {
    const origins = getZoteroPermissionOrigins(payload);
    if (!origins.length) return;
    try {
      const result = await sendMessage({
        type: "zoteroEnsureCookiePermission",
        origins
      });
      if (!result?.granted) {
        zoteroState.status = t("zoteroCookiePermission");
        renderZoteroDrawer();
      }
    } catch {
      zoteroState.status = t("zoteroCookiePermission");
      renderZoteroDrawer();
    }
  }

  function getZoteroPermissionOrigins(payload) {
    return [...new Set([payload?.pdfUrl, payload?.pageUrl, location.href]
      .map((url) => {
        try {
          const parsed = new URL(clean(url));
          if (!/^https?:$/.test(parsed.protocol)) return "";
          return `${parsed.protocol}//${parsed.host}/*`;
        } catch {
          return "";
        }
      })
      .filter(Boolean))];
  }

  function parseZoteroTags(value) {
    return String(value || "")
      .split(/[,，;；\n]/)
      .map((tag) => clean(tag))
      .filter(Boolean)
      .slice(0, 20);
  }

  function getZoteroTargetPath(targetId) {
    return window.PaperDockZotero?.formatZoteroTargetPath?.(zoteroState.targets, targetId) ||
      formatZoteroTargetPathFallback(zoteroState.targets, targetId) ||
      zoteroState.targets.find((target) => target.id === targetId)?.name ||
      "";
  }

  function buildZoteroTargetTreeRows(targets = [], options = {}) {
    const sharedRows = window.PaperDockZotero?.buildZoteroTargetTreeRows?.(targets, options);
    return Array.isArray(sharedRows) ? sharedRows : buildZoteroTargetTreeRowsFallback(targets, options);
  }

  function buildZoteroTargetTreeRowsFallback(targets = [], options = {}) {
    const rows = (Array.isArray(targets) ? targets : [])
      .map((target, index) => {
        const level = Number(target.level) || 0;
        const nextLevel = Number(targets[index + 1]?.level);
        return {
          ...target,
          level,
          hasChildren: Number.isFinite(nextLevel) && nextLevel > level
        };
      })
      .filter((target) => target.id && target.name);
    const expandedIds = new Set(Array.isArray(options.expandedIds) ? options.expandedIds.map((id) => clean(id)) : []);
    const activeId = clean(options.activeId);
    for (const ancestorId of getZoteroTargetAncestorIdsFallback(rows, activeId)) expandedIds.add(ancestorId);
    const filter = clean(options.filter).toLowerCase();
    const visibleIds = new Set();
    if (filter) {
      for (const target of rows) {
        const path = formatZoteroTargetPathFallback(rows, target.id) || target.name;
        if (!path.toLowerCase().includes(filter)) continue;
        visibleIds.add(target.id);
        for (const ancestorId of getZoteroTargetAncestorIdsFallback(rows, target.id)) {
          visibleIds.add(ancestorId);
          expandedIds.add(ancestorId);
        }
      }
    }
    return rows
      .filter((target) => {
        if (filter) return visibleIds.has(target.id);
        if (!getZoteroTargetAncestorIdsFallback(rows, target.id).length) return true;
        return getZoteroTargetAncestorIdsFallback(rows, target.id).every((ancestorId) => {
          const ancestor = rows.find((row) => row.id === ancestorId);
          return ancestor?.id?.startsWith("L") || expandedIds.has(ancestorId);
        });
      })
      .map((target) => ({
        ...target,
        isExpanded: target.hasChildren && (target.id.startsWith("L") || expandedIds.has(target.id))
      }));
  }

  function getVisibleZoteroExpandedTargetIds() {
    return [...new Set([
      ...(Array.isArray(zoteroState.expandedTargetIds) ? zoteroState.expandedTargetIds : []),
      ...(Array.isArray(zoteroState.hoverExpandedTargetIds) ? zoteroState.hoverExpandedTargetIds : [])
    ])];
  }

  function getExpandedZoteroAncestorIds(targets, targetId) {
    return window.PaperDockZotero?.getZoteroTargetAncestorIds?.(targets, targetId)
      ?.filter((id) => !String(id).startsWith("L")) ||
      getZoteroTargetAncestorIdsFallback(targets, targetId).filter((id) => !String(id).startsWith("L")) ||
      [];
  }

  function isZoteroTargetInBranch(branchId, targetId) {
    return window.PaperDockZotero?.isZoteroTargetInBranch?.(zoteroState.targets, branchId, targetId) ||
      branchId === targetId ||
      getZoteroTargetAncestorIdsFallback(zoteroState.targets, targetId).includes(branchId);
  }

  function pruneZoteroHoverExpandedTargetIds(pointerTargetId) {
    const sharedIds = window.PaperDockZotero?.pruneZoteroHoverExpandedTargetIds?.(
      zoteroState.targets,
      zoteroState.hoverExpandedTargetIds,
      pointerTargetId
    );
    if (Array.isArray(sharedIds)) return sharedIds;
    return zoteroState.hoverExpandedTargetIds
      .filter((id) => isZoteroTargetInBranch(id, pointerTargetId));
  }

  function getRelatedZoteroTargetRow(row) {
    if (!row || !zoteroTargets?.contains?.(row)) return null;
    return row;
  }

  function getZoteroTargetRowAtPoint(point) {
    if (!point) return null;
    const element = shadow.elementFromPoint?.(point.x, point.y);
    return element?.closest?.(".pd-zotero-target") || null;
  }

  function findZoteroTarget(targetId) {
    return zoteroState.targets.find((target) => target.id === targetId) || null;
  }

  function hasZoteroTargetChildren(targetId) {
    const index = zoteroState.targets.findIndex((target) => target.id === targetId);
    if (index < 0) return false;
    const level = Number(zoteroState.targets[index].level) || 0;
    const nextLevel = Number(zoteroState.targets[index + 1]?.level);
    return Number.isFinite(nextLevel) && nextLevel > level;
  }

  function getZoteroTargetAncestorIdsFallback(targets = [], targetId = "") {
    const rows = Array.isArray(targets) ? targets : [];
    const index = rows.findIndex((target) => target.id === targetId);
    if (index < 0) return [];
    const ancestors = [];
    let level = Number(rows[index].level) || 0;
    for (let i = index - 1; i >= 0 && level > 0; i -= 1) {
      const parent = rows[i];
      const parentLevel = Number(parent.level) || 0;
      if (parentLevel < level) {
        ancestors.unshift(parent.id);
        level = parentLevel;
      }
    }
    return ancestors;
  }

  function formatZoteroTargetPathFallback(targets = [], targetId = "") {
    const rows = Array.isArray(targets) ? targets : [];
    const target = rows.find((row) => row.id === targetId);
    if (!target) return "";
    const names = getZoteroTargetAncestorIdsFallback(rows, targetId)
      .map((id) => rows.find((row) => row.id === id)?.name)
      .filter(Boolean);
    names.push(target.name);
    return names.join(" / ");
  }

  function arraysEqual(left = [], right = []) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function resolveTurnContextMode(mode) {
    if (["quick", "deep", "study", "ask"].includes(mode)) return "full";
    return "auto";
  }

  async function buildPaperPayloadForTurn(contextMode) {
    const payload = { ...paper };
    const selectedProfile = getSelectedProfile();
    if (isWebChatProfile(selectedProfile) && !hasReusableWebChatSession(selectedProfile) && !payload.webchatPdf) {
      await attachWebChatPdfPayload(payload);
      if (!payload.webchatPdf?.base64) {
        const detail = clean(payload.webchatPdfError || payload.contextSource);
        throw new Error(detail || "WebChat 模式需要先把当前 PDF 作为文件附件上传，但没有准备到可上传的 PDF 文件。");
      }
    }
    if (contextMode !== "full" || payload.fullText) return payload;
    const maxChars = Number(getSelectedProfile()?.maxContextChars || currentSettings?.maxContextChars || 14000);
    try {
      const extraction = await extractPdfTextInPage(payload.pdfUrl || getCurrentPdfUrl() || payload.pageUrl || location.href, maxChars);
      if (extraction.text && extraction.text.length > 400) {
        payload.fullText = extraction.text;
        payload.contextSource = extraction.source;
      }
    } catch (error) {
      payload.contextSource = `浏览器页面 PDF 抽取失败：${formatPdfExtractionError(error)}`;
    }
    return payload;
  }

  async function attachWebChatPdfPayload(payload) {
    const pdfUrl = getWebChatPdfCandidateUrl(payload);
    const filename = buildPdfUploadFilename(payload);
    const attempts = [];
    if (canFetchPdfBytesInPage(pdfUrl)) {
      try {
        setStatus(`${t("preparingFull")} · 正在准备 PDF 文件上传到 WebChat`);
        const result = await sendMessage({
          type: "fetchPdfAsBase64",
          url: pdfUrl,
          filename
        });
        if (result?.base64) {
          applyWebChatPdfPayload(payload, result, "PDF 文件已准备上传");
          return;
        }
      } catch (error) {
        attempts.push(`后台下载失败：${error?.message || String(error)}`);
      }
    } else {
      attempts.push(`原始 PDF 地址不是可直接下载的 HTTP(S) 地址：${pdfUrl || "空"}`);
    }

    if (canFetchPdfBytesInPage(pdfUrl)) {
      try {
        setStatus(`${t("preparingFull")} · 后台下载受限，改用当前页面会话准备 PDF`);
        const result = await fetchPdfAsBase64InPage(pdfUrl, filename);
        if (result?.base64) {
          applyWebChatPdfPayload(payload, result, "PDF 文件已准备上传（页面会话下载）");
          return;
        }
      } catch (error) {
        attempts.push(`页面会话下载失败：${error?.message || String(error)}`);
      }
    }

    try {
      setStatus(`${t("preparingFull")} · 原始 PDF 下载受限，正在生成可上传的页面正文 PDF`);
      const result = await createFallbackContextPdfPayload(payload, pdfUrl, filename, attempts);
      if (result?.base64) {
        applyWebChatPdfPayload(payload, result, "PDF 文件已准备上传（页面正文生成）");
        return;
      }
    } catch (error) {
      attempts.push(`页面正文 PDF 生成失败：${error?.message || String(error)}`);
    }

    const message = attempts.filter(Boolean).join("；") || "未知错误";
    payload.webchatPdfError = `PDF 文件上传准备失败：${message}`;
    payload.contextSource = payload.contextSource
      ? `${payload.contextSource}；PDF 文件上传准备失败：${message}`
      : `PDF 文件上传准备失败：${message}`;
  }

  function applyWebChatPdfPayload(payload, result, sourceLabel) {
    payload.webchatPdf = {
      ...result,
      source: result.source || sourceLabel
    };
    payload.contextSource = payload.contextSource
      ? `${payload.contextSource} + ${sourceLabel}`
      : sourceLabel;
  }

  function getWebChatPdfCandidateUrl(payload) {
    return clean(payload?.pdfUrl) ||
      getCurrentPdfUrl() ||
      clean(payload?.pageUrl) ||
      clean(location.href);
  }

  function canFetchPdfBytesInPage(pdfUrl) {
    return /^https?:\/\//i.test(clean(pdfUrl));
  }

  async function fetchPdfAsBase64InPage(pdfUrl, requestedFilename = "") {
    const target = clean(pdfUrl);
    if (!/^https?:\/\//i.test(target)) throw new Error("当前链接不是可下载的 HTTP(S) PDF 地址。");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(target, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        credentials: "include",
        referrer: location.href,
        referrerPolicy: "strict-origin-when-cross-origin",
        signal: controller.signal,
        headers: {
          Accept: "application/pdf,*/*;q=0.8"
        }
      });
      if (!response.ok) throw new Error(`PDF 下载失败：HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      const disposition = response.headers.get("content-disposition") || "";
      const finalUrl = response.url || target;
      const length = Number(response.headers.get("content-length") || 0);
      if (length > WEBCHAT_PDF_UPLOAD_MAX_BYTES) {
        throw new Error(`PDF 文件过大（${formatBytesInPage(length)}），超过 ${formatBytesInPage(WEBCHAT_PDF_UPLOAD_MAX_BYTES)} 的网页上传保护上限。`);
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > WEBCHAT_PDF_UPLOAD_MAX_BYTES) {
        throw new Error(`PDF 文件过大（${formatBytesInPage(buffer.byteLength)}），超过 ${formatBytesInPage(WEBCHAT_PDF_UPLOAD_MAX_BYTES)} 的网页上传保护上限。`);
      }
      const prefix = new TextDecoder("latin1").decode(buffer.slice(0, 16));
      if (!isPdfResponseLike(contentType, disposition, finalUrl, prefix.startsWith("%PDF"))) {
        throw new Error("当前链接返回的不是原始 PDF 字节，无法直接上传到 WebChat。");
      }
      return {
        base64: arrayBufferToBase64InPage(buffer),
        filename: requestedFilename || buildPdfUploadFilename({ pdfUrl: finalUrl }),
        url: finalUrl,
        size: buffer.byteLength,
        contentType,
        source: "page-session-fetch"
      };
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("PDF 下载超时，无法上传到 WebChat。");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function createFallbackContextPdfPayload(payload, pdfUrl, requestedFilename, attempts = []) {
    const maxChars = Math.max(8000, Number(getSelectedProfile()?.maxContextChars || currentSettings?.maxContextChars || 14000));
    let extraction = null;
    try {
      extraction = await extractPdfTextInPage(pdfUrl || payload.pdfUrl || payload.pageUrl || location.href, maxChars);
    } catch (error) {
      attempts.push(`页面正文抽取失败：${formatPdfExtractionError(error)}`);
    }
    const text = buildFallbackPdfText(payload, extraction?.text || "", extraction?.source || "", attempts);
    const generated = createTextPdfBase64(payload.title || payload.id || "Paper context", text);
    return {
      base64: generated.base64,
      filename: buildContextPdfFilename(requestedFilename || buildPdfUploadFilename(payload)),
      url: clean(pdfUrl || payload.pdfUrl || payload.pageUrl || location.href),
      size: generated.size,
      contentType: "application/pdf",
      generated: true,
      source: extraction?.source || "page-context-generated-pdf"
    };
  }

  function buildFallbackPdfText(payload, extractedText = "", source = "", attempts = []) {
    const metadata = [
      `Title: ${clean(payload.title) || "Unknown"}`,
      `Document ID: ${clean(payload.id) || "Unknown"}`,
      `Source: ${clean(payload.sourceType) || "Unknown"}`,
      `Authors: ${clean(payload.authors) || "Unknown"}`,
      `Published: ${clean(payload.submittedAt) || "Unknown"}`,
      `Updated: ${clean(payload.paperUpdatedAt) || "Unknown"}`,
      `Subjects: ${clean(payload.subjects) || "Unknown"}`,
      `PDF URL: ${clean(payload.pdfUrl) || "Unknown"}`,
      `Page URL: ${clean(payload.pageUrl) || location.href}`,
      source ? `Extraction source: ${source}` : ""
    ].filter(Boolean).join("\n");
    const abstract = clean(payload.abstract)
      ? `Abstract\n${payload.abstract}`
      : "";
    const body = normalizeTextBlock(extractedText);
    return normalizeTextBlock([
      "PaperDock generated this PDF because the original PDF source was unavailable for direct upload.",
      "PDF source was unavailable for direct upload. This context PDF is generated from readable page text, PDF viewer text, metadata, and preparation diagnostics.",
      "Use this attached file as the readable paper context for the current question.",
      metadata,
      attempts.length ? `Preparation diagnostics\n${attempts.filter(Boolean).join("\n")}` : "",
      abstract,
      body ? `Extracted text\n${body}` : ""
    ].filter(Boolean).join("\n\n")).slice(0, Math.max(12000, Number(getSelectedProfile()?.maxContextChars || currentSettings?.maxContextChars || 14000) * 4));
  }

  function buildContextPdfFilename(filename) {
    const base = clean(filename || "paper.pdf")
      .replace(/\.pdf$/i, "")
      .slice(0, 145)
      .trim() || "paper";
    return `${base}-context.pdf`;
  }

  function createTextPdfBase64(title, bodyText) {
    const lines = pdfWrapLines(normalizeTextBlock(`${title}\n\n${bodyText}`), 88);
    const pages = [];
    const linesPerPage = 52;
    for (let index = 0; index < lines.length; index += linesPerPage) {
      pages.push(lines.slice(index, index + linesPerPage));
    }
    if (!pages.length) pages.push(["No readable text was available."]);

    const objects = [];
    const addObject = (body) => {
      objects.push(body);
      return objects.length;
    };
    const catalogId = addObject("");
    const pagesId = addObject("");
    const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const pageIds = [];

    for (const pageLines of pages) {
      const stream = [
        "BT",
        "/F1 10 Tf",
        "50 790 Td",
        "14 TL",
        ...pageLines.map((line) => `(${escapePdfText(line)}) Tj T*`),
        "ET"
      ].join("\n");
      const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    }

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let index = 0; index < objects.length; index += 1) {
      offsets[index + 1] = pdf.length;
      pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
    }
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return {
      base64: btoa(pdf),
      size: pdf.length
    };
  }

  function pdfWrapLines(text, width) {
    const output = [];
    for (const paragraph of String(text || "").split("\n")) {
      const cleanParagraph = clean(paragraph);
      if (!cleanParagraph) {
        output.push("");
        continue;
      }
      let line = "";
      for (const word of cleanParagraph.split(/\s+/)) {
        if (word.length > width) {
          if (line) output.push(line);
          for (let index = 0; index < word.length; index += width) {
            output.push(word.slice(index, index + width));
          }
          line = "";
          continue;
        }
        const next = line ? `${line} ${word}` : word;
        if (next.length > width) {
          output.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      if (line) output.push(line);
    }
    return output;
  }

  function escapePdfText(value) {
    return String(value || "")
      .replace(/[^\x20-\x7E]/g, "?")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function arrayBufferToBase64InPage(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  function isPdfResponseLike(contentType, disposition, url, hasPdfMagic) {
    return /^application\/pdf\b/i.test(clean(contentType)) ||
      /\.pdf(?:[?#]|$)/i.test(clean(disposition)) ||
      /\.pdf(?:[?#]|$)/i.test(clean(url)) ||
      Boolean(hasPdfMagic);
  }

  function formatBytesInPage(bytes) {
    const value = Number(bytes) || 0;
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${value} B`;
  }

  function buildPdfUploadFilename(payload) {
    const base = clean(payload.title) || clean(payload.id) || extractTitleFromPdfUrl(payload.pdfUrl || location.href) || "paper";
    const filename = base
      .replace(/\.pdf$/i, "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .slice(0, 120)
      .trim() || "paper";
    return `${filename}.pdf`;
  }

  function isWebChatProfile(profile) {
    return profile?.provider === "webchatChatGPT" || profile?.provider === "webchatDeepSeek";
  }

  function hasReusableWebChatSession(profile) {
    const provider = profile?.provider || "";
    const session = currentConversation?.webchatSessions?.[buildWebChatSessionKey(provider, profile?.id)];
    return Boolean(session?.chatUrl && session?.pdfAttached === true);
  }

  function getSelectedWebChatSession() {
    const profile = getSelectedProfile();
    if (!isWebChatProfile(profile)) return null;
    return currentConversation?.webchatSessions?.[buildWebChatSessionKey(profile.provider, profile.id)] || null;
  }

  function getConversationMessagesForRequest() {
    const messages = Array.isArray(currentConversation?.messages) ? currentConversation.messages : [];
    return messages
      .filter((message) => message && (message.role === "user" || message.role === "assistant") && message.text)
      .map((message) => ({
        id: message.id || "",
        turnId: message.turnId || "",
        role: message.role,
        mode: message.mode || "",
        text: message.text || "",
        createdAt: message.createdAt || ""
      }));
  }

  function buildWebChatSessionKey(provider, profileId) {
    return `${provider || ""}:${profileId || "default"}`;
  }

  async function extractPdfTextInPage(pdfUrl, maxChars) {
    const parentExtraction = await requestParentPdfText(maxChars);
    if (parentExtraction?.text && parentExtraction.text.length > 400) {
      return parentExtraction;
    }

    const ieeeExtraction = await extractIeeeFullText(maxChars);
    if (ieeeExtraction?.text && ieeeExtraction.text.length > 400) {
      return ieeeExtraction;
    }

    const acmExtraction = await extractAcmFullText(maxChars);
    if (acmExtraction?.text && acmExtraction.text.length > 400) {
      return acmExtraction;
    }

    const viewerText = extractPdfViewerTextFromPage(maxChars);
    if (viewerText.length > 400) {
      return {
        text: viewerText,
        source: "浏览器 PDF 阅读器文本层 + 页面元数据"
      };
    }

    return extractPdfTextViaPdfJs(pdfUrl, maxChars);
  }

  async function extractIeeeFullText(maxChars) {
    const articleNumber = extractIeeeArticleNumber(location.href) || extractIeeeArticleNumber(paper?.pdfUrl);
    if (!articleNumber) return null;
    const charLimit = Math.max(4000, Number(maxChars) || 14000);
    const response = await fetch(`https://ieeexplore.ieee.org/rest/document/${encodeURIComponent(articleNumber)}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    if (!response.ok) {
      if (response.status === 418) {
        throw new Error("IEEE 正文接口触发访问限制（418），请稍后刷新页面重试。");
      }
      throw new Error(`IEEE 正文接口返回 ${response.status}`);
    }
    const html = await response.text();
    const text = ieeeRestHtmlToText(html, charLimit);
    if (text.length <= 400) {
      throw new Error("IEEE 正文接口没有返回可用正文。");
    }
    return {
      text,
      source: "IEEE Xplore REST 正文 + 页面元数据"
    };
  }

  function ieeeRestHtmlToText(html, maxChars) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    doc.querySelectorAll([
      "script",
      "style",
      "noscript",
      "svg",
      ".u-hidden",
      ".hidden",
      ".MathJax_Preview"
    ].join(",")).forEach((node) => node.remove());
    doc.querySelectorAll("a[ref-type='bibr'], a[ref-type='fig'], a[ref-type='table'], sup").forEach((node) => {
      const text = clean(node.textContent);
      node.replaceWith(text ? ` ${text} ` : " ");
    });
    const sections = Array.from(doc.querySelectorAll(".section, section, #article"))
      .map((section) => sectionToReadableText(section))
      .filter(Boolean);
    const text = sections.length ? sections.join("\n\n") : htmlToReadableText(doc.body?.innerHTML || html);
    return normalizeTextBlock(text)
      .replace(/\s+\[\s*/g, " [")
      .replace(/\s+\]/g, "]")
      .slice(0, Math.max(4000, Number(maxChars) || 14000));
  }

  function sectionToReadableText(section) {
    const blocks = [];
    section.querySelectorAll("h1, h2, h3, h4, p, li, figcaption, .caption, .article-hdr").forEach((node) => {
      const text = clean(node.textContent);
      if (!text || isIeeeBoilerplateLine(text)) return;
      blocks.push(text);
    });
    return normalizeTextBlock(dedupeConsecutiveLines(blocks).join("\n"));
  }

  function isIeeeBoilerplateLine(text) {
    return /^(SECTION\s+[IVXLCDM]+\.?|References|Acknowledgment|Footnotes)$/i.test(text) ||
      /^View All Authors/i.test(text);
  }

  async function extractAcmFullText(maxChars) {
    const doi = extractAcmDoiFromDocument(document, location.href) || extractAcmDoi(paper?.pdfUrl || "");
    if (!doi && paper?.sourceType !== "acm") return null;
    const charLimit = Math.max(4000, Number(maxChars) || 14000);
    const currentText = acmDocumentToReadableText(document, charLimit);
    if (currentText.length > 400) {
      return {
        text: currentText,
        source: "ACM Digital Library 页面正文 + 元数据"
      };
    }

    if (!doi || /\/doi\/fullHtml\//i.test(location.pathname)) return null;
    const fullHtmlUrl = `https://dl.acm.org/doi/fullHtml/${encodeURI(doi)}`;
    const response = await fetch(fullHtmlUrl, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      referrer: location.href,
      referrerPolicy: "strict-origin-when-cross-origin",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    if (!response.ok) throw new Error(`ACM fullHtml 返回 ${response.status}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = acmDocumentToReadableText(doc, charLimit);
    if (text.length <= 400) throw new Error("ACM 页面没有返回可用正文。");
    return {
      text,
      source: "ACM Digital Library fullHtml 正文 + 元数据"
    };
  }

  function acmDocumentToReadableText(doc, maxChars) {
    const clone = doc.cloneNode(true);
    clone.querySelectorAll([
      "script",
      "style",
      "noscript",
      "svg",
      "nav",
      "header",
      "footer",
      ".references",
      ".article__references",
      ".relatedContent",
      ".recommendations"
    ].join(",")).forEach((node) => node.remove());

    const metadata = [
      getAcmTitle(doc),
      getAuthorsFromDocument(doc),
      getAcmVenue(doc),
      extractAcmPublishedDate(doc),
      getAcmAbstract(doc),
      getAcmSubjects(doc)
    ].map(clean).filter(Boolean);
    const selectors = [
      "article",
      "main",
      ".article__body",
      ".article__sections",
      ".hlFld-Fulltext",
      ".NLM_sec",
      "#pb-page-content",
      "section"
    ];
    const bodyParts = [];
    const seen = new Set();
    for (const selector of selectors) {
      for (const node of Array.from(clone.querySelectorAll(selector))) {
        const text = normalizeTextBlock(node.textContent || "");
        if (!text || text.length < 120 || seen.has(text.slice(0, 300))) continue;
        seen.add(text.slice(0, 300));
        bodyParts.push(text);
      }
      if (bodyParts.join("\n\n").length > Math.max(1200, Number(maxChars) || 14000)) break;
    }
    const text = normalizeTextBlock([...metadata, ...bodyParts].join("\n\n"));
    return text
      .split("\n")
      .map((line) => clean(line))
      .filter((line) => line && !isAcmBoilerplateLine(line))
      .join("\n")
      .slice(0, Math.max(4000, Number(maxChars) || 14000));
  }

  function isAcmBoilerplateLine(text) {
    return /^(Get Access|Sign in|Create Account|View Metrics|Export Citation|Recommendations|References|Cited By|Comments)$/i.test(text) ||
      /^ACM Digital Library/i.test(text) ||
      /^Skip to/i.test(text);
  }

  function htmlToReadableText(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    doc.querySelectorAll("script, style, noscript, nav, header, footer").forEach((node) => node.remove());
    return normalizeTextBlock(doc.body?.textContent || "");
  }

  async function extractPdfTextViaPdfJs(pdfUrl, maxChars) {
    if (isIeeeStampPdfUrl(pdfUrl || location.href)) {
      throw new Error("IEEE Xplore 的 stamp.jsp 不是稳定的原始 PDF 下载地址，且 IEEE 正文接口/页面文本层当前不可读。请稍后刷新 IEEE 页面重试。");
    }
    const pdfjs = window.pdfjsLib;
    if (!pdfjs?.getDocument) {
      throw new Error("前端 PDF.js 未加载，请重新加载扩展。");
    }
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = runtimeUrl("vendor/pdfjs/pdf.worker.js");
    }
    const url = clean(pdfUrl || location.href);
    if (!url) throw new Error("没有可读取的 PDF URL。");
    const charLimit = Math.max(4000, Number(maxChars) || 14000);
    const task = pdfjs.getDocument({
      url,
      httpHeaders: {
        Accept: "application/pdf,*/*;q=0.8"
      },
      withCredentials: true,
      rangeChunkSize: 262144,
      disableAutoFetch: true,
      disableStream: false,
      disableFontFace: true,
      disableWorker: true,
      useSystemFonts: true
    });
    const pdfDoc = await task.promise;
    const parts = [];
    const pageLimit = Math.min(pdfDoc.numPages, 80);
    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      const page = await pdfDoc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => typeof item.str === "string" ? item.str : "")
        .filter(Boolean)
        .join(" ");
      if (pageText.trim()) {
        parts.push(`Page ${pageNumber}\n${pageText}`);
      }
      if (parts.join("\n\n").length >= charLimit) break;
    }
    try {
      await pdfDoc.destroy();
    } catch {}
    return {
      text: normalizeTextBlock(parts.join("\n\n")).slice(0, charLimit),
      source: "浏览器 PDF.js 正文抽取 + 页面元数据"
    };
  }

  function requestParentPdfText(maxChars) {
    if (!isEmbeddedPanel || window.parent === window) return Promise.resolve(null);
    const requestId = `pd-pdf-text-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve(null);
      }, 2500);
      const onMessage = (event) => {
        if (event.source !== window.parent) return;
        if (event.data?.type !== "pd-parent-pdf-text-result" || event.data.requestId !== requestId) return;
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        resolve(event.data.extraction || null);
      };
      window.addEventListener("message", onMessage);
      try {
        window.parent.postMessage({
          type: "pd-extract-parent-pdf-text",
          requestId,
          maxChars
        }, "*");
      } catch {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        resolve(null);
      }
    });
  }

  function extractPdfViewerTextFromPage(maxChars) {
    const charLimit = Math.max(4000, Number(maxChars) || 14000);
    const chunks = [];
    collectPdfTextLayerChunksDeep(document, chunks);
    const textLayerText = cleanViewerText(chunks.join("\n"), charLimit);
    if (textLayerText.length > 400) return textLayerText;

    const selectionText = cleanViewerText(String(window.getSelection?.() || ""), charLimit);
    if (selectionText.length > 400) return selectionText;

    const selectedAllText = extractPdfTextByTemporarySelection(charLimit);
    if (selectedAllText.length > 400) return selectedAllText;

    const bodyText = hasPdfViewerElement() ? cleanViewerText(document.body?.innerText || "", charLimit) : "";
    return bodyText.length > 400 ? bodyText : "";
  }

  function extractPdfTextByTemporarySelection(maxChars) {
    const charLimit = Math.max(4000, Number(maxChars) || 14000);
    const selection = window.getSelection?.();
    if (!selection) return "";
    const savedRanges = [];
    for (let index = 0; index < selection.rangeCount; index += 1) {
      savedRanges.push(selection.getRangeAt(index).cloneRange());
    }
    const activeElement = document.activeElement;
    const focusTargets = [
      document.querySelector("pdf-viewer"),
      document.querySelector("embed[type='application/pdf']"),
      document.querySelector("object[type='application/pdf']"),
      document.body
    ].filter(Boolean);

    try {
      for (const target of focusTargets) {
        focusElementForSelection(target);
        selection.removeAllRanges();
        try {
          document.execCommand?.("selectAll");
        } catch {}
        let text = cleanViewerText(String(selection || ""), charLimit);
        if (text.length > 400) return text;

        try {
          const range = document.createRange();
          range.selectNodeContents(target);
          selection.removeAllRanges();
          selection.addRange(range);
          text = cleanViewerText(String(selection || ""), charLimit);
          if (text.length > 400) return text;
        } catch {}
      }
    } finally {
      selection.removeAllRanges();
      savedRanges.forEach((range) => selection.addRange(range));
      try {
        activeElement?.focus?.({ preventScroll: true });
      } catch {}
    }
    return "";
  }

  function focusElementForSelection(node) {
    if (!node?.focus) return;
    const hadTabIndex = node.hasAttribute?.("tabindex");
    const previousTabIndex = node.getAttribute?.("tabindex");
    try {
      if (!hadTabIndex) node.setAttribute?.("tabindex", "-1");
      node.focus({ preventScroll: true });
    } catch {}
    try {
      if (!hadTabIndex) {
        node.removeAttribute?.("tabindex");
      } else if (previousTabIndex !== null) {
        node.setAttribute?.("tabindex", previousTabIndex);
      }
    } catch {}
  }

  function collectPdfTextLayerChunksDeep(root, chunks, depth = 0) {
    if (!root || depth > 4) return;
    collectPdfTextLayerChunks(root, chunks);
    root.querySelectorAll?.("*").forEach((node) => {
      if (node.shadowRoot) collectPdfTextLayerChunksDeep(node.shadowRoot, chunks, depth + 1);
    });
  }

  function collectPdfTextLayerChunks(root, chunks) {
    if (!root) return;
    root.querySelectorAll([
      ".textLayer",
      ".textLayer span",
      ".page .textLayer",
      "[data-page-number]",
      ".page",
      "pdf-viewer-text-layer",
      "viewer-page",
      "embed[type='application/pdf']"
    ].join(",")).forEach((node) => {
      const text = node.innerText || node.textContent || node.getAttribute("aria-label") || "";
      if (text && text.trim().length > 20) chunks.push(text);
    });
  }

  function cleanViewerText(value, maxChars) {
    const charLimit = Math.max(4000, Number(maxChars) || 14000);
    const lines = normalizeTextBlock(value)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !isPdfViewerUiLine(line));
    return normalizeTextBlock(dedupeConsecutiveLines(lines).join("\n")).slice(0, charLimit);
  }

  function isPdfViewerUiLine(line) {
    const text = String(line || "").trim();
    if (!text) return true;
    if (/^(PaperDock|AI|PDF|模型|全文|复制|保存|历史|清空|设置|发送|停止)$/i.test(text)) return true;
    if (/^\d+\s*\/\s*\d+$/.test(text)) return true;
    if (/^(zoom|download|print|page|fit|rotate|menu|thumbnail|outline|attachment)$/i.test(text)) return true;
    if (/^(正在生成|正在抽取|上下文|完成|已停止)/.test(text)) return true;
    return false;
  }

  function dedupeConsecutiveLines(lines) {
    const result = [];
    let previous = "";
    lines.forEach((line) => {
      if (line === previous) return;
      result.push(line);
      previous = line;
    });
    return result;
  }

  function formatPdfExtractionError(error) {
    const message = error?.message || String(error);
    if (/Invalid PDF structure|Missing PDF|Unexpected server response|not a PDF/i.test(message)) {
      return `${message}；当前链接可能返回的是阅读器页面或权限页，不是原始 PDF 字节，已先尝试读取页面文本层。`;
    }
    return message;
  }

  function installSettingsChangeListener() {
    try {
      chrome.storage?.onChanged?.addListener((changes, areaName) => {
        handleStorageSettingsChange(changes, areaName);
      });
    } catch {
      // Storage listeners are optional; initial settings still cover normal page loads.
    }
    try {
      chrome.runtime?.onMessage?.addListener((message, sender, sendResponse) => {
        if (message?.type === "openPaperDockPanel") {
          togglePanel(true);
          sendResponse?.({ ok: true });
          return false;
        }
        if (message?.type !== "settingsChanged") return false;
        applySettingsSnapshot(message.settings, {
          allowEmptyProfiles: Array.isArray(message.settings?.modelProfiles)
        });
        showModelLoadStatus({ onlyWhenEmpty: false });
        return false;
      });
    } catch {
      // Runtime notifications are best-effort; focus/open refresh still covers normal use.
    }
  }

  function handleStorageSettingsChange(changes, areaName) {
    if (areaName !== "local" || (!changes.settings && !changes.modelProfiles)) return;
    const snapshot = buildSettingsSnapshotFromStorageChanges(changes);
    const allowEmptyProfiles = Boolean(changes.modelProfiles);
    if (getSettingsProfiles(snapshot).length) {
      applySettingsSnapshot(snapshot, { allowEmptyProfiles });
      showModelLoadStatus({ onlyWhenEmpty: false });
      return;
    }
    refreshSettings({ silent: true }).catch(() => {
      if (snapshot) applySettingsSnapshot(snapshot, { allowEmptyProfiles });
    });
  }

  function applyAppearance(value) {
    activeAppearance = normalizeAppearance(value);
    installSystemAppearanceListener();
    host.dataset.appearance = resolveAppearance(activeAppearance);
  }

  function installSystemAppearanceListener() {
    if (activeAppearance !== "system" || systemAppearanceListenerInstalled || !window.matchMedia) return;
    systemAppearanceQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if (activeAppearance === "system") host.dataset.appearance = resolveAppearance(activeAppearance);
    };
    if (systemAppearanceQuery.addEventListener) {
      systemAppearanceQuery.addEventListener("change", update);
    } else if (systemAppearanceQuery.addListener) {
      systemAppearanceQuery.addListener(update);
    }
    systemAppearanceListenerInstalled = true;
  }

  function resolveAppearance(value) {
    const normalized = normalizeAppearance(value);
    if (normalized !== "system") return normalized;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  }

  function applyLanguage(value) {
    const languageChanged = normalizeLanguage(value) !== currentLanguage;
    currentLanguage = normalizeLanguage(value);
    const resolved = I18N.resolveLanguage(currentLanguage);
    host.dataset.language = resolved;
    if (languageChanged) {
      shadow.querySelectorAll("[data-i18n]").forEach((node) => {
        node.textContent = t(node.dataset.i18n);
      });
      shadow.querySelectorAll("[data-i18n-title]").forEach((node) => {
        node.title = t(node.dataset.i18nTitle);
      });
      shadow.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
        node.placeholder = t(node.dataset.i18nPlaceholder);
      });
      renderPaperHeader();
      renderConversation(currentConversation);
      renderModelSelect();
      renderZoteroDrawer();
    }
  }

  function t(key, vars = {}) {
    return I18N.t(currentLanguage, key, vars);
  }

  function renderUpdateBanner() {
    window.PaperDockUpdateBanner?.checkAndRender({
      container: updateBanner,
      language: currentLanguage,
      compact: true
    });
  }

  async function refreshSettings({ silent = true } = {}) {
    if (isGenerating) return true;
    if (settingsRefreshPromise) return settingsRefreshPromise;
    settingsRefreshPromise = readLatestSettings()
      .then((settings) => {
        if (!settings) throw new Error("No settings snapshot.");
        if (isPanelInteractionActive()) return true;
        applySettingsSnapshot(settings);
        showModelLoadStatus({ onlyWhenEmpty: false });
        return true;
      })
      .catch((error) => {
        if (!silent) setStatus(error.message || String(error), true);
        return false;
      })
      .finally(() => {
        settingsRefreshPromise = null;
      });
    return settingsRefreshPromise;
  }

  function applySettingsSnapshot(settings, options = {}) {
    currentSettings = mergeSettingsWithKnownProfiles(settings, options);
    applyPreferredModelSelection();
    reconcileSelectedProfile();
    selectedModelLabel = buildSelectedModelLabel();
    applyLanguage(currentSettings.language);
    applyAppearance(currentSettings.appearance);
    renderModelSelect();
    renderUpdateBanner();
  }

  async function readLatestSettings() {
    const [storedResult, runtimeResult] = await Promise.allSettled([
      readStoredSettingsSnapshot(),
      sendMessage({ type: "getSettings" })
    ]);
    const storedSettings = storedResult.status === "fulfilled" ? storedResult.value : null;
    if (getSettingsProfiles(storedSettings).length) return storedSettings;
    const runtimeSettings = runtimeResult.status === "fulfilled" ? runtimeResult.value : null;
    if (getSettingsProfiles(runtimeSettings).length) return runtimeSettings;
    return storedSettings || runtimeSettings;
  }

  async function readStoredSettingsSnapshot() {
    const [localItems, syncItems] = await Promise.all([
      readStorageArea("local", ["settings", "settingsMirror", "modelProfiles"]),
      readStorageArea("sync", "settings")
    ]);
    return mergeStoredSettingsCandidates(
      localItems?.settings,
      createProfilesSnapshotSettings(localItems?.modelProfiles, localItems?.settings),
      localItems?.settingsMirror,
      syncItems?.settings
    );
  }

  function readStorageArea(area, keys) {
    return new Promise((resolve) => {
      try {
        const storageArea = area === "sync" ? chrome.storage?.sync : chrome.storage?.local;
        if (!storageArea) {
          resolve(null);
          return;
        }
        storageArea.get(keys, (items) => {
          if (chrome.runtime?.lastError) {
            resolve(null);
            return;
          }
          resolve(items || null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function mergeStoredSettingsCandidates(...candidates) {
    const snapshots = candidates.filter((candidate) => candidate && typeof candidate === "object");
    const primary = snapshots[0] || null;
    const profileSource = snapshots.find((candidate) => getSettingsProfiles(candidate).length);
    if (!profileSource) return primary;
    return {
      ...(primary || {}),
      ...profileSource,
      language: primary?.language || profileSource.language || "system",
      appearance: primary?.appearance || profileSource.appearance || "system",
      modelProfiles: getSettingsProfiles(profileSource)
    };
  }

  function createProfilesSnapshotSettings(modelProfiles, base = {}) {
    return Array.isArray(modelProfiles) && modelProfiles.length
      ? {
        ...(base || {}),
        modelProfiles
      }
      : null;
  }

  function getSettingsProfiles(settings) {
    return Array.isArray(settings?.modelProfiles)
      ? settings.modelProfiles.filter((profile) => profile && typeof profile === "object")
      : [];
  }

  function mergeSettingsWithKnownProfiles(settings, { allowEmptyProfiles = false } = {}) {
    const next = settings && typeof settings === "object" ? { ...settings } : {};
    const profiles = getSettingsProfiles(next);
    if (profiles.length) {
      lastKnownModelProfiles = profiles;
      next.modelProfiles = profiles;
      return next;
    }
    if (allowEmptyProfiles && Array.isArray(next.modelProfiles)) {
      lastKnownModelProfiles = [];
      next.modelProfiles = [];
      return next;
    }
    if (lastKnownModelProfiles.length) {
      next.modelProfiles = lastKnownModelProfiles;
    }
    return next;
  }

  function buildSettingsSnapshotFromStorageChanges(changes) {
    const settings = changes.settings?.newValue && typeof changes.settings.newValue === "object"
      ? changes.settings.newValue
      : currentSettings;
    const changedProfiles = Array.isArray(changes.modelProfiles?.newValue)
      ? changes.modelProfiles.newValue
      : [];
    if (changedProfiles.length) {
      return {
        ...(settings || {}),
        modelProfiles: changedProfiles
      };
    }
    return settings || null;
  }

  function renderModelSelect() {
    if (!modelSelect) return;
    const profiles = getRenderableProfiles();
    reconcileSelectedProfile();
    modelSelect.replaceChildren(...createModelOptions(profiles));
    modelSelect.disabled = isGenerating || profiles.length === 0;
    selectedModelLabel = buildSelectedModelLabel();
  }

  function createModelOptions(profiles) {
    if (!profiles.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = t("noModelProfilesShort");
      return [option];
    }
    return profiles.map((profile) => {
      const option = document.createElement("option");
      option.value = profile.id || "";
      option.selected = profile.id === selectedProfileId;
      option.textContent = formatProfileOption(profile);
      return option;
    });
  }

  function showModelLoadStatus({ onlyWhenEmpty = true } = {}) {
    const profiles = getRenderableProfiles();
    if (profiles.length) {
      if (!onlyWhenEmpty) {
        setStatus(t("modelProfilesLoaded", {
          count: profiles.length
        }));
      }
      return;
    }
    setStatus(t("modelProfilesMissing", {
      count: profiles.length
    }), true);
  }

  function switchChatModel(event) {
    selectChatModelById(event.target.value);
  }

  function selectChatModelById(nextProfileId) {
    if (!nextProfileId || nextProfileId === selectedProfileId) return;
    selectedProfileId = nextProfileId;
    persistPreferredModelProfile(nextProfileId);
    selectedModelLabel = buildSelectedModelLabel();
    renderModelSelect();
    const profile = getSelectedProfile();
    setStatus(isWebChatProfile(profile)
      ? webChatLoginReminderText(profile)
      : t("modelSelected", { model: selectedProfileDisplayName() }));
  }

  async function persistPreferredModelProfile(profileId) {
    const id = String(profileId || "").trim();
    if (!id) return;
    lastAppliedPreferredModelProfileId = id;
    currentSettings = {
      ...(currentSettings || {}),
      preferredModelProfileId: id
    };
    try {
      const saved = await sendMessage({
        type: "setPreferredModelProfile",
        profileId: id
      });
      if (saved && typeof saved === "object") {
        currentSettings = mergeSettingsWithKnownProfiles(saved);
        lastAppliedPreferredModelProfileId = currentSettings.preferredModelProfileId || id;
      }
    } catch (error) {
      setStatus(error.message || String(error), true);
    }
  }

  function applyPreferredModelSelection() {
    const profiles = getRenderableProfiles();
    const preferred = currentSettings?.preferredModelProfileId || "";
    if (!preferred || !profiles.some((profile) => profile.id === preferred)) return;
    if (!selectedProfileId || preferred !== lastAppliedPreferredModelProfileId || !profiles.some((profile) => profile.id === selectedProfileId)) {
      selectedProfileId = preferred;
    }
    lastAppliedPreferredModelProfileId = preferred;
  }

  function reconcileSelectedProfile() {
    const profiles = getRenderableProfiles();
    if (!profiles.length) {
      selectedProfileId = "";
      return;
    }
    if (!profiles.some((profile) => profile.id === selectedProfileId)) {
      const preferred = currentSettings?.preferredModelProfileId || "";
      selectedProfileId = profiles.some((profile) => profile.id === preferred) ? preferred : profiles[0].id;
    }
  }

  function getSelectedProfile() {
    const profiles = getRenderableProfiles();
    return profiles.find((profile) => profile.id === selectedProfileId) || null;
  }

  function getRenderableProfiles() {
    const profiles = getSettingsProfiles(currentSettings);
    return profiles.length ? profiles : lastKnownModelProfiles;
  }

  function buildSelectedModelLabel() {
    const display = selectedProfileDisplayName();
    return display ? ` · ${display}` : "";
  }

  function selectedProfileDisplayName() {
    const profile = getSelectedProfile();
    return profile?.name || profile?.model || "";
  }

  function webChatLoginReminderText(profile = getSelectedProfile()) {
    if (!isWebChatProfile(profile)) return "";
    return t("webchatLoginReminder", {
      model: profile?.name || profile?.model || selectedProfileDisplayName() || "WebChat"
    });
  }

  function withWebChatLoginReminder(text, profile = getSelectedProfile()) {
    const reminder = webChatLoginReminderText(profile);
    return reminder ? `${text} ${reminder}` : text;
  }

  function formatProfileOption(profile) {
    const name = profile.name || profile.model || t("untitledProfile");
    const model = profile.model && profile.model !== name ? ` · ${profile.model}` : "";
    return `${name}${model}`;
  }

  async function loadConversation() {
    try {
      currentConversation = await sendMessage({ type: "getConversation", id: paper.id });
      renderConversation(currentConversation);
      if (currentConversation?.messageCount) {
        currentResult = findLastAssistantText(currentConversation);
        setStatus(withWebChatLoginReminder(t("loadedHistory", { count: currentConversation.turnCount || 0, model: selectedModelLabel })));
      } else {
        setStatus(withWebChatLoginReminder(t("defaultModeHint", { model: selectedModelLabel })));
      }
    } catch (error) {
      setStatus(error.message || String(error), true);
    }
  }

  async function saveCurrentNote() {
    const latest = currentResult || findLastAssistantText(currentConversation);
    if (!latest) {
      setStatus(t("noAnswerToSave"), true);
      return;
    }
    setBusy(true);
    try {
      await sendMessage({
        type: "saveNote",
        paper,
        summary: latest,
        mode: currentMode,
        conversation: currentConversation
      });
      setStatus(t("savedToReview"));
    } catch (error) {
      setStatus(error.message || String(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function copyCurrentMarkdown() {
    const markdown = buildMarkdownNote(paper, currentResult || findLastAssistantText(currentConversation), currentConversation);
    try {
      await navigator.clipboard.writeText(markdown);
      setStatus(t("copiedMarkdown"));
    } catch {
      setStatus(t("copyFailed"), true);
    }
  }

  async function clearCurrentConversation() {
    if (!currentConversation?.messageCount) {
      setStatus(t("noHistory"));
      return;
    }
    if (!confirm(t("confirmClear", { id: paper.id }))) return;
    setBusy(true);
    try {
      await sendMessage({ type: "clearConversation", id: paper.id });
      currentConversation = null;
      currentResult = "";
      renderConversation(null);
      setStatus(t("clearedHistory"));
    } catch (error) {
      setStatus(error.message || String(error), true);
    } finally {
      setBusy(false);
    }
  }

  function appendPreviewTurn(text) {
    const preview = {
      ...(currentConversation || {}),
      messages: [
        ...((currentConversation && currentConversation.messages) || []),
        {
          id: "preview-user",
          role: "user",
          text,
          createdAt: new Date().toISOString()
        },
        {
          id: "preview-assistant",
          role: "assistant",
          text: t("generatedFallback"),
          streaming: true,
          createdAt: new Date().toISOString()
        }
      ]
    };
    renderConversation(preview);
    return preview;
  }

  function updatePreviewAssistant(preview, text) {
    const messages = Array.isArray(preview?.messages) ? preview.messages : [];
    const assistant = messages.find((message) => message.id === "preview-assistant");
    if (!assistant) return;
    assistant.text = text;
    currentResult = text;
    scheduleConversationRender(preview);
  }

  function getPreviewAssistantText(preview) {
    const messages = Array.isArray(preview?.messages) ? preview.messages : [];
    const assistant = messages.find((message) => message.id === "preview-assistant");
    return assistant?.text || "";
  }

  function finalizePreviewConversation(preview, partialText, options = {}) {
    const text = cleanPartialGenerationText(partialText);
    const messages = Array.isArray(preview?.messages) ? preview.messages : [];
    const stopped = options.stopped === true;
    const localId = Date.now();
    const idPrefix = stopped ? "stopped" : "local";
    const finalizedMessages = messages.map((message) => {
      if (message.id === "preview-user") {
        return {
          ...message,
          id: `${idPrefix}-user-${localId}`
        };
      }
      if (message.id === "preview-assistant") {
        return {
          ...message,
          id: `${idPrefix}-assistant-${localId}`,
          text,
          streaming: false,
          stopped,
          webchatSession: options.webchatSession || message.webchatSession
        };
      }
      return message;
    });
    const now = new Date().toISOString();
    const webchatSessions = mergeWebChatSessions(preview?.webchatSessions, options.webchatSession, now);
    return {
      ...(preview || {}),
      id: paper.id,
      title: paper.title || preview?.title,
      updatedAt: now,
      lastAnswer: text,
      lastStopped: stopped,
      webchatSessions,
      messageCount: finalizedMessages.length,
      turnCount: finalizedMessages.filter((message) => message.role === "user").length,
      messages: finalizedMessages
    };
  }

  function mergeWebChatSessions(existing, session, updatedAt) {
    const sessions = existing && typeof existing === "object" ? { ...existing } : {};
    if (session?.provider) {
      const key = buildWebChatSessionKey(session.provider, session.profileId);
      sessions[key] = {
        ...(sessions[key] || {}),
        ...session,
        updatedAt: session.updatedAt || updatedAt
      };
    }
    return sessions;
  }

  async function preserveStoppedGeneration({ preview, partialText }) {
    const text = cleanPartialGenerationText(partialText);
    if (!text) {
      renderConversation(currentConversation);
      setStatus(t("generationStopped"));
      return;
    }
    currentResult = text;
    const fallbackConversation = finalizePreviewConversation(preview, text, { stopped: true });
    currentConversation = fallbackConversation;
    flushScheduledRender();
    renderConversation(currentConversation);
    setStatus(t("generationStopped"));
  }

  function cleanPartialGenerationText(value) {
    const text = String(value || "").trim();
    return text === t("generatedFallback") ? "" : text;
  }

  function scheduleConversationRender(conversation) {
    if (renderTimer) return;
    renderTimer = setTimeout(() => {
      renderTimer = 0;
      renderConversation(conversation);
    }, 80);
  }

  function renderConversation(conversation) {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    if (!messages.length) {
      historyJumpIndex = -1;
      chat.innerHTML = `
        <div class="pd-welcome">
          <strong>${escapeHtml(t("welcomeTitle"))}</strong>
          <p>${escapeHtml(t("welcomeBody"))}</p>
        </div>
      `;
      updateHistoryJumpButtons(0);
      return;
    }

    chat.innerHTML = messages.map((message, index) => `
      <article class="pd-message pd-message-${message.role}${message.streaming ? " is-streaming" : ""}" data-message-index="${index}" data-message-role="${escapeHtml(message.role || "")}">
        <div class="pd-bubble">
          <div class="pd-message-meta">${message.role === "user" ? escapeHtml(t("you")) : "AI"} · ${formatTime(message.createdAt, currentLanguage)}${message.mode ? ` · ${escapeHtml(modeLabel(message.mode, currentLanguage))}` : ""}${message.stopped ? ` · ${escapeHtml(t("stoppedBadge"))}` : ""}${message.role === "assistant" ? formatMessageUsageMeta(message, currentLanguage) : ""}</div>
          <div class="pd-message-body">${message.role === "assistant" ? markdownToHtml(message.text || "") : escapeHtml(message.text || "")}</div>
        </div>
      </article>
    `).join("");
    updateHistoryJumpButtons(messages.length);
    if (historyJumpIndex >= 0) {
      scrollToMessageIndex(historyJumpIndex, { behavior: "auto", updateStatus: false });
      return;
    }
    if (shouldAutoScrollConversation) {
      chat.scrollTop = chat.scrollHeight;
    }
  }

  function getConversationMessageNodes() {
    return Array.from(chat.querySelectorAll(".pd-message[data-message-index]"));
  }

  function updateHistoryJumpButtons(count = getConversationMessageNodes().length) {
    const hasMessages = count > 0;
    if (historyPrevButton) historyPrevButton.disabled = !hasMessages;
    if (historyNextButton) historyNextButton.disabled = !hasMessages;
  }

  function updateConversationAutoScrollFromScroll() {
    const nearBottom = isChatNearBottom();
    shouldAutoScrollConversation = nearBottom;
    if (nearBottom && historyJumpIndex >= 0) {
      historyJumpIndex = -1;
      getConversationMessageNodes().forEach((node) => {
        node.classList.remove("is-jump-target");
      });
      updateHistoryJumpButtons();
    }
  }

  function isChatNearBottom(threshold = 48) {
    return chat.scrollHeight - chat.scrollTop - chat.clientHeight <= threshold;
  }

  function jumpConversationMessage(direction) {
    const nodes = getConversationMessageNodes();
    if (!nodes.length) {
      historyJumpIndex = -1;
      updateHistoryJumpButtons(0);
      setStatus(t("noHistory"));
      return;
    }
    const currentIndex = getVisibleHistoryJumpIndex(nodes);
    if (direction > 0 && currentIndex >= nodes.length - 1) {
      resumeConversationAutoScroll();
      return;
    }
    const nextIndex = direction < 0
      ? Math.max(0, currentIndex - 1)
      : Math.min(nodes.length - 1, currentIndex + 1);
    scrollToMessageIndex(nextIndex);
  }

  function getVisibleHistoryJumpIndex(nodes) {
    if (historyJumpIndex >= 0 && historyJumpIndex < nodes.length) {
      return historyJumpIndex;
    }
    const chatRect = chat.getBoundingClientRect();
    const anchorY = chatRect.top + Math.min(72, chatRect.height * 0.25);
    let currentIndex = 0;
    nodes.forEach((node, index) => {
      if (node.getBoundingClientRect().top <= anchorY) {
        currentIndex = index;
      }
    });
    return currentIndex;
  }

  function scrollToMessageIndex(index, options = {}) {
    const nodes = getConversationMessageNodes();
    if (!nodes.length) return;
    const targetIndex = Math.max(0, Math.min(nodes.length - 1, Number(index) || 0));
    const target = nodes[targetIndex];
    historyJumpIndex = targetIndex;
    shouldAutoScrollConversation = targetIndex >= nodes.length - 1;
    nodes.forEach((node) => {
      node.classList.toggle("is-jump-target", node === target);
    });
    const chatRect = chat.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = Math.max(0, targetRect.top - chatRect.top + chat.scrollTop - 8);
    chat.scrollTo({
      top,
      behavior: options.behavior || "smooth"
    });
    updateHistoryJumpButtons(nodes.length);
    if (options.updateStatus !== false) {
      setStatus(t("historyJumpStatus", {
        current: targetIndex + 1,
        total: nodes.length
      }));
    }
  }

  function resumeConversationAutoScroll(options = {}) {
    historyJumpIndex = -1;
    shouldAutoScrollConversation = true;
    getConversationMessageNodes().forEach((node) => {
      node.classList.remove("is-jump-target");
    });
    updateHistoryJumpButtons();
    chat.scrollTo({
      top: chat.scrollHeight,
      behavior: options.behavior || "smooth"
    });
    if (options.updateStatus !== false) {
      setStatus(t("historyJumpBottom"));
    }
  }

  function setBusy(isBusy) {
    isGenerating = Boolean(isBusy);
    shadow.querySelectorAll("button, textarea, input, select").forEach((node) => {
      if (node.classList.contains("pd-close") || node.classList.contains("pd-fab")) return;
      if (node.classList.contains("pd-layout-toggle") || node.classList.contains("pd-restore-layout")) return;
      if (node.classList.contains("pd-history-prev") || node.classList.contains("pd-history-next")) return;
      if (node.classList.contains("pd-fulltext")) {
        node.disabled = true;
        node.checked = true;
        return;
      }
      if (node.classList.contains("pd-review") || node.classList.contains("pd-copy")) return;
      if (node.classList.contains("pd-send")) {
        node.disabled = false;
        node.textContent = isBusy ? t("stop") : t("send");
        node.classList.toggle("is-stop", isBusy);
        return;
      }
      node.disabled = isBusy;
    });
    if (!isBusy) {
      activeStreamCancel = null;
      renderModelSelect();
      if (sendButton) {
        sendButton.textContent = t("send");
        sendButton.classList.remove("is-stop");
      }
    }
    panel.classList.toggle("is-busy", isBusy);
  }

  function setStatus(text, isError = false) {
    status.textContent = text || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  function notifyEmbeddedPanelReady() {
    if (!isEmbeddedPanel || window.parent === window) return;
    try {
      window.parent.postMessage({ type: "pd-panel-ready" }, "*");
    } catch {
      // The outer PDF host may already be gone after navigation.
    }
  }

  function formatWebChatStatus(status, fallbackLabel = "WebChat") {
    const label = status?.label || fallbackLabel;
    const chars = formatTokenCount(status?.lastTextLength || 0);
    const thinkingChars = formatTokenCount(status?.lastThinkingLength || 0);
    const elapsed = formatWebChatElapsed(status?.elapsedMs);
    const phase = status?.phase || "";
    if (isThinkingWebChatSite(status?.site) && (phase === "waiting_for_first_token" || (phase === "waiting_for_completion" && !Number(status?.lastTextLength || 0)))) {
      if (Number(status?.lastThinkingLength || 0) > 0) {
        return t("webchatThinkingWithReasoning", { label, elapsed, chars: thinkingChars });
      }
      if (elapsed) return t("webchatThinkingWithElapsed", { label, elapsed });
      return t("webchatThinking", { label });
    }
    const phaseMap = {
      pdf_uploading: "webchatPdfUploading",
      pdf_uploaded: "webchatPdfUploaded",
      prompt_applying: "webchatPromptApplying",
      prompt_applied: "webchatPromptApplied",
      prompt_before_pdf: "webchatPromptBeforePdf",
      deepseek_deepthink_on: "webchatDeepThinkOn",
      deepseek_deepthink_off: "webchatDeepThinkOff",
      chatgpt_fast_mode: "webchatChatGptFastMode",
      chatgpt_deep_mode: "webchatChatGptDeepMode",
      submitted: "webchatSubmitted",
      waiting_for_first_token: "webchatWaitingFirstToken",
      waiting_for_completion: "webchatWaitingCompletion"
    };
    const key = phaseMap[phase];
    if (!key) return "";
    return t(key, { label, chars });
  }

  function isThinkingWebChatSite(site) {
    return site === "chatgpt" || site === "deepseek";
  }

  function formatWebChatElapsed(elapsedMs) {
    const seconds = Math.max(0, Math.floor(Number(elapsedMs) / 1000));
    if (!seconds) return "";
    return t("webchatElapsedSeconds", { seconds });
  }

  function showExtensionReloadNotice(error) {
    const text = normalizeErrorMessage(error);
    if (isExtensionContextInvalidated(error)) {
      setBusy(false);
      setStatus(t("extensionReloaded"), true);
      return;
    }
    setStatus(text || t("extensionFailed"), true);
  }

  function safeSendRuntimeMessage(payload) {
    try {
      sendMessage(payload).catch(showExtensionReloadNotice);
    } catch (error) {
      showExtensionReloadNotice(error);
    }
  }

  function autoResizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(120, Math.max(38, input.scrollHeight))}px`;
  }

  function sendMessage(payload) {
    return new Promise((resolve, reject) => {
      if (!isRuntimeAvailable()) {
        reject(createExtensionContextError());
        return;
      }
      try {
        chrome.runtime.sendMessage(payload, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          if (!response?.ok) {
            reject(new Error(response?.error || "插件后台没有返回有效结果。"));
            return;
          }
          resolve(response.data);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function sendStreamMessage(payload, callbacks = {}) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let cancelled = false;
      let latestText = "";
      let port;
      const abort = () => {
        cancelled = true;
        if (!settled) {
          settled = true;
          reject(Object.assign(new Error("generation-aborted"), {
            name: "AbortError",
            partialText: latestText
          }));
        }
        try {
          port?.postMessage({ type: "cancelStream" });
        } catch {}
        setTimeout(() => {
          try {
            port?.disconnect();
          } catch {}
        }, 800);
      };
      try {
        if (!isRuntimeAvailable()) throw createExtensionContextError();
        port = chrome.runtime.connect({ name: "pd-stream" });
        activeStreamCancel = abort;
      } catch (error) {
        if (isExtensionContextInvalidated(error)) {
          reject(error);
          return;
        }
        let fallbackCancelled = false;
        activeStreamCancel = () => {
          fallbackCancelled = true;
          if (!settled) {
            settled = true;
            reject(Object.assign(new Error("generation-aborted"), {
              name: "AbortError",
              partialText: latestText
            }));
          }
        };
        sendMessage(payload).then((data) => {
          if (fallbackCancelled) return;
          settled = true;
          activeStreamCancel = null;
          resolve(data);
        }, (sendError) => {
          if (fallbackCancelled) return;
          settled = true;
          activeStreamCancel = null;
          reject(sendError);
        });
        return;
      }

      port.onMessage.addListener((message) => {
        if (cancelled) return;
        if (message?.type === "meta") {
          callbacks.onMeta?.(message);
          return;
        }
        if (message?.type === "webchatStatus") {
          callbacks.onWebChatStatus?.(message);
          return;
        }
        if (message?.type === "delta") {
          latestText = message.fullText || `${latestText}${message.text || ""}`;
          callbacks.onDelta?.(latestText);
          return;
        }
        if (message?.type === "done") {
          settled = true;
          activeStreamCancel = null;
          resolve(message.data);
          try {
            port.disconnect();
          } catch {}
          return;
        }
        if (message?.type === "error") {
          settled = true;
          activeStreamCancel = null;
          reject(Object.assign(new Error(message.error || "流式请求失败。"), {
            partialText: message.partialText || latestText
          }));
          try {
            port.disconnect();
          } catch {}
        }
      });

      port.onDisconnect.addListener(() => {
        if (cancelled) return;
        if (!settled) {
          reject(Object.assign(new Error(getRuntimeLastErrorMessage() || "流式连接已断开，请重试。"), {
            partialText: latestText
          }));
        }
      });

      try {
        port.postMessage({
          ...payload,
          type: "summarizePaperStream"
        });
      } catch (error) {
        activeStreamCancel = null;
        reject(error);
      }
    });
  }

  function stopCurrentGeneration() {
    if (!activeStreamCancel) return;
    activeStreamCancel();
    activeStreamCancel = null;
    flushScheduledRender();
    setStatus(t("generationStopped"));
    input.focus();
  }

  function isPdfPage() {
    return isPdfLikeUrl(location.href) || hasPdfViewerElement();
  }

  function isSupportedReadingPage(value) {
    return Boolean(value?.id || isPdfPage());
  }

  function installIframePanel(paperData) {
    if (!isRuntimeAvailable()) return;
    removeExistingPaperDockRoots();
    installPageSplitStyles();

    const root = document.createElement("div");
    root.id = "paperdock-companion-frame-root";
    root.dataset.extensionId = chrome.runtime.id || "";
    const shadowRoot = root.attachShadow({ mode: "open" });
    document.documentElement.appendChild(root);

    const styleNode = document.createElement("style");
    styleNode.textContent = `
      .pd-frame-fab {
        position: fixed;
        right: 22px;
        bottom: 24px;
        z-index: 2147483647;
        width: 52px;
        height: 52px;
        border: 0;
        border-radius: 50%;
        background: #156f8f;
        color: #fff;
        font: 800 15px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 12px 28px rgba(15, 83, 107, 0.26);
        cursor: pointer;
      }
      .pd-frame {
        --pd-frame-panel: #fff;
        --pd-frame-line: #d9e0e6;
        --pd-frame-shadow: -8px 0 24px rgba(31, 35, 40, 0.16);
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483647;
        width: var(--pd-split-width, 460px);
        display: none;
        overflow: hidden;
        border-left: 1px solid var(--pd-frame-line);
        border-radius: 0;
        background: var(--pd-frame-panel);
        box-shadow: var(--pd-frame-shadow);
      }
      .pd-frame.is-floating {
        top: var(--pd-float-top, 72px);
        right: var(--pd-float-right, 24px);
        bottom: auto;
        width: var(--pd-float-width, 560px);
        height: var(--pd-float-height, 720px);
        max-width: calc(100vw - 24px);
        max-height: calc(100vh - 24px);
        border: 1px solid var(--pd-frame-line);
        border-radius: 8px;
        box-shadow: 0 16px 42px rgba(31, 35, 40, 0.22);
      }
      :host([data-appearance="dark"]) .pd-frame {
        --pd-frame-panel: #161a1f;
        --pd-frame-line: #303942;
        --pd-frame-shadow: -8px 0 24px rgba(0, 0, 0, 0.32);
      }
      :host([data-appearance="sepia"]) .pd-frame {
        --pd-frame-panel: #fffaf0;
        --pd-frame-line: #ded0b8;
        --pd-frame-shadow: -8px 0 24px rgba(70, 58, 42, 0.15);
      }
      .pd-frame.is-open {
        display: block;
      }
      .pd-frame iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        background: transparent;
      }
      .pd-frame-fallback {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: none;
        place-content: center;
        gap: 10px;
        padding: 24px;
        background: var(--pd-frame-panel);
        color: #66707a;
        font: 13px/1.55 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
      }
      .pd-frame.is-loading .pd-frame-fallback,
      .pd-frame.is-load-error .pd-frame-fallback {
        display: grid;
      }
      .pd-frame.is-ready .pd-frame-fallback {
        display: none;
      }
      .pd-frame-fallback strong {
        color: #20242a;
        font-size: 15px;
      }
      .pd-frame-fallback button {
        min-height: 34px;
        justify-self: center;
        border: 1px solid #156f8f;
        border-radius: 8px;
        background: #156f8f;
        color: #fff;
        font: 800 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 0 12px;
        cursor: pointer;
      }
      .pd-frame-resize-edge,
      .pd-frame-resize-corner {
        position: absolute;
        z-index: 3;
        display: none;
        pointer-events: auto;
        touch-action: none;
      }
      .pd-frame.is-open .pd-frame-resize-edge,
      .pd-frame.is-open.is-floating .pd-frame-resize-corner {
        display: block;
      }
      .pd-frame-resize-edge {
        top: 0;
        bottom: 0;
        left: -5px;
        width: 10px;
        cursor: ew-resize;
      }
      .pd-frame-resize-corner {
        left: -7px;
        bottom: -7px;
        width: 18px;
        height: 18px;
        cursor: nesw-resize;
      }
      .pd-frame-resize-corner::after {
        content: "";
        position: absolute;
        left: 5px;
        bottom: 5px;
        width: 7px;
        height: 7px;
        border-left: 2px solid #66707a;
        border-bottom: 2px solid #66707a;
        opacity: 0.72;
      }
      .pd-frame.is-resizing,
      .pd-frame.is-dragging {
        transition: none;
        user-select: none;
      }
      .pd-frame-fab.is-hidden {
        display: none;
      }
      @media (max-width: 640px) {
        .pd-frame {
          width: min(100vw, var(--pd-split-width, 460px));
        }
      }
    `;

    const fabButton = document.createElement("button");
    fabButton.className = "pd-frame-fab";
    fabButton.type = "button";
    fabButton.textContent = "AI";
    fabButton.title = "PaperDock";

    const frameShell = document.createElement("section");
    frameShell.className = "pd-frame";
    frameShell.setAttribute("aria-label", "PaperDock");

    const frame = document.createElement("iframe");
    frame.allow = "clipboard-read; clipboard-write";
    const frameSrc = `${runtimeUrl("panel.html")}?paper=${encodeURIComponent(JSON.stringify(paperData))}`;
    frameShell.appendChild(frame);
    const frameFallback = document.createElement("div");
    frameFallback.className = "pd-frame-fallback";
    frameFallback.innerHTML = `
      <strong>正在打开 PaperDock</strong>
      <span>如果长时间没有显示，请刷新当前 PDF 页面后再试。</span>
      <button type="button">刷新页面</button>
    `;
    frameShell.appendChild(frameFallback);
    const frameResizeEdge = document.createElement("div");
    frameResizeEdge.className = "pd-frame-resize-edge";
    const frameResizeCorner = document.createElement("div");
    frameResizeCorner.className = "pd-frame-resize-corner";
    frameShell.append(frameResizeEdge, frameResizeCorner);

    shadowRoot.append(styleNode, fabButton, frameShell);
    let frameLayout = getDefaultPanelLayout();
    let activeFrameGesture = null;
    let frameReady = false;
    let frameReadyTimer = 0;

    const loadFrameLayout = async () => {
      try {
        const stored = await readStorageArea("local", PANEL_LAYOUT_STORAGE_KEY);
        frameLayout = normalizePanelLayout(stored?.[PANEL_LAYOUT_STORAGE_KEY]);
      } catch {
        frameLayout = getDefaultPanelLayout();
      }
      applyFrameLayout(false);
    };
    loadFrameLayout();

    const applyFrameAppearance = (value) => {
      root.dataset.appearance = resolveFrameAppearance(value);
    };
    const loadFrameAppearance = async () => {
      try {
        const settings = await sendMessage({ type: "getSettings" });
        applyFrameAppearance(settings.appearance);
      } catch {
        applyFrameAppearance("system");
      }
    };
    applyFrameAppearance("system");
    loadFrameAppearance();
    try {
      chrome.storage?.onChanged?.addListener((changes, areaName) => {
        if (areaName !== "local" || !changes.settings) return;
        applyFrameAppearance(changes.settings.newValue?.appearance);
      });
    } catch {
      // The iframe panel applies the saved appearance independently.
    }

    const openPanel = () => {
      if (!isRuntimeAvailable()) {
        location.reload();
        return;
      }
      frameLayout = normalizePanelLayout(frameLayout);
      frameShell.classList.add("is-open");
      fabButton.classList.add("is-hidden");
      showFrameLoading();
      applyFrameLayout(false);
      frame.focus();
      frame.contentWindow?.focus();
    };
    const closePanel = () => {
      document.documentElement.classList.remove("pd-page-split-active");
      frameShell.classList.remove("is-open");
      fabButton.classList.remove("is-hidden");
      clearTimeout(frameReadyTimer);
    };

    const openPanelFromEvent = (event) => {
      event?.preventDefault?.();
      openPanel();
    };
    fabButton.addEventListener("click", openPanelFromEvent);
    fabButton.addEventListener("pointerup", (event) => {
      if (event.button !== 0 || frameShell.classList.contains("is-open")) return;
      openPanelFromEvent(event);
    });
    fabButton.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      openPanelFromEvent(event);
    });
    frameFallback.querySelector("button")?.addEventListener("click", () => {
      location.reload();
    });
    frame.addEventListener("load", () => {
      if (!frameShell.classList.contains("is-open") || frameReady) return;
      showFrameLoading();
      setTimeout(() => {
        if (frameReady || !frameShell.classList.contains("is-open")) return;
        markFrameReady();
      }, 450);
    });
    frameResizeEdge.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startFramePointerGesture(event, "resize", {
        kind: "edge",
        startX: event.screenX,
        startY: event.screenY
      });
    });
    frameResizeCorner.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startFramePointerGesture(event, "resize", {
        kind: "corner",
        startX: event.screenX,
        startY: event.screenY
      });
    });
    window.addEventListener("resize", () => {
      if (!frameShell.classList.contains("is-open")) return;
      frameLayout = normalizePanelLayout(frameLayout);
      applyFrameLayout(false);
    });
    window.addEventListener("message", (event) => {
      if (event.source !== frame.contentWindow) return;
      if (event.data?.type === "pd-panel-ready") {
        markFrameReady();
      }
      if (event.data?.type === "pd-close-panel") closePanel();
      if (event.data?.type === "pd-request-layout") postFrameLayout();
      if (event.data?.type === "pd-toggle-layout") {
        frameLayout = normalizePanelLayout({
          ...frameLayout,
          mode: frameLayout.mode === "float" ? "dock" : "float"
        });
        applyFrameLayout(true);
      }
      if (event.data?.type === "pd-restore-layout") {
        frameLayout = getDefaultPanelLayout();
        applyFrameLayout(true);
      }
      if (event.data?.type === "pd-extract-parent-pdf-text") {
        handleParentPdfTextRequest(event, frame, paperData);
      }
      if (event.data?.type === "pd-resize-start") {
        startFrameGesture("resize", {
          kind: event.data.kind === "corner" ? "corner" : "edge",
          startX: event.data.screenX,
          startY: event.data.screenY
        });
      }
      if (event.data?.type === "pd-drag-start") {
        startFrameGesture("drag", {
          startX: event.data.screenX,
          startY: event.data.screenY
        });
      }
      if (event.data?.type === "pd-resize-move" || event.data?.type === "pd-drag-move") {
        updateFrameGesture(event.data.screenX, event.data.screenY);
      }
      if (event.data?.type === "pd-resize-end" || event.data?.type === "pd-drag-end") {
        endFrameGesture(event.data.screenX, event.data.screenY);
      }
    });
    frame.src = frameSrc;

    function applyFrameLayout(shouldSave) {
      frameLayout = normalizePanelLayout(frameLayout);
      const floating = frameLayout.mode === "float";
      document.documentElement.style.setProperty("--pd-split-width", `${frameLayout.dockWidth}px`);
      document.documentElement.classList.toggle("pd-page-split-active", frameShell.classList.contains("is-open") && !floating);
      frameShell.classList.toggle("is-floating", floating);
      frameShell.style.setProperty("--pd-split-width", `${frameLayout.dockWidth}px`);
      frameShell.style.setProperty("--pd-float-width", `${frameLayout.floatWidth}px`);
      frameShell.style.setProperty("--pd-float-height", `${frameLayout.floatHeight}px`);
      frameShell.style.setProperty("--pd-float-top", `${frameLayout.floatTop}px`);
      frameShell.style.setProperty("--pd-float-right", `${frameLayout.floatRight}px`);
      postFrameLayout();
      if (shouldSave) {
        try {
          chrome.storage?.local?.set({ [PANEL_LAYOUT_STORAGE_KEY]: frameLayout });
        } catch {
          // Layout persistence is best-effort.
        }
      }
    }

    function postFrameLayout() {
      try {
        frame.contentWindow?.postMessage({
          type: "pd-panel-layout",
          layout: {
            mode: frameLayout.mode
          }
        }, "*");
      } catch {
        // The iframe may still be loading.
      }
    }

    function showFrameLoading() {
      if (frameReady) {
        markFrameReady();
        return;
      }
      clearTimeout(frameReadyTimer);
      frameShell.classList.add("is-loading");
      frameShell.classList.remove("is-ready", "is-load-error");
      frameReadyTimer = setTimeout(() => {
        if (frameReady || !frameShell.classList.contains("is-open")) return;
        frameShell.classList.remove("is-loading");
        frameShell.classList.add("is-load-error");
        const strong = frameFallback.querySelector("strong");
        const span = frameFallback.querySelector("span");
        if (strong) strong.textContent = "PaperDock 面板没有成功加载";
        if (span) span.textContent = "通常是扩展刚更新后当前 PDF 页还没刷新。刷新页面后会重新注入最新脚本。";
      }, 3500);
    }

    function markFrameReady() {
      frameReady = true;
      clearTimeout(frameReadyTimer);
      frameShell.classList.remove("is-loading", "is-load-error");
      frameShell.classList.add("is-ready");
    }

    function startFrameGesture(kind, data) {
      frameLayout = normalizePanelLayout(frameLayout);
      activeFrameGesture = {
        kind,
        resizeKind: data.kind || "edge",
        startX: Number(data.startX) || 0,
        startY: Number(data.startY) || 0,
        layout: { ...frameLayout }
      };
      frameShell.classList.toggle("is-resizing", kind === "resize");
      frameShell.classList.toggle("is-dragging", kind === "drag");
    }

    function startFramePointerGesture(event, kind, data) {
      startFrameGesture(kind, data);
      const pointerId = event.pointerId;
      event.currentTarget?.setPointerCapture?.(pointerId);
      const onMove = (moveEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        updateFrameGesture(moveEvent.screenX, moveEvent.screenY);
      };
      const onUp = (upEvent) => {
        if (upEvent.pointerId === pointerId) {
          endFrameGesture(upEvent.screenX, upEvent.screenY);
        }
        document.removeEventListener("pointermove", onMove, true);
        document.removeEventListener("pointerup", onUp, true);
        document.removeEventListener("pointercancel", onUp, true);
      };
      document.addEventListener("pointermove", onMove, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("pointercancel", onUp, true);
    }

    function updateFrameGesture(screenX, screenY) {
      if (!activeFrameGesture) return;
      const x = Number(screenX) || activeFrameGesture.startX;
      const y = Number(screenY) || activeFrameGesture.startY;
      const dx = x - activeFrameGesture.startX;
      const dy = y - activeFrameGesture.startY;
      const base = activeFrameGesture.layout;
      if (activeFrameGesture.kind === "drag") {
        frameLayout = normalizePanelLayout({
          ...base,
          mode: "float",
          floatTop: base.floatTop + dy,
          floatRight: base.floatRight - dx
        });
      } else if (activeFrameGesture.resizeKind === "corner" || base.mode === "float") {
        frameLayout = normalizePanelLayout({
          ...base,
          mode: "float",
          floatWidth: base.floatWidth - dx,
          floatHeight: base.floatHeight + dy
        });
      } else {
        frameLayout = normalizePanelLayout({
          ...base,
          dockWidth: base.dockWidth - dx
        });
      }
      applyFrameLayout(false);
    }

    function endFrameGesture(screenX, screenY) {
      if (activeFrameGesture) updateFrameGesture(screenX, screenY);
      activeFrameGesture = null;
      frameShell.classList.remove("is-resizing", "is-dragging");
      applyFrameLayout(true);
    }
  }
})();

function installPageSplitStyles() {
  if (document.getElementById("paperdock-companion-page-style")) return;
  const node = document.createElement("style");
  node.id = "paperdock-companion-page-style";
  node.textContent = `
    html.pd-page-split-active {
      margin-right: var(--pd-split-width, 460px) !important;
      transition: margin-right 160ms ease;
    }
    html.pd-page-split-active body {
      width: calc(100vw - var(--pd-split-width, 460px)) !important;
      max-width: 100% !important;
      overflow-x: auto !important;
    }
    html.pd-page-split-active embed[type="application/pdf"],
    html.pd-page-split-active pdf-viewer {
      width: calc(100vw - var(--pd-split-width, 460px)) !important;
      max-width: calc(100vw - var(--pd-split-width, 460px)) !important;
    }
    @media (max-width: 900px) {
      html.pd-page-split-active {
        margin-right: 0 !important;
      }
      html.pd-page-split-active body,
      html.pd-page-split-active embed[type="application/pdf"],
      html.pd-page-split-active pdf-viewer {
        width: 100vw !important;
        max-width: 100vw !important;
      }
    }
  `;
  document.documentElement.appendChild(node);
}

function getSplitPanelWidth() {
  const width = Math.round(Math.min(500, Math.max(420, window.innerWidth * 0.34)));
  return window.innerWidth <= 900 ? Math.min(window.innerWidth, 460) : width;
}

function getDefaultPanelLayout() {
  return normalizePanelLayout({
    mode: "dock",
    dockWidth: getSplitPanelWidth(),
    floatWidth: Math.round(Math.min(680, Math.max(520, window.innerWidth * 0.42))),
    floatHeight: Math.round(Math.min(760, Math.max(520, window.innerHeight * 0.78))),
    floatTop: 64,
    floatRight: 24
  });
}

function normalizePanelLayout(value = {}) {
  const viewportWidth = Math.max(320, window.innerWidth || 1280);
  const viewportHeight = Math.max(320, window.innerHeight || 900);
  const maxDockWidth = Math.max(360, Math.min(860, viewportWidth - 260));
  const dockWidth = clampNumber(value.dockWidth, 360, maxDockWidth, getSplitPanelWidth());
  const maxFloatWidth = Math.max(360, viewportWidth - 24);
  const maxFloatHeight = Math.max(360, viewportHeight - 24);
  const floatWidth = clampNumber(value.floatWidth, 420, maxFloatWidth, Math.min(620, maxFloatWidth));
  const floatHeight = clampNumber(value.floatHeight, 420, maxFloatHeight, Math.min(720, maxFloatHeight));
  const floatRight = clampNumber(value.floatRight, 8, Math.max(8, viewportWidth - floatWidth - 8), 24);
  const floatTop = clampNumber(value.floatTop, 8, Math.max(8, viewportHeight - floatHeight - 8), 64);
  return {
    mode: value.mode === "float" ? "float" : "dock",
    dockWidth,
    floatWidth,
    floatHeight,
    floatTop,
    floatRight
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  const safeFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : min;
  const normalized = Number.isFinite(number) ? number : safeFallback;
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.round(Math.min(upper, Math.max(lower, normalized)));
}

function normalizeAppearance(value) {
  if (value === "system" || value === "跟随系统") return "system";
  if (value === "light" || value === "浅色") return "light";
  if (value === "dark" || value === "深色") return "dark";
  if (value === "sepia" || value === "护眼") return "sepia";
  return "system";
}

function normalizeLanguage(value) {
  return window.PaperDockI18n.normalizeLanguage(value);
}

function resolveFrameAppearance(value) {
  const normalized = normalizeAppearance(value);
  if (normalized !== "system") return normalized;
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function readEmbeddedPanelPaper() {
  if (window.PaperDockEmbeddedPanelPaper && typeof window.PaperDockEmbeddedPanelPaper === "object") {
    return window.PaperDockEmbeddedPanelPaper;
  }
  if (window.PaperDockEmbeddedPanelMode) return null;
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return null;
  const panelUrl = runtimeUrl("panel.html");
  if (!panelUrl || !location.href.startsWith(panelUrl)) return null;
  const raw = new URLSearchParams(location.search).get("paper");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function isRuntimeAvailable() {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

function runtimeUrl(path) {
  try {
    if (!isRuntimeAvailable()) return "";
    return chrome.runtime.getURL(path);
  } catch {
    return "";
  }
}

function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    if (!isRuntimeAvailable()) {
      reject(new Error("Extension runtime is unavailable."));
      return;
    }
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || "Extension background returned no valid response."));
          return;
        }
        resolve(response.data);
      });
    } catch (error) {
      reject(error);
        }
      });
    }

    async function handleParentPdfTextRequest(event, frameNode, sourcePaper) {
      if (event.source !== frameNode.contentWindow) return;
      const requestId = event.data?.requestId || "";
      try {
        const maxChars = Number(event.data?.maxChars) || 14000;
        let extraction = null;
        try {
          extraction = await extractIeeeFullText(maxChars);
        } catch {}
        const viewerText = extraction ? "" : extractPdfViewerTextFromPage(maxChars);
        if (!extraction && viewerText.length > 400) {
          extraction = {
            text: viewerText,
            source: "父页面 PDF 阅读器文本层 + 页面元数据"
          };
        }
        if (!extraction && !isIeeeStampPdfUrl(location.href)) {
          const pdfUrl = getCurrentPdfUrl() || sourcePaper?.pdfUrl || location.href;
          extraction = await extractPdfTextViaPdfJs(pdfUrl, maxChars);
          extraction.source = "父页面 PDF.js 正文抽取 + 页面元数据";
        }
        frameNode.contentWindow?.postMessage({
          type: "pd-parent-pdf-text-result",
          requestId,
          extraction
        }, "*");
      } catch (error) {
        frameNode.contentWindow?.postMessage({
          type: "pd-parent-pdf-text-result",
          requestId,
          extraction: null,
          error: error.message || String(error)
        }, "*");
      }
    }

function getRuntimeLastErrorMessage() {
  try {
    return chrome?.runtime?.lastError?.message || "";
  } catch {
    return "";
  }
}

function createExtensionContextError() {
  return new Error("Extension context invalidated. Refresh the current page.");
}

function normalizeErrorMessage(error) {
  return error?.message || String(error || "");
}

function isExtensionContextInvalidated(error) {
  return /extension context invalidated|context invalidated|extension context/i.test(normalizeErrorMessage(error));
}

function modeToUserText(mode, language = "system") {
  const i18n = window.PaperDockI18n;
  if (mode === "deep") return i18n.t(language, "modeDeepPrompt");
  if (mode === "study") return i18n.t(language, "modeStudyPrompt");
  return i18n.t(language, "modeQuickPrompt");
}

function modeLabel(mode, language = "system") {
  const i18n = window.PaperDockI18n;
  if (mode === "deep") return i18n.t(language, "deep");
  if (mode === "study") return i18n.t(language, "study");
  if (mode === "ask") return i18n.t(language, "ask");
  return i18n.t(language, "quick");
}

function findLastAssistantText(conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant" && messages[index]?.text) {
      return messages[index].text;
    }
  }
  return "";
}

function extractPaper() {
  const arxivId = extractArxivId(location.href);
  const acmDoi = extractAcmDoiFromDocument(document, location.href);
  const isPdf = isCurrentPdfPage();
  const currentPdfUrl = getCurrentPdfUrl();
  const title = getField(".title.mathjax", "Title:") ||
    getAcmTitle(document) ||
    document.querySelector("meta[name='citation_title']")?.content ||
    extractPdfTitle() ||
    extractTitleFromPdfUrl(currentPdfUrl || location.href) ||
    document.title.replace(/\s*\|\s*(?:arXiv|ACM Digital Library).*$/i, "");
  const authors = getAuthors();
  const abstract = getField("blockquote.abstract", "Abstract:") ||
    getAcmAbstract(document);
  const subjects = getField(".subheader + .subjects", "") ||
    getText(".tablecell.subjects") ||
    getText(".subjects") ||
    getAcmSubjects(document);
  const comments = getField(".comments", "Comments:") || getMeta("citation_comments") || getAcmVenue(document);
  const submittedAt = acmDoi ? extractAcmPublishedDate(document) : extractSubmittedDate(document);
  const paperUpdatedAt = acmDoi ? "" : extractUpdatedDate(document);
  const pdfUrl = document.querySelector("meta[name='citation_pdf_url']")?.content ||
    document.querySelector("a[title='Download PDF']")?.href ||
    findAcmPdfUrl(document, location.href, acmDoi) ||
    currentPdfUrl ||
    extractPdfUrl(location.href, arxivId);
  const id = arxivId || (acmDoi ? `acm:${acmDoi}` : "") || (isPdf ? createPdfDocumentId(pdfUrl || location.href) : "");

  return {
    id,
    sourceType: arxivId ? "arxiv" : acmDoi ? "acm" : isPdf ? "pdf" : "web",
    title: clean(title),
    authors: clean(authors),
    abstract: clean(abstract),
    subjects: clean(subjects),
    comments: clean(comments),
    submittedAt: clean(submittedAt),
    paperUpdatedAt: clean(paperUpdatedAt),
    pdfUrl: clean(pdfUrl || (isPdf ? currentPdfUrl || location.href : "")),
    pageUrl: clean(location.href)
  };
}

async function fetchAbsPaperMetadata(id) {
  const cleanId = clean(String(id).replace(/^arXiv:/i, ""));
  if (!cleanId) return null;
  const response = await fetch(`https://arxiv.org/abs/${encodeURIComponent(cleanId)}`, {
    credentials: "omit"
  });
  if (!response.ok) return null;
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  return extractPaperFromDocument(doc, `https://arxiv.org/abs/${cleanId}`);
}

function extractPaperFromDocument(doc, url) {
  const id = extractArxivId(url);
  const title = getFieldFromDocument(doc, ".title.mathjax", "Title:") ||
    doc.querySelector("meta[name='citation_title']")?.content ||
    doc.title.replace(/\s*\|\s*arXiv.*$/i, "");
  const authors = getAuthorsFromDocument(doc);
  const abstract = getFieldFromDocument(doc, "blockquote.abstract", "Abstract:");
  const subjects = getFieldFromDocument(doc, ".subheader + .subjects", "") ||
    getTextFromDocument(doc, ".tablecell.subjects") ||
    getTextFromDocument(doc, ".subjects");
  const comments = getFieldFromDocument(doc, ".comments", "Comments:") ||
    doc.querySelector("meta[name='citation_comments']")?.content ||
    "";
  const pdfUrl = doc.querySelector("meta[name='citation_pdf_url']")?.content ||
    doc.querySelector("a[title='Download PDF']")?.href ||
    extractPdfUrl(url, id);
  return {
    id,
    title: clean(title),
    authors: clean(authors),
    abstract: clean(abstract),
    subjects: clean(subjects),
    comments: clean(comments),
    submittedAt: clean(extractSubmittedDate(doc)),
    paperUpdatedAt: clean(extractUpdatedDate(doc)),
    pdfUrl: clean(pdfUrl)
  };
}

function extractArxivId(url) {
  const match = String(url).match(/arxiv\.org\/(?:abs|pdf)\/([^?#/]+)(?:\.pdf)?/i);
  return match ? decodeURIComponent(match[1]).replace(/\.pdf$/i, "") : "";
}

function extractPdfUrl(url, id) {
  const acmDoi = extractAcmDoi(url);
  if (acmDoi) return buildAcmPdfUrl(acmDoi);
  if (/arxiv\.org\/pdf\//i.test(url)) {
    return String(url).replace(/[?#].*$/, "").replace(/\.pdf$/i, "");
  }
  return id ? `https://arxiv.org/pdf/${id}` : "";
}

function extractPdfTitle() {
  const title = document.querySelector("pdf-viewer")?.getAttribute("document-title") ||
    document.querySelector("embed[type='application/pdf']")?.getAttribute("title") ||
    document.querySelector("meta[name='citation_title']")?.content ||
    document.querySelector("meta[property='og:title']")?.content ||
    "";
  return String(title).replace(/\.pdf$/i, "").replace(/_/g, " ").trim();
}

function extractTitleFromPdfUrl(url) {
  try {
    const parsed = new URL(url);
    const ieeeNumber = extractIeeeArticleNumber(parsed.href);
    if (ieeeNumber) return `IEEE ${ieeeNumber}`;
    const acmDoi = extractAcmDoi(parsed.href);
    if (acmDoi) return `ACM ${acmDoi}`;
    const lastPart = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    const fileName = lastPart.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
    return fileName || parsed.hostname;
  } catch {
    return String(url || "")
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.pdf(?:[?#].*)?$/i, "")
      .replace(/[_-]+/g, " ")
      .trim() || "";
  }
}

function getCurrentPdfUrl() {
  return clean(
    document.querySelector("meta[name='citation_pdf_url']")?.content ||
    document.querySelector("a[title='Download PDF']")?.href ||
    findAcmPdfUrl(document, location.href) ||
    document.querySelector("embed[type='application/pdf']")?.src ||
    document.querySelector("object[type='application/pdf']")?.data ||
    document.querySelector("iframe[type='application/pdf']")?.src ||
    document.querySelector("pdf-viewer")?.getAttribute("src") ||
    document.querySelector("pdf-viewer")?.getAttribute("original-url") ||
    ""
  );
}

function isCurrentPdfPage() {
  return isPdfLikeUrl(location.href) || hasPdfViewerElement();
}

function isPdfLikeUrl(url) {
  const value = String(url || "");
  return /arxiv\.org\/pdf\//i.test(value) ||
    /\.pdf(?:[?#]|$)/i.test(value) ||
    isKnownDynamicPdfUrl(value);
}

function createPdfDocumentId(url) {
  const normalized = normalizeDocumentUrl(url || location.href);
  return normalized ? `pdf:${hashString(normalized)}` : "";
}

function normalizeDocumentUrl(url) {
  try {
    const parsed = new URL(url, location.href);
    const ieeeNumber = extractIeeeArticleNumber(parsed.href);
    if (ieeeNumber && isIeeeStampPdfUrl(parsed.href)) {
      return `https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=${encodeURIComponent(ieeeNumber)}`;
    }
    const acmDoi = extractAcmDoi(parsed.href);
    if (acmDoi && (isAcmArticleUrl(parsed.href) || isAcmPdfUrl(parsed.href))) {
      return buildAcmPdfUrl(acmDoi);
    }
    parsed.hash = "";
    return parsed.href;
  } catch {
    return String(url || "").replace(/#.*$/, "");
  }
}

async function probeCurrentPdfDocument() {
  const probe = await sendRuntimeMessage({ type: "probePdfUrl", url: location.href });
  if (!probe?.isPdf) return null;
  const pdfUrl = clean(probe.url) || location.href;
  return {
    id: createPdfDocumentId(pdfUrl),
    sourceType: "pdf",
    title: extractPdfTitle() || extractTitleFromPdfUrl(pdfUrl) || "PDF document",
    authors: clean(getMeta("citation_author") || document.querySelector("meta[name='dc.creator']")?.content),
    abstract: clean(getMeta("description") || document.querySelector("meta[property='og:description']")?.content),
    subjects: "",
    comments: "",
    submittedAt: "",
    paperUpdatedAt: "",
    pdfUrl,
    pageUrl: clean(location.href),
    detectedContentType: clean(probe.contentType)
  };
}

function shouldProbePdfUrl(url) {
  if (isPdfLikeUrl(url) || hasPdfViewerElement()) return false;
  try {
    const parsed = new URL(url, location.href);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    const text = `${parsed.hostname} ${parsed.pathname} ${parsed.search}`.toLowerCase();
    return /(?:pdf|download|fulltext|full-text|stamp|arnumber|getpdf|get-pdf|downloadfile|download-file|bitstream|viewcontent|pdfdownload|pdf-download|epdf)/i
      .test(text);
  } catch {
    return false;
  }
}

function hasPdfViewerElement() {
  return Boolean(document.querySelector("embed[type='application/pdf'], object[type='application/pdf'], iframe[type='application/pdf'], pdf-viewer"));
}

function isKnownDynamicPdfUrl(url) {
  return isIeeeStampPdfUrl(url) ||
    isAcmPdfUrl(url) ||
    isScienceDirectPdfUrl(url) ||
    isSpringerPdfUrl(url) ||
    isWileyPdfUrl(url) ||
    isResearchGatePdfUrl(url);
}

function isIeeeStampPdfUrl(url) {
  try {
    const parsed = new URL(url, location.href);
    return /(^|\.)ieeexplore\.ieee\.org$/i.test(parsed.hostname) &&
      /\/stamp\/stamp\.jsp$/i.test(parsed.pathname) &&
      Boolean(extractIeeeArticleNumber(parsed.href));
  } catch {
    return false;
  }
}

function isAcmPdfUrl(url) {
  try {
    const parsed = new URL(url, location.href);
    return /(^|\.)dl\.acm\.org$/i.test(parsed.hostname) &&
      /\/doi\/(?:pdf|epdf)\//i.test(parsed.pathname) &&
      Boolean(extractAcmDoi(parsed.href));
  } catch {
    return false;
  }
}

function isAcmArticleUrl(url) {
  try {
    const parsed = new URL(url, location.href);
    return isAcmHostUrl(parsed.href) &&
      /\/doi\/(?:abs\/|fullHtml\/|pdf\/|epdf\/)?10\.\d{4,9}\//i.test(decodeURIComponent(parsed.pathname));
  } catch {
    return false;
  }
}

function isAcmHostUrl(url) {
  try {
    return /(^|\.)dl\.acm\.org$/i.test(new URL(url, location.href).hostname);
  } catch {
    return false;
  }
}

function extractAcmDoi(url) {
  try {
    const parsed = new URL(url, location.href);
    if (!/(^|\.)dl\.acm\.org$/i.test(parsed.hostname)) return "";
    const path = decodeURIComponent(parsed.pathname).replace(/\/+$/, "");
    const match = path.match(/\/doi\/(?:abs\/|fullHtml\/|pdf\/|epdf\/)?(10\.\d{4,9}\/.+)$/i);
    return normalizeDoi(match?.[1] || "");
  } catch {
    const match = String(url || "").match(/\/doi\/(?:abs\/|fullHtml\/|pdf\/|epdf\/)?(10\.\d{4,9}\/[^?#]+)/i);
    return normalizeDoi(match?.[1] || "");
  }
}

function extractAcmDoiFromDocument(doc, url = location.href) {
  if (!isAcmHostUrl(url)) return "";
  return normalizeDoi(
    getMetaAnyFromDocument(doc, ["citation_doi", "dc.identifier", "prism.doi"]) ||
    extractAcmDoi(url)
  );
}

function normalizeDoi(value) {
  return clean(String(value || "")
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/fulltext$/i, "")
    .replace(/\/$/, ""));
}

function buildAcmPdfUrl(doi) {
  const cleanDoi = normalizeDoi(doi);
  return cleanDoi ? `https://dl.acm.org/doi/pdf/${encodeURI(cleanDoi)}` : "";
}

function findAcmPdfUrl(doc = document, url = location.href, doi = "") {
  if (!isAcmHostUrl(url)) return "";
  const metaPdf = getMetaAnyFromDocument(doc, ["citation_pdf_url"]);
  if (metaPdf) return absoluteUrl(metaPdf, url);
  const link = doc.querySelector("a[href*='/doi/pdf/'], a[href*='/doi/epdf/']");
  if (link?.getAttribute("href")) return absoluteUrl(link.getAttribute("href"), url);
  const cleanDoi = normalizeDoi(doi) || extractAcmDoiFromDocument(doc, url);
  return cleanDoi ? buildAcmPdfUrl(cleanDoi) : "";
}

function getAcmTitle(doc) {
  return getMetaAnyFromDocument(doc, ["citation_title", "dc.title", "og:title"]) ||
    getTextFromDocument(doc, "h1[property='name'], h1.citation__title, h1");
}

function getAcmAbstract(doc) {
  const metaAbstract = getMetaAnyFromDocument(doc, [
    "citation_abstract",
    "dc.description",
    "description",
    "og:description"
  ]);
  if (metaAbstract) return metaAbstract;
  return getFieldFromDocument(doc, "#abstract", "Abstract") ||
    getFieldFromDocument(doc, ".abstractSection", "Abstract") ||
    getFieldFromDocument(doc, ".abstractInFull", "Abstract") ||
    getFieldFromDocument(doc, "section[aria-labelledby*='abstract' i]", "Abstract") ||
    getFieldFromDocument(doc, ".abstract", "Abstract");
}

function getAcmSubjects(doc) {
  const metaKeywords = [...doc.querySelectorAll("meta[name='citation_keywords'], meta[name='keywords']")]
    .map((node) => node.content)
    .filter(Boolean);
  if (metaKeywords.length) return metaKeywords.join(", ");
  return getTextFromDocument(doc, ".keywords-section") ||
    getTextFromDocument(doc, "section[aria-labelledby*='keywords' i]");
}

function getAcmVenue(doc) {
  return getMetaAnyFromDocument(doc, [
    "citation_conference_title",
    "citation_journal_title",
    "citation_inbook_title",
    "citation_proceedings_title"
  ]);
}

function extractAcmPublishedDate(doc) {
  return clean(getMetaAnyFromDocument(doc, [
    "citation_publication_date",
    "citation_online_date",
    "dc.date",
    "prism.publicationDate"
  ]));
}

function absoluteUrl(value, base = location.href) {
  try {
    return new URL(value, base).href;
  } catch {
    return clean(value);
  }
}

function isScienceDirectPdfUrl(url) {
  try {
    const parsed = new URL(url, location.href);
    return /(^|\.)sciencedirect\.com$/i.test(parsed.hostname) &&
      /\/science\/article\/pii\//i.test(parsed.pathname) &&
      (/\/pdf\//i.test(parsed.pathname) || /[?&](?:download|via|isDTMRedir)=/i.test(parsed.search));
  } catch {
    return false;
  }
}

function isSpringerPdfUrl(url) {
  try {
    const parsed = new URL(url, location.href);
    return /(^|\.)link\.springer\.com$/i.test(parsed.hostname) &&
      /\/content\/pdf\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isWileyPdfUrl(url) {
  try {
    const parsed = new URL(url, location.href);
    return /(^|\.)onlinelibrary\.wiley\.com$/i.test(parsed.hostname) &&
      /\/doi\/pdf(?:direct)?\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isResearchGatePdfUrl(url) {
  try {
    const parsed = new URL(url, location.href);
    return /(^|\.)researchgate\.net$/i.test(parsed.hostname) &&
      /\/publication\/.+\/download/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function extractIeeeArticleNumber(url) {
  try {
    const parsed = new URL(url, location.href);
    return clean(parsed.searchParams.get("arnumber") || "")
      .replace(/[^\d]/g, "");
  } catch {
    const match = String(url || "").match(/[?&]arnumber=(\d+)/i);
    return match ? match[1] : "";
  }
}

function ensureDocumentIdentity(value) {
  if (value?.id) return value;
  if (!isCurrentPdfPage()) return value;
  const pdfUrl = clean(value?.pdfUrl) || getCurrentPdfUrl() || location.href;
  return {
    ...value,
    id: createPdfDocumentId(pdfUrl),
    sourceType: value?.sourceType || "pdf",
    title: clean(value?.title) || extractPdfTitle() || extractTitleFromPdfUrl(pdfUrl) || "PDF document",
    pdfUrl: clean(pdfUrl),
    pageUrl: clean(value?.pageUrl) || clean(location.href)
  };
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getField(selector, prefix) {
  return getFieldFromDocument(document, selector, prefix);
}

function getFieldFromDocument(doc, selector, prefix) {
  const node = doc.querySelector(selector);
  if (!node) return "";
  const clone = node.cloneNode(true);
  clone.querySelectorAll(".descriptor").forEach((item) => item.remove());
  let text = clone.textContent || "";
  if (prefix) text = text.replace(new RegExp(`^\\s*${escapeRegExp(prefix)}\\s*`, "i"), "");
  return text;
}

function getAuthors() {
  return getAuthorsFromDocument(document);
}

function getAuthorsFromDocument(doc) {
  const metaAuthors = [...doc.querySelectorAll("meta[name='citation_author']")]
    .map((node) => node.content)
    .filter(Boolean);
  if (metaAuthors.length) return metaAuthors.join(", ");

  const authorsNode = doc.querySelector(".authors");
  if (!authorsNode) return "";
  const clone = authorsNode.cloneNode(true);
  clone.querySelectorAll(".descriptor").forEach((item) => item.remove());
  return clone.textContent || "";
}

function getMeta(name) {
  return document.querySelector(`meta[name='${name}']`)?.content || "";
}

function getMetaAnyFromDocument(doc, names = []) {
  const wanted = new Set(names.map((name) => String(name || "").toLowerCase()));
  for (const node of Array.from(doc.querySelectorAll("meta"))) {
    const key = String(node.getAttribute("name") || node.getAttribute("property") || "").toLowerCase();
    if (wanted.has(key) && node.content) return node.content;
  }
  return "";
}

function getText(selector) {
  return getTextFromDocument(document, selector);
}

function getTextFromDocument(doc, selector) {
  return doc.querySelector(selector)?.textContent || "";
}

function extractSubmittedDate(doc) {
  const history = getTextFromDocument(doc, ".submission-history");
  const match = history.match(/\[v1\]\s+(.+?)(?=(?:\s+\[v\d+\])|$)/i);
  return normalizeArxivDate(match?.[1] || getMetaFromDocument(doc, "citation_date"));
}

function extractUpdatedDate(doc) {
  const history = getTextFromDocument(doc, ".submission-history");
  const matches = [...history.matchAll(/\[v\d+\]\s+(.+?)(?=(?:\s+\[v\d+\])|$)/gi)];
  if (matches.length > 1) return normalizeArxivDate(matches[matches.length - 1][1]);
  return "";
}

function getMetaFromDocument(doc, name) {
  return doc.querySelector(`meta[name='${name}']`)?.content || "";
}

function normalizeArxivDate(value) {
  return clean(String(value || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/,\s*revised\s*/i, " ")
    .replace(/Submitted\s*/i, ""));
}

function hasUsefulPaperMetadata(value) {
  return Boolean(clean(value?.title) && !isArxivIdLikeTitle(value.title) && (clean(value?.authors) || clean(value?.submittedAt) || clean(value?.paperUpdatedAt)));
}

function isArxivIdLikeTitle(value) {
  const text = clean(value).replace(/\.pdf$/i, "");
  return /^(\d{4}\.\d{4,5})(v\d+)?$/i.test(text) || /^arxiv[:\s]/i.test(text);
}

function displayPaperTitle(value) {
  const titleText = clean(value?.title);
  if (titleText && !isArxivIdLikeTitle(titleText)) return titleText;
  if (value?.sourceType === "pdf") return "PDF document";
  if (value?.sourceType === "acm") return "ACM article";
  return value?.id ? `arXiv ${value.id}` : "Paper";
}

function buildPaperMeta(value) {
  const i18n = window.PaperDockI18n;
  const language = document.getElementById("paperdock-companion-root")?.dataset?.language || "system";
  return [
    value?.submittedAt ? i18n.t(language, "submitted", { date: value.submittedAt }) : "",
    value?.paperUpdatedAt ? i18n.t(language, "updated", { date: value.paperUpdatedAt }) : "",
    value?.authors ? truncate(value.authors, 88) : "",
    value?.subjects ? truncate(value.subjects, 58) : "",
    value?.sourceType === "pdf" ? "PDF" : value?.sourceType === "acm" ? "ACM" : value?.id ? `arXiv ${value.id}` : ""
  ].filter(Boolean).join(" · ");
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeTextBlock(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function truncate(value, max) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatTime(value, language = "system") {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(window.PaperDockI18n.resolveLanguage(language), {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatContextUsage(value, language = "system") {
  const tokens = Number(value?.contextTokens);
  const windowTokens = Number(value?.contextWindow);
  if (!Number.isFinite(tokens) || tokens <= 0 || !Number.isFinite(windowTokens) || windowTokens <= 0) return "";
  const percent = Math.max(0, Math.min(100, Math.round((tokens / windowTokens) * 100)));
  const i18n = window.PaperDockI18n;
  return i18n.t(language, "contextUsage", {
    tokens: formatTokenCount(tokens),
    window: formatTokenCount(windowTokens),
    percent,
    capped: value?.contextCapped ? i18n.t(language, "capped") : ""
  });
}

function formatMessageUsageMeta(message, language = "system") {
  const usage = formatContextUsage(message, language);
  return usage ? ` · ${escapeHtml(usage)}` : "";
}

function formatTokenCount(value) {
  const tokens = Math.max(0, Math.floor(Number(value) || 0));
  if (tokens < 1000) return String(tokens);
  if (tokens < 1000000) {
    return tokens < 10000
      ? `${(tokens / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : `${Math.round(tokens / 1000)}k`;
  }
  return `${(tokens / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markdownToHtml(markdown) {
  if (window.PaperDockMarkdown?.toHtml) {
    return window.PaperDockMarkdown.toHtml(markdown, { headingOffset: 2 });
  }
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listType = "";
  let paragraph = [];
  let codeBlock = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${formatInline(escapeHtml(paragraph.join(" ")))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = "";
  };
  const closeCodeBlock = () => {
    if (!codeBlock.length) return;
    html.push(`<pre><code>${escapeHtml(codeBlock.join("\n"))}</code></pre>`);
    codeBlock = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^```/.test(line.trim())) {
      if (codeBlock.length) {
        closeCodeBlock();
      } else {
        flushParagraph();
        closeList();
        codeBlock.push("");
      }
      continue;
    }
    if (codeBlock.length) {
      codeBlock.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      closeList();
      html.push("<hr>");
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(4, heading[1].length) + 2;
      html.push(`<h${level}>${formatInline(escapeHtml(heading[2]))}</h${level}>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (ordered || unordered) {
      flushParagraph();
      const nextType = ordered ? "ol" : "ul";
      if (listType !== nextType) {
        closeList();
        html.push(`<${nextType}>`);
        listType = nextType;
      }
      html.push(`<li>${formatInline(escapeHtml((ordered || unordered)[1]))}</li>`);
      continue;
    }

    const quote = line.match(/^\s*>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${formatInline(escapeHtml(quote[1]))}</blockquote>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  closeCodeBlock();
  flushParagraph();
  closeList();
  return html.join("");
}

function formatInline(value) {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildMarkdownNote(paper, summary, conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const conversationBlock = messages.length
    ? [
      "",
      "## Conversation",
      ...messages.map((message) => [
        "",
        `### ${message.role === "user" ? "User" : "Assistant"} ${message.createdAt || ""}`,
        "",
        message.text || ""
      ].join("\n"))
    ].join("\n")
    : "";

  return [
    `# ${paper.title || paper.id || "Paper"}`,
    "",
    `- Type: ${paper.sourceType === "pdf" ? "PDF" : paper.sourceType === "acm" ? "ACM" : "arXiv"}`,
    `- ID: ${paper.id || ""}`,
    `- Authors: ${paper.authors || ""}`,
    `- Subjects: ${paper.subjects || ""}`,
    `- PDF: ${paper.pdfUrl || ""}`,
    "",
    "## Abstract",
    paper.abstract || "",
    "",
    "## Latest Note",
    summary || "",
    conversationBlock
  ].join("\n");
}
