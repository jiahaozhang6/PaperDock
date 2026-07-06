const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const background = read("background.js");
const webchat = read("webchat.js");
const injected = read("webchat-injected.js");
const i18n = read("i18n.js");

assert.match(background, /prepared\.webchatSession,\s*prepared\.mode/, "background should pass the paper/chat mode into WebChat");
assert.match(background, /webchatMode,/, "START payload should include webchatMode");

assert.match(webchat, /function shouldUseDeepSeekDeepThink\(/, "webchat bridge should decide when DeepSeek deep thinking is needed");
assert.match(webchat, /mode === "quick"[^]*return false/, "quick overview should not enable DeepSeek deep thinking");
assert.match(webchat, /mode === "deep"[^]*return true/, "deep reading should enable DeepSeek deep thinking");
assert.match(webchat, /mode === "ask"[^]*return true/, "normal follow-up chat should enable DeepSeek deep thinking");
assert.match(webchat, /function setDeepSeekDeepThinkMode\(/, "webchat bridge should toggle DeepSeek deep thinking before sending");
assert.doesNotMatch(webchat, /unknown_off_skipped/, "quick mode must not skip disabling DeepSeek deep thinking when state is unknown");
assert.match(webchat, /shouldClickUnknownDeepSeekDeepThinkState\(/, "unknown DeepSeek deep-thinking state should be resolved instead of skipped");
assert.match(webchat, /ds-toggle-button/, "DeepSeek deep-thinking lookup should include the real ds-toggle-button control");
assert.match(webchat, /deepseek_deepthink_on|deepseek_deepthink_off/, "webchat bridge should report DeepSeek deep thinking phase");

assert.match(webchat, /function chatGptTargetComposerMode\(/, "ChatGPT WebChat should choose a composer mode for each paper mode");
assert.match(webchat, /mode === "quick"[^]*return "极速"/, "ChatGPT quick overview should use the fastest mode");
assert.match(webchat, /mode === "deep"[^]*return "高级"/, "ChatGPT deep reading should use advanced mode");
assert.match(webchat, /mode === "ask"[^]*return "高级"/, "ChatGPT follow-up chat should use advanced mode");
assert.match(webchat, /function setChatGptComposerMode\(/, "ChatGPT WebChat should switch the composer intelligence menu before sending");
assert.match(webchat, /chatgpt_fast_mode|chatgpt_deep_mode/, "webchat bridge should report ChatGPT composer mode changes");
assert.ok(
  webchat.indexOf("await waitForUploadReady(site") < webchat.indexOf("await ensureChatGptComposerModeForPaperMode("),
  "ChatGPT composer mode should be applied after PDF upload because ChatGPT can reset the picker when an attachment is added"
);
assert.match(background, /const WEBCHAT_BRIDGE_VERSION = 18;/, "background WebChat bridge version should force the latest content bridge");
assert.match(webchat, /const BRIDGE_VERSION = 18;/, "WebChat content bridge should force reload over previous page installs");
assert.match(injected, /const PATCH_VERSION = 18;/, "MAIN-world WebChat patch should use the same bridge version");

const deepThinkMatches = i18n.match(/webchatDeepThink/g) || [];
assert.ok(deepThinkMatches.length >= 2, "DeepSeek deep thinking status should be localized in zh-CN and en");
const chatGptModeMatches = i18n.match(/webchatChatGpt/g) || [];
assert.ok(chatGptModeMatches.length >= 2, "ChatGPT composer mode status should be localized in zh-CN and en");

console.log("deepseek webchat deepthink contract ok");
