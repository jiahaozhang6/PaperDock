const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const manifest = JSON.parse(read("manifest.json"));
const background = read("background.js");
const content = read("content.js");
const css = read("content.css");
const i18n = read("i18n.js");
const zoteroClient = read("zotero-client.js");
const panel = read("panel.html");

assert.ok(
  manifest.optional_permissions?.includes("cookies"),
  "Zotero PDF attachment saving should request cookies only when needed"
);
assert.match(
  manifest.web_accessible_resources[0].resources.join("\n"),
  /zotero-client\.js/,
  "zotero-client.js should be exposed for the embedded panel"
);
assert.ok(
  panel.indexOf('src="zotero-client.js"') > -1 &&
    panel.indexOf('src="zotero-client.js"') < panel.indexOf('src="panel-bootstrap.js"'),
  "embedded panel should load zotero-client.js before the bootstrap that loads content.js"
);

assert.match(zoteroClient, /ZOTERO_CONNECTOR_API_VERSION\s*=\s*3/, "Zotero Connector API v3 should be used");
assert.match(zoteroClient, /function buildZoteroItem\(/, "Zotero item mapping should live in zotero-client.js");
assert.match(zoteroClient, /function buildZoteroAttachment\(/, "PDF attachment mapping should live in zotero-client.js");
assert.match(zoteroClient, /function formatZoteroTargetPath\(/, "target tree path formatting should be reusable");
assert.match(zoteroClient, /function buildZoteroTargetTreeRows\(/, "target tree visible rows should be computed from hierarchy state");
assert.match(zoteroClient, /function parseSuggestionResponse\(/, "AI collection suggestion parsing should live in the shared Zotero client");
assert.match(zoteroClient, /itemType:\s*"preprint"/, "arXiv papers should map to Zotero preprint items");
assert.match(zoteroClient, /mimeType:\s*"application\/pdf"/, "PDF attachments should use application/pdf");

for (const messageType of [
  "zoteroGetTargets",
  "zoteroSuggestTargets",
  "zoteroEnsureCookiePermission",
  "zoteroSavePaper"
]) {
  assert.match(background, new RegExp(`case "${messageType}"`), `background should handle ${messageType}`);
}

assert.match(background, /importScripts\("zotero-client\.js"\)/, "background should load the shared Zotero client");
assert.match(background, /function savePaperToZotero\(/, "background should save papers to Zotero");
assert.match(background, /PaperDockZotero\.parseSuggestionResponse\(text,\s*targets\)/, "background should use the shared tolerant Zotero suggestion parser");
assert.match(background, /function saveZoteroPdfAttachment\(/, "background should save PDF bytes as Zotero attachments");
assert.match(background, /connector\/saveItems/, "background should call Zotero saveItems");
assert.match(background, /connector\/updateSession/, "background should move save sessions into the selected target");
assert.match(background, /connector\/saveAttachment/, "background should upload PDF attachments to Zotero");

assert.match(content, /class="pd-zotero"/, "paper toolbar should include a Zotero button");
assert.match(content, /class="pd-zotero-drawer"/, "paper panel should include a Zotero drawer");
assert.match(content, /class="pd-zotero-current"/, "Zotero drawer should show the current collection path");
assert.match(content, /class="[^"]*pd-zotero-primary[^"]*"/, "Zotero drawer should have one clear primary save button");
assert.doesNotMatch(content, /class="pd-zotero-target-select"/, "Zotero drawer should not use a duplicate dropdown selector");
assert.doesNotMatch(content, /class="pd-zotero-disclosure"/, "Zotero drawer should not hide the tree behind an outer disclosure");
assert.match(content, /class="pd-zotero-expanded"/, "Zotero collection tree should be the primary selector");
assert.doesNotMatch(content, /class="pd-zotero-expanded"\s+hidden/, "Zotero collection tree should be visible by default");
assert.match(content, /class="pd-zotero-library"/, "Zotero drawer should group the collection list");
assert.match(content, /class="pd-zotero-note"/, "Zotero drawer should include an optional child note field");
assert.match(content, /class="pd-zotero-tags"/, "Zotero drawer should include a tag input");
assert.match(content, /function openZoteroDrawer\(/, "content should open the Zotero drawer");
assert.doesNotMatch(content, /function toggleZoteroTargetSelector\(/, "content should not keep the old outer target selector toggle");
assert.doesNotMatch(content, /function renderZoteroTargetSelect\(/, "content should not keep the old dropdown renderer");
assert.match(content, /function renderZoteroTargets\(/, "content should render Zotero targets");
assert.match(content, /function buildZoteroTargetTreeRowsFallback\(/, "content should keep a local fallback tree renderer");
assert.match(content, /function expandZoteroTargetOnHover\(/, "Zotero target tree should expand parent collections on hover");
assert.match(content, /function collapseZoteroTargetOnLeave\(/, "Zotero target tree should collapse hover-opened branches when the pointer leaves");
assert.match(content, /function scheduleCollapseZoteroHoverBranches\(/, "Zotero hover collapse should be evaluated from the whole tree, not only the row that fired the event");
assert.match(content, /function pruneZoteroHoverExpandedTargetIds\(/, "Zotero hover collapse should prune temporary branches by current pointer branch");
assert.match(content, /pointerleave/, "Zotero target tree should clear hover-opened branches when the pointer leaves the tree");
assert.match(content, /hoverExpandedTargetIds/, "Zotero target tree should keep hover-opened branches separate from manually opened branches");
assert.match(content, /pointerout/, "Zotero target tree should listen for pointer leaving a branch");
assert.match(content, /function toggleZoteroTreeNode\(/, "Zotero target tree should support manual disclosure toggles");
assert.match(content, /pd-zotero-tree-toggle/, "Zotero target rows should include tree disclosure controls");
assert.match(content, /function suggestZoteroTargets\(/, "content should ask the LLM for category suggestions");
assert.match(content, /createSuggestionFallback\?\.\(paper,\s*zoteroState\.targets/, "content should locally fall back when the model/backend returns no usable Zotero suggestion");
assert.match(content, /function saveToZotero\(/, "content should save the paper to Zotero");
assert.match(content, /function prepareZoteroPdfPayload\(/, "content should prepare a real PDF payload when possible");
assert.match(content, /noteText:\s*zoteroState\.note/, "Zotero save should include the optional note text");
assert.match(content, /tags:\s*parseZoteroTags\(zoteroState\.tags\)/, "Zotero save should include parsed tags");
assert.match(background, /tags:\s*normalizeZoteroTags\(tags\)/, "background should pass cleaned tags to Zotero updateSession");
assert.match(zoteroClient, /noteText\s*=\s*""/, "Zotero notes should accept user note text");

assert.match(css, /\.pd-zotero-drawer\b/, "Zotero drawer should be styled");
assert.match(
  css,
  /\.pd-zotero-drawer\s*{[^}]*grid-template-rows:\s*auto auto auto minmax\(0,\s*1fr\)/s,
  "Zotero drawer should use a compact command-panel layout"
);
assert.match(
  css,
  /\.pd-zotero-expanded\s*{[^}]*display:\s*grid/s,
  "Zotero tree should be visible as the primary selector"
);
assert.match(
  css,
  /\.pd-zotero-current\s*{[^}]*border:[^}]*background:/s,
  "Zotero current target should be styled as the main selection area"
);
assert.match(
  css,
  /\.pd-zotero-suggestion\s*{[^}]*border:\s*0/s,
  "Zotero suggestions should render as quiet rows rather than heavy cards"
);
assert.match(css, /\.pd-zotero-target\b/, "Zotero target rows should be styled");
assert.match(css, /\.pd-zotero-suggestion\b/, "Zotero AI suggestions should be styled");

for (const key of [
  "zotero",
  "zoteroTitle",
  "zoteroCurrentTarget",
  "zoteroAllCollections",
  "zoteroNotePlaceholder",
  "zoteroTagsPlaceholder",
  "zoteroLoadTargets",
  "zoteroSuggest",
  "zoteroSave",
  "zoteroCookiePermission",
  "zoteroSaved",
  "zoteroPdfSaved",
  "zoteroPdfFailed"
]) {
  const matches = i18n.match(new RegExp(`${key}:`, "g")) || [];
  assert.ok(matches.length >= 2, `${key} should be localized in zh-CN and en`);
}

console.log("zotero integration contract ok");
