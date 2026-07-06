(function () {
  "use strict";

  const BRIDGE_VERSION = 18;
  if (window.__arxivMateWebChatBridgeInstalled >= BRIDGE_VERSION) return;
  window.__arxivMateWebChatBridgeInstalled = BRIDGE_VERSION;

  const SITE_CONFIGS = {
    chatgpt: {
      id: "chatgpt",
      label: "ChatGPT",
      composerSelectors: [
        'textarea[data-testid="prompt-textarea"]',
        "#prompt-textarea",
        'div[contenteditable="true"][data-testid="prompt-textarea"]',
        'div[contenteditable="true"]',
        "textarea"
      ],
      sendSelectors: [
        'button[data-testid="send-button"]',
        'button[aria-label*="Send" i]',
        'button[title*="Send" i]'
      ],
      stopSelectors: [
        'button[data-testid="stop-button"]',
        'button[aria-label*="Stop" i]',
        'button[aria-label*="Cancel" i]',
        'button[title*="Stop" i]',
        'button[title*="Cancel" i]'
      ],
      assistantSelectors: [
        '[data-message-author-role="assistant"]',
        'article[data-testid*="assistant"]',
        '[data-testid^="conversation-turn-"] .markdown',
        "article .markdown",
        ".markdown.prose",
        ".prose"
      ],
      thinkingSelectors: [
        "[data-testid='reasoning-content']",
        "[data-testid='thinking-content']",
        "[data-testid='thinking']",
        "[data-testid*='reason' i]",
        "[data-testid*='thinking' i]",
        "[aria-label*='Reason' i]",
        "[aria-label*='Thinking' i]",
        "[aria-label*='思考' i]",
        "[aria-label*='推理' i]",
        "[class*='thinking' i] .markdown",
        "[class*='reasoning' i] .markdown",
        "[class*='reason' i] .markdown",
        "[class*='think' i] .markdown",
        "[class*='thinking' i]",
        "[class*='reasoning' i]",
        "[class*='reason' i]",
        "[class*='think' i]"
      ],
      pruneThinkingSelectors: [
        "[data-testid='reasoning-content']",
        "[data-testid='thinking-content']",
        "[data-testid='thinking']",
        "[data-testid*='reason' i]",
        "[data-testid*='thinking' i]",
        "[aria-label*='Reason' i]",
        "[aria-label*='Thinking' i]",
        "[aria-label*='思考' i]",
        "[aria-label*='推理' i]",
        "[class*='thinking' i]",
        "[class*='reasoning' i]",
        "[class*='reason' i]",
        "[class*='think' i]"
      ],
      dropTargetSelectors: [
        "#prompt-textarea",
        '[data-testid="prompt-textarea"]',
        '[data-testid="text-input"]',
        "form"
      ],
      attachmentButtonSelectors: [
        'button[aria-label*="Attach" i]',
        'button[aria-label*="Upload" i]',
        'button[aria-label*="file" i]',
        'button[title*="Attach" i]',
        'button[title*="Upload" i]',
        'button[data-testid*="attach" i]',
        'button[data-testid*="upload" i]',
        'button:has(input[type="file"])',
        '[role="button"][aria-label*="Attach" i]',
        '[role="button"][aria-label*="Upload" i]'
      ],
      fileInputSelectors: [
        'input[type="file"][accept*="pdf" i]',
        'input[type="file"][accept*="application/pdf" i]',
        'input[type="file"]'
      ],
      attachmentPillSelector: [
        '[data-testid*="attachment" i]',
        '[data-testid*="file" i]',
        '[aria-label*="pdf" i]',
        '[class*="attachment" i]',
        '[class*="file-pill" i]',
        '[class*="FileIcon"]'
      ].join(", "),
      actionBarSelectors: [
        'button[aria-label="Copy"]',
        'button[aria-label="Regenerate"]',
        'button[aria-label="Read aloud"]',
        'button[aria-label="Good response"]',
        'button[aria-label="Bad response"]',
        'button[data-testid="copy-turn-action-button"]',
        'button[data-testid="regenerate-turn-action-button"]',
        'button[data-testid="thumbs-up-turn-action-button"]',
        'button[data-testid="thumbs-down-turn-action-button"]',
        'button[data-testid*="voice-play"]'
      ],
      conversationTurnSelector: '[data-testid^="conversation-turn"]'
    },
    deepseek: {
      id: "deepseek",
      label: "DeepSeek",
      composerSelectors: [
        'textarea[placeholder*="DeepSeek" i]',
        'textarea[placeholder*="发送" i]',
        'textarea[placeholder*="消息" i]',
        "textarea",
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]'
      ],
      sendSelectors: [
        'button[aria-label*="Send" i]',
        'button[aria-label*="发送" i]',
        'button[title*="Send" i]',
        'button[title*="发送" i]',
        'button[class*="send" i]',
        '[role="button"][aria-label*="Send" i]',
        '[role="button"][aria-label*="发送" i]',
        "div.ds-icon-button"
      ],
      stopSelectors: [],
      assistantSelectors: [
        "div.ds-message",
        ".ds-markdown",
        '[class*="markdown" i]',
        ".prose"
      ],
      thinkingSelectors: [
        ".ds-think-content .ds-markdown",
        ".ds-think-content",
        "[class*='think' i] .ds-markdown",
        "[class*='think' i]",
        "[class*='thinking' i] .ds-markdown",
        "[class*='thinking' i]",
        "[class*='reasoning' i] .ds-markdown",
        "[class*='reasoning' i]"
      ],
      pruneThinkingSelectors: [
        ".ds-think-content",
        "[class*='think' i]",
        "[class*='thinking' i]",
        "[class*='reasoning' i]"
      ],
      dropTargetSelectors: [
        "textarea",
        'div[contenteditable="true"]',
        "form"
      ],
      attachmentButtonSelectors: [
        'button[aria-label*="Attach" i]',
        'button[aria-label*="Upload" i]',
        'button[aria-label*="file" i]',
        'button[aria-label*="附件" i]',
        'button[aria-label*="上传" i]',
        'button[title*="Attach" i]',
        'button[title*="Upload" i]',
        'button[title*="附件" i]',
        'button[title*="上传" i]',
        'button[class*="upload" i]',
        'button[class*="attach" i]',
        'button:has(input[type="file"])',
        '[role="button"][aria-label*="Attach" i]',
        '[role="button"][aria-label*="Upload" i]',
        '[role="button"][aria-label*="附件" i]',
        '[role="button"][aria-label*="上传" i]',
        '[role="button"]:has(input[type="file"])',
        "label:has(input[type='file'])"
      ],
      fileInputSelectors: [
        'input[type="file"][accept*="pdf" i]',
        'input[type="file"]'
      ],
      attachmentPillSelector: [
        '[class*="attachment" i]',
        '[class*="file-pill" i]',
        '[class*="upload" i]',
        '[class*="file" i]',
        '[aria-label*="pdf" i]',
        '[class*="ds-file" i]',
        '[class*="ds-attachment" i]'
      ].join(", ")
    },
    gemini: {
      id: "gemini",
      label: "Gemini",
      composerSelectors: [
        'rich-textarea div[contenteditable="true"]',
        'rich-textarea [contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][aria-label*="prompt" i]',
        'div[contenteditable="true"][aria-label*="message" i]',
        'div[contenteditable="true"][aria-label*="输入" i]',
        'div[contenteditable="true"]',
        "textarea"
      ],
      sendSelectors: [
        'button[aria-label*="Send" i]',
        'button[aria-label*="发送" i]',
        'button[title*="Send" i]',
        'button[title*="发送" i]',
        'button[data-testid*="send" i]',
        'button[class*="send" i]',
        '[role="button"][aria-label*="Send" i]',
        '[role="button"][aria-label*="发送" i]'
      ],
      stopSelectors: [
        'button[aria-label*="Stop" i]',
        'button[aria-label*="Cancel" i]',
        'button[aria-label*="停止" i]',
        'button[aria-label*="取消" i]',
        'button[title*="Stop" i]',
        'button[title*="Cancel" i]'
      ],
      assistantSelectors: [
        "message-content",
        ".model-response-text.has-thoughts",
        ".model-response-text",
        ".markdown-main-panel",
        '[class*="model-response" i]',
        '[class*="response-container" i]'
      ],
      thinkingSelectors: [
        "[class*='thinking' i]",
        "[class*='reasoning' i]",
        "[aria-label*='Thought' i]",
        "[aria-label*='Thinking' i]",
        "[aria-label*='思考' i]"
      ],
      pruneThinkingSelectors: [
        "[class*='thinking' i]",
        "[class*='reasoning' i]"
      ],
      dropTargetSelectors: [
        ".xap-uploader-dropzone",
        '[class*="uploader-dropzone" i]',
        "rich-textarea",
        'rich-textarea div[contenteditable="true"]',
        'div[contenteditable="true"]',
        "form"
      ],
      attachmentButtonSelectors: [
        'button[aria-label*="Upload" i]',
        'button[aria-label*="Attach" i]',
        'button[aria-label*="Add" i]',
        'button[aria-label*="file" i]',
        'button[aria-label*="上传" i]',
        'button[aria-label*="附件" i]',
        'button[aria-label*="添加" i]',
        'button[title*="Upload" i]',
        'button[title*="Attach" i]',
        'button[title*="Add" i]',
        'button[class*="upload" i]',
        'button[class*="attach" i]',
        'button:has(input[type="file"])',
        '[role="button"][aria-label*="Upload" i]',
        '[role="button"][aria-label*="Attach" i]',
        '[role="button"][aria-label*="添加" i]',
        '[role="button"]:has(input[type="file"])',
        "label:has(input[type='file'])"
      ],
      fileInputSelectors: [
        'input[type="file"][name="Filedata"]',
        'input[type="file"][accept*="pdf" i]',
        'input[type="file"][accept*="application/pdf" i]',
        'input[type="file"][accept*=".pdf" i]',
        'input[type="file"]'
      ],
      attachmentPillSelector: [
        ".attachment-preview-wrapper",
        ".file-preview-chip",
        ".file-preview-container",
        ".gem-attachment",
        ".gem-attachment-tile",
        ".gem-attachment-extension-label",
        ".gem-attachment-text",
        '[aria-label*="pdf" i]',
        '[aria-label*=".pdf" i]'
      ].join(", "),
      actionBarSelectors: [
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Regenerate" i]',
        'button[aria-label*="Like" i]',
        'button[aria-label*="Dislike" i]',
        'button[aria-label*="复制" i]',
        'button[aria-label*="重新生成" i]'
      ]
    }
  };

  let sseText = "";
  let sseThinking = "";
  let sseDone = false;
  let activeStreamCount = 0;
  let lastSseAt = 0;
  let sseDoneAt = 0;
  let outboundRequestSerial = 0;
  let outboundRequestEvents = [];
  let lastRequestAt = 0;
  let mainWorldInjected = false;
  let networkHookActive = false;
  let promptRequestSerial = 0;
  let lastTrustedSubmitOk = null;
  let lastTrustedSubmitError = "";
  let lastPageWorldSubmit = null;
  let lastSubmitStrategy = "";
  const pendingHealthChecks = new Map();
  const promptWriteResults = new Map();
  const submitResults = new Map();

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "paperdock-webchat") return;
    if (event.data.type === "ARXIVMATE_WEBCHAT_STREAM_START") {
      sseDone = false;
      sseDoneAt = 0;
      activeStreamCount = Number(event.data.activeStreamCount) || activeStreamCount || 1;
      lastSseAt = Date.now();
      return;
    }
    if (event.data.type === "ARXIVMATE_WEBCHAT_REQUEST") {
      const serial = Number(event.data.serial) || outboundRequestSerial + 1;
      outboundRequestSerial = Math.max(outboundRequestSerial, serial);
      outboundRequestEvents.push({
        serial,
        url: String(event.data.url || ""),
        method: String(event.data.method || "GET").toUpperCase(),
        chatUrl: String(event.data.chatUrl || ""),
        chatId: String(event.data.chatId || ""),
        sentAt: Number(event.data.sentAt) || Date.now(),
        promptFingerprint: String(event.data.promptFingerprint || "")
      });
      if (outboundRequestEvents.length > 50) outboundRequestEvents = outboundRequestEvents.slice(-50);
      lastRequestAt = Date.now();
      networkHookActive = true;
      mainWorldInjected = true;
      return;
    }
    if (event.data.type === "ARXIVMATE_WEBCHAT_INJECTED_READY") {
      mainWorldInjected = true;
      networkHookActive = event.data.networkHookActive !== false;
      return;
    }
    if (event.data.type === "ARXIVMATE_WEBCHAT_NETWORK_HEALTH") {
      mainWorldInjected = true;
      networkHookActive = event.data.networkHookActive !== false;
      const requestId = String(event.data.requestId || "");
      const resolve = pendingHealthChecks.get(requestId);
      if (resolve) {
        pendingHealthChecks.delete(requestId);
        resolve(networkHookActive);
      }
      return;
    }
    if (event.data.type === "ARXIVMATE_WEBCHAT_STREAM_STATE") {
      activeStreamCount = Math.max(0, Number(event.data.activeStreamCount) || 0);
      lastSseAt = Date.now();
      return;
    }
    if (event.data.type === "ARXIVMATE_WEBCHAT_SSE") {
      sseText = mergeStreamText(sseText, event.data.text || "");
      sseThinking = mergeStreamText(sseThinking, event.data.thinking || "");
      activeStreamCount = Math.max(0, Number(event.data.activeStreamCount) || activeStreamCount || 0);
      sseDone = event.data.done === true && activeStreamCount <= 1;
      if (sseDone && !sseDoneAt) sseDoneAt = Date.now();
      lastSseAt = Date.now();
      return;
    }
    if (event.data.type === "ARXIVMATE_WEBCHAT_PROMPT_RESULT") {
      const requestId = String(event.data.requestId || "");
      if (requestId) {
        promptWriteResults.set(requestId, {
          ok: event.data.ok === true,
          detail: event.data.detail || "",
          text: event.data.text || "",
          textLength: Number(event.data.textLength) || String(event.data.text || "").length
        });
      }
      return;
    }
    if (event.data.type === "ARXIVMATE_WEBCHAT_SUBMIT_RESULT") {
      const requestId = String(event.data.requestId || "");
      if (requestId) {
        submitResults.set(requestId, {
          ok: event.data.ok === true,
          action: event.data.action || "",
          detail: event.data.detail || "",
          composerTextLength: Number(event.data.composerTextLength) || 0,
          buttonFound: event.data.buttonFound === true,
          buttonEnabled: event.data.buttonEnabled === true,
          buttonRect: event.data.buttonRect || null
        });
      }
    }
  });

  function currentSite() {
    const host = location.hostname.toLowerCase();
    if (host.includes("chat.deepseek.com")) return SITE_CONFIGS.deepseek;
    if (host.includes("chatgpt.com")) return SITE_CONFIGS.chatgpt;
    if (host.includes("gemini.google.com")) return SITE_CONFIGS.gemini;
    return null;
  }

  function getCurrentChatUrl() {
    const site = currentSite();
    if (site?.id === "chatgpt") {
      const match = location.pathname.match(/^\/c\/([^/?#]+)/);
      if (match) return `${location.origin}/c/${match[1]}`;
    }
    if (site?.id === "deepseek") {
      const match = location.pathname.match(/^\/a\/chat\/s\/([^/?#]+)/);
      if (match) return `${location.origin}/a/chat/s/${match[1]}`;
    }
    if (site?.id === "gemini") {
      const match = location.pathname.match(/^\/app\/([^/?#]+)/);
      if (match) return `${location.origin}/app/${match[1]}`;
    }
    return "";
  }

  function getCurrentChatId(chatUrl = getCurrentChatUrl()) {
    try {
      return new URL(chatUrl).pathname.split("/").filter(Boolean).pop() || "";
    } catch {
      return "";
    }
  }

  async function waitForCurrentChatUrl(timeoutMs = 8000) {
    const startedAt = Date.now();
    let current = getCurrentChatUrl();
    while (!current && Date.now() - startedAt < timeoutMs) {
      await sleep(250);
      current = getCurrentChatUrl();
    }
    return current;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function longSleep(ms) {
    if (ms < 1000 || typeof Worker !== "function" || typeof Blob !== "function" || !URL?.createObjectURL) {
      return sleep(ms);
    }
    return new Promise((resolve) => {
      let worker = null;
      let objectUrl = "";
      try {
        const blob = new Blob([`setTimeout(() => postMessage("done"), ${Math.max(0, Number(ms) || 0)})`], {
          type: "application/javascript"
        });
        objectUrl = URL.createObjectURL(blob);
        worker = new Worker(objectUrl);
        worker.onmessage = () => {
          worker?.terminate();
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          resolve();
        };
        worker.onerror = () => {
          worker?.terminate();
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          sleep(ms).then(resolve);
        };
      } catch {
        try {
          worker?.terminate();
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        } catch {}
        sleep(ms).then(resolve);
      }
    });
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function mergeStreamText(previous, next) {
    const left = String(previous || "");
    const right = String(next || "");
    if (!right) return left;
    if (!left) return right;
    if (right.startsWith(left)) return right;
    if (left.endsWith(right)) return left;
    return right.length > left.length ? right : left;
  }

  function cleanupCapturedText(value) {
    return normalizeText(String(value || "")
      .replace(/\u200b/g, "")
      .replace(/\s*\\left\s*/g, "\\left ")
      .replace(/\s*\\right\s*/g, "\\right ")
      .replace(/\n{3,}/g, "\n\n"));
  }

  function isVisible(node) {
    if (!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isEditable(node) {
    if (!(node instanceof Element) || !isVisible(node)) return false;
    if (node.matches("textarea,input")) return !node.disabled && !node.readOnly;
    return node.isContentEditable;
  }

  function findComposer(site = currentSite()) {
    for (const selector of site?.composerSelectors || []) {
      const candidates = Array.from(document.querySelectorAll(selector)).filter(isEditable);
      if (candidates.length) return chooseComposerCandidate(candidates, site);
    }
    return null;
  }

  function chooseComposerCandidate(candidates, site = currentSite()) {
    if (!candidates.length) return null;
    if (site?.id === "gemini") {
      return candidates
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const label = [
            node.getAttribute("aria-label"),
            node.getAttribute("placeholder"),
            node.getAttribute("role"),
            node.getAttribute("class")
          ].join(" ");
          let score = rect.bottom;
          if (/prompt|message|ask|输入|消息/i.test(label)) score += 1000;
          if (node.closest?.("rich-textarea")) score += 900;
          if (rect.width > 260 && rect.height > 20) score += 250;
          return { node, score };
        })
        .sort((left, right) => right.score - left.score)[0]?.node || candidates[candidates.length - 1];
    }
    if (site?.id !== "deepseek") return candidates[candidates.length - 1];
    return candidates
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const placeholder = node.getAttribute("placeholder") || "";
        let score = rect.bottom;
        if (/deepseek|发送|消息|message/i.test(placeholder)) score += 1000;
        if (rect.width > 240 && rect.height > 20) score += 200;
        return { node, score };
      })
      .sort((left, right) => right.score - left.score)[0]?.node || candidates[candidates.length - 1];
  }

  function findDropTarget(site = currentSite()) {
    for (const selector of site?.dropTargetSelectors || []) {
      const candidates = Array.from(document.querySelectorAll(selector)).filter((node) => node instanceof Element && isVisible(node));
      if (candidates.length) return candidates[candidates.length - 1];
    }
    return findComposer(site) || document.body;
  }

  function findFileInputs(site = currentSite()) {
    const seen = new Set();
    const inputs = [];
    for (const selector of [...(site?.fileInputSelectors || []), 'input[type="file"]']) {
      try {
        for (const node of Array.from(document.querySelectorAll(selector))) {
          if (!(node instanceof HTMLInputElement) || node.type !== "file" || seen.has(node)) continue;
          seen.add(node);
          inputs.push(node);
        }
      } catch {}
    }
    return inputs;
  }

  function fileInputAcceptsPdf(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== "file" || input.disabled) return false;
    const accept = normalizeText(input.getAttribute("accept") || "").toLowerCase();
    const identity = normalizeText([
      input.id,
      input.name,
      input.getAttribute("data-testid"),
      input.getAttribute("aria-label"),
      input.getAttribute("title"),
      input.getAttribute("class")
    ].join(" ")).toLowerCase();
    if (/upload-(photos?|camera)|camera|photo|image/.test(identity) && !/upload-files|pdf|file/.test(identity)) return false;
    if (!accept) return true;
    const accepts = accept.split(",").map((part) => part.trim()).filter(Boolean);
    const pdfCapable = accepts.some((part) =>
      part === "*/*" ||
      part === "application/*" ||
      part === "application/pdf" ||
      part === ".pdf" ||
      /\bpdf\b/.test(part)
    );
    if (pdfCapable) return true;
    const mediaOnly = accepts.length > 0 && accepts.every((part) =>
      /^image\//.test(part) ||
      /^video\//.test(part) ||
      /^audio\//.test(part) ||
      part === ".png" ||
      part === ".jpg" ||
      part === ".jpeg" ||
      part === ".gif" ||
      part === ".webp"
    );
    return !mediaOnly;
  }

  function scoreFileInput(input, site = currentSite()) {
    if (!fileInputAcceptsPdf(input)) return -Infinity;
    const accept = normalizeText(input.getAttribute("accept") || "").toLowerCase();
    const identity = normalizeText([
      input.id,
      input.name,
      input.getAttribute("data-testid"),
      input.getAttribute("aria-label"),
      input.getAttribute("title"),
      input.getAttribute("class")
    ].join(" ")).toLowerCase();
    let score = 0;
    if (/\bpdf\b|application\/pdf|\.pdf/.test(accept)) score += 1200;
    if (!accept) score += 600;
    if (input.multiple) score += 80;
    if (isVisible(input)) score += 30;
    if (/upload|attach|file|pdf|附件|上传|文件/.test(identity)) score += 350;
    if (site?.id === "chatgpt") {
      if (input.id === "upload-files") score += 2500;
      if (/upload-files/.test(identity)) score += 1200;
      if (/upload-photos|upload-camera|camera|photo|image/.test(identity)) score -= 5000;
    }
    if (site?.id === "deepseek" && /upload|attach|file|pdf|附件|上传|文件/.test(identity)) score += 600;
    if (site?.id === "gemini") {
      if (/upload|attach|file|pdf|picker|drive|附件|上传|文件|添加/.test(identity)) score += 700;
      if (/image|photo|camera|video/.test(identity) && !/pdf|file/.test(identity)) score -= 1200;
    }
    return score;
  }

  function findFileInput(site = currentSite()) {
    return findFileInputs(site)
      .map((input, index) => ({ input, index, score: scoreFileInput(input, site) }))
      .filter((item) => Number.isFinite(item.score))
      .sort((left, right) => right.score - left.score || right.index - left.index)[0]?.input || null;
  }

  function describeFileInput(input) {
    if (!(input instanceof HTMLInputElement)) return null;
    const rect = input.getBoundingClientRect?.();
    return {
      id: input.id || "",
      accept: input.getAttribute("accept") || "",
      name: input.getAttribute("name") || "",
      testid: input.getAttribute("data-testid") || "",
      className: String(input.getAttribute("class") || "").slice(0, 120),
      multiple: Boolean(input.multiple),
      disabled: Boolean(input.disabled),
      visible: isVisible(input),
      score: scoreFileInput(input, currentSite()),
      rect: rect ? `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)}x${Math.round(rect.height)}` : "none"
    };
  }

  function getFileInputDiagnostics(site = currentSite()) {
    return findFileInputs(site).map(describeFileInput).filter(Boolean).slice(-8);
  }

  function findAttachmentButton(site = currentSite()) {
    const selectors = site?.attachmentButtonSelectors || [];
    for (const selector of selectors) {
      const candidates = Array.from(document.querySelectorAll(selector))
        .filter((node) => node instanceof Element && isVisible(node));
      if (candidates.length) return candidates[candidates.length - 1];
    }

    const composer = findComposer(site);
    const container = findComposerContainer(composer);
    const roots = [container, composer?.closest?.("form"), document.body].filter(Boolean);
    const buttons = [];
    const seenButtons = new Set();
    for (const root of roots) {
      for (const node of Array.from(root.querySelectorAll('button, [role="button"], label, div.ds-icon-button'))) {
        if (seenButtons.has(node)) continue;
        seenButtons.add(node);
        buttons.push(node);
      }
    }
    const candidates = buttons
      .filter((node) => node instanceof Element && isVisible(node));
    let best = null;
    let bestScore = -Infinity;
    const composerRect = composer?.getBoundingClientRect?.() || null;
    for (const button of candidates) {
      if (button.matches?.('button[data-testid="send-button"], button[aria-label*="Send" i]')) continue;
      const label = normalizeText([
        button.getAttribute("aria-label"),
        button.getAttribute("title"),
        button.getAttribute("data-testid"),
        button.getAttribute("class"),
        button.textContent
      ].join(" ")).toLowerCase();
      const hasFileInput = Boolean(button.querySelector?.('input[type="file"]') || button.parentElement?.querySelector?.('input[type="file"]'));
      const namedAttach = /attach|upload|file|paperclip|附件|上传|添加/.test(label);
      const looksLikePlus = /plus|add|composer-btn|composer-upload|attachment/.test(label);
      if (!hasFileInput && !namedAttach && !looksLikePlus) continue;
      const rect = button.getBoundingClientRect?.();
      if (!rect || rect.width <= 0 || rect.height <= 0) continue;
      let score = 0;
      if (hasFileInput) score += 1200;
      if (namedAttach) score += 900;
      if (looksLikePlus) score += 300;
      if (composerRect) {
        const centerY = rect.top + rect.height / 2;
        const nearComposer = centerY >= composerRect.top - 120 && centerY <= composerRect.bottom + 120;
        if (!nearComposer) score -= 700;
        else score += 300;
        score -= Math.abs(centerY - (composerRect.top + composerRect.height / 2));
      }
      if (score > bestScore) {
        best = button;
        bestScore = score;
      }
    }
    return best;
  }

  async function openAttachmentPicker(site = currentSite()) {
    const before = findFileInput(site);
    if (before) return true;
    const button = findAttachmentButton(site);
    if (!button) return false;
    dispatchPointerClick(button);
    if (await waitForAttachmentFileInput(site, 1200)) return true;
    const menuItem = findUploadMenuItem(site);
    if (menuItem) {
      dispatchPointerClick(menuItem);
      return Boolean(await waitForAttachmentFileInput(site, 3500));
    }
    return Boolean(await waitForAttachmentFileInput(site, 2500));
  }

  function findUploadMenuItem(site = currentSite()) {
    const candidates = Array.from(document.querySelectorAll([
      "button",
      "[role='button']",
      "[role='menuitem']",
      "label",
      "a"
    ].join(", "))).filter((node) => node instanceof Element && isVisible(node));
    let best = null;
    let bestScore = -Infinity;
    for (const node of candidates) {
      const label = normalizeText([
        node.innerText || node.textContent || "",
        node.getAttribute("aria-label") || "",
        node.getAttribute("title") || "",
        node.getAttribute("data-testid") || "",
        node.getAttribute("class") || ""
      ].join(" ")).toLowerCase();
      const hasFileInput = Boolean(node.querySelector?.("input[type='file']") || node.parentElement?.querySelector?.("input[type='file']"));
      const uploadLike = /upload|attach|file|computer|pdf|上传|附件|文件|本地/.test(label);
      if (!hasFileInput && !uploadLike) continue;
      if (/drive|onedrive|google|cloud|camera|image|photo|图片|照片|网盘/.test(label) && !/file|pdf|文件|本地|computer/.test(label)) continue;
      let score = 0;
      if (hasFileInput) score += 1200;
      if (/upload|上传/.test(label)) score += 700;
      if (/file|pdf|文件/.test(label)) score += 500;
      if (/computer|本地/.test(label)) score += 350;
      if (site?.id === "deepseek" && /deepthink|search|深度思考|搜索/.test(label)) score -= 1500;
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }
    return best;
  }

  async function waitForAttachmentFileInput(site = currentSite(), timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const input = findFileInput(site);
      if (input) return input;
      await sleep(100);
    }
    return null;
  }

  function setNativeValue(input, value) {
    const proto = input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : input instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : null;
    const setter = proto && Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
  }

  function dispatchInput(node, data) {
    node.dispatchEvent(new Event("focus", { bubbles: true }));
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    try {
      node.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: "insertText",
        data
      }));
    } catch {}
    try {
      node.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        composed: true,
        inputType: "insertText",
        data
      }));
    } catch {
      node.dispatchEvent(new Event("input", { bubbles: true }));
    }
    try {
      node.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true,
        data
      }));
    } catch {}
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function writePromptInPageWorld(prompt, timeoutMs = 2500) {
    const requestId = `${Date.now()}-${++promptRequestSerial}`;
    promptWriteResults.delete(requestId);
    window.postMessage({
      source: "paperdock-webchat",
      type: `ARXIVMATE_WEBCHAT_SET_PROMPT_V${BRIDGE_VERSION}`,
      bridgeVersion: BRIDGE_VERSION,
      requestId,
      prompt
    }, "*");
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (promptWriteResults.has(requestId)) {
        const result = promptWriteResults.get(requestId);
        promptWriteResults.delete(requestId);
        return result;
      }
      await sleep(50);
    }
    return {
      ok: false,
      detail: "main_world_timeout",
      text: ""
    };
  }

  async function submitInPageWorld(timeoutMs = 2500) {
    const requestId = `${Date.now()}-${++promptRequestSerial}`;
    submitResults.delete(requestId);
    window.postMessage({
      source: "paperdock-webchat",
      type: `ARXIVMATE_WEBCHAT_SUBMIT_V${BRIDGE_VERSION}`,
      bridgeVersion: BRIDGE_VERSION,
      requestId
    }, "*");
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (submitResults.has(requestId)) {
        const result = submitResults.get(requestId);
        submitResults.delete(requestId);
        lastPageWorldSubmit = result;
        return result;
      }
      await sleep(50);
    }
    lastPageWorldSubmit = {
      ok: false,
      action: "timeout",
      detail: "main_world_submit_timeout"
    };
    return lastPageWorldSubmit;
  }

  function readComposerText(composer) {
    if (!composer) return "";
    if (composer.matches("textarea,input")) return composer.value || "";
    return composer.innerText || composer.textContent || "";
  }

  function composerTextMatches(expected, actual) {
    return normalizeText(expected).replace(/\s+/g, " ") === normalizeText(actual).replace(/\s+/g, " ");
  }

  function makePromptFingerprint(text) {
    const normalized = normalizeText(text).replace(/\s+/g, " ").normalize("NFC").toLowerCase();
    if (!normalized) return "";
    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${normalized.length}:${(hash >>> 0).toString(36)}`;
  }

  async function requestMainWorldHealth(timeoutMs = 800) {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingHealthChecks.delete(requestId);
        resolve(false);
      }, timeoutMs);
      pendingHealthChecks.set(requestId, (ok) => {
        clearTimeout(timer);
        resolve(Boolean(ok));
      });
      window.postMessage({
        source: "paperdock-webchat",
        type: `ARXIVMATE_WEBCHAT_NETWORK_HEALTH_REQUEST_V${BRIDGE_VERSION}`,
        bridgeVersion: BRIDGE_VERSION,
        requestId
      }, "*");
    });
  }

  async function ensureMainWorldNetworkHook() {
    if (networkHookActive && mainWorldInjected) return true;
    const ok = await requestMainWorldHealth();
    if (ok) return true;
    throw new Error("WebChat MAIN-world 网络桥接未就绪，无法确认 ChatGPT/DeepSeek/Gemini 是否真的发送。请在 chrome://extensions 重新加载 PaperDock，并刷新 WebChat 页面后重试。");
  }

  function findObservedRequestContext(baselineSerial, prompt = "") {
    const candidates = outboundRequestEvents.filter((event) => event.serial > baselineSerial);
    if (!candidates.length) return null;
    const fingerprint = makePromptFingerprint(prompt);
    if (!fingerprint) return candidates[0] || null;
    const exact = candidates.find((event) => event.promptFingerprint === fingerprint);
    if (exact) return exact;
    const untagged = candidates.find((event) => !event.promptFingerprint);
    if (untagged) return untagged;
    if (currentSite()?.id === "deepseek" && candidates.length === 1) {
      return {
        ...candidates[0],
        promptFingerprintMismatch: true,
        expectedPromptFingerprint: fingerprint
      };
    }
    return currentSite()?.id === "deepseek" ? null : candidates[0] || null;
  }

  function setTextareaText(textarea, value) {
    const previous = textarea.value || "";
    textarea.focus();
    textarea.click();
    setNativeValue(textarea, "");
    if (textarea._valueTracker?.setValue) textarea._valueTracker.setValue(previous);
    dispatchInput(textarea, "");
    setNativeValue(textarea, value);
    if (textarea._valueTracker?.setValue) textarea._valueTracker.setValue("");
    try {
      textarea.setSelectionRange(value.length, value.length);
    } catch {}
    dispatchInput(textarea, value);
    textarea.dispatchEvent(new KeyboardEvent("keyup", {
      bubbles: true,
      key: value ? value[value.length - 1] || "Unidentified" : "Backspace"
    }));
  }

  function setContentEditableText(composer, value) {
    composer.focus();
    selectAllEditable(composer);
    document.execCommand("delete");
    if (value) {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : document.createRange();
      if (!selection?.rangeCount) {
        range.selectNodeContents(composer);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      const textNode = document.createTextNode(value);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    dispatchInput(composer, value);
  }

  async function pastePromptText(composer, value) {
    composer.focus();
    try {
      const data = new DataTransfer();
      data.setData("text/plain", value);
      const event = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data
      });
      composer.dispatchEvent(event);
    } catch {}
    await sleep(80);
    if (!composerTextMatches(value, readComposerText(composer))) {
      if (composer.matches("textarea,input")) {
        setTextareaText(composer, value);
      } else {
        document.execCommand("insertText", false, value);
        dispatchInput(composer, value);
      }
    }
  }

  function selectAllEditable(node) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function waitForPromptReadyToSend(prompt, composer, timeoutMs = 5000) {
    const expected = normalizeText(prompt);
    if (currentSite()?.id !== "deepseek") {
      return composerTextMatches(expected, readComposerText(composer)) ? composer : null;
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const currentComposer = findComposer() || composer;
      const textAccepted = composerTextMatches(expected, readComposerText(currentComposer));
      if (textAccepted) return currentComposer;
      await sleep(120);
    }
    return null;
  }

  async function writePrompt(prompt) {
    const expected = normalizeText(prompt);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (currentSite()?.id === "deepseek") {
        const composer = await waitForComposer();
        const pageWorldFirst = await writePromptInPageWorld(prompt);
        await sleep(220 + attempt * 120);
        const pageWorldComposer = await waitForPromptReadyToSend(prompt, findComposer() || composer, 2500 + attempt * 1000);
        if (pageWorldComposer && pageWorldFirst.ok) return pageWorldComposer;
        if (composer.matches("textarea,input")) {
          setTextareaText(composer, prompt);
        } else {
          setContentEditableText(composer, prompt);
        }
        await sleep(300 + attempt * 150);
        const typedComposer = await waitForPromptReadyToSend(prompt, findComposer() || composer, 2500 + attempt * 1000);
        if (typedComposer) return typedComposer;
        await pastePromptText(composer, prompt);
        await sleep(250);
        const pastedComposer = await waitForPromptReadyToSend(prompt, findComposer() || composer, 2500 + attempt * 1000);
        if (pastedComposer) return pastedComposer;
      }

      const pageWorldResult = await writePromptInPageWorld(prompt);
      await sleep(180 + attempt * 120);
      let composer = findComposer();
      const pageReadyComposer = await waitForPromptReadyToSend(prompt, composer, 3500 + attempt * 1000);
      if (pageReadyComposer) return pageReadyComposer;

      if (pageWorldResult.ok && composerTextMatches(expected, pageWorldResult.text || "")) {
        composer = findComposer();
        if (composer && currentSite()?.id !== "deepseek") return composer;
      }

      composer = await waitForComposer();
      if (composer.matches("textarea,input")) {
        setTextareaText(composer, prompt);
      } else {
        setContentEditableText(composer, prompt);
      }
      await sleep(180 + attempt * 120);
      const nativeReadyComposer = await waitForPromptReadyToSend(prompt, composer, 2500);
      if (nativeReadyComposer) return nativeReadyComposer;
      await pastePromptText(composer, prompt);
      await sleep(180);
      const pasteReadyComposer = await waitForPromptReadyToSend(prompt, composer, 2500);
      if (pasteReadyComposer) return pasteReadyComposer;
    }
    const composer = findComposer();
    const actual = normalizeText(readComposerText(composer)).slice(0, 120);
    const detail = composer
      ? `${composer.tagName.toLowerCase()}${composer.getAttribute("placeholder") ? ` placeholder="${composer.getAttribute("placeholder")}"` : ""}`
      : "未找到输入框";
    const sendButton = currentSite()?.id === "deepseek" ? findDeepSeekSendButton(composer) : null;
    const sendState = sendButton ? `，发送按钮状态：${describeControl(sendButton)}` : "";
    throw new Error(`WebChat 输入框没有接收 prompt 或网页未启用发送按钮（${detail}，当前内容：${actual || "空"}${sendState}）。请刷新 ${currentSite()?.label || "WebChat"} 页面后重试。`);
  }

  async function attachPdf(site, pdfBase64, filename) {
    const cleanBase64 = String(pdfBase64 || "").trim();
    if (!cleanBase64) return false;

    const file = base64ToPdfFile(cleanBase64, filename);
    const baseline = getAttachmentState(site, file.name);
    if (baseline.count > 0 && baseline.hasExpectedFile) return true;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    let selectedInputDiagnostic = null;

    await openAttachmentPicker(site);
    const pickerInput = await waitForAttachmentFileInput(site, site?.id === "chatgpt" || site?.id === "gemini" ? 5000 : 2500);
    if (pickerInput) {
      selectedInputDiagnostic = describeFileInput(pickerInput);
      applyFilesToInput(pickerInput, transfer.files);
      if (await waitForAttachmentAccepted(site, baseline, 25000, file.name)) return true;
    }

    const dropTarget = findDropTarget(site);
    if (dropTarget) {
      for (const [type, waitMs] of [["dragenter", 100], ["dragover", 100], ["drop", 0]]) {
        dropTarget.dispatchEvent(new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer
        }));
        if (waitMs) await sleep(waitMs);
      }
      if (await waitForAttachmentAccepted(site, baseline, 12000, file.name)) return true;
    }

    const input = findFileInput(site);
    if (input) {
      selectedInputDiagnostic = describeFileInput(input);
      applyFilesToInput(input, transfer.files);
      if (await waitForAttachmentAccepted(site, baseline, 15000, file.name)) return true;
    }

    throw new Error(`${site.label} 页面没有被 PaperDock 识别为已接收本次 PDF 附件（${file.name}）。若页面中已经出现 PDF 卡片，请刷新 WebChat 页面后重试；诊断：${JSON.stringify({
      attachmentState: getAttachmentState(site, file.name),
      selectedFileInput: selectedInputDiagnostic,
      fileInputs: getFileInputDiagnostics(site)
    })}`);
  }

  function applyFilesToInput(input, files) {
    try {
      input.files = files;
    } catch {}
    try {
      Object.defineProperty(input, "files", {
        value: files,
        configurable: true
      });
    } catch {}
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }

  function base64ToPdfFile(base64, filename) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], sanitizeFilename(filename), { type: "application/pdf" });
  }

  function sanitizeFilename(value) {
    const cleaned = String(value || "paper.pdf")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, " ")
      .slice(0, 160)
      .trim() || "paper.pdf";
    return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
  }

  function countAttachmentPills(site = currentSite(), expectedFilename = "") {
    return getAttachmentState(site, expectedFilename).count;
  }

  function getAttachmentState(site = currentSite(), expectedFilename = "") {
    const selector = site?.attachmentPillSelector;
    const selectorNodes = selector
      ? Array.from(document.querySelectorAll(selector)).filter((node) => node instanceof Element && isVisible(node))
      : [];
    const textNodes = findAttachmentTextNodes(site, expectedFilename);
    const expectedFile = normalizeFilenameForMatch(expectedFilename);
    const selectorTexts = selectorNodes.map((node) => attachmentNodeText(node));
    const textNodeTexts = textNodes.map((node) => attachmentNodeText(node));
    const allTexts = [...selectorTexts, ...textNodeTexts];
    const hasExpectedFile = Boolean(expectedFile) && allTexts.some((text) => attachmentTextMatchesFilename(text, expectedFile));
    const count = Math.max(selectorNodes.length, textNodes.length);
    return {
      count,
      hasPdf: selectorNodes.length > 0 || textNodes.length > 0,
      hasExpectedFile,
      expectedFile,
      selectorCount: selectorNodes.length,
      textCount: textNodes.length,
      sampleText: allTexts.slice(-5).map((text) => text.slice(0, 160))
    };
  }

  function findAttachmentTextNodes(site = currentSite(), expectedFilename = "") {
    const roots = [];
    const composer = findComposer(site);
    const container = findComposerContainer(composer);
    if (container) roots.push(container);
    roots.push(document.body);
    const seen = new Set();
    const matches = [];
    for (const root of roots) {
      for (const node of Array.from(root.querySelectorAll("div,span,button,a,li,[role='button']"))) {
        if (!(node instanceof Element) || seen.has(node) || !isVisible(node)) continue;
        seen.add(node);
        if (node.matches?.("textarea,input,[contenteditable='true']")) continue;
        const text = normalizeText(node.innerText || node.textContent || "");
        if (!text || text.length > 260) continue;
        const className = String(node.getAttribute("class") || "");
        const label = [
          text,
          node.getAttribute("aria-label") || "",
          node.getAttribute("title") || "",
          className
        ].join(" ");
        if (looksLikePdfAttachmentText(label, expectedFilename)) matches.push(node);
      }
    }
    return matches;
  }

  function attachmentNodeText(node) {
    if (!(node instanceof Element)) return "";
    return normalizeText([
      node.innerText || node.textContent || "",
      node.getAttribute("aria-label") || "",
      node.getAttribute("title") || "",
      node.getAttribute("data-testid") || "",
      node.getAttribute("class") || ""
    ].join(" "));
  }

  function looksLikePdfAttachmentText(value, expectedFilename = "") {
    const text = normalizeText(value).toLowerCase();
    if (!text) return false;
    const expectedFile = normalizeFilenameForMatch(expectedFilename);
    if (expectedFile && attachmentTextMatchesFilename(text, expectedFile)) return true;
    if (!/\bpdf\b|\.pdf\b|pdf\s*\d+(?:\.\d+)?\s*(?:kb|mb|gb)\b/i.test(text)) return false;
    if (/uploading|processing|parsing|analyzing|正在上传|处理中|解析中|分析中|失败|error/.test(text)) return false;
    return /\bpdf\b|\.pdf\b/.test(text) && (/\d+(?:\.\d+)?\s*(?:kb|mb|gb)\b/i.test(text) || text.length < 180);
  }

  function normalizeFilenameForMatch(value) {
    return normalizeText(String(value || ""))
      .replace(/\.pdf$/i, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function attachmentTextMatchesFilename(value, expectedFile) {
    const expected = normalizeFilenameForMatch(expectedFile);
    if (!expected) return false;
    const text = normalizeFilenameForMatch(value);
    if (!text) return false;
    if (text.includes(expected) || expected.includes(text)) return true;
    const parts = expected.split(" ").filter((part) =>
      part.length >= 4 && !/^(paper|pdf|document|arxiv|the|and|for|with|from|this|that)$/i.test(part)
    );
    if (!parts.length) return false;
    const hits = parts.filter((part) => text.includes(part)).length;
    return hits >= Math.min(2, parts.length);
  }

  function attachmentIsReady(site, state, expectedFilename = "") {
    if (expectedFilename && state?.hasExpectedFile) return true;
    if (site?.id === "gemini" && state?.hasPdf && Number(state?.count || 0) > 0) return true;
    return expectedFilename ? false : Number(state?.count || 0) > 0;
  }

  async function waitForAttachmentAccepted(site, baseline, timeoutMs, expectedFilename = "") {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const state = getAttachmentState(site, expectedFilename);
      const baselineCount = typeof baseline === "object" ? Number(baseline.count) || 0 : Number(baseline) || 0;
      if (state.hasExpectedFile) return true;
      if (attachmentIsReady(site, state, expectedFilename) && (state.hasExpectedFile || state.count > baselineCount || baselineCount === 0)) return true;
      if (!expectedFilename && (state.count > baselineCount || (baselineCount === 0 && state.count > 0))) return true;
      if (!expectedFilename && baselineCount > 0 && state.hasPdf && state.count >= baselineCount) return true;
      await sleep(500);
    }
    return false;
  }

  async function waitForUploadReady(site = currentSite(), timeoutMs = 30000, expectedFilename = "") {
    const deadline = Date.now() + timeoutMs;
    let stableSince = 0;
    let lastDiagnostic = null;
    while (Date.now() < deadline) {
      const composer = findComposer(site);
      const busyText = getUploadStatusText(site, composer).toLowerCase();
      const uploadBusy = /uploading|processing|parsing|analyzing|上传中|正在上传|处理中|解析中|分析中/.test(busyText);
      const sendButton = findSendButton(site, composer);
      const attachmentState = getAttachmentState(site, expectedFilename);
      lastDiagnostic = buildDiagnostic({
        phase: "upload_wait",
        uploadBusy,
        attachmentState
      });
      if (site?.id === "deepseek") {
        if (!uploadBusy && composer && attachmentIsReady(site, attachmentState, expectedFilename) && sendButton && !isSendButtonVisuallyDisabled(sendButton)) {
          stableSince ||= Date.now();
          if (Date.now() - stableSince >= 1000) return true;
        } else {
          stableSince = 0;
        }
        await sleep(500);
        continue;
      }
      if (!uploadBusy && composer && attachmentIsReady(site, attachmentState, expectedFilename) && (sendButton || composer.matches("textarea,input,[contenteditable='true']"))) {
        return true;
      }
      await sleep(500);
    }
    throw new Error(`${site?.label || "WebChat"} PDF 附件还没有准备好，已停止发送以避免只发送空消息：${JSON.stringify(lastDiagnostic || buildDiagnostic({ phase: "upload_timeout" }))}`);
  }

  function findComposerContainer(composer = findComposer()) {
    let container = composer;
    for (let index = 0; index < 8 && container?.parentElement; index += 1) {
      container = container.parentElement;
      const hasComposer = Boolean(container.querySelector?.("textarea,input,[contenteditable='true']"));
      const actionCount = container.querySelectorAll?.('button, [role="button"], div.ds-icon-button')?.length || 0;
      if (hasComposer && actionCount >= 2) return container;
    }
    return composer?.parentElement || document.body;
  }

  function getUploadStatusText(site = currentSite(), composer = findComposer(site)) {
    const parts = [];
    const container = findComposerContainer(composer);
    if (container) parts.push(container.innerText || container.textContent || "");
    const selector = site?.attachmentPillSelector;
    if (selector) {
      for (const node of Array.from(document.querySelectorAll(selector)).filter(isVisible).slice(-12)) {
        parts.push(node.innerText || node.textContent || "");
      }
    }
    return normalizeText(parts.join(" "));
  }

  async function waitForComposer(timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const composer = findComposer();
      if (composer) return composer;
      await sleep(250);
    }
    throw new Error("WebChat 输入框不可用。请先打开对应网页并确认已经登录。");
  }

  function isEnabledButton(button) {
    if (!(button instanceof HTMLButtonElement) && !(button instanceof Element)) return false;
    const className = String(button.className || "");
    return isVisible(button) &&
      !button.disabled &&
      button.getAttribute("aria-disabled") !== "true" &&
      !button.hasAttribute("disabled") &&
      !/disabled/i.test(className);
  }

  function isSendButtonVisuallyDisabled(button) {
    if (!(button instanceof Element) || !isVisible(button)) return true;
    const style = getComputedStyle(button);
    const className = String(button.getAttribute?.("class") || button.className || "");
    if (button.disabled || button.hasAttribute("disabled") || button.getAttribute("aria-disabled") === "true") return true;
    if (style.pointerEvents === "none") return true;
    if (style.cursor === "not-allowed") return true;
    if (Number(style.opacity) > 0 && Number(style.opacity) < 0.55) return true;
    const disabledClass = /\bdisabled\b/i.test(className) || /--disabled\b/i.test(className);
    return disabledClass && Number(style.opacity) > 0 && Number(style.opacity) < 0.8;
  }

  function findButtonBySelectors(selectors) {
    for (const selector of selectors || []) {
      const buttons = Array.from(document.querySelectorAll(selector)).filter(isEnabledButton);
      if (buttons.length) return buttons[buttons.length - 1];
    }
    return null;
  }

  function findSendButton(site = currentSite(), composer = findComposer(site)) {
    if (site?.id === "deepseek") return findDeepSeekSendButton(composer);
    const direct = findButtonBySelectors(site?.sendSelectors);
    if (direct) return direct;

    const root = composer?.closest("form") || composer?.parentElement || document.body;
    const buttons = Array.from(root.querySelectorAll("button")).filter((button) => {
      if (!isEnabledButton(button)) return false;
      if (button.querySelector('input[type="file"]') || button.parentElement?.querySelector('input[type="file"]')) return false;
      return true;
    });
    return buttons.find((button) => {
      const label = normalizeText([
        button.getAttribute("aria-label"),
        button.getAttribute("title"),
        button.textContent
      ].join(" ")).toLowerCase();
      return /send|发送|submit/.test(label);
    }) || chooseSendButtonByPosition(buttons, composer);
  }

  async function waitForSendButton(site = currentSite(), composer = findComposer(site), timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const button = findSendButton(site, composer || findComposer(site));
      if (button) return button;
      await sleep(100);
    }
    return null;
  }

  function chooseSendButtonByPosition(buttons, composer) {
    if (!buttons.length) return null;
    const composerRect = composer?.getBoundingClientRect?.();
    if (!composerRect) return buttons[buttons.length - 1];
    return buttons
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let score = centerX;
        if (centerX >= composerRect.right - 120) score += 600;
        if (centerY >= composerRect.top - 40 && centerY <= composerRect.bottom + 80) score += 400;
        score -= Math.abs(centerY - (composerRect.top + composerRect.height / 2));
        return { button, score };
      })
      .sort((left, right) => right.score - left.score)[0]?.button || buttons[buttons.length - 1];
  }

  function findDeepSeekSendButton(composer = findComposer()) {
    const container = findComposerContainer(composer) || document.body;
    const composerRect = composer?.getBoundingClientRect?.() || null;
    const nodes = Array.from(container.querySelectorAll([
      "button",
      '[role="button"]',
      "div.ds-icon-button",
      '[class*="send" i]',
      '[aria-label*="send" i]',
      '[aria-label*="发送" i]',
      '[data-testid*="send" i]'
    ].join(", ")));
    let best = null;
    let bestScore = -Infinity;
    const seen = new Set();
    for (const node of nodes) {
      const button = node.closest?.('button, [role="button"], div.ds-icon-button') || node;
      if (!button || seen.has(button) || !isVisible(button)) continue;
      seen.add(button);
      if (button.querySelector?.('input[type="file"]') || button.parentElement?.querySelector?.('input[type="file"]')) continue;
      const label = [
        button.getAttribute?.("aria-label"),
        button.getAttribute?.("title"),
        button.textContent,
        button.getAttribute?.("class")
      ].filter(Boolean).join(" ").toLowerCase();
      if (/attach|upload|file|paperclip|deepthink|search|深度思考|智能搜索|附件|上传/.test(label)) continue;
      const rect = button.getBoundingClientRect?.();
      if (!rect || rect.width <= 0 || rect.height <= 0) continue;
      const pathText = Array.from(button.querySelectorAll?.("path") || [])
        .map((path) => path.getAttribute("d") || "")
        .join(" ");
      const primaryCircleSend = /ds-button--primary/.test(label) &&
        /ds-button--filled/.test(label) &&
        /ds-button--circle/.test(label);
      const arrowSendIcon = looksLikeDeepSeekSendIcon(pathText);
      const namedSend = /send|发送/.test(label);
      let score = 0;
      if (composerRect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const composerCenterY = composerRect.top + composerRect.height / 2;
        const adjacentY = centerY >= composerRect.top - 80 && centerY <= composerRect.bottom + 120;
        if (!adjacentY) continue;
        score += centerX - composerRect.left;
        score -= Math.abs(centerY - composerCenterY);
        if (centerX >= composerRect.right - 140) score += 500;
        if (centerY >= composerRect.top) score += 100;
      }
      if (/send|发送/.test(label)) score += 300;
      if (primaryCircleSend) score += 1200;
      if (arrowSendIcon) score += 600;
      if (/primary|circle|filled/.test(label)) score += 80;
      if (!primaryCircleSend && !arrowSendIcon && !namedSend && !/primary|circle|filled/.test(label)) score -= 350;
      if (isSendButtonVisuallyDisabled(button)) score -= 1000;
      if (button.tagName === "BUTTON") score += 20;
      if (score > bestScore) {
        best = button;
        bestScore = score;
      }
    }
    return best;
  }

  function shouldUseDeepSeekDeepThink(mode) {
    mode = String(mode || "").trim().toLowerCase();
    if (mode === "quick") return false;
    if (mode === "deep") return true;
    if (mode === "ask") return true;
    if (mode === "study") return true;
    return false;
  }

  async function setDeepSeekDeepThinkMode(enabled) {
    if (currentSite()?.id !== "deepseek") {
      return { ok: false, reason: "not_deepseek" };
    }
    const button = findDeepSeekDeepThinkButton();
    if (!button) {
      return { ok: false, reason: "deepthink_button_not_found" };
    }
    const before = readDeepSeekDeepThinkState(button);
    if (before === enabled) {
      return { ok: true, changed: false, enabled: before, state: "already_set", control: describeControl(button) };
    }
    if (before === null && !shouldClickUnknownDeepSeekDeepThinkState(enabled, button)) {
      return { ok: false, changed: false, enabled: null, state: "unknown_state_not_clicked", control: describeControl(button) };
    }
    dispatchPointerClick(button);
    await sleep(450);
    const afterButton = findDeepSeekDeepThinkButton() || button;
    const after = readDeepSeekDeepThinkState(afterButton);
    return {
      ok: after === enabled || (after === null && enabled === true),
      changed: true,
      enabled: after,
      state: after === null ? "unknown_after_click" : "updated",
      control: describeControl(afterButton)
    };
  }

  function findDeepSeekDeepThinkButton(composer = findComposer()) {
    const container = findComposerContainer(composer);
    const roots = [container, composer?.closest?.("form"), document.body].filter(Boolean);
    const seen = new Set();
    let best = null;
    let bestScore = -Infinity;
    for (const root of roots) {
      for (const node of Array.from(root.querySelectorAll([
        "button",
        '[role="button"]',
        '[aria-pressed]',
        '[class*="ds-toggle-button" i]',
        "div.ds-icon-button",
        '[class*="ds-button" i]',
        '[aria-label*="DeepThink" i]',
        '[aria-label*="深度思考" i]',
        '[title*="DeepThink" i]',
        '[title*="深度思考" i]'
      ].join(", ")))) {
        const control = node.closest?.('button, [role="button"], [class*="ds-toggle-button" i], div.ds-icon-button, [class*="ds-button" i], [aria-pressed]') || node;
        if (!(control instanceof Element) || seen.has(control) || !isVisible(control)) continue;
        seen.add(control);
        const label = getControlIdentity(control);
        const directText = normalizeText(control.innerText || control.textContent || "");
        if (!looksLikeDeepSeekDeepThinkControl(label)) continue;
        const rect = control.getBoundingClientRect?.();
        if (!rect || rect.width <= 0 || rect.height <= 0) continue;
        let score = 0;
        if (directText === "深度思考") score += 2000;
        if (/^deep\s*think$/i.test(directText)) score += 2000;
        if (/\bds-toggle-button\b/.test(label)) score += 900;
        if (/deep\s*think|deepthink/i.test(label)) score += 1200;
        if (/深度思考|深度推理/.test(label)) score += 1200;
        if (/\br1\b|reasoner|reasoning|推理/.test(label)) score += 250;
        if (/搜索|联网|search|upload|attach|file|send|发送|附件|上传/.test(label)) score -= 700;
        if (/智能搜索/.test(label) && !/^深度思考$/.test(directText)) score -= 900;
        if (rect.width <= 260 && rect.height <= 80) score += 160;
        const composerRect = composer?.getBoundingClientRect?.() || null;
        if (composerRect) {
          const centerY = rect.top + rect.height / 2;
          const nearComposer = centerY >= composerRect.top - 120 && centerY <= composerRect.bottom + 120;
          score += nearComposer ? 250 : -250;
        }
        if (score > bestScore) {
          best = control;
          bestScore = score;
        }
      }
    }
    return best;
  }

  function looksLikeDeepSeekDeepThinkControl(label) {
    const value = String(label || "").toLowerCase();
    if (!/(deep\s*think|deepthink|深度思考|深度推理|\br1\b|reasoner|reasoning)/i.test(value)) return false;
    if (/搜索|联网|search/.test(value) && !/(deep\s*think|deepthink|深度思考|深度推理)/i.test(value)) return false;
    return true;
  }

  function shouldClickUnknownDeepSeekDeepThinkState(enabled, control) {
    if (!(control instanceof Element)) return false;
    const label = getControlIdentity(control);
    if (!looksLikeDeepSeekDeepThinkControl(label)) return false;
    return enabled === true || enabled === false;
  }

  function readDeepSeekDeepThinkState(control) {
    if (!(control instanceof Element)) return null;
    const target = control.closest?.('[class*="ds-toggle-button" i], button, [role="button"], [aria-pressed]') || control;
    const values = [
      control.getAttribute("aria-pressed"),
      control.getAttribute("aria-checked"),
      control.getAttribute("data-state"),
      control.getAttribute("data-active"),
      control.getAttribute("data-selected"),
      control.getAttribute("data-checked"),
      target.getAttribute?.("aria-pressed"),
      target.getAttribute?.("aria-checked"),
      target.getAttribute?.("data-state"),
      target.getAttribute?.("data-active"),
      target.getAttribute?.("data-selected"),
      target.getAttribute?.("data-checked")
    ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
    if (values.some((value) => /^(true|checked|on|active|selected|enabled)$/i.test(value))) return true;
    if (values.some((value) => /^(false|unchecked|off|inactive|unselected|disabled)$/i.test(value))) return false;

    const label = getControlIdentity(control);
    if (/关闭(?:深度思考|deep\s*think)|disable\s+deep\s*think|turn\s+off\s+deep\s*think|已开启|已打开/i.test(label)) return true;
    if (/开启(?:深度思考|deep\s*think)|打开(?:深度思考|deep\s*think)|enable\s+deep\s*think|turn\s+on\s+deep\s*think/i.test(label)) return false;

    const classText = String([
      control.getAttribute?.("class") || control.className || "",
      target.getAttribute?.("class") || target.className || ""
    ].join(" ")).toLowerCase();
    if (/\b(is-)?(active|selected|checked|pressed|on)\b|--active\b|--selected\b|--checked\b/.test(classText)) return true;
    if (/\b(inactive|unselected|unchecked|off)\b|--inactive\b/.test(classText)) return false;
    return null;
  }

  function getControlIdentity(control) {
    if (!(control instanceof Element)) return "";
    return normalizeText([
      control.innerText || control.textContent || "",
      control.getAttribute("aria-label") || "",
      control.getAttribute("title") || "",
      control.getAttribute("data-testid") || "",
      control.getAttribute("data-state") || "",
      control.getAttribute("class") || ""
    ].join(" ")).toLowerCase();
  }

  function chatGptTargetComposerMode(mode) {
    mode = String(mode || "").trim().toLowerCase();
    if (mode === "quick") return "极速";
    if (mode === "deep") return "高级";
    if (mode === "ask") return "高级";
    if (mode === "study") return "高级";
    return "";
  }

  async function setChatGptComposerMode(targetLabel) {
    if (currentSite()?.id !== "chatgpt") {
      return { ok: false, reason: "not_chatgpt" };
    }
    const target = normalizeText(targetLabel);
    if (!target) return { ok: false, reason: "empty_target" };
    const button = findChatGptComposerModeButton();
    if (!button) {
      return { ok: false, reason: "composer_mode_button_not_found", menu: chatGptComposerModeMenuLabels() };
    }
    const before = readChatGptComposerModeLabel(button);
    if (before === target) {
      return { ok: true, changed: false, selected: before, state: "already_set", control: describeControl(button) };
    }
    if (!isChatGptComposerModeMenuOpen()) {
      dispatchPointerClick(button);
      await waitForChatGptComposerModeMenu(1800);
    }
    const item = findChatGptComposerModeItem(target);
    if (!item) {
      return {
        ok: false,
        reason: "composer_mode_item_not_found",
        target,
        selected: before,
        menu: chatGptComposerModeMenuLabels(),
        control: describeControl(button)
      };
    }
    if (!readChatGptComposerModeItemChecked(item)) {
      dispatchPointerClick(item);
      await sleep(500);
    }
    const afterButton = findChatGptComposerModeButton() || button;
    const after = readChatGptComposerModeLabel(afterButton);
    const afterItem = findChatGptComposerModeItem(target);
    const checked = readChatGptComposerModeItemChecked(afterItem);
    return {
      ok: after === target || checked,
      changed: true,
      selected: after || (checked ? target : ""),
      target,
      state: after === target || checked ? "updated" : "not_verified",
      control: describeControl(afterButton),
      menu: chatGptComposerModeMenuLabels()
    };
  }

  function findChatGptComposerModeButton(composer = findComposer()) {
    const container = findComposerContainer(composer);
    const roots = [container, composer?.closest?.("form"), document.body].filter(Boolean);
    const seen = new Set();
    let best = null;
    let bestScore = -Infinity;
    const composerRect = composer?.getBoundingClientRect?.() || null;
    for (const root of roots) {
      for (const node of Array.from(root.querySelectorAll("button, [role='button']"))) {
        if (!(node instanceof Element) || seen.has(node) || !isVisible(node)) continue;
        seen.add(node);
        if (node.closest?.('[role="menu"], [data-testid="composer-intelligence-picker-content"]')) continue;
        const label = readChatGptComposerModeLabel(node);
        if (!label) continue;
        const rect = node.getBoundingClientRect?.();
        if (!rect || rect.width <= 0 || rect.height <= 0) continue;
        let score = 0;
        if (/^(极速|均衡|高级|智能)$/.test(label)) score += 1200;
        const identity = normalizeText([
          node.getAttribute("aria-label"),
          node.getAttribute("title"),
          node.getAttribute("data-testid"),
          node.getAttribute("class")
        ].join(" ")).toLowerCase();
        if (/composer|intelligence|model|picker|pill/.test(identity)) score += 800;
        if (node.getAttribute("aria-haspopup") === "menu" || node.getAttribute("aria-expanded") != null) score += 500;
        if (rect.width <= 180 && rect.height <= 64) score += 180;
        if (composerRect) {
          const centerY = rect.top + rect.height / 2;
          const nearComposer = centerY >= composerRect.top - 160 && centerY <= composerRect.bottom + 120;
          score += nearComposer ? 350 : -450;
        }
        if (score > bestScore) {
          best = node;
          bestScore = score;
        }
      }
    }
    return best;
  }

  function readChatGptComposerModeLabel(node) {
    if (!(node instanceof Element)) return "";
    const text = normalizeText([
      node.innerText || node.textContent || "",
      node.getAttribute("aria-label") || "",
      node.getAttribute("title") || ""
    ].join(" "));
    const match = text.match(/智能|极速|均衡|高级/);
    return match ? match[0] : "";
  }

  function isChatGptComposerModeMenuOpen() {
    return Boolean(findChatGptComposerModeMenuRoot());
  }

  async function waitForChatGptComposerModeMenu(timeoutMs = 1500) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (findChatGptComposerModeMenuRoot()) return true;
      await sleep(100);
    }
    return false;
  }

  function findChatGptComposerModeMenuRoot() {
    const selectors = [
      '[data-testid="composer-intelligence-picker-content"]',
      '[role="menu"]',
      "[data-radix-popper-content-wrapper]"
    ];
    for (const selector of selectors) {
      const candidates = Array.from(document.querySelectorAll(selector))
        .filter((node) => node instanceof Element && isVisible(node));
      const root = candidates.find((node) => /智能|极速|均衡|高级/.test(normalizeText(node.innerText || node.textContent || "")));
      if (root) return root;
    }
    return null;
  }

  function findChatGptComposerModeItem(targetLabel) {
    const target = normalizeText(targetLabel);
    const roots = [findChatGptComposerModeMenuRoot(), document.body].filter(Boolean);
    const seen = new Set();
    for (const root of roots) {
      const candidates = Array.from(root.querySelectorAll([
        '[role="menuitemradio"]',
        '[role="menuitem"]',
        "button",
        "[data-testid]"
      ].join(", "))).filter((node) => node instanceof Element && isVisible(node));
      for (const node of candidates) {
        if (seen.has(node)) continue;
        seen.add(node);
        const label = readChatGptComposerModeLabel(node);
        if (label === target) return node;
      }
    }
    return null;
  }

  function readChatGptComposerModeItemChecked(item) {
    if (!(item instanceof Element)) return false;
    const values = [
      item.getAttribute("aria-checked"),
      item.getAttribute("data-state"),
      item.getAttribute("data-checked"),
      item.getAttribute("data-selected")
    ].map((value) => String(value || "").trim().toLowerCase());
    return values.some((value) => /^(true|checked|selected|on)$/.test(value));
  }

  function chatGptComposerModeMenuLabels() {
    const root = findChatGptComposerModeMenuRoot();
    if (!root) return [];
    return Array.from(root.querySelectorAll('[role="menuitemradio"], [role="menuitem"], button, [data-testid]'))
      .map(readChatGptComposerModeLabel)
      .filter(Boolean)
      .filter((label, index, labels) => labels.indexOf(label) === index);
  }

  async function ensureChatGptComposerModeForPaperMode(port, site, payload) {
    if (site?.id !== "chatgpt") return "";
    const chatGptMode = chatGptTargetComposerMode(payload.webchatMode);
    if (!chatGptMode) return "";
    const phase = chatGptMode === "极速" ? "chatgpt_fast_mode" : "chatgpt_deep_mode";
    const chatGptModeResult = await setChatGptComposerMode(chatGptMode).catch((error) => ({
      ok: false,
      error: error?.message || String(error)
    }));
    post(port, {
      type: "phase",
      phase,
      site: site.id,
      diagnostic: chatGptModeResult
    });
    return phase;
  }

  function looksLikeDeepSeekSendIcon(pathText) {
    const value = String(pathText || "");
    const hints = [
      /M8\.3125/,
      /14\.707/,
      /15\.043/,
      /3\.95717/,
      /6\.83608/
    ];
    return hints.filter((pattern) => pattern.test(value)).length >= 2;
  }

  function findStopButton(site = currentSite()) {
    if (site?.id === "deepseek") return null;
    const direct = findButtonBySelectors(site?.stopSelectors);
    if (direct) return direct;
    const buttons = Array.from(document.querySelectorAll("button")).filter(isEnabledButton);
    return buttons.find((button) => {
      const label = normalizeText([
        button.getAttribute("aria-label"),
        button.getAttribute("title"),
        button.textContent
      ].join(" ")).toLowerCase();
      return /stop|停止|cancel|取消/.test(label);
    }) || null;
  }

  function hasResponseActionBar(site = currentSite()) {
    if (site?.id !== "chatgpt") return false;
    const candidates = getAssistantCandidates(site);
    if (!candidates.length) return false;
    const messageNodes = Array.from(document.querySelectorAll('[data-message-author-role="assistant"], article[data-testid*="assistant"]'))
      .filter((node) => node instanceof Element && isVisible(node));
    const lastMessage = messageNodes[messageNodes.length - 1];
    if (!lastMessage) return false;
    const searchRoot = site.conversationTurnSelector
      ? lastMessage.closest(site.conversationTurnSelector) || lastMessage.parentElement || lastMessage
      : lastMessage.parentElement || lastMessage;
    for (const selector of site.actionBarSelectors || []) {
      const el = searchRoot.querySelector(selector);
      if (el && isVisible(el)) return true;
    }
    const contentArea = searchRoot.querySelector(".markdown, [class*='markdown'], .prose, [class*='prose']");
    const buttons = Array.from(searchRoot.querySelectorAll('button, [role="button"]'));
    let iconButtonCount = 0;
    for (const button of buttons) {
      if (!(button instanceof Element) || !isVisible(button)) continue;
      if (contentArea?.contains(button)) continue;
      const hasSvg = Boolean(button.querySelector("svg"));
      const textLen = normalizeText(button.textContent || "").length;
      if (hasSvg && textLen <= 2) iconButtonCount += 1;
    }
    return iconButtonCount >= 3;
  }

  function dispatchPointerClick(element) {
    if (!element) return;
    element.focus?.();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      button: 0,
      buttons: 1
    };
    const pointerEventInit = {
      ...eventInit,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true
    };
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const EventCtor = type.startsWith("pointer") && typeof PointerEvent === "function"
        ? PointerEvent
        : MouseEvent;
      element.dispatchEvent(new EventCtor(type, type.startsWith("pointer") ? pointerEventInit : eventInit));
    }
    try {
      element.click?.();
    } catch {}
  }

  async function dispatchTrustedClick(element) {
    if (!(element instanceof Element)) return false;
    dispatchPointerClick(element);
    lastTrustedSubmitOk = null;
    lastTrustedSubmitError = "";
    return true;
  }

  async function dispatchTrustedEnter(composer) {
    dispatchSubmitViaEnter(composer);
    lastTrustedSubmitOk = null;
    lastTrustedSubmitError = "";
    return true;
  }

  async function clickSubmitControl(button) {
    if (!button) return false;
    if (await dispatchTrustedClick(button)) return true;
    dispatchPointerClick(button);
    return true;
  }

  async function submitByTrustedInput(composer, button = null) {
    const site = currentSite();
    const target = button || findSendButton(site, composer);

    if (site?.id === "deepseek") {
      const pageWorld = await submitInPageWorld();
      if (pageWorld?.ok && pageWorld.action && pageWorld.action !== "error") {
        lastSubmitStrategy = `page_world_${pageWorld.action}`;
        return lastSubmitStrategy;
      }
      if (target && await dispatchTrustedClick(target)) {
        lastSubmitStrategy = "dom_click";
        return lastSubmitStrategy;
      }
      if (await dispatchTrustedEnter(composer)) {
        lastSubmitStrategy = "dom_enter";
        return lastSubmitStrategy;
      }
    } else {
      const pageWorld = await submitInPageWorld();
      if (pageWorld?.ok && pageWorld.action && pageWorld.action !== "error") {
        lastSubmitStrategy = `page_world_${pageWorld.action}`;
        return lastSubmitStrategy;
      }
      if (target && await dispatchTrustedClick(target)) {
        lastSubmitStrategy = "trusted_click";
        return lastSubmitStrategy;
      }
      if (await dispatchTrustedEnter(composer)) {
        lastSubmitStrategy = "trusted_enter";
        return lastSubmitStrategy;
      }
    }

    if (target) {
      dispatchPointerClick(target);
      lastSubmitStrategy = "dom_click";
      return lastSubmitStrategy;
    }
    dispatchSubmitViaEnter(composer);
    dispatchSubmitViaForm(composer);
    lastSubmitStrategy = "dom_enter";
    return lastSubmitStrategy;
  }

  function dispatchSubmitViaEnter(composer) {
    if (!composer) return;
    composer.focus();
    const eventInit = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    };
    composer.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    composer.dispatchEvent(new KeyboardEvent("keypress", eventInit));
    composer.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  }

  function dispatchSubmitViaForm(composer) {
    const form = composer?.closest?.("form");
    if (!form) return false;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
      return true;
    }
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    return true;
  }

  function composerLooksSubmitted(prompt, composer) {
    const current = normalizeText(readComposerText(composer));
    if (!current) return true;
    return !composerTextMatches(prompt, current);
  }

  function getUserMessageCount(site = currentSite()) {
    if (site?.id === "chatgpt") {
      return document.querySelectorAll('[data-message-author-role="user"]').length;
    }
    if (site?.id === "gemini") {
      const selectors = [
        "user-query",
        '[data-test-id*="user" i]',
        '[data-testid*="user" i]',
        '[class*="user-query" i]',
        '[class*="query-content" i]',
        '[class*="user-prompt" i]'
      ];
      const seen = new Set();
      let count = 0;
      for (const selector of selectors) {
        for (const node of document.querySelectorAll(selector)) {
          if (!(node instanceof Element) || seen.has(node) || !isVisible(node)) continue;
          const text = normalizeText(node.innerText || node.textContent || "");
          if (!text && !node.querySelector?.('[class*="file" i], [class*="attachment" i]')) continue;
          seen.add(node);
          count += 1;
        }
      }
      return count;
    }
    if (site?.id === "deepseek") {
      return Array.from(document.querySelectorAll("div.ds-message"))
        .filter((node) => {
          if (!(node instanceof Element) || !isVisible(node) || node.querySelector(".ds-markdown")) return false;
          const text = normalizeText(node.innerText || node.textContent || "");
          return text.length > 0 || node.querySelector('[class*="file" i], [class*="attachment" i]');
        })
        .length;
    }
    return 0;
  }

  function describeControl(control) {
    if (!control) return "not_found";
    const rect = control.getBoundingClientRect?.();
    const classText = String(control.getAttribute?.("class") || control.className || "");
    const style = control instanceof Element ? getComputedStyle(control) : null;
    return [
      control instanceof Element && currentSite()?.id === "deepseek" && !isSendButtonVisuallyDisabled(control)
        ? "enabled"
        : isEnabledButton(control) ? "enabled" : "disabled_or_hidden",
      control.tagName?.toLowerCase?.() || "node",
      `class=${classText.slice(0, 120)}`,
      style ? `cursor=${style.cursor}` : "",
      style ? `opacity=${style.opacity}` : "",
      style ? `background=${style.backgroundColor}` : "",
      rect ? `rect=${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)}x${Math.round(rect.height)}` : "rect=none"
    ].filter(Boolean).join("; ");
  }

  function buildDiagnostic(extra = {}) {
    const composer = findComposer();
    const sendButton = findSendButton(currentSite(), composer);
    return {
      site: currentSite()?.id || "",
      composerFound: Boolean(composer),
      composerTextLength: normalizeText(readComposerText(composer)).length,
      attachmentCount: countAttachmentPills(),
      userMessageCount: getUserMessageCount(),
      outboundRequestSerial,
      recentRequests: outboundRequestEvents.slice(-5),
      mainWorldInjected,
      networkHookActive,
      activeStreamCount,
      sseTextLength: String(sseText || "").length,
      sendControlState: describeControl(sendButton),
      trustedSubmitOk: lastTrustedSubmitOk,
      trustedSubmitError: lastTrustedSubmitError,
      pageWorldSubmit: lastPageWorldSubmit,
      submitStrategy: lastSubmitStrategy,
      ...extra
    };
  }

  async function waitForSubmissionSignal(prompt, baseline, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const composer = findComposer();
      const requestContext = findObservedRequestContext(baseline.outboundRequestSerial, prompt);
      const requestObserved = Boolean(requestContext);
      const streamObserved = activeStreamCount > baseline.activeStreamCount || Boolean(lastSseAt && lastSseAt >= baseline.startedAt);
      const userTurnObserved = getUserMessageCount() > baseline.userMessageCount;
      const composerSubmitted = composerLooksSubmitted(prompt, composer);
      const site = currentSite();
      const needsStrongSubmitSignal = site?.id === "deepseek" || site?.id === "gemini";
      const delivered = requestObserved || streamObserved || userTurnObserved || (!needsStrongSubmitSignal && composerSubmitted);
      if (delivered) {
        return {
          delivered: true,
          requestObserved,
          streamObserved,
          userTurnObserved,
          composerSubmitted,
          requestContext,
          diagnostic: buildDiagnostic({
            phase: "submitted",
            requestObserved,
            streamObserved,
            userTurnObserved,
            composerSubmitted,
            requestContext
          })
        };
      }
      await longSleep(200);
    }
    return {
      delivered: false,
      diagnostic: buildDiagnostic({
        phase: "submit_timeout",
        requestObserved: Boolean(findObservedRequestContext(baseline.outboundRequestSerial, prompt)),
        streamObserved: activeStreamCount > baseline.activeStreamCount,
        userTurnObserved: getUserMessageCount() > baseline.userMessageCount,
        composerSubmitted: composerLooksSubmitted(prompt, findComposer()),
        mainWorldInjected,
        networkHookActive
      })
    };
  }

  function makeSubmissionBaseline() {
    return {
      startedAt: Date.now(),
      outboundRequestSerial,
      activeStreamCount,
      userMessageCount: getUserMessageCount()
    };
  }

  async function submitPrompt(composer = findComposer(), prompt = "") {
    const site = currentSite();
    if (site?.id === "deepseek") {
      return submitDeepSeekPrompt(composer, prompt);
    }

    let lastDiagnostic = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      lastTrustedSubmitOk = null;
      lastTrustedSubmitError = "";
      lastPageWorldSubmit = null;
      lastSubmitStrategy = "";
      const currentComposer = await waitForComposer();
      if (!composerTextMatches(prompt, readComposerText(currentComposer))) {
        await writePrompt(prompt);
      }
      const baseline = makeSubmissionBaseline();
      const button = await waitForSendButton(site, currentComposer, 30000);
      if (isEnabledButton(button)) {
        await submitByTrustedInput(currentComposer, button);
      } else {
        await submitByTrustedInput(currentComposer, null);
      }
      const delivered = await waitForSubmissionSignal(prompt, baseline, 15000);
      lastDiagnostic = delivered.diagnostic;
      if (delivered.delivered) return delivered;
      await writePrompt(prompt);
    }
    throw new Error(`WebChat 没有确认发送成功：${JSON.stringify(lastDiagnostic || buildDiagnostic({ phase: "submit_failed" }))}`);
  }

  async function submitDeepSeekPrompt(composer, prompt) {
    await ensureMainWorldNetworkHook();
    let totalClickAttempts = 0;
    let lastDiagnostic = null;
    let lastButton = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      lastTrustedSubmitOk = null;
      lastTrustedSubmitError = "";
      lastPageWorldSubmit = null;
      lastSubmitStrategy = "";
      const baseline = makeSubmissionBaseline();
      const started = Date.now();
      let lastClickAt = 0;
      while (Date.now() - started < 30000) {
        const currentComposer = findComposer() || composer;
        if (!currentComposer) {
          await longSleep(150);
          continue;
        }
        const early = await waitForSubmissionSignal(prompt, baseline, 350);
        lastDiagnostic = early.diagnostic;
        if (early.delivered) return early;

        const button = findDeepSeekSendButton(currentComposer);
        lastButton = button || lastButton;
        const now = Date.now();
        if (button && !isSendButtonVisuallyDisabled(button) && now - lastClickAt >= 350) {
          lastClickAt = now;
          totalClickAttempts += 1;
          await submitByTrustedInput(currentComposer, button);
          const postClick = await waitForSubmissionSignal(prompt, baseline, 1500);
          lastDiagnostic = postClick.diagnostic;
          if (postClick.delivered) return postClick;
        } else if (!button && now - lastClickAt >= 1200) {
          lastClickAt = now;
          await submitByTrustedInput(currentComposer, null);
          const postFallback = await waitForSubmissionSignal(prompt, baseline, 1500);
          lastDiagnostic = postFallback.diagnostic;
          if (postFallback.delivered) return postFallback;
        }
        await longSleep(150);
      }
      await writePrompt(prompt);
    }
    throw new Error(`DeepSeek 没有确认发送成功（点击 ${totalClickAttempts} 次，按钮：${describeControl(lastButton)}）：${JSON.stringify(lastDiagnostic || buildDiagnostic({ phase: "deepseek_submit_failed" }))}`);
  }

  async function diagnoseWebChatBridge() {
    const site = currentSite();
    if (!site) {
      return {
        ok: false,
        error: "unsupported_site",
        bridgeVersion: BRIDGE_VERSION,
        url: location.href
      };
    }
    const hookOk = await requestMainWorldHealth().catch(() => false);
    const composer = findComposer(site);
    const sendButton = findSendButton(site, composer);
    return {
      ok: Boolean(composer) && Boolean(hookOk),
      site: site.id,
      url: location.href,
      bridgeVersion: BRIDGE_VERSION,
      composerFound: Boolean(composer),
      composerTextLength: normalizeText(readComposerText(composer)).length,
      sendControlState: describeControl(sendButton),
      selectedFileInput: describeFileInput(findFileInput(currentSite())),
      fileInputs: getFileInputDiagnostics(currentSite()),
      mainWorldInjected,
      networkHookActive,
      hookOk,
      outboundRequestSerial
    };
  }

  function candidateText(node) {
    const clone = node.cloneNode(true);
    restoreRenderedMath(clone);
    removeThinkingNodes(clone, currentSite());
    removeCaptureNoise(clone);
    return cleanupCapturedText(clone.innerText || clone.textContent || "");
  }

  function removeCaptureNoise(root) {
    root.querySelectorAll([
      "button",
      "[role='button']",
      "script",
      "style",
      "svg",
      ".katex-html",
      ".katex-mathml",
      ".MathJax_Assistive_MathML",
      "mjx-assistive-mml",
      "math"
    ].join(", ")).forEach((child) => child.remove());
  }

  function removeThinkingNodes(root, site = currentSite()) {
    const selectors = [
      "[data-testid='reasoning-content']",
      "[data-testid='thinking-content']",
      "[data-testid='thinking']",
      "[class*='think' i]",
      "[class*='thinking' i]",
      "[class*='reasoning' i]",
      ...(site?.pruneThinkingSelectors || [])
    ];
    root.querySelectorAll(selectors.join(", ")).forEach((node) => node.remove());

    root.querySelectorAll("details").forEach((node) => {
      const summary = normalizeText(node.querySelector("summary")?.innerText || node.querySelector("summary")?.textContent || "");
      if (/thought|thinking|reason|思考|推理/i.test(summary)) node.remove();
    });
  }

  function restoreRenderedMath(root) {
    restoreKatex(root);
    restoreMathJax(root);
  }

  function restoreKatex(root) {
    const nodes = Array.from(root.querySelectorAll(".katex"));
    for (const node of nodes) {
      const tex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
      if (!tex) continue;
      const display = Boolean(node.closest(".katex-display"));
      node.replaceWith(document.createTextNode(display ? `\n\\[${tex}\\]\n` : `\\(${tex}\\)`));
    }
  }

  function restoreMathJax(root) {
    const nodes = Array.from(root.querySelectorAll("mjx-container, .MathJax"));
    for (const node of nodes) {
      const tex = node.getAttribute("data-tex") ||
        node.getAttribute("aria-label") ||
        node.querySelector('annotation[encoding="application/x-tex"]')?.textContent ||
        "";
      if (!tex || /^(math|formula)$/i.test(tex.trim())) {
        node.remove();
        continue;
      }
      const display = node.getAttribute("display") === "true" || node.classList.contains("MathJax_Display");
      node.replaceWith(document.createTextNode(display ? `\n\\[${tex}\\]\n` : `\\(${tex}\\)`));
    }
  }

  function htmlToMarkdown(html) {
    const container = document.createElement("div");
    container.innerHTML = String(html || "");

    function childrenToMarkdown(node) {
      return Array.from(node.childNodes).map(nodeToMarkdown).join("");
    }

    function nodeToMarkdown(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
      if (!(node instanceof Element)) return "";
      if (node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return "";

      const tag = node.tagName?.toLowerCase();
      const className = String(node.getAttribute("class") || node.className || "");
      if (/(sr-only|screen-reader|visually-hidden|radix-visually-hidden)/i.test(className)) return "";
      if (/katex-mathml|katex-html|MathJax_Assistive_MathML/i.test(className) || tag === "mjx-assistive-mml" || tag === "script" || tag === "style" || tag === "svg") return "";

      if (tag === "span") {
        if (className.includes("katex-display")) {
          const latex = extractLatexFromKatex(node);
          if (latex) return `\n$$${latex}$$\n`;
        }
        if (/\bkatex\b/.test(className) && !className.includes("katex-")) {
          const latex = extractLatexFromKatex(node);
          if (latex) return `$${latex}$`;
        }
      }

      const content = () => childrenToMarkdown(node);
      switch (tag) {
        case "h1": return `\n# ${content().trim()}\n`;
        case "h2": return `\n## ${content().trim()}\n`;
        case "h3": return `\n### ${content().trim()}\n`;
        case "h4": return `\n#### ${content().trim()}\n`;
        case "h5": return `\n##### ${content().trim()}\n`;
        case "h6": return `\n###### ${content().trim()}\n`;
        case "p": return `\n${content().trim()}\n`;
        case "br": return "\n";
        case "strong":
        case "b": return `**${content()}**`;
        case "em":
        case "i": return `*${content()}*`;
        case "code": {
          if (node.parentElement?.tagName?.toLowerCase() === "pre") return node.textContent || "";
          return `\`${node.textContent || content()}\``;
        }
        case "pre": {
          const code = node.querySelector("code");
          const lang = String(code?.className || "").match(/language-([\w-]+)/)?.[1] || "";
          const text = code ? code.textContent || "" : node.textContent || "";
          return `\n\`\`\`${lang}\n${text.replace(/\n+$/g, "")}\n\`\`\`\n`;
        }
        case "ul":
          return `\n${Array.from(node.children).filter((child) => child.tagName?.toLowerCase() === "li").map((li) => `- ${liChildrenToMarkdown(li)}`).join("\n")}\n`;
        case "ol":
          return `\n${Array.from(node.children).filter((child) => child.tagName?.toLowerCase() === "li").map((li, index) => `${index + 1}. ${liChildrenToMarkdown(li)}`).join("\n")}\n`;
        case "li":
          return content().trim();
        case "a": {
          const text = content().trim() || node.getAttribute("href") || "";
          const href = node.getAttribute("href") || "";
          return href ? `[${text}](${href})` : text;
        }
        case "blockquote":
          return `\n> ${content().trim().replace(/\n/g, "\n> ")}\n`;
        case "hr":
          return "\n---\n";
        case "table":
          return `\n${tableToMarkdown(node)}\n`;
        default:
          return content();
      }
    }

    function tableToMarkdown(table) {
      const rows = Array.from(table.querySelectorAll("tr"));
      if (!rows.length) return "";
      const lines = rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td, th")).map((cell) =>
          childrenToMarkdown(cell).trim().replace(/\|/g, "\\|")
        );
        return `| ${cells.join(" | ")} |`;
      });
      const firstCellCount = (lines[0].match(/\|/g) || []).length - 1;
      const separator = `| ${Array.from({ length: Math.max(1, firstCellCount) }).map(() => "---").join(" | ")} |`;
      return [lines[0], separator, ...lines.slice(1)].join("\n");
    }

    function liChildrenToMarkdown(li) {
      return Array.from(li.childNodes)
        .map(nodeToMarkdown)
        .join("")
        .replace(/^\s*[-*]\s+/, "")
        .trim();
    }

    return cleanupCapturedText(nodeToMarkdown(container).replace(/\n{3,}/g, "\n\n"));
  }

  function extractLatexFromKatex(node) {
    return node.querySelector?.('annotation[encoding="application/x-tex"]')?.textContent?.trim() || "";
  }

  function getAssistantCandidates(site = currentSite()) {
    if (site?.id === "deepseek") return getDeepSeekAssistantCandidates();
    if (site?.id === "chatgpt") return getChatGptAssistantCandidates(site);
    if (site?.id === "gemini") return getGeminiAssistantCandidates(site);
    const seen = new Set();
    const candidates = [];
    for (const selector of site?.assistantSelectors || []) {
      for (const node of document.querySelectorAll(selector)) {
        if (!(node instanceof Element) || !isVisible(node)) continue;
        const text = candidateText(node);
        if (!hasMeaningfulText(text) || seen.has(text)) continue;
        seen.add(text);
        candidates.push({
          text,
          thinking: "",
          order: candidates.length
        });
      }
    }
    return candidates;
  }

  function getGeminiAssistantCandidates(site = currentSite()) {
    const candidates = [];
    const seenKeys = new Set();
    const seenNodes = new Set();
    for (const selector of site?.assistantSelectors || []) {
      for (const node of document.querySelectorAll(selector)) {
        if (!(node instanceof Element) || !isVisible(node)) continue;
        if (isGeminiPromptEchoContainer(node)) continue;
        if (node.closest?.("user-query, [class*='user-query' i], [class*='user-prompt' i]")) continue;
        const container = node.closest?.("model-response, message-content, [class*='model-response' i], [class*='response-container' i]") || node;
        if (!(container instanceof Element) || seenNodes.has(container) || !isVisible(container)) continue;
        if (isGeminiPromptEchoContainer(container)) continue;
        seenNodes.add(container);

        const sections = extractAssistantSections(container, site);
        let text = sections.answer || "";
        let thinking = sections.thinking || "";
        if (isPaperDockPromptLeak(thinking)) thinking = "";
        if (!hasMeaningfulText(text)) text = candidateText(container);
        if (isPaperDockPromptLeak(text) && !hasMeaningfulText(thinking)) continue;
        if (isPaperDockPromptLeak(text)) text = "";
        if (isLikelyPaperContextLeak(text) && !hasMeaningfulText(thinking)) continue;
        if (isLikelyPaperContextLeak(text)) text = "";
        if (!hasMeaningfulText(text) && !hasMeaningfulText(thinking)) continue;

        const key = `${text}\n---thinking---\n${thinking}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        candidates.push({
          text,
          thinking,
          sourcePriority: geminiAssistantSourcePriority(selector, container),
          order: candidates.length
        });
      }
    }
    return candidates;
  }

  function geminiAssistantSourcePriority(selector, container) {
    const tag = String(container?.tagName || "").toLowerCase();
    const className = String(container?.getAttribute?.("class") || container?.className || "").toLowerCase();
    if (tag === "message-content") return 6;
    if (/model-response-text/.test(className)) return 5;
    if (selector === ".markdown-main-panel" || /markdown-main-panel/.test(className)) return 4;
    if (/model-response/.test(className)) return 2;
    if (/response-container/.test(className)) return 1;
    return 0;
  }

  function getChatGptAssistantCandidates(site = currentSite()) {
    const candidates = [];
    const seen = new Set();
    const messageNodes = Array.from(document.querySelectorAll('[data-message-author-role="assistant"], article[data-testid*="assistant"]'))
      .filter((node) => node instanceof Element && isVisible(node));
    for (const node of messageNodes) {
      const sections = extractAssistantSections(node, site);
      const text = sections.answer || "";
      const thinking = sections.thinking || "";
      if (!hasMeaningfulText(text) && !hasMeaningfulText(thinking)) continue;
      const key = `${text}\n---thinking---\n${thinking}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ text, thinking, order: candidates.length });
    }
    if (candidates.length) return candidates;

    for (const selector of site?.assistantSelectors || []) {
      for (const node of document.querySelectorAll(selector)) {
        if (!(node instanceof Element) || !isVisible(node)) continue;
        if (hasThinkingAncestorOrLabel(node) && !node.matches?.('[data-message-author-role="assistant"], article[data-testid*="assistant"]')) continue;
        const sections = extractAssistantSections(node, site);
        const text = sections.answer || "";
        const thinking = sections.thinking || "";
        if (!hasMeaningfulText(text) && !hasMeaningfulText(thinking)) continue;
        const key = `${text}\n---thinking---\n${thinking}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({ text, thinking, order: candidates.length });
      }
    }
    return candidates;
  }

  function getDeepSeekAssistantCandidates() {
    const candidates = [];
    const seen = new Set();
    const messageNodes = Array.from(document.querySelectorAll("div.ds-message"))
      .filter((node) => node instanceof Element && isVisible(node) && node.querySelector(".ds-markdown"));
    for (const node of messageNodes) {
      const sections = extractDeepSeekAssistantSections(node);
      const text = sections?.answer || "";
      const thinking = sections?.thinking || "";
      if (!hasMeaningfulText(text) && !hasMeaningfulText(thinking)) continue;
      const key = `${text}\n---thinking---\n${thinking}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        text,
        thinking,
        order: candidates.length
      });
    }
    if (candidates.length) return candidates;

    for (const node of Array.from(document.querySelectorAll(".ds-markdown")).filter((item) => item instanceof Element && isVisible(item))) {
      const text = candidateText(node);
      if (!hasMeaningfulText(text) || seen.has(text)) continue;
      seen.add(text);
      candidates.push({
        text,
        thinking: "",
        order: candidates.length
      });
    }
    return candidates;
  }

  function deepSeekMessageText(node) {
    return extractDeepSeekAssistantSections(node)?.answer || candidateText(node);
  }

  function extractAssistantSections(node, site = currentSite()) {
    if (site?.id === "chatgpt") return extractChatGptAssistantSections(node, site);
    const thinking = extractAssistantThinkingText(node, site);
    const answer = extractAssistantAnswerText(node, site);
    return { answer, thinking };
  }

  function extractChatGptAssistantSections(node, site = currentSite()) {
    if (!node) return { answer: "", thinking: "" };
    const thinking = extractChatGptThinkingText(node, site);
    const answerRoot = node.cloneNode(true);
    restoreRenderedMath(answerRoot);
    removeChatGptThinkingNodes(answerRoot, site);
    pruneAssistantStatusNodes(answerRoot, site);
    return {
      answer: extractBestAssistantText(answerRoot),
      thinking
    };
  }

  function extractAssistantAnswerText(node, site = currentSite()) {
    if (!node) return "";
    if (site?.id === "deepseek") {
      return extractDeepSeekAssistantSections(node)?.answer || "";
    }
    if (site?.id === "chatgpt") {
      return extractChatGptAssistantSections(node, site).answer || "";
    }
    const clone = node.cloneNode(true);
    restoreRenderedMath(clone);
    pruneAssistantStatusNodes(clone, site);
    return extractBestAssistantText(clone);
  }

  function extractBestAssistantText(root) {
    const selectors = [
      ".markdown",
      ".ds-markdown",
      ".markdown-container",
      "[class*='markdown' i]",
      ".prose",
      "[class*='prose' i]",
      "article",
      ".text-message",
      "div[data-message-content]",
      "p"
    ];
    const candidates = [];
    const seen = new Set();
    for (const selector of selectors) {
      for (const el of root.querySelectorAll(selector)) {
        if (!(el instanceof Element) || !isVisibleInClone(el)) continue;
        const text = htmlToMarkdown(el.innerHTML) || cleanupCapturedText(el.innerText || el.textContent || "");
        if (!hasMeaningfulText(text) || seen.has(text)) continue;
        seen.add(text);
        candidates.push({
          text,
          score: text.length + (selector === ".markdown" || selector === ".prose" ? 1000 : 0)
        });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates[0]?.text) return candidates[0].text;
    return cleanupCapturedText(root.innerText || root.textContent || "");
  }

  function isVisibleInClone(node) {
    if (!(node instanceof Element)) return false;
    if (node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return false;
    const className = String(node.getAttribute("class") || node.className || "").toLowerCase();
    return !/(sr-only|screen-reader|visually-hidden|radix-visually-hidden)/.test(className);
  }

  function pruneAssistantStatusNodes(root, site = currentSite()) {
    const selectors = [
      "details",
      "summary",
      "button",
      "[role='button']",
      "[role='status']",
      "[aria-live]",
      "progress",
      "script",
      "style",
      "svg",
      ".katex-html",
      ".katex-mathml",
      ".MathJax_Assistive_MathML",
      "mjx-assistive-mml",
      "math",
      "[data-testid='reasoning-content']",
      "[data-testid='thinking-content']",
      "[data-testid='thinking']",
      "[class*='think' i]",
      "[class*='thinking' i]",
      "[class*='reasoning' i]",
      ...(site?.pruneThinkingSelectors || [])
    ];
    for (const selector of selectors) {
      root.querySelectorAll(selector).forEach((child) => child.remove());
    }
  }

  function extractAssistantThinkingText(node, site = currentSite()) {
    if (!node) return "";
    if (site?.id === "deepseek") {
      const sections = extractDeepSeekAssistantSections(node);
      if (sections?.hasStructuredSplit && sections.thinking) return sections.thinking;
    }
    if (site?.id === "chatgpt") {
      return extractChatGptThinkingText(node, site);
    }

    const root = node.cloneNode(true);
    restoreRenderedMath(root);
    root.querySelectorAll("button, [role='button'], script, style, svg").forEach((child) => child.remove());
    const selectors = site?.thinkingSelectors || [
      "[data-testid='reasoning-content']",
      "[data-testid='thinking-content']",
      "[data-testid='thinking']",
      "[class*='thinking' i] .markdown",
      "[class*='reasoning' i] .markdown",
      "[class*='think' i]"
    ];
    for (const selector of selectors) {
      const nodes = Array.from(root.querySelectorAll(selector)).filter(isVisibleInClone);
      if (!nodes.length) continue;
      const target = nodes[nodes.length - 1];
      const text = htmlToMarkdown(target.innerHTML) || cleanupCapturedText(target.innerText || target.textContent || "");
      if (hasMeaningfulText(text)) return text;
    }

    const details = Array.from(root.querySelectorAll("details"));
    for (let index = details.length - 1; index >= 0; index -= 1) {
      const detail = details[index];
      const summary = detail.querySelector("summary");
      const summaryText = normalizeText(summary?.innerText || summary?.textContent || "");
      if (!looksLikeThinkingLabel(summaryText)) continue;
      const full = htmlToMarkdown(detail.innerHTML) || cleanupCapturedText(detail.innerText || detail.textContent || "");
      const content = full.startsWith(summaryText)
        ? cleanupCapturedText(full.slice(summaryText.length))
        : full;
      if (hasMeaningfulText(content)) return content;
    }
    return "";
  }

  function extractChatGptThinkingText(node, site = currentSite()) {
    if (!node) return "";
    const root = node.cloneNode(true);
    restoreRenderedMath(root);
    root.querySelectorAll("button, [role='button'], script, style, svg").forEach((child) => child.remove());

    const details = Array.from(root.querySelectorAll("details"));
    for (let index = details.length - 1; index >= 0; index -= 1) {
      const detail = details[index];
      const summary = detail.querySelector("summary");
      const summaryText = normalizeText(summary?.innerText || summary?.textContent || "");
      if (!looksLikeThinkingLabel(summaryText) && !looksLikeChatGptThinkingNode(detail)) continue;
      summary?.remove();
      const text = htmlToMarkdown(detail.innerHTML) || cleanupCapturedText(detail.innerText || detail.textContent || "");
      if (hasMeaningfulText(text)) return text;
    }

    const selectors = site?.thinkingSelectors || [];
    for (const selector of selectors) {
      const nodes = Array.from(root.querySelectorAll(selector))
        .filter((candidate) => candidate instanceof Element && isVisibleInClone(candidate));
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const target = nodes[index];
        if (!looksLikeChatGptThinkingNode(target) && !hasThinkingAncestorOrLabel(target)) continue;
        const text = htmlToMarkdown(target.innerHTML) || cleanupCapturedText(target.innerText || target.textContent || "");
        if (hasMeaningfulText(text)) return text;
      }
    }
    return "";
  }

  function removeChatGptThinkingNodes(root, site = currentSite()) {
    const selectors = [
      "details",
      ...(site?.pruneThinkingSelectors || [])
    ];
    const toRemove = new Set();
    for (const selector of selectors) {
      for (const node of root.querySelectorAll(selector)) {
        if (!(node instanceof Element)) continue;
        if (node.tagName?.toLowerCase() === "details") {
          const summary = normalizeText(node.querySelector("summary")?.innerText || node.querySelector("summary")?.textContent || "");
          if (!looksLikeThinkingLabel(summary) && !looksLikeChatGptThinkingNode(node)) continue;
        }
        toRemove.add(node);
      }
    }
    root.querySelectorAll("*").forEach((node) => {
      if (node instanceof Element && looksLikeChatGptThinkingNode(node)) toRemove.add(node);
    });
    toRemove.forEach((node) => node.remove());
  }

  function looksLikeChatGptThinkingNode(node) {
    if (!(node instanceof Element)) return false;
    const marker = normalizeText([
      node.getAttribute("data-testid"),
      node.getAttribute("aria-label"),
      node.getAttribute("data-message-content-part"),
      node.getAttribute("class"),
      node.querySelector?.("summary")?.innerText || node.querySelector?.("summary")?.textContent || ""
    ].join(" "));
    if (/(?:^|[-_\s])(think|thinking|reason|reasoning|thought|cot)(?:[-_\s]|$)|思考|推理/i.test(marker)) return true;
    return looksLikeThinkingLabel(normalizeText(node.innerText || node.textContent || "").slice(0, 80));
  }

  function hasThinkingAncestorOrLabel(node) {
    for (let current = node; current && current instanceof Element; current = current.parentElement) {
      if (looksLikeChatGptThinkingNode(current)) return true;
      if (current.matches?.('[data-message-author-role="assistant"], article')) break;
    }
    return false;
  }

  function getDeepSeekTopLevelMarkdownBlocks(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(".ds-markdown"))
      .filter((block) => block instanceof Element)
      .filter((block) => !block.parentElement?.closest(".ds-markdown"))
      .filter((block) => !block.hasAttribute("hidden") && block.getAttribute("aria-hidden") !== "true");
  }

  function isDeepSeekReasoningBlock(block) {
    if (!(block instanceof Element)) return false;
    for (let current = block; current && current instanceof Element; current = current.parentElement) {
      const className = String(current.getAttribute("class") || current.className || "").toLowerCase();
      const markerText = normalizeText([
        className,
        current.getAttribute("data-testid"),
        current.getAttribute("aria-label"),
        current.getAttribute("data-state")
      ].join(" "));
      if (/(?:^|[-_\s])(think|thinking|reasoning|reasoner|thought|cot)(?:[-_\s]|$)|ds-think|think-content|推理|思考/i.test(markerText)) return true;

      const summary = current.querySelector?.("summary");
      const summaryText = normalizeText(summary?.innerText || summary?.textContent || "");
      if (looksLikeThinkingLabel(summaryText)) return true;

      const prevText = normalizeText(current.previousElementSibling?.innerText || current.previousElementSibling?.textContent || "");
      if (looksLikeThinkingLabel(prevText)) return true;

      if (current.matches?.("div.ds-message")) break;
    }
    return false;
  }

  function looksLikeThinkingLabel(text) {
    const value = normalizeText(text);
    if (!value) return false;
    return /^thought for\b/i.test(value) ||
      /^\s*(thinking|reason|reasoning)\b/i.test(value) ||
      /^已?深?度?思考/.test(value) ||
      /^已思考/.test(value) ||
      /^思考了/.test(value) ||
      /思考中|深度思考|推理/.test(value);
  }

  function extractDeepSeekAssistantSections(node) {
    if (!node) return null;
    const root = node.cloneNode(true);
    restoreRenderedMath(root);
    root.querySelectorAll("button, [role='button'], script, style, svg").forEach((child) => child.remove());

    const blocks = getDeepSeekTopLevelMarkdownBlocks(root)
      .map((block) => {
        const text = cleanupCapturedText(block.innerText || block.textContent || "");
        if (!hasMeaningfulText(text)) return null;
        return {
          text,
          markdown: htmlToMarkdown(block.innerHTML) || text,
          reasoningLike: isDeepSeekReasoningBlock(block)
        };
      })
      .filter(Boolean);

    if (!blocks.length) {
      const fallback = candidateText(node);
      return hasMeaningfulText(fallback)
        ? { answer: fallback, thinking: "", hasStructuredSplit: false }
        : null;
    }

    const rootText = cleanupCapturedText(root.innerText || root.textContent || "");
    const rootStartsWithReasoning = looksLikeThinkingLabel(rootText);
    const explicitThinking = blocks.filter((block) => block.reasoningLike);
    let thinkingBlocks = [];
    let answerBlocks = [];

    if (explicitThinking.length) {
      thinkingBlocks = explicitThinking;
      answerBlocks = blocks.filter((block) => !block.reasoningLike);
      if (!answerBlocks.length && blocks.length > 1) {
        answerBlocks = [blocks[blocks.length - 1]];
        thinkingBlocks = blocks.slice(0, -1);
      }
    } else if (blocks.length > 1 && rootStartsWithReasoning) {
      thinkingBlocks = blocks.slice(0, -1);
      answerBlocks = [blocks[blocks.length - 1]];
    } else if (blocks.length === 1 && rootStartsWithReasoning) {
      thinkingBlocks = [blocks[0]];
    } else {
      answerBlocks = blocks;
    }

    const answer = uniqueTextBlocks(answerBlocks.map((block) => block.markdown)).join("\n\n");
    const thinking = uniqueTextBlocks(thinkingBlocks.map((block) => block.markdown)).join("\n\n");
    const fallback = hasMeaningfulText(answer) ? "" : candidateText(node);
    return {
      answer: answer || fallback,
      thinking,
      hasStructuredSplit: Boolean(thinkingBlocks.length)
    };
  }

  function uniqueTextBlocks(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
      const text = cleanupCapturedText(value);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      result.push(text);
    }
    return result;
  }

  function hasMeaningfulText(text) {
    const value = normalizeText(text);
    if (value.length < 2) return false;
    const lowered = value.toLowerCase();
    if (/^thought for\b/i.test(value)) return false;
    if (/^stopped thinking\b/i.test(value)) return false;
    if (/^已?深?度?思考/.test(value) || /^已思考/.test(value) || /^思考了/.test(value)) return false;
    return ![
      "thinking",
      "thinking...",
      "stopped thinking",
      "stopped thinking quick answer",
      "quick answer",
      "思考中",
      "思考中...",
      "深度思考",
      "停止思考"
    ].includes(lowered);
  }

  function makeBaseline() {
    const candidates = getAssistantCandidates();
    const latest = candidates[candidates.length - 1] || null;
    return {
      count: candidates.length,
      lastText: latest?.text || "",
      lastThinking: latest?.thinking || "",
      signature: assistantCandidateSignature(latest)
    };
  }

  function latestAssistantCandidateAfterBaseline(baseline) {
    const candidates = getAssistantCandidates();
    const baselineCount = Math.max(0, Number(baseline?.count) || 0);
    const afterBaseline = candidates
      .slice(baselineCount)
      .filter((candidate) => candidate && assistantCandidateSignature(candidate) !== baseline?.signature)
      .filter((candidate) => !isPaperDockPromptLeak(candidate?.text) && !isPaperDockPromptLeak(candidate?.thinking));
    const bestAfterBaseline = chooseBestPostBaselineCandidate(afterBaseline);
    if (bestAfterBaseline) return bestAfterBaseline;
    const latest = candidates[candidates.length - 1] || null;
    if (!latest) return null;
    if (
      assistantCandidateSignature(latest) &&
      assistantCandidateSignature(latest) !== baseline?.signature &&
      !isPaperDockPromptLeak(latest?.text) &&
      !isPaperDockPromptLeak(latest?.thinking)
    ) {
      return latest;
    }
    return null;
  }

  function chooseBestPostBaselineCandidate(candidates) {
    const meaningful = (candidates || []).filter((candidate) =>
      hasMeaningfulText(candidate?.text || "") || hasMeaningfulText(candidate?.thinking || "")
    );
    if (!meaningful.length) return null;
    const nonPrelude = meaningful.filter((candidate) => !isLikelyChatGptPdfPrelude(candidate?.text || ""));
    const pool = nonPrelude.length ? nonPrelude : meaningful;
    return pool
      .map((candidate, index) => ({
        candidate,
        score: scoreAssistantCandidate(candidate, index, pool.length)
      }))
      .sort((left, right) => right.score - left.score)[0]?.candidate || pool[pool.length - 1] || null;
  }

  function scoreAssistantCandidate(candidate, index, total) {
    const text = normalizeText(candidate?.text || "");
    const thinking = normalizeText(candidate?.thinking || "");
    const sourcePriority = Number(candidate?.sourcePriority) || 0;
    let score = text.length + thinking.length * 0.25 + sourcePriority * 1000 + index * 25;
    if (/^#{1,3}\s|\n#{1,3}\s|\n\d+\.\s|^\d+\.\s|\n[-*]\s|```|\$\$/.test(text)) score += 1200;
    if (/附件定位|核心问题|相关工作|方法|实验|局限|contribution|method|experiment|limitation/i.test(text)) score += 800;
    if (isLikelyChatGptPdfPrelude(text)) score -= 5000;
    if (isLikelyPaperContextLeak(text)) score -= 20000;
    if (index === total - 1) score += 200;
    return score;
  }

  function isPaperDockPromptLeak(value) {
    const text = normalizeText(value);
    if (!text) return false;
    if (/You are being used through PaperDock WebChat mode/i.test(text)) return true;
    const hasProfile = /Current WebChat profile:/i.test(text);
    const hasSystemBlock = /\[(?:SYSTEM|USER|ASSISTANT)\]/i.test(text);
    const hasContextBlock = /Document Context:|Full Paper Contexts:|Retrieved Evidence:/i.test(text);
    const hasPaperMetadata = /(?:arXiv ID|Document ID|Title|PDF):/i.test(text);
    return (hasProfile && hasSystemBlock) || (hasSystemBlock && hasContextBlock && hasPaperMetadata);
  }

  function isLikelyPaperContextLeak(value) {
    const text = normalizeText(value);
    if (!text) return false;
    if (isPaperDockPromptLeak(text)) return true;
    if (/Document Context:|Full Paper Contexts:|Retrieved Evidence:|Context source:|Paper\s+\d+\s*(?:Title|Context|URL):/i.test(text)) return true;
    const hasAnswerShape = /上下文局限性|一句话概括|研究问题|方法|实验|局限|贡献|总结|answer|summary|key takeaway|limitation/i.test(text);
    if (hasAnswerShape && /[\u4e00-\u9fa5]{8,}/.test(text)) return false;
    const hasNumberedPaperSection = /(?:^|\s)\d+(?:\.\d+)*\s+(?:Abstract|Introduction|Related Work|Methodology|Problem Formulation|Approach|Experiments?|Evaluation|Results?|Discussion|Conclusion|References)\b/i.test(text);
    const hasPaperProse = /\b(?:we|this paper|our|the agent|the model|experiments?)\s+(?:propose|focus|consider|evaluate|train|use|introduce|show|compare|improves?|learns?|discuss)/i.test(text);
    const hasFormulaOrCitation = /\b[a-z]_[a-z0-9]\b|\b(?:Fig\.|Figure|Table|Section|Appendix)\s+\d|\[[0-9,\s-]{1,20}\]|\([A-Z][A-Za-z]+(?:\s+et\s+al\.)?,?\s+\d{4}\)/.test(text);
    const mostlyEnglish = !/[\u4e00-\u9fa5]{8,}/.test(text);
    return text.length > 900 && mostlyEnglish && hasNumberedPaperSection && (hasPaperProse || hasFormulaOrCitation);
  }

  function isGeminiPromptEchoContainer(node) {
    if (!(node instanceof Element)) return false;
    const tag = String(node.tagName || "").toUpperCase();
    if (/^(CHAT-APP|CHAT-HISTORY|INFINITE-SCROLLER|USER-QUERY|RICH-TEXTAREA)$/.test(tag)) return true;
    const identity = normalizeText([
      node.id || "",
      node.getAttribute?.("class") || "",
      node.getAttribute?.("data-test-id") || "",
      node.getAttribute?.("aria-label") || ""
    ].join(" "));
    return /\b(chat-history|user-query|user-prompt|input-area|rich-textarea|composer|xap-uploader-dropzone)\b/i.test(identity);
  }

  function isLikelyChatGptPdfPrelude(text) {
    const value = normalizeText(text);
    if (!value || value.length > 260) return false;
    return /我会先定位\s*PDF|我会先.*PDF.*再按|附件正文不可访问|元数据\/摘要支持|I(?:'|’)ll first locate.*PDF|I will first locate.*PDF/i.test(value);
  }

  function assistantCandidateSignature(candidate) {
    if (!candidate) return "";
    return normalizeText(`${candidate.text || ""}\n---thinking---\n${candidate.thinking || ""}`).slice(0, 1200);
  }

  function latestAssistantAfterBaseline(baseline) {
    return latestAssistantCandidateAfterBaseline(baseline)?.text || "";
  }

  function latestAssistantCandidate() {
    const candidates = getAssistantCandidates();
    return candidates[candidates.length - 1] || null;
  }

  function latestAssistantText() {
    return latestAssistantCandidate()?.text || "";
  }

  function post(port, payload) {
    try {
      port.postMessage(payload);
    } catch {}
  }

  function startHeartbeat(state, callback) {
    clearHeartbeat(state);
    const intervalMs = 10000;
    const tick = () => {
      try {
        callback();
      } catch {}
    };
    const startInterval = () => {
      clearHeartbeat(state);
      state.heartbeatTimer = setInterval(tick, intervalMs);
    };
    try {
      if (typeof Worker !== "function" || typeof Blob !== "function" || !URL?.createObjectURL) {
        startInterval();
        return;
      }
      const blob = new Blob([`setInterval(() => postMessage("tick"), ${intervalMs});`], {
        type: "application/javascript"
      });
      const objectUrl = URL.createObjectURL(blob);
      const worker = new Worker(objectUrl);
      state.heartbeatWorker = worker;
      state.heartbeatWorkerUrl = objectUrl;
      worker.onmessage = tick;
      worker.onerror = () => startInterval();
    } catch {
      startInterval();
    }
  }

  function clearHeartbeat(state) {
    if (state?.heartbeatWorker) {
      try {
        state.heartbeatWorker.terminate();
      } catch {}
      state.heartbeatWorker = null;
    }
    if (state?.heartbeatWorkerUrl) {
      try {
        URL.revokeObjectURL(state.heartbeatWorkerUrl);
      } catch {}
      state.heartbeatWorkerUrl = "";
    }
    if (!state?.heartbeatTimer) return;
    clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = 0;
  }

  function postTerminal(port, state, payload) {
    if (state.completed) return;
    clearHeartbeat(state);
    state.completed = true;
    post(port, {
      type: "terminal",
      ...payload
    });
  }

  async function runWebChat(port, payload, state) {
    const site = currentSite();
    if (!site) throw new Error("当前页面不是 PaperDock 支持的 WebChat 页面。");

    const prompt = String(payload.prompt || "").trim();
    if (!prompt) throw new Error("WebChat prompt 为空。");
    if (payload.expectedChatUrl) {
      const expected = String(payload.expectedChatUrl || "").replace(/\/+$/, "");
      const current = getCurrentChatUrl().replace(/\/+$/, "");
      if (expected && current && expected !== current) {
        throw new Error(`${site.label} 当前网页会话不是这篇论文保存的 WebChat 会话，请刷新后重试。`);
      }
    }

    sseText = "";
    sseThinking = "";
    sseDone = false;
    activeStreamCount = 0;
    lastSseAt = 0;
    sseDoneAt = 0;

    const baseline = makeBaseline();
    let lastText = "";
    let lastThinking = "";
    let pdfAttached = Boolean(payload.pdfAlreadyAttached && payload.expectedChatUrl);
    let pdfFilename = payload.pdfAttachmentFilename ? sanitizeFilename(payload.pdfAttachmentFilename) : "";
    let pdfSize = Number(payload.pdfAttachmentSize || 0) || 0;
    let pdfAttachmentState = null;
    state.pdfAttached = pdfAttached;
    state.pdfFilename = pdfFilename;
    state.pdfSize = pdfSize;
    state.pdfAttachmentState = pdfAttachmentState;
    let lastChangeAt = Date.now();
    let transportObserved = false;
    let currentPhase = "preparing";
    const startedAt = Date.now();
    const timeoutMs = Math.max(60000, Math.min(Number(payload.timeoutMs) || 30 * 60 * 1000, 120 * 60 * 1000));
    startHeartbeat(state, () => {
      post(port, {
        type: "heartbeat",
        phase: currentPhase || (lastText ? "waiting_for_completion" : "waiting_for_first_token"),
        site: site.id,
        elapsedMs: Date.now() - startedAt,
        lastTextLength: lastText.length,
        lastThinkingLength: (lastThinking || sseThinking || "").length,
        activeStreamCount,
        sseDone
      });
    }, 10000);

    let composer = null;
    if (site.id === "deepseek") {
      const deepThinkEnabled = shouldUseDeepSeekDeepThink(payload.webchatMode);
      currentPhase = deepThinkEnabled ? "deepseek_deepthink_on" : "deepseek_deepthink_off";
      const deepThinkResult = await setDeepSeekDeepThinkMode(deepThinkEnabled).catch((error) => ({
        ok: false,
        error: error?.message || String(error)
      }));
      post(port, {
        type: "phase",
        phase: currentPhase,
        site: site.id,
        diagnostic: deepThinkResult
      });
    }
    const shouldWritePromptBeforePdf = site.id === "deepseek" && payload.pdfBase64;

    if (shouldWritePromptBeforePdf) {
      currentPhase = "prompt_applying";
      post(port, { type: "phase", phase: "prompt_applying", site: site.id });
      composer = await writePrompt(prompt);
      currentPhase = "prompt_applied";
      post(port, { type: "phase", phase: "prompt_applied", site: site.id });
      currentPhase = "prompt_before_pdf";
      post(port, { type: "phase", phase: "prompt_before_pdf", site: site.id });
    }

    if (payload.pdfBase64) {
      currentPhase = "pdf_uploading";
      post(port, {
        type: "phase",
        phase: "pdf_uploading",
        site: site.id,
        filename: payload.pdfFilename || "paper.pdf",
        size: Number(payload.pdfSize) || 0
      });
      await attachPdf(site, payload.pdfBase64, payload.pdfFilename);
      await waitForUploadReady(site, 30000, payload.pdfFilename || "paper.pdf");
      pdfFilename = sanitizeFilename(payload.pdfFilename || "paper.pdf");
      pdfSize = Number(payload.pdfSize) || 0;
      pdfAttachmentState = getAttachmentState(site, pdfFilename);
      pdfAttached = attachmentIsReady(site, pdfAttachmentState, pdfFilename);
      if (!pdfAttached) {
        throw new Error(`${site.label} 没有确认收到 PDF 文件附件（${pdfFilename}），已停止发送以避免只发送文字。`);
      }
      state.pdfAttached = pdfAttached;
      state.pdfFilename = pdfFilename;
      state.pdfSize = pdfSize;
      state.pdfAttachmentState = pdfAttachmentState;
      currentPhase = "pdf_uploaded";
      post(port, {
        type: "phase",
        phase: "pdf_uploaded",
        site: site.id,
        pdfAttached,
        pdfFilename,
        pdfSize,
        attachmentState: pdfAttachmentState
      });
    }

    currentPhase = await ensureChatGptComposerModeForPaperMode(port, site, payload) || currentPhase;

    if (shouldWritePromptBeforePdf || !composerTextMatches(prompt, readComposerText(composer))) {
      currentPhase = "prompt_applying";
      post(port, { type: "phase", phase: "prompt_applying", site: site.id });
      composer = await writePrompt(prompt);
      currentPhase = "prompt_applied";
      post(port, { type: "phase", phase: "prompt_applied", site: site.id });
    }
    if (!composerTextMatches(prompt, readComposerText(composer))) {
      throw new Error(`${site.label} 输入框没有保留 prompt，已停止发送以避免只发送 PDF。`);
    }
    const submission = await submitPrompt(composer, prompt);
    currentPhase = "waiting_for_first_token";
    post(port, {
      type: "phase",
      phase: "submitted",
      site: site.id,
      diagnostic: submission?.diagnostic || buildDiagnostic({ phase: "submitted" })
    });

    while (Date.now() - startedAt < timeoutMs) {
      const now = Date.now();
      if (payload.cancelled) {
        const stopButton = findStopButton(site);
        if (stopButton) stopButton.click();
        const stoppedCandidate = chooseBestAssistantCandidate(
          { text: lastText || sseText, thinking: lastThinking || sseThinking },
          latestAssistantCandidateAfterBaseline(baseline)
        );
        postTerminal(port, state, {
          text: stoppedCandidate.text || "",
          thinking: stoppedCandidate.thinking || null,
          runState: "incomplete",
          completionReason: "stopped",
          chatUrl: getCurrentChatUrl(),
          chatId: getCurrentChatId(),
          pdfAttached,
          pdfFilename,
          pdfSize,
          attachmentState: pdfAttachmentState
        });
        return;
      }

      if (lastSseAt) transportObserved = true;
      const domCandidate = latestAssistantCandidateAfterBaseline(baseline);
      const nextCandidate = chooseBestAssistantCandidate(
        { text: sseText, thinking: sseThinking },
        domCandidate
      );
      const textChanged = nextCandidate.text && nextCandidate.text !== lastText;
      const thinkingChanged = nextCandidate.thinking && nextCandidate.thinking !== lastThinking;
      if (textChanged || thinkingChanged) {
        if (nextCandidate.text) lastText = nextCandidate.text;
        if (nextCandidate.thinking) lastThinking = nextCandidate.thinking;
        lastChangeAt = now;
        currentPhase = "waiting_for_completion";
        if (lastText) {
          post(port, {
            type: "delta",
            fullText: lastText,
            text: lastText,
            thinking: lastThinking || null
          });
        }
      }

      const stopVisible = Boolean(findStopButton(site));
      const actionBarVisible = hasResponseActionBar(site);
      const uploadBusy = hasBusyComposerHint(site);
      const quietFor = now - Math.max(lastChangeAt, lastSseAt || 0);
      const streamSettled = sseDone && activeStreamCount === 0;
      const sseSettleMs = site.id === "deepseek" ? 8000 : 5000;
      const sseSettled = streamSettled && sseDoneAt > 0 && now - sseDoneAt >= sseSettleMs;
      const domOnlyQuietMs = site.id === "deepseek" ? 45000 : 20000;
      const hasWaitedForFirstAnswerMs = now - startedAt > 3500;
      const chatGptPdfTurn = site.id === "chatgpt" && Boolean(payload.pdfBase64);
      const chatGptPreludeOnly = site.id === "chatgpt" && isLikelyChatGptPdfPrelude(lastText);
      const canFinishWithCurrentText = !(site.id === "chatgpt" && chatGptPreludeOnly);
      const chatGptQuietMs = chatGptPdfTurn ? 15000 : 8000;
      const geminiQuietMs = site.id === "gemini" ? 12000 : 0;
      const deepSeekQuietDone = site.id === "deepseek" && lastText && !activeStreamCount && !uploadBusy && quietFor >= 1500;
      const chatGptActionDone = site.id === "chatgpt" && actionBarVisible && lastText && !chatGptPreludeOnly && !stopVisible && !uploadBusy;
      const chatGptDomQuietDone = site.id === "chatgpt" && lastText && !chatGptPreludeOnly && !stopVisible && !uploadBusy && !activeStreamCount && quietFor >= chatGptQuietMs;
      const geminiDomQuietDone = site.id === "gemini" && lastText && !stopVisible && !uploadBusy && !activeStreamCount && quietFor >= geminiQuietMs;
      const mayFinishFromDomOnly = !transportObserved && quietFor >= domOnlyQuietMs;
      const mayFinishFromQuietFallback = transportObserved && !activeStreamCount && !sseDone && quietFor >= 90000;
      if (lastText && canFinishWithCurrentText && !stopVisible && hasWaitedForFirstAnswerMs && (chatGptActionDone || chatGptDomQuietDone || geminiDomQuietDone || deepSeekQuietDone || sseSettled || mayFinishFromDomOnly || mayFinishFromQuietFallback)) {
        const chatUrl = await waitForCurrentChatUrl();
        const finalCandidate = getFinalAssistantCandidate(baseline, { text: lastText, thinking: lastThinking || sseThinking });
        postTerminal(port, state, {
          text: finalCandidate.text || lastText,
          thinking: finalCandidate.thinking || null,
          runState: "done",
          completionReason: sseSettled ? "sse_done" : "settled",
          chatUrl,
          chatId: getCurrentChatId(chatUrl),
          pdfAttached,
          pdfFilename,
          pdfSize,
          attachmentState: pdfAttachmentState
        });
        return;
      }

      await longSleep(lastText ? 650 : 500);
    }

    if (lastText) {
      const chatUrl = await waitForCurrentChatUrl();
      const finalCandidate = getFinalAssistantCandidate(baseline, { text: lastText, thinking: lastThinking || sseThinking });
      postTerminal(port, state, {
        text: finalCandidate.text || lastText,
        thinking: finalCandidate.thinking || null,
        runState: "incomplete",
        completionReason: "timeout",
        chatUrl,
        chatId: getCurrentChatId(chatUrl),
        pdfAttached,
        pdfFilename,
        pdfSize,
        attachmentState: pdfAttachmentState
      });
      return;
    }
    throw new Error(`${site.label} 没有生成可读取的回答。`);
  }

  function getFinalAssistantCandidate(baseline, streamCandidate = {}) {
    return chooseBestAssistantCandidate(streamCandidate, latestAssistantCandidateAfterBaseline(baseline));
  }

  function chooseBestAssistantText(streamText, domText) {
    return chooseBestAssistantCandidate({ text: streamText, thinking: "" }, { text: domText, thinking: "" }).text;
  }

  function chooseBestAssistantCandidate(streamCandidate = {}, domCandidate = {}) {
    const cleanStreamCandidate = sanitizeAssistantCandidate(streamCandidate);
    const cleanDomCandidate = sanitizeAssistantCandidate(domCandidate);
    const stream = cleanStreamCandidate.text;
    const dom = cleanDomCandidate.text;
    const streamThinking = cleanStreamCandidate.thinking;
    const domThinking = cleanDomCandidate.thinking;
    if (hasMeaningfulText(dom) || hasMeaningfulText(domThinking)) {
      return {
        text: hasMeaningfulText(dom) ? dom : "",
        thinking: domThinking || streamThinking
      };
    }
    let text = "";
    if (!hasMeaningfulText(stream)) {
      text = "";
    } else if (!hasMeaningfulText(dom)) {
      text = stream;
    } else if (dom.length > stream.length * 1.15) {
      text = dom;
    } else if (stream.length > dom.length * 1.15) {
      text = stream;
    } else {
      text = dom.length >= stream.length ? dom : stream;
    }
    return {
      text,
      thinking: domThinking || streamThinking
    };
  }

  function sanitizeAssistantCandidate(candidate = {}) {
    let text = normalizeText(candidate?.text || "");
    let thinking = normalizeText(candidate?.thinking || "");
    if (isPaperDockPromptLeak(thinking)) thinking = "";
    if (isPaperDockPromptLeak(text)) text = "";
    if (isLikelyPaperContextLeak(text)) text = "";
    if (isLikelyPaperContextLeak(thinking)) thinking = "";
    return { text, thinking };
  }

  function hasBusyComposerHint(site = currentSite()) {
    const composer = findComposer(site);
    if (site?.id === "deepseek") {
      if (!composer) return false;
      const text = getUploadStatusText(site, composer).toLowerCase();
      if (/uploading|processing|parsing|analyzing|正在上传|处理中|解析中|分析中/.test(text)) return true;
      return Boolean(composer && (composer.disabled || composer.getAttribute?.("disabled") !== null));
    }
    const text = getUploadStatusText(site, composer).toLowerCase();
    if (/uploading|processing|parsing|analyzing|正在上传|处理中|解析中|分析中/.test(text)) return true;
    return /generating|thinking|responding|生成中|思考中|回答中/.test(text);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "ARXIVMATE_WEBCHAT_PING") {
      const site = currentSite();
      sendResponse({
        ok: Boolean(site),
        site: site?.id || null,
        url: location.href,
        bridgeVersion: BRIDGE_VERSION,
        composerFound: Boolean(findComposer(site))
      });
      return false;
    }
    if (message?.type === "ARXIVMATE_WEBCHAT_DIAGNOSE") {
      diagnoseWebChatBridge().then(sendResponse, (error) => {
        sendResponse({
          ok: false,
          error: error?.message || String(error),
          bridgeVersion: BRIDGE_VERSION,
          url: location.href
        });
      });
      return true;
    }
    if (message?.type === "ARXIVMATE_WEBCHAT_STOP") {
      const site = currentSite();
      const button = findStopButton(site);
      if (button) {
        button.click();
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: "stop-button-not-found" });
      }
      return false;
    }
    return false;
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== `paperdock-webchat-v${BRIDGE_VERSION}`) return;
    const state = {
      cancelled: false,
      completed: false,
      pdfAttached: false,
      pdfFilename: "",
      pdfSize: 0,
      pdfAttachmentState: null
    };
    port.onDisconnect.addListener(() => {
      clearHeartbeat(state);
      if (state.completed) return;
      if (state.cancelled) {
        const button = findStopButton();
        if (button) button.click();
      }
    });
    port.onMessage.addListener((message) => {
      if (message?.type === "STOP") {
        state.cancelled = true;
        const button = findStopButton();
        if (button) button.click();
        const candidate = latestAssistantCandidate() || {};
        const snapshot = sseText || candidate.text || "";
        const thinking = sseThinking || candidate.thinking || "";
        if ((snapshot || thinking) && !state.completed) {
          waitForCurrentChatUrl(1200).then((chatUrl) => postTerminal(port, state, {
            text: snapshot,
            thinking: thinking || null,
            runState: "incomplete",
            completionReason: "stopped",
            chatUrl,
            chatId: getCurrentChatId(chatUrl),
            pdfAttached: Boolean(state.pdfAttached),
            pdfFilename: state.pdfFilename || "",
            pdfSize: Number(state.pdfSize) || 0,
            attachmentState: state.pdfAttachmentState || null
          }));
        }
        return;
      }
      if (message?.type !== "START" || Number(message.bridgeVersion) !== BRIDGE_VERSION) return;
      runWebChat(port, {
        ...message,
        get cancelled() {
          return state.cancelled;
        }
      }, state).then(() => {
        clearHeartbeat(state);
        state.completed = true;
      }).catch((error) => {
        clearHeartbeat(state);
        state.completed = true;
        post(port, {
          type: "error",
          error: error?.message || String(error)
        });
      });
    });
  });
})();
