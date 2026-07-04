const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "content.css"), "utf8");

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
  assert.ok(match, `${selector} rule should exist`);
  return match[1];
}

assert.match(css, /--pd-surface:\s*#f6f8f9;/, "release UI should use the stable cool surface color");
assert.match(css, /--pd-accent:\s*#156f8f;/, "release UI should use the stable blue-green accent");
assert.match(css, /--pd-panel-shadow:\s*-8px 0 24px rgba\(31,\s*35,\s*40,\s*0\.16\);/, "release UI should keep the soft side shadow");
assert.match(css, /font-family:\s*Inter,\s*ui-sans-serif/, "release UI should keep the stable sans font stack");

assert.match(rule(".pd-panel"), /width:\s*var\(--pd-split-width,\s*460px\);/, "dock panel width should match the stable release");
assert.match(rule(".pd-panel.is-floating"), /width:\s*var\(--pd-float-width,\s*560px\);[\s\S]*box-shadow:\s*0 16px 42px rgba\(31,\s*35,\s*40,\s*0\.22\);/, "floating panel should match the stable release size and depth");
assert.match(rule(".pd-header"), /gap:\s*10px;[\s\S]*padding:\s*12px 12px 9px;[\s\S]*background:\s*var\(--pd-header\);/, "header should match the stable compact release layout");
assert.match(rule(".pd-header h2"), /font-size:\s*13px;[\s\S]*line-height:\s*1\.35;/, "paper title should use the stable compact title scale");
assert.doesNotMatch(rule(".pd-header h2"), /Georgia|Times New Roman/, "paper title should not keep the later serif treatment");
assert.match(rule(".pd-meta"), /margin-top:\s*6px;[\s\S]*font-size:\s*11px;[\s\S]*line-height:\s*1\.4;/, "paper metadata should be one quiet release-style line");
assert.doesNotMatch(css, /\.pd-meta span\b/, "paper metadata should not keep later split-chip markup styling");

assert.match(rule(".pd-toolbar"), /gap:\s*7px;[\s\S]*padding:\s*8px 10px;/, "toolbar should match the stable compact release layout");
assert.match(rule(".pd-model-picker"), /min-width:\s*140px;[\s\S]*gap:\s*3px;/, "model picker should use the stable compact width");
assert.match(rule(".pd-model-select"), /min-height:\s*28px;[\s\S]*border-radius:\s*6px;/, "native model select should match the stable release sizing");
assert.doesNotMatch(css, /\.pd-model-button\b|\.pd-model-combobox\b|\.pd-model-menu\b/, "chat panel should not keep the later custom model combobox");
assert.match(rule(".pd-shortcuts button,\n.pd-tools > button,\n.pd-toggle"), /min-height:\s*28px;[\s\S]*border-radius:\s*999px;/, "toolbar controls should use the stable pill shape");
assert.match(rule(".pd-shortcuts button"), /background:\s*var\(--pd-accent-soft\);/, "mode tabs should keep the stable highlighted release style");
assert.match(rule(".pd-chat-shell"), /background:\s*var\(--pd-surface\);/, "chat shell should use the stable release surface");

assert.doesNotMatch(css, /\.pd-avatar\b/, "chat messages should not render role avatars");
assert.doesNotMatch(css, /\.pd-message-meta span\b/, "message metadata should not be split into chip spans");
assert.match(rule(".pd-message-user"), /justify-content:\s*flex-end;/, "user messages should align to the right like the stable release");
assert.doesNotMatch(rule(".pd-message-user"), /flex-direction:\s*row-reverse;/, "user messages should not need reversed avatar layout");

assert.match(rule(".pd-bubble"), /border-radius:\s*8px;/, "chat bubbles should use the stable compact radius");
assert.match(rule(".pd-bubble"), /box-shadow:\s*var\(--pd-bubble-shadow\);/, "chat bubbles should use the stable subtle shadow token");
assert.doesNotMatch(rule(".pd-bubble"), /border-left:/, "chat bubbles should not use note-style left rules");
assert.doesNotMatch(rule(".pd-message-user .pd-bubble"), /linear-gradient/, "user notes should not use decorative gradients");
assert.doesNotMatch(rule(".pd-welcome"), /border:\s*1px|background:|padding:/, "empty chat welcome should stay quiet, not a card");
assert.match(rule(".pd-chat"), /padding:\s*12px 10px;/, "chat list should keep the stable compact padding");
assert.doesNotMatch(rule(".pd-chat"), /scroll-behavior:\s*smooth;/, "chat rendering should not force smooth scrolling on every update");
assert.match(rule(".pd-composer"), /gap:\s*8px;[\s\S]*padding:\s*9px 10px;/, "composer should keep the stable compact layout");
assert.match(rule(".pd-composer textarea"), /min-height:\s*38px;[\s\S]*border-radius:\s*8px;[\s\S]*padding:\s*9px 10px;/, "composer textarea should match the stable release sizing");
assert.match(rule(".pd-history-jump"), /grid-template-columns:\s*repeat\(2,\s*30px\);/, "history jump buttons should keep compact stable width");
assert.match(rule(".pd-history-jump button"), /width:\s*30px;[\s\S]*min-height:\s*38px;[\s\S]*border-radius:\s*8px;/, "history jump buttons should keep compact stable sizing");
assert.match(rule(".pd-send"), /min-width:\s*58px;[\s\S]*min-height:\s*38px;[\s\S]*border-radius:\s*8px;/, "send button should keep compact stable sizing");
assert.doesNotMatch(rule(".pd-send"), /box-shadow/, "send button should stay flat");

console.log("release chat ui contract ok");
