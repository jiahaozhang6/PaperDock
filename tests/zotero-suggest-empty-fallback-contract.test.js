const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const zoteroClientJs = fs.readFileSync(path.join(root, "zotero-client.js"), "utf8");
const backgroundJs = fs.readFileSync(path.join(root, "background.js"), "utf8");

const storedSettings = {
  language: "zh-CN",
  appearance: "system",
  preferredModelProfileId: "p1",
  modelProfiles: [
    {
      id: "p1",
      name: "Empty API",
      provider: "custom",
      baseUrl: "https://empty.example/v1",
      apiKey: "sk-test",
      model: "empty-model",
      temperature: 0.2,
      maxOutputTokens: 4096,
      inputTokenCap: 32000,
      historyTurns: 4,
      historyMessageChars: 1800,
      defaultContextMode: "fast",
      thinkingMode: "hide",
      reasoningLevel: "default",
      useAr5iv: true
    }
  ]
};

const context = {
  console,
  setTimeout,
  clearTimeout,
  TextDecoder,
  URL,
  importScripts() {},
  fetch: async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify({
      choices: [
        {
          message: {
            content: ""
          }
        }
      ]
    })
  }),
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
      local: {
        get: async () => ({
          settings: storedSettings,
          settingsMirror: storedSettings,
          modelProfiles: storedSettings.modelProfiles
        }),
        set: async () => {}
      }
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
vm.runInContext(zoteroClientJs, context, { filename: "zotero-client.js" });
vm.runInContext(backgroundJs, context, { filename: "background.js" });

(async () => {
  const suggestZoteroTargets = vm.runInContext("suggestZoteroTargets", context);
  const result = await suggestZoteroTargets(
    {
      title: "A Diffusion World Model for Long Video Generation",
      abstract: "We study video generation and world models for controllable long-horizon scenes."
    },
    [
      { id: "L1", name: "My Library", level: 0 },
      { id: "C30", name: "Video Generation", level: 1 },
      { id: "C31", name: "World Model", level: 1 }
    ],
    "p1",
    ""
  );

  assert.equal(result.suggestions[0]?.targetId, "C30", "empty LLM output should fall back to local Zotero category matching");
  assert.match(result.warning || "", /LLM 返回为空|本地匹配/, "fallback should report that the model returned no usable text");

  console.log("zotero suggest empty fallback contract ok");
})();
