const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const panelHtml = read("panel.html");
const content = read("content.js");
const bootstrap = read("panel-bootstrap.js");

assert.match(panelHtml, /panel-bootstrap\.js/, "panel.html should load the bootstrap script");
assert.doesNotMatch(panelHtml, /<script src="content\.js"><\/script>/, "panel.html should not load content.js before paper data is ready");
assert.match(bootstrap, /window\.PaperDockEmbeddedPanelPaper/, "bootstrap should expose paper data synchronously before loading content.js");
assert.match(bootstrap, /window\.PaperDockEmbeddedPanelMode/, "bootstrap should force content.js into embedded panel mode");
assert.match(bootstrap, /chrome\.storage\.session/, "bootstrap should read current paper data from session storage");
assert.match(bootstrap, /chrome\.storage\.local/, "bootstrap should fall back to local storage");
assert.match(bootstrap, /if \(!paper\) \{[\s\S]*?showPanelBootstrapError[\s\S]*?return;[\s\S]*?\}/, "bootstrap should not load content.js without paper data");
assert.match(bootstrap, /document\.createElement\("script"\)/, "bootstrap should load content.js after paper data is ready");
assert.match(bootstrap, /showPanelBootstrapError/, "bootstrap should show visible errors instead of leaving a white panel");
assert.match(bootstrap, /window\.addEventListener\("error"/, "bootstrap should catch startup script errors");
assert.match(bootstrap, /window\.addEventListener\("unhandledrejection"/, "bootstrap should catch startup promise errors");
assert.match(bootstrap, /function isPanelMounted\(/, "bootstrap should verify that the panel actually mounted");
assert.match(bootstrap, /document\.body\.appendChild\(fallback\)/, "bootstrap should recreate the fallback if content removed it before failing");
assert.match(content, /window\.PaperDockEmbeddedPanelPaper/, "content should accept bootstrap-provided embedded paper data");
assert.match(content, /runtimeUrl\("panel\.html"\)\}\?paper=/, "PDF iframe host should pass paper data directly to panel.html");

console.log("panel bootstrap contract ok");
