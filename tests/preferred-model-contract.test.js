const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const backgroundJs = read("background.js");
const contentJs = read("content.js");
const optionsJs = read("options.js");
const i18nJs = read("i18n.js");

const context = {
  console,
  setTimeout,
  clearTimeout,
  TextDecoder,
  URL,
  importScripts() {},
  fetch: async () => ({ ok: true, text: async () => "{}" }),
  chrome: {
    runtime: {
      getManifest: () => ({ version: "0.0.0" }),
      onInstalled: { addListener() {} },
      onMessage: { addListener() {} },
      onConnect: { addListener() {} },
      sendNativeMessage() {}
    },
    storage: {
      sync: { get: async () => ({}), set: async () => {} },
      local: { get: async () => ({}), set: async () => {} }
    },
    tabs: {
      query: async () => [],
      sendMessage: async () => {},
      reload: async () => {},
      create: async () => ({ id: 1 }),
      get: async () => ({ id: 1, status: "complete", url: "about:blank" })
    }
  }
};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(backgroundJs, context, { filename: "background.js" });

const normalizeSettings = vm.runInContext("normalizeSettings", context);
const resolveRequestSettings = vm.runInContext("resolveRequestSettings", context);

const settings = normalizeSettings({
  preferredModelProfileId: "p2",
  modelProfiles: [
    {
      id: "p1",
      name: "Fast",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-fast",
      model: "gpt-4o-mini"
    },
    {
      id: "p2",
      name: "Preferred",
      provider: "minimax",
      baseUrl: "https://api.minimaxi.com/v1",
      apiKey: "sk-preferred",
      model: "MiniMax-M3"
    }
  ]
});

assert.equal(settings.preferredModelProfileId, "p2", "normalized settings should preserve a valid preferred profile id");
assert.equal(
  resolveRequestSettings(settings, "").requestProfileId,
  "p2",
  "requests without an explicit chat selection should use the preferred model"
);
assert.equal(
  resolveRequestSettings(settings, "p1").requestProfileId,
  "p1",
  "explicit chat selection should override the preferred model"
);
assert.equal(
  normalizeSettings({ ...settings, preferredModelProfileId: "missing" }).preferredModelProfileId,
  "p1",
  "missing preferred profile should fall back to the first available profile"
);

assert.match(
  backgroundJs,
  /case "setPreferredModelProfile"/,
  "background should expose a focused message for changing only the preferred profile"
);
assert.match(
  contentJs,
  /function persistPreferredModelProfile\(/,
  "paper chat should persist the model selected by the user"
);
assert.match(
  contentJs,
  /selectChatModelById[\s\S]*persistPreferredModelProfile\(nextProfileId\)/,
  "manual chat model switching should remember the chosen model"
);
assert.match(
  contentJs,
  /preferredModelProfileId/,
  "paper chat should initialize selection from the preferred model id"
);
assert.match(
  optionsJs,
  /data-action="set-preferred"/,
  "settings page should let users set the preferred model explicitly"
);
assert.match(
  optionsJs,
  /function setPreferredModelProfile\(/,
  "settings page should save a preferred model independently of editing profiles"
);
assert.match(
  i18nJs,
  /preferredModel/,
  "preferred model labels should be localized"
);

console.log("preferred model contract ok");
