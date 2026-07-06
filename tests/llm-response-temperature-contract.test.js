const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const zoteroClientJs = fs.readFileSync(path.join(root, "zotero-client.js"), "utf8");
const backgroundJs = fs.readFileSync(path.join(root, "background.js"), "utf8");

const fetchCalls = [];
const storedSettings = {
  language: "zh-CN",
  appearance: "system",
  preferredModelProfileId: "p1",
  modelProfiles: [
    {
      id: "p1",
      name: "Test OpenAI-compatible",
      provider: "custom",
      baseUrl: "https://llm.example/v1",
      apiKey: "sk-test",
      model: "strict-temp-model",
      temperature: 0.6,
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
  fetch: async (url, options = {}) => {
    fetchCalls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    if (body.temperature !== 1) {
      return {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => JSON.stringify({
          error: {
            message: "invalid temperature: only 1 is allowed for this model"
          }
        })
      };
    }
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: "{\"suggestions\":[{\"targetId\":\"C10\",\"reason\":\"matches graph learning\",\"confidence\":0.8}]}"
            }
          }
        ]
      })
    };
  },
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
  const extractAssistantContent = vm.runInContext("extractAssistantContent", context);
  assert.equal(
    extractAssistantContent({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: "{\"suggestions\":[]}"
            }
          ]
        }
      ]
    }),
    "{\"suggestions\":[]}",
    "OpenAI Responses-style output_text payloads should not be treated as empty"
  );
  assert.equal(
    extractAssistantContent({
      choices: [
        {
          message: {
            content: [
              {
                type: "text",
                text: {
                  value: "{\"suggestions\":[{\"targetId\":\"C10\"}]}"
                }
              }
            ]
          }
        }
      ]
    }),
    "{\"suggestions\":[{\"targetId\":\"C10\"}]}",
    "text blocks with nested value fields should be parsed"
  );
  assert.equal(
    extractAssistantContent({
      data: {
        choices: [
          {
            message: {
              content: "{\"suggestions\":[{\"targetId\":\"C10\",\"reason\":\"nested data\"}]}"
            }
          }
        ]
      }
    }),
    "{\"suggestions\":[{\"targetId\":\"C10\",\"reason\":\"nested data\"}]}",
    "OpenAI-compatible wrappers that nest choices under data should be parsed"
  );

  const suggestZoteroTargets = vm.runInContext("suggestZoteroTargets", context);
  const result = await suggestZoteroTargets(
    {
      title: "Graph Learning for Scientific Papers",
      abstract: "This paper studies graph learning and retrieval."
    },
    [
      { id: "L1", name: "My Library", level: 0 },
      { id: "C10", name: "Graph Learning", level: 1 }
    ],
    "p1",
    ""
  );

  assert.equal(result.suggestions[0]?.targetId, "C10", "AI recommendation should recover after a provider requires temperature 1");
  assert.equal(fetchCalls.length, 2, "temperature-restricted providers should be retried once with temperature 1");
  assert.equal(
    JSON.parse(fetchCalls[0].options.body).temperature,
    0.6,
    "AI recommendation should start from the saved model temperature instead of forcing 0.1"
  );
  assert.equal(
    JSON.parse(fetchCalls[1].options.body).temperature,
    1,
    "retry should satisfy providers that only accept temperature 1"
  );

  console.log("llm response temperature contract ok");
})();
