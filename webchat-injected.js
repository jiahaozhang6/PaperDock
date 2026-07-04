(function () {
  "use strict";

  const PATCH_VERSION = 15;
  if (window.__arxivMateWebChatFetchPatched >= PATCH_VERSION && window.fetch === window.__arxivMatePatchedFetch) return;
  window.__arxivMateWebChatFetchPatched = PATCH_VERSION;

  const originalFetch = window.__arxivMateOriginalFetch || window.fetch;
  window.__arxivMateOriginalFetch = originalFetch;
  const xhrProto = window.XMLHttpRequest?.prototype;
  const originalXhrOpen = window.__arxivMateOriginalXhrOpen || xhrProto?.open;
  const originalXhrSend = window.__arxivMateOriginalXhrSend || xhrProto?.send;
  if (originalXhrOpen) window.__arxivMateOriginalXhrOpen = originalXhrOpen;
  if (originalXhrSend) window.__arxivMateOriginalXhrSend = originalXhrSend;
  let activeStreamCount = 0;
  let outboundRequestSerial = 0;

  function post(payload) {
    try {
      window.postMessage({
        source: "paperdock-webchat",
        ...payload
      }, "*");
    } catch {}
  }

  function safeJsonParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function normalizeFingerprintText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\s+/g, " ")
      .normalize("NFC")
      .trim()
      .toLowerCase();
  }

  function fingerprintText(value) {
    const normalized = normalizeFingerprintText(value);
    if (!normalized) return "";
    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${normalized.length}:${(hash >>> 0).toString(36)}`;
  }

  function extractPromptTextFromRequestPayload(value, depth = 0) {
    if (depth > 8 || value == null) return "";
    if (typeof value === "string") {
      const parsed = safeJsonParse(value);
      if (parsed && parsed !== value) {
        const next = extractPromptTextFromRequestPayload(parsed, depth + 1);
        if (next) return next;
      }
      return value;
    }
    if (Array.isArray(value)) {
      for (let index = value.length - 1; index >= 0; index -= 1) {
        const next = extractPromptTextFromRequestPayload(value[index], depth + 1);
        if (next) return next;
      }
      return "";
    }
    if (typeof value !== "object") return "";

    for (const key of ["messages", "message_list", "conversation", "turns"]) {
      if (Array.isArray(value[key])) {
        const next = extractPromptTextFromRequestPayload(value[key], depth + 1);
        if (next) return next;
      }
    }
    for (const key of ["prompt", "query", "input", "message", "content", "text"]) {
      if (!(key in value)) continue;
      const next = extractPromptTextFromRequestPayload(value[key], depth + 1);
      if (next) return next;
    }
    for (const child of Object.values(value)) {
      const next = extractPromptTextFromRequestPayload(child, depth + 1);
      if (next) return next;
    }
    return "";
  }

  function extractPromptFingerprintFromBody(body) {
    if (body == null) return null;
    let payload = body;
    if (typeof body === "string") payload = safeJsonParse(body) ?? body;
    const promptText = extractPromptTextFromRequestPayload(payload);
    return fingerprintText(promptText) || null;
  }

  function extractPromptFingerprintFromFetchArgs(args) {
    try {
      if (args[0] instanceof Request) return null;
      const body = args[1]?.body;
      if (typeof body === "string") return extractPromptFingerprintFromBody(body);
      if (body instanceof URLSearchParams) return extractPromptFingerprintFromBody(body.toString());
      if (body instanceof FormData) {
        const textFields = [];
        for (const [key, value] of body.entries()) {
          if (typeof value === "string") textFields.push(`${key}=${value}`);
        }
        return extractPromptFingerprintFromBody(textFields.join("&"));
      }
    } catch {}
    return null;
  }

  function isConversationRequest(url, method) {
    if (String(method || "GET").toUpperCase() !== "POST") return false;
    const target = String(url || "");
    if (location.hostname === "chatgpt.com") {
      return /\/backend-api\/(?:f\/)?conversation\b/.test(target) ||
        /\/backend-anon\/conversation\b/.test(target);
    }
    if (location.hostname === "chat.deepseek.com") {
      return /\/api\/v0\/chat\/completion\b/.test(target);
    }
    return false;
  }

  function getCurrentChatUrl() {
    if (location.hostname === "chat.deepseek.com") {
      const match = location.pathname.match(/\/a\/chat\/s\/([^/?#]+)/);
      if (match) return `${location.origin}/a/chat/s/${match[1]}`;
    }
    if (location.hostname === "chatgpt.com") {
      const match = location.pathname.match(/\/c\/([^/?#]+)/);
      if (match) return `${location.origin}/c/${match[1]}`;
    }
    return location.href;
  }

  function getCurrentChatId(chatUrl = getCurrentChatUrl()) {
    try {
      const parsed = new URL(chatUrl);
      return parsed.pathname.split("/").filter(Boolean).pop() || "";
    } catch {
      return "";
    }
  }

  function postConversationRequest(url, method, promptFingerprint = null) {
    outboundRequestSerial += 1;
    post({
      type: "ARXIVMATE_WEBCHAT_REQUEST",
      serial: outboundRequestSerial,
      url: String(url || ""),
      method: String(method || "GET").toUpperCase(),
      chatUrl: getCurrentChatUrl(),
      chatId: getCurrentChatId(),
      sentAt: Date.now(),
      promptFingerprint: promptFingerprint || null,
      activeStreamCount
    });
    return outboundRequestSerial;
  }

  function isVisible(node) {
    if (!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findComposer() {
    const selectors = location.hostname === "chat.deepseek.com"
      ? [
        'textarea[placeholder*="DeepSeek" i]',
        'textarea[placeholder*="发送" i]',
        'textarea[placeholder*="消息" i]',
        "textarea",
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]'
      ]
      : [
        'textarea[data-testid="prompt-textarea"]',
        "#prompt-textarea",
        'div[contenteditable="true"][data-testid="prompt-textarea"]',
        'div[contenteditable="true"]',
        "textarea"
      ];
    const candidates = [];
    for (const selector of selectors) {
      candidates.push(...Array.from(document.querySelectorAll(selector)).filter((node) => {
        if (!isVisible(node)) return false;
        if (node.matches?.("textarea,input")) return !node.disabled && !node.readOnly;
        return node.isContentEditable;
      }));
    }
    if (!candidates.length) return null;
    if (location.hostname !== "chat.deepseek.com") return candidates[candidates.length - 1];
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

  function readComposerText(composer) {
    if (!composer) return "";
    if (composer.matches?.("textarea,input")) return composer.value || "";
    return composer.innerText || composer.textContent || "";
  }

  function dispatchInputEvents(node, value, inputType = "insertFromPaste") {
    try {
      node.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: value,
        inputType
      }));
    } catch {}
    try {
      node.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: value,
        inputType
      }));
    } catch {
      node.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    try {
      node.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true,
        data: value
      }));
    } catch {}
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setNativeTextareaValue(node, value) {
    const win = node.ownerDocument?.defaultView || window;
    const proto = node instanceof HTMLTextAreaElement
      ? win.HTMLTextAreaElement?.prototype
      : node instanceof HTMLInputElement
        ? win.HTMLInputElement?.prototype
        : null;
    const setter = proto && Object.getOwnPropertyDescriptor(proto, "value")?.set;
    const previous = node.value || "";
    node.focus();
    node.click();

    if (setter) setter.call(node, "");
    else node.value = "";
    if (node._valueTracker?.setValue) node._valueTracker.setValue(previous);
    dispatchInputEvents(node, "", "deleteContentBackward");

    if (setter) setter.call(node, value);
    else node.value = value;
    if (node._valueTracker?.setValue) node._valueTracker.setValue("");
    try {
      node.setSelectionRange(value.length, value.length);
    } catch {}
    dispatchInputEvents(node, value, "insertFromPaste");
    node.dispatchEvent(new KeyboardEvent("keyup", {
      bubbles: true,
      key: value ? value[value.length - 1] || "Unidentified" : "Backspace"
    }));
  }

  function setContentEditableValue(node, value) {
    node.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.deleteContents();
    range.collapse(true);
    if (value) {
      const textNode = document.createTextNode(value);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);
    dispatchInputEvents(node, value, value ? "insertFromPaste" : "deleteContentBackward");
  }

  function setComposerPrompt(prompt) {
    const value = String(prompt || "");
    const composer = findComposer();
    if (!composer) {
      return {
        ok: false,
        detail: "composer_not_found",
        text: ""
      };
    }
    if (composer.matches?.("textarea,input")) {
      setNativeTextareaValue(composer, value);
    } else {
      setContentEditableValue(composer, value);
    }
    const actual = readComposerText(composer);
    return {
      ok: actual.replace(/\s+/g, " ").trim() === value.replace(/\s+/g, " ").trim(),
      detail: composer.tagName.toLowerCase(),
      text: actual,
      textLength: actual.length
    };
  }

  function isEnabledControl(node) {
    if (!(node instanceof Element) || !isVisible(node)) return false;
    const style = getComputedStyle(node);
    if (node.disabled || node.hasAttribute("disabled") || node.getAttribute("aria-disabled") === "true") return false;
    if (style.pointerEvents === "none") return false;
    if (style.cursor === "not-allowed") return false;
    if (Number(style.opacity) > 0 && Number(style.opacity) < 0.55) return false;
    return true;
  }

  function findChatGptSendButton(composer = findComposer()) {
    const root = composer?.closest?.("form") ||
      composer?.closest?.('[data-testid*="composer" i]') ||
      composer?.parentElement ||
      document.body;
    const composerRect = composer?.getBoundingClientRect?.() || null;
    const buttons = Array.from(root.querySelectorAll("button"))
      .filter((button) => {
        if (!isVisible(button)) return false;
        if (button.querySelector?.('input[type="file"]') || button.parentElement?.querySelector?.('input[type="file"]')) return false;
        return true;
      });
    let best = null;
    let bestScore = -Infinity;
    for (const button of buttons) {
      const label = [
        button.getAttribute("aria-label"),
        button.getAttribute("title"),
        button.getAttribute("data-testid"),
        button.getAttribute("class"),
        button.textContent
      ].filter(Boolean).join(" ").toLowerCase();
      if (/attach|upload|file|添加文件|开始听写|voice|mic|microphone|dictation|plus/.test(label)) continue;
      const rect = button.getBoundingClientRect();
      let score = 0;
      if (/send|发送|submit|composer-submit|submit-button/.test(label)) score += 1000;
      if (/composer-submit-button-color/.test(label)) score += 900;
      if (composerRect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const adjacentY = centerY >= composerRect.top - 90 && centerY <= composerRect.bottom + 110;
        if (!adjacentY) continue;
        if (centerX >= composerRect.right - 120) score += 500;
        score += centerX - composerRect.left;
        score -= Math.abs(centerY - (composerRect.top + composerRect.height / 2));
      }
      if (!isEnabledControl(button)) score -= 300;
      if (score > bestScore) {
        best = button;
        bestScore = score;
      }
    }
    return best;
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
        const adjacentY = centerY >= composerRect.top - 80 && centerY <= composerRect.bottom + 120;
        if (!adjacentY) continue;
        score += centerX - composerRect.left;
        score -= Math.abs(centerY - (composerRect.top + composerRect.height / 2));
        if (centerX >= composerRect.right - 140) score += 500;
        if (centerY >= composerRect.top) score += 100;
      }
      if (primaryCircleSend) score += 1200;
      if (arrowSendIcon) score += 600;
      if (namedSend) score += 300;
      if (/primary|circle|filled/.test(label)) score += 80;
      if (!primaryCircleSend && !arrowSendIcon && !namedSend && !/primary|circle|filled/.test(label)) score -= 350;
      if (!isEnabledControl(button)) score -= 300;
      if (score > bestScore) {
        best = button;
        bestScore = score;
      }
    }
    return best;
  }

  function findSendButton() {
    const composer = findComposer();
    if (location.hostname === "chat.deepseek.com") return findDeepSeekSendButton(composer);
    if (location.hostname === "chatgpt.com") return findChatGptSendButton(composer);
    return null;
  }

  function dispatchEnter(composer) {
    if (!composer) return false;
    composer.focus?.();
    const init = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true
    };
    composer.dispatchEvent(new KeyboardEvent("keydown", init));
    composer.dispatchEvent(new KeyboardEvent("keypress", init));
    composer.dispatchEvent(new KeyboardEvent("keyup", init));
    return true;
  }

  function dispatchPointerClick(element) {
    if (!element) return false;
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
    return true;
  }

  function submitComposerInPageWorld() {
    const composer = findComposer();
    const button = findSendButton();
    const form = composer?.closest?.("form");
    const beforeText = readComposerText(composer);
    let action = "";

    composer?.focus?.();
    if (button && isEnabledControl(button)) {
      dispatchPointerClick(button);
      action = "button_pointer_click";
    }
    if (!action && form) {
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
        action = "form_request_submit";
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        action = "form_submit_event";
      }
    }
    if (!action) {
      dispatchEnter(composer);
      action = "enter";
    }

    const rect = button?.getBoundingClientRect?.();
    return {
      ok: true,
      action,
      composerTextLength: beforeText.length,
      buttonFound: Boolean(button),
      buttonEnabled: Boolean(button && isEnabledControl(button)),
      buttonRect: rect ? {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      } : null
    };
  }

  function hasMeaningfulText(text) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    if (value.length < 2) return false;
    return !/^(thinking|thinking\.\.\.|quick answer|思考中|深度思考)$/i.test(value);
  }

  function firstString(...values) {
    for (const value of values) {
      if (typeof value === "string" && value) return value;
    }
    return "";
  }

  function parseSsePayload(parsed, state) {
    if (location.hostname === "chatgpt.com") {
      const msg = parsed?.message;
      if (!msg || msg.author?.role !== "assistant") return null;
      const contentType = msg.content?.content_type;
      if (contentType === "system_error" || contentType === "title_generation" || contentType === "conversation_title") return null;

      let text = state.text;
      const parts = Array.isArray(msg.content?.parts) ? msg.content.parts : [];
      const partText = parts.filter((part) => typeof part === "string").join("");
      if (hasMeaningfulText(partText)) text = partText;

      const thinking = msg.metadata?.thinking_text ||
        msg.metadata?.reasoning_text ||
        msg.content?.thinking ||
        state.thinking ||
        "";

      if (text !== state.text || thinking !== state.thinking) {
        state.text = text;
        state.thinking = thinking;
        return { text, thinking };
      }
      return null;
    }

    if (location.hostname === "chat.deepseek.com") {
      const choice = Array.isArray(parsed?.choices) ? parsed.choices[0] || {} : {};
      const delta = choice.delta || {};
      const nextText = firstString(
        delta.content,
        parsed.content,
        parsed.data?.content,
        parsed.message?.content,
        choice.text,
        choice.message?.content,
        parsed.output_text,
        parsed.data?.output_text
      );
      const nextThinking = firstString(
        delta.reasoning_content,
        delta.reasoning,
        delta.thinking,
        parsed.reasoning_content,
        parsed.reasoning,
        parsed.thinking,
        parsed.data?.reasoning_content,
        parsed.data?.reasoning,
        parsed.data?.thinking,
        choice.reasoning_content,
        choice.reasoning,
        choice.thinking,
        choice.message?.reasoning_content,
        choice.message?.reasoning,
        choice.message?.thinking
      );

      if (nextText) {
        const isDeltaText = typeof delta.content === "string" ||
          typeof parsed.content === "string" ||
          typeof parsed.data?.content === "string" ||
          typeof choice.text === "string";
        state.text = isDeltaText ? state.text + nextText : nextText;
      }
      if (nextThinking) {
        const isDeltaThinking = typeof delta.reasoning_content === "string" ||
          typeof delta.reasoning === "string" ||
          typeof delta.thinking === "string" ||
          typeof parsed.reasoning_content === "string" ||
          typeof parsed.reasoning === "string" ||
          typeof parsed.thinking === "string" ||
          typeof parsed.data?.reasoning_content === "string" ||
          typeof parsed.data?.reasoning === "string" ||
          typeof parsed.data?.thinking === "string";
        state.thinking = isDeltaThinking ? state.thinking + nextThinking : nextThinking;
      }
      if (nextText || nextThinking) return { text: state.text, thinking: state.thinking };
    }

    return null;
  }

  async function processSse(response) {
    if (!response?.body) return;
    activeStreamCount += 1;
    post({ type: "ARXIVMATE_WEBCHAT_STREAM_START", activeStreamCount });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const state = { text: "", thinking: "" };
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.replace(/^data:\s*/, "").trim();
          if (raw === "[DONE]") {
            post({
              type: "ARXIVMATE_WEBCHAT_SSE",
              text: state.text,
              thinking: state.thinking || null,
              done: true,
              activeStreamCount
            });
            return;
          }
          const parsed = safeJsonParse(raw);
          if (!parsed) continue;
          const result = parseSsePayload(parsed, state);
          if (!result) continue;
          post({
            type: "ARXIVMATE_WEBCHAT_SSE",
            text: result.text,
            thinking: result.thinking || null,
            done: false,
            activeStreamCount
          });
        }
      }
    } finally {
      activeStreamCount = Math.max(0, activeStreamCount - 1);
      post({ type: "ARXIVMATE_WEBCHAT_STREAM_STATE", activeStreamCount });
      try {
        reader.releaseLock();
      } catch {}
    }
  }

  const patchedFetch = async function (...args) {
    const url = args[0] instanceof Request ? args[0].url : String(args[0] || "");
    const method = ((args[0] instanceof Request ? args[0].method : args[1]?.method) || "GET").toUpperCase();
    const isConversation = isConversationRequest(url, method);
    if (isConversation) {
      postConversationRequest(url, method, extractPromptFingerprintFromFetchArgs(args));
    }
    const response = await originalFetch.apply(this, args);
    try {
      if (isConversation) {
        processSse(response.clone()).catch(() => {});
      }
    } catch {}
    return response;
  };
  window.__arxivMatePatchedFetch = patchedFetch;
  window.fetch = patchedFetch;

  if (xhrProto && originalXhrOpen && originalXhrSend && !xhrProto.__arxivMateXhrPatched) {
    xhrProto.__arxivMateXhrPatched = true;
    xhrProto.open = function (method, url, ...rest) {
      try {
        this.__arxivMateRequest = {
          method: String(method || "GET").toUpperCase(),
          url: String(url || "")
        };
      } catch {}
      return originalXhrOpen.call(this, method, url, ...rest);
    };
    xhrProto.send = function (...args) {
      try {
        const request = this.__arxivMateRequest || {};
        if (isConversationRequest(request.url, request.method)) {
          postConversationRequest(
            request.url,
            request.method,
            typeof args[0] === "string" ? extractPromptFingerprintFromBody(args[0]) : null
          );
        }
      } catch {}
      return originalXhrSend.apply(this, args);
    };
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "paperdock-webchat") return;
    const requestId = event.data.requestId || "";
    if (event.data.type === `ARXIVMATE_WEBCHAT_NETWORK_HEALTH_REQUEST_V${PATCH_VERSION}` && Number(event.data.bridgeVersion) === PATCH_VERSION) {
      post({
        type: "ARXIVMATE_WEBCHAT_NETWORK_HEALTH",
        requestId,
        patchVersion: PATCH_VERSION,
        networkHookActive: window.fetch === window.__arxivMatePatchedFetch || Boolean(xhrProto?.__arxivMateXhrPatched)
      });
      return;
    }
    if (event.data.type === `ARXIVMATE_WEBCHAT_SET_PROMPT_V${PATCH_VERSION}` && Number(event.data.bridgeVersion) === PATCH_VERSION) {
      try {
        post({
          type: "ARXIVMATE_WEBCHAT_PROMPT_RESULT",
          requestId,
          ...setComposerPrompt(event.data.prompt)
        });
      } catch (error) {
        post({
          type: "ARXIVMATE_WEBCHAT_PROMPT_RESULT",
          requestId,
          ok: false,
          detail: error?.message || String(error),
          text: ""
        });
      }
      return;
    }
    if (event.data.type === `ARXIVMATE_WEBCHAT_SUBMIT_V${PATCH_VERSION}` && Number(event.data.bridgeVersion) === PATCH_VERSION) {
      try {
        post({
          type: "ARXIVMATE_WEBCHAT_SUBMIT_RESULT",
          requestId,
          ...submitComposerInPageWorld()
        });
      } catch (error) {
        post({
          type: "ARXIVMATE_WEBCHAT_SUBMIT_RESULT",
          requestId,
          ok: false,
          action: "error",
          detail: error?.message || String(error)
        });
      }
    }
  });

  post({
    type: "ARXIVMATE_WEBCHAT_INJECTED_READY",
    patchVersion: PATCH_VERSION,
    networkHookActive: window.fetch === window.__arxivMatePatchedFetch || Boolean(xhrProto?.__arxivMateXhrPatched)
  });
})();
