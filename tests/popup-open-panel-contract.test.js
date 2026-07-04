const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const popupHtml = read("popup.html");
const popupJs = read("popup.js");
const content = read("content.js");
const i18n = read("i18n.js");
const background = read("background.js");
const manifest = JSON.parse(read("manifest.json"));

function localized(key) {
  const matches = i18n.match(new RegExp(`${key}:`, "g")) || [];
  assert.ok(matches.length >= 2, `${key} should be localized in zh-CN and en`);
}

assert.match(popupHtml, /id="open-panel"/, "popup should provide a direct Open panel button");
assert.match(popupJs, /openPanelButton/, "popup should cache the Open panel button");
assert.match(popupJs, /function openPanelForCurrentTab\(/, "popup should open the paper panel for the current tab");
assert.match(popupJs, /type:\s*"openPaperDockPanel"/, "popup should send an open-panel message to the content script");
assert.match(popupJs, /chrome\.tabs\.sendMessage/, "popup should first try the existing content script");
assert.match(popupJs, /chrome\.scripting\.executeScript/, "popup should inject content scripts when the tab has no receiver");
assert.match(popupJs, /CONTENT_SCRIPT_FILES/, "popup should inject the same dependency order as manifest content scripts");
assert.doesNotMatch(popupJs, /openStandalonePanel/, "popup open-current-panel must not fall back to a standalone extension panel");
assert.doesNotMatch(popupJs, /chrome\.sidePanel/, "popup open-current-panel must not open the browser side panel");
assert.doesNotMatch(popupJs, /chrome\.windows\.create/, "popup open-current-panel must not create a popup window");
assert.doesNotMatch(popupJs, /panel\.html\?alcPanel=/, "popup open-current-panel must not route through extension panel pages");
assert.match(popupJs, /openPanelButton\.disabled\s*=\s*!supported/, "open button should be disabled on unsupported pages");
assert.match(content, /message\?\.type\s*===\s*"openPaperDockPanel"/, "content should listen for the popup open-panel message");
assert.match(content, /togglePanel\(true\)/, "content should force-open the panel from the popup message");
assert.doesNotMatch(content, /isPdfPage\(\)[\s\S]*openPaperPanelFromCurrentPage/, "PDF floating AI button should not open a separate extension popup");
assert.doesNotMatch(content, /type:\s*"openPaperPanel"/, "PDF floating AI button should not ask the background to open a popup");
assert.ok(
  popupJs.indexOf("await sendTabMessage(tab.id, { type: \"openPaperDockPanel\" })") > -1 &&
    popupJs.indexOf("await injectContentScripts(tab.id)") > popupJs.indexOf("await sendTabMessage(tab.id, { type: \"openPaperDockPanel\" })"),
  "popup button should try the existing in-page panel before injecting scripts"
);
assert.doesNotMatch(background, /case "openPaperPanel"/, "background should not accept content-triggered standalone panel requests");
assert.doesNotMatch(background, /function openPaperPanel\(/, "background should not contain a standalone panel opener");
assert.doesNotMatch(background, /function openPanelFallbackWindow\(/, "background should not create popup fallback windows for paper panels");

[
  "openCurrentPanel",
  "popupStatusArxiv",
  "popupOpenPanelFailed",
  "popupOpenPanelRetryHint",
  "popupOpeningPanel"
].forEach(localized);

assert.ok(!manifest.permissions.includes("sidePanel"), "manifest should not request sidePanel for in-page panels");
assert.equal(manifest.side_panel, undefined, "manifest should not declare a browser side panel");

console.log("popup open panel contract ok");
