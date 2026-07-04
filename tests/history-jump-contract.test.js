const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const content = read("content.js");
const css = read("content.css");
const i18n = read("i18n.js");
const panelHtml = read("panel.html");

function countMatches(text, pattern) {
  return text.match(pattern)?.length || 0;
}

const iframePanelIndex = content.indexOf("function installIframePanel");
const iframeMessageListenerIndex = content.indexOf('window.addEventListener("message", (event) => {', iframePanelIndex);
const iframeSrcIndex = content.indexOf("frame.src = frameSrc", iframePanelIndex);

assert.match(content, /class="pd-history-jump"/, "composer should include a history jump control");
assert.match(content, /function installFabOpenHandlers\(/, "floating AI button should have robust open handlers");
assert.match(content, /"pointerdown", "pointerup", "mousedown", "mouseup", "click"/, "floating AI button should not depend on click alone");
assert.match(content, /fab\.addEventListener\(type, openFromEvent, \{ capture: true \}\)/, "floating AI button should open before PDF viewer can swallow the event");
assert.doesNotMatch(content, /class="pd-avatar"/, "chat messages should not include role avatars");
assert.doesNotMatch(content, /renderMessageMeta\(message\)/, "chat messages should render quiet inline metadata");
assert.match(content, /class="pd-message-body">\$\{message\.role === "assistant" \? markdownToHtml\(message\.text \|\| ""\) : escapeHtml\(message\.text \|\| ""\)\}<\/div>/, "messages should keep assistant markdown and plain user text rendering");
assert.match(content, /meta\.textContent = buildPaperMeta\(paper\)/, "paper header should render release-style inline metadata");
assert.match(content, /function buildPaperMeta\(value\) \{[\s\S]*?\]\.filter\(Boolean\)\.join\(" · "\);[\s\S]*?\}/, "buildPaperMeta should return one dot-separated metadata line");
assert.doesNotMatch(content, /buildPaperMetaItems\(paper\)/, "paper header should not keep split-chip metadata rendering");
assert.match(content, /function notifyEmbeddedPanelReady\(/, "embedded PDF panel should notify its outer frame after startup");
assert.match(content, /type:\s*"pd-panel-ready"/, "embedded PDF panel should send a ready message");
assert.match(content, /if \(!isEmbeddedPanel && isPdfPage\(\)\) \{[\s\S]*?installIframePanel\(paper\);[\s\S]*?return;[\s\S]*?\}/, "top-level PDF pages should use the stable iframe panel");
assert.ok(iframeMessageListenerIndex > -1 && iframeSrcIndex > -1 && iframeMessageListenerIndex < iframeSrcIndex, "PDF iframe host should register message listeners before loading panel.html");
assert.match(content, /className = "pd-frame-fallback"/, "PDF iframe host should show a fallback instead of a blank panel");
assert.match(content, /function showFrameLoading\(/, "PDF iframe host should expose a loading state");
assert.match(content, /function markFrameReady\(/, "PDF iframe host should mark the iframe ready after handshake");
assert.match(content, /Math\.min\(500,\s*Math\.max\(420,\s*window\.innerWidth \* 0\.34\)\)/, "dock width calculation should match the stable release");
assert.match(content, /Math\.min\(window\.innerWidth,\s*460\)/, "mobile dock fallback should match the stable release");
assert.match(content, /Math\.min\(680,\s*Math\.max\(520,\s*window\.innerWidth \* 0\.42\)\)/, "floating width default should match the stable release");
assert.match(content, /fabButton\.addEventListener\("pointerup"/, "PDF iframe AI button should have a pointer fallback");
assert.match(content, /frame\.addEventListener\("load"[\s\S]*markFrameReady\(\)/, "PDF iframe host should reveal the panel after iframe load even if a stale inner script misses ready");
assert.match(content, /paperdock-panel-static-fallback/, "content startup should remove the panel static fallback after the real UI mounts");
assert.match(panelHtml, /id="paperdock-panel-static-fallback"/, "panel.html should include a static fallback if the embedded script fails");
assert.match(content, /class="pd-history-prev"/, "composer should include a previous-message button");
assert.match(content, /class="pd-history-next"/, "composer should include a next-message button");
assert.match(content, /const historyPrevButton = \$\("\.pd-history-prev"\)/, "content should cache the previous button");
assert.match(content, /const historyNextButton = \$\("\.pd-history-next"\)/, "content should cache the next button");
assert.match(content, /function jumpConversationMessage\(/, "content should expose jumpConversationMessage");
assert.match(content, /function resumeConversationAutoScroll\(/, "content should expose a bottom-follow mode");
assert.match(content, /let shouldAutoScrollConversation = true/, "conversation should track whether streaming may follow the bottom");
assert.match(content, /chat\.addEventListener\("scroll"[\s\S]*updateConversationAutoScrollFromScroll/, "manual chat scrolling should update bottom-follow state");
assert.match(content, /function updateConversationAutoScrollFromScroll\(/, "content should detect when the user scrolls away from the live bottom");
assert.match(content, /function isChatNearBottom\(/, "content should have a bottom threshold for streaming auto-follow");
assert.match(content, /if \(shouldAutoScrollConversation\) \{[\s\S]*chat\.scrollTop = chat\.scrollHeight/, "rendering should only force bottom scroll while auto-follow is enabled");
assert.match(content, /currentIndex >= nodes\.length - 1[\s\S]*resumeConversationAutoScroll\(/, "next from the last message should resume bottom-follow mode");
assert.match(content, /historyJumpIndex = -1[\s\S]*chat\.scrollTo\(\{[\s\S]*chat\.scrollHeight/, "bottom-follow mode should clear the jump index and scroll to the bottom");
assert.match(content, /messages\.map\(\(message,\s*index\)/, "messages should render with a stable index");
assert.match(content, /data-message-index="\$\{index\}"/, "message elements should carry their index");
assert.match(content, /is-jump-target/, "jump target should get a visible highlight class");
assert.match(content, /pd-history-prev/, "busy state should preserve history navigation buttons");

assert.match(css, /\.pd-history-jump\b/, "history jump control should be styled");
assert.match(css, /\.pd-fab \{[\s\S]*pointer-events: auto;[\s\S]*touch-action: none;/, "floating AI button should receive pointer events reliably");
assert.match(css, /\.pd-history-jump button\b/, "history jump buttons should be styled");
assert.match(css, /\.pd-message\.is-jump-target \.pd-bubble\b/, "jump target should be highlighted");
assert.doesNotMatch(css, /\.pd-avatar\b/, "chat role avatar styles should not be present");
assert.doesNotMatch(css, /\.pd-message-meta span\b/, "message metadata chip styles should not be present");
assert.doesNotMatch(css, /\.pd-meta span\b/, "paper metadata chip styles should not be present in release-style UI");
assert.match(css, /\.pd-composer textarea:focus\b/, "composer focus state should be polished");
assert.match(css, /--pd-soft-shadow:/, "chat UI should use a restrained depth token");

for (const key of ["historyJump", "historyPrev", "historyNext", "historyJumpStatus", "historyJumpBottom"]) {
  assert.ok(countMatches(i18n, new RegExp(`${key}:`, "g")) >= 2, `${key} should be localized`);
}

console.log("history jump contract ok");
