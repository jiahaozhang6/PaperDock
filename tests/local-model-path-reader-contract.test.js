const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const manifest = JSON.parse(read("manifest.json"));
const background = read("background.js");
const nativeHost = read("native-host/paperdock-native-host.js");
const installer = read("native-host/install-windows.ps1");
const launcher = read("native-host/paperdock-native-host.cmd");

assert.ok(
  manifest.permissions.includes("nativeMessaging"),
  "extension should request nativeMessaging for stable local config reading"
);
assert.match(background, /case "readLocalModelConfigPaths":/, "background should expose a local config path reader message");
assert.match(background, /function readLocalModelConfigPaths\(/, "background should read local model config paths");
assert.match(background, /chrome\.runtime\.sendNativeMessage/, "background should try the native host first");
assert.match(background, /function fetchLocalConfigPathViaFileUrl\(/, "background should keep a file:// fallback");
assert.match(background, /com\.paperdock\.local/, "background should use the PaperDock native host name");
assert.doesNotMatch(background, /text:\s*normalizeString\(document\.text\)/, "background must preserve config file newlines for TOML/env parsing");
assert.match(background, /text:\s*String\(document\.text\s*\|\|\s*""\)\.slice/, "background should keep raw local config text while capping size");
assert.match(
  background,
  /localModelConfigPaths:\s*normalizeLocalModelConfigPaths\(settings\?\.localModelConfigPaths\)/,
  "background should persist edited local config paths across settings reloads"
);

assert.match(nativeHost, /DEFAULT_LOCAL_MODEL_CONFIG_PATHS/, "native host should know default Codex and Claude config paths");
assert.match(nativeHost, /os\.homedir\(\)/, "native host should expand home-relative paths");
assert.match(nativeHost, /readLocalModelConfigPaths/, "native host should expose the same read action");
assert.match(nativeHost, /MAX_LOCAL_CONFIG_BYTES/, "native host should cap readable config size");
assert.match(installer, /NativeMessagingHosts/, "Windows installer should register the native messaging host");
assert.match(installer, /com\.paperdock\.local/, "Windows installer should install the PaperDock native host");
assert.match(launcher, /%\*/, "native host launcher should forward command-line arguments");

console.log("local model path reader contract ok");
