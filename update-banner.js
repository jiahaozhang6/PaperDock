window.PaperDockUpdateBanner = (() => {
  function checkAndRender({ container, language = "system", compact = false } = {}) {
    if (!container) return Promise.resolve(null);
    return sendMessage({ type: "checkForUpdate", force: false })
      .then((result) => {
        render(container, result, language, compact);
        return result;
      })
      .catch(() => {
        hide(container);
        return null;
      });
  }

  function renderResult({ container, result, language = "system", compact = false } = {}) {
    if (!container) return;
    render(container, result, language, compact);
  }

  function render(container, result, language, compact) {
    if (!result?.updateAvailable || !result.latestZipUrl) {
      hide(container);
      return;
    }

    container.hidden = false;
    container.dataset.updateAvailable = "true";
    container.classList.toggle("is-compact", Boolean(compact));
    container.replaceChildren();

    const body = document.createElement("div");
    body.className = "pd-update-body";

    const title = document.createElement("strong");
    title.className = "pd-update-title";
    title.textContent = t(language, "updateBannerTitle", {
      version: result.latestVersion,
      tag: result.latestTag
    });

    const text = document.createElement("p");
    text.className = "pd-update-text";
    text.textContent = t(language, "updateBannerBody");

    const actions = document.createElement("div");
    actions.className = "pd-update-actions";

    const download = document.createElement("a");
    download.className = "pd-update-download";
    download.href = result.latestZipUrl;
    download.target = "_blank";
    download.rel = "noreferrer";
    download.textContent = t(language, "downloadLatestStable");

    const guide = document.createElement("button");
    guide.className = "pd-update-guide";
    guide.type = "button";
    guide.textContent = t(language, "viewUpgradeGuide");
    guide.addEventListener("click", openOptionsPage);

    actions.append(download, guide);
    body.append(title, text);
    container.append(body, actions);
  }

  function hide(container) {
    container.hidden = true;
    container.dataset.updateAvailable = "false";
    container.replaceChildren();
  }

  function openOptionsPage() {
    try {
      if (chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
        return;
      }
    } catch {}
    try {
      chrome.runtime?.sendMessage?.({ type: "openOptions" });
      return;
    } catch {}
    try {
      window.open(chrome.runtime.getURL("options.html"), "_blank", "noopener");
    } catch {}
  }

  function sendMessage(payload) {
    return new Promise((resolve, reject) => {
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

  function t(language, key, vars = {}) {
    const i18n = window.PaperDockI18n;
    return i18n?.t ? i18n.t(language, key, vars) : key;
  }

  return {
    checkAndRender,
    renderResult
  };
})();
