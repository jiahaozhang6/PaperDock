const I18N = window.PaperDockI18n;
const statusNode = document.querySelector("#status");
const updateStatusNode = document.querySelector("#update-status");
const downloadUpdateLink = document.querySelector("#download-update");
const updateBannerNode = document.querySelector("#update-banner");
const openPanelButton = document.querySelector("#open-panel");
let currentLanguage = "system";
let activeTabSnapshot = null;

const CONTENT_SCRIPT_FILES = [
  "i18n.js",
  "update-banner.js",
  "vendor/markdown-it/markdown-it.min.js",
  "vendor/katex/katex.min.js",
  "vendor/pdfjs/pdf.js",
  "math-render.js",
  "markdown-render.js",
  "zotero-client.js",
  "content.js"
];

initPopup();

document.querySelector("#options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.querySelector("#review").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("review.html") });
});

openPanelButton?.addEventListener("click", () => {
  const pending = activeTabSnapshot?.id && isSupportedPaperTab(activeTabSnapshot.url || "")
    ? openPanelForTab(activeTabSnapshot)
    : openPanelForCurrentTab();
  pending.catch((error) => {
    statusNode.textContent = `${t("popupOpenPanelFailed")} ${error?.message || ""}`.trim();
    console.warn("PaperDock popup open panel failed:", error);
  });
});

async function initPopup() {
  try {
    const { settings = {} } = await chrome.storage.sync.get("settings");
    currentLanguage = I18N.normalizeLanguage(settings.language);
    document.body.dataset.appearance = resolveAppearance(settings.appearance);
  } catch {
    currentLanguage = "system";
    document.body.dataset.appearance = resolveAppearance("system");
  }
  applyLanguage();
  updateTabStatus();
  renderUpdateBanner();
}

function applyLanguage() {
  document.documentElement.lang = I18N.resolveLanguage(currentLanguage);
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
}

function updateTabStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    activeTabSnapshot = tab || null;
    const supported = isSupportedPaperTab(tab?.url || "");
    if (openPanelButton) openPanelButton.disabled = !supported;
    if (supported) {
      statusNode.textContent = t("popupStatusArxiv");
    }
  });
}

async function openPanelForCurrentTab() {
  const tab = await getCurrentTab();
  return openPanelForTab(tab);
}

async function openPanelForTab(tab) {
  if (!tab?.id || !isSupportedPaperTab(tab.url || "")) return;
  statusNode.textContent = t("popupOpeningPanel");
  try {
    await sendTabMessage(tab.id, { type: "openPaperDockPanel" });
    statusNode.textContent = t("popupStatusArxiv");
    return;
  } catch (firstError) {
    try {
      await injectContentScripts(tab.id);
      await sendTabMessage(tab.id, { type: "openPaperDockPanel" });
      statusNode.textContent = t("popupStatusArxiv");
      return;
    } catch (secondError) {
      console.warn("PaperDock page injection failed:", firstError, secondError);
      throw new Error(t("popupOpenPanelRetryHint"));
    }
  }
}

function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      resolve(tab || null);
    });
  });
}

function sendTabMessage(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "No valid panel response."));
        return;
      }
      resolve(response);
    });
  });
}

function injectContentScripts(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId },
    files: CONTENT_SCRIPT_FILES
  });
}

function isSupportedPaperTab(url) {
  const value = String(url || "");
  return /https?:\/\/(www\.)?arxiv\.org\/(abs|pdf)\//i.test(value) ||
    isAcmArticleUrl(value) ||
    /\.pdf(?:[?#]|$)/i.test(value) ||
    isKnownDynamicPdfUrl(value);
}

function isKnownDynamicPdfUrl(url) {
  return isIeeeStampPdfUrl(url) ||
    matchesHostPath(url, /(^|\.)dl\.acm\.org$/i, /\/doi\/(?:pdf|epdf)\//i) ||
    matchesHostPath(url, /(^|\.)link\.springer\.com$/i, /\/content\/pdf\//i) ||
    matchesHostPath(url, /(^|\.)onlinelibrary\.wiley\.com$/i, /\/doi\/pdf(?:direct)?\//i) ||
    isScienceDirectPdfUrl(url) ||
    matchesHostPath(url, /(^|\.)researchgate\.net$/i, /\/publication\/.+\/download/i);
}

function isAcmArticleUrl(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)dl\.acm\.org$/i.test(parsed.hostname) &&
      /\/doi\/(?:abs\/|fullHtml\/|pdf\/|epdf\/)?10\.\d{4,9}\//i.test(decodeURIComponent(parsed.pathname));
  } catch {
    return false;
  }
}

function isIeeeStampPdfUrl(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)ieeexplore\.ieee\.org$/i.test(parsed.hostname) &&
      /\/stamp\/stamp\.jsp$/i.test(parsed.pathname) &&
      Boolean(parsed.searchParams.get("arnumber"));
  } catch {
    return false;
  }
}

function isScienceDirectPdfUrl(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)sciencedirect\.com$/i.test(parsed.hostname) &&
      /\/science\/article\/pii\//i.test(parsed.pathname) &&
      (/\/pdf\//i.test(parsed.pathname) || /[?&](?:download|via|isDTMRedir)=/i.test(parsed.search));
  } catch {
    return false;
  }
}

function matchesHostPath(url, hostPattern, pathPattern) {
  try {
    const parsed = new URL(url);
    return hostPattern.test(parsed.hostname) && pathPattern.test(parsed.pathname);
  } catch {
    return false;
  }
}

function renderUpdateBanner() {
  updateStatusNode.classList.remove("is-visible");
  downloadUpdateLink.hidden = true;
  downloadUpdateLink.removeAttribute("href");
  window.PaperDockUpdateBanner?.checkAndRender({
    container: updateBannerNode,
    language: currentLanguage,
    compact: true
  });
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "Extension background returned no valid response."));
        return;
      }
      resolve(response.data);
    });
  });
}

function resolveAppearance(value) {
  const normalized = normalizeAppearance(value);
  if (normalized !== "system") return normalized;
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function normalizeAppearance(value) {
  if (value === "system" || value === "跟随系统") return "system";
  if (value === "light" || value === "浅色") return "light";
  if (value === "dark" || value === "深色") return "dark";
  if (value === "sepia" || value === "护眼") return "sepia";
  return "system";
}

function t(key, vars = {}) {
  return I18N.t(currentLanguage, key, vars);
}
