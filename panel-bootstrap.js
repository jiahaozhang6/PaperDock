(async function () {
  const PANEL_PAPER_STORAGE_KEY = "arxivMatePanelPaper";
  const CONTENT_SCRIPT = "content.js";
  let startupFailed = false;

  window.addEventListener("error", (event) => {
    startupFailed = true;
    showPanelBootstrapError(event.message || "面板脚本运行失败。");
  });
  window.addEventListener("unhandledrejection", (event) => {
    startupFailed = true;
    showPanelBootstrapError(event.reason?.message || String(event.reason || "面板脚本运行失败。"));
  });

  try {
    const paper = readPaperFromUrl() || await readStoredPanelPaper();
    if (!paper) {
      showPanelBootstrapError("没有拿到当前论文信息。请回到论文/PDF 页面，点击扩展图标里的“打开当前页面板”。");
      return;
    }
    window.PaperDockEmbeddedPanelMode = true;
    if (paper) {
      window.PaperDockEmbeddedPanelPaper = paper;
    }
    await loadScript(CONTENT_SCRIPT);
    setTimeout(() => {
      if (!startupFailed && !isPanelMounted()) {
        showPanelBootstrapError("面板脚本已加载，但没有进入嵌入式面板模式。请重新加载扩展后再打开。");
      }
    }, 1200);
  } catch (error) {
    showPanelBootstrapError(error?.message || String(error));
  }

  function readPaperFromUrl() {
    const raw = new URLSearchParams(location.search).get("paper");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  async function readStoredPanelPaper() {
    const fromSession = await readStorageValue(chrome.storage.session, PANEL_PAPER_STORAGE_KEY);
    if (fromSession) return fromSession;
    return readStorageValue(chrome.storage.local, PANEL_PAPER_STORAGE_KEY);
  }

  function readStorageValue(area, key) {
    return new Promise((resolve) => {
      if (!area?.get) {
        resolve(null);
        return;
      }
      try {
        area.get(key, (result) => {
          if (chrome.runtime?.lastError) {
            resolve(null);
            return;
          }
          const value = result?.[key];
          resolve(value && typeof value === "object" ? value : null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`加载 ${src} 失败。`));
      document.documentElement.appendChild(script);
    });
  }

  function isPanelMounted() {
    const root = document.getElementById("paperdock-companion-root");
    const panel = root?.shadowRoot?.querySelector(".pd-panel");
    return Boolean(panel?.classList.contains("is-open") && panel.classList.contains("is-embedded"));
  }

  function showPanelBootstrapError(message) {
    const fallback = ensurePanelFallback();
    fallback.innerHTML = `
      <strong>PaperDock 面板没有成功加载</strong>
      <span>${escapeHtml(message || "未知错误")}</span>
      <small>请在扩展管理页重新加载 PaperDock，然后回到论文/PDF 页面重新打开面板。</small>
    `;
  }

  function ensurePanelFallback() {
    let fallback = document.getElementById("paperdock-panel-static-fallback");
    if (fallback) return fallback;
    fallback = document.createElement("div");
    fallback.id = "paperdock-panel-static-fallback";
    fallback.className = "panel-static-fallback";
    document.body.appendChild(fallback);
    return fallback;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
