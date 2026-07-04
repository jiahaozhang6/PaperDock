const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const backgroundJs = fs.readFileSync(path.join(root, "background.js"), "utf8");
const optionsJs = fs.readFileSync(path.join(root, "options.js"), "utf8");

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

const buildChatRequestBody = vm.runInContext("buildChatRequestBody", context);

const fixedTemperatureBody = buildChatRequestBody(
  {
    provider: "openai",
    model: "gpt-5.5",
    temperature: 0.2,
    maxOutputTokens: 4096,
    thinkingMode: "hide",
    reasoningLevel: "default"
  },
  [{ role: "user", content: "hello" }],
  false
);
assert.equal(
  fixedTemperatureBody.temperature,
  1,
  "GPT-5-style models should force temperature to 1 instead of sending the saved default 0.2"
);

const customFixedTemperatureBody = buildChatRequestBody(
  {
    provider: "custom",
    model: "openai/gpt-5.5",
    temperature: 0.7,
    maxOutputTokens: 4096,
    thinkingMode: "hide",
    reasoningLevel: "default"
  },
  [{ role: "user", content: "hello" }],
  false
);
assert.equal(
  customFixedTemperatureBody.temperature,
  1,
  "custom OpenAI-compatible profiles should also fix temperature by model name"
);

const normalBody = buildChatRequestBody(
  {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxOutputTokens: 4096,
    thinkingMode: "hide",
    reasoningLevel: "default"
  },
  [{ role: "user", content: "hello" }],
  false
);
assert.equal(normalBody.temperature, 0.3, "ordinary chat models should keep the selected temperature");

assert.match(
  optionsJs,
  /function getFixedTemperatureValueForModel\(/,
  "settings UI should detect models with fixed temperature requirements"
);
assert.match(
  optionsJs,
  /temperature:\s*{[^}]*min:\s*\(profile\)\s*=>\s*getTemperatureBounds\(profile\)\.min[^}]*max:\s*\(profile\)\s*=>\s*getTemperatureBounds\(profile\)\.max/s,
  "settings UI temperature control should use model-aware bounds"
);

console.log("fixed temperature model contract ok");
