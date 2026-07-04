const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const optionsJs = fs.readFileSync(path.join(root, "options.js"), "utf8");

function createNode() {
  return {
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    checked: false,
    addEventListener() {},
    querySelector() { return createNode(); },
    querySelectorAll() { return []; },
    replaceChildren() {},
    closest() { return null; },
    focus() {},
    click() {}
  };
}

const form = createNode();
form.language = createNode();
form.language.value = "en";
form.appearance = createNode();
form.appearance.value = "system";

const document = {
  documentElement: {},
  body: { dataset: {} },
  querySelector(selector) {
    if (selector === "#settings-form") return form;
    return createNode();
  },
  querySelectorAll() { return []; },
  createElement() { return createNode(); }
};

const context = {
  console,
  setTimeout,
  clearTimeout,
  confirm: () => true,
  window: {
    matchMedia: () => ({ matches: false }),
    open() {},
    PaperDockUpdateBanner: { checkAndRender() {}, renderResult() {} },
    PaperDockI18n: {
      normalizeLanguage: (value) => value || "system",
      resolveLanguage: () => "en",
      t: (language, key, vars = {}) => `${key}${vars.count ? `:${vars.count}` : ""}`
    }
  },
  document,
  chrome: {
    runtime: {
      getManifest: () => ({ version: "0.0.0" }),
      sendMessage: (payload, callback) => callback({ modelProfiles: [], language: "en", appearance: "system" })
    },
    tabs: { create() {} }
  }
};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(optionsJs, context, { filename: "options.js" });

(async () => {
  const candidates = await context.parseLocalModelConfigFiles([
    {
      name: "config.toml",
      text: async () => `
model_provider = "custom"
model = "gpt-5.5"

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "http://3.237.6.45:8080"
`
    },
    {
      name: "auth.json",
      text: async () => JSON.stringify({ OPENAI_API_KEY: "sk-codex-secret" })
    },
    {
      name: "settings.json",
      text: async () => JSON.stringify({
        env: {
          ANTHROPIC_AUTH_TOKEN: "sk-claude-secret",
          ANTHROPIC_BASE_URL: "https://api.minimaxi.com/anthropic",
          ANTHROPIC_MODEL: "claude-3-5-sonnet-latest"
        }
      })
    }
  ]);

  const codex = candidates.find((candidate) => candidate.source === "Codex" && candidate.baseUrl.includes("3.237.6.45"));
  assert.ok(codex, "Codex config.toml should produce a custom model candidate");
  assert.equal(codex.apiKey, "sk-codex-secret", "Codex candidate should hydrate API key from auth.json");
  assert.equal(codex.baseUrl, "http://3.237.6.45:8080/v1", "Codex candidate should append /v1 when base_url omits it");
  assert.equal(codex.model, "gpt-5.5", "Codex candidate should keep the configured model");
  assert.ok(codex.warning, "Codex responses wire_api should warn about compatibility");

  const claude = candidates.find((candidate) => candidate.provider === "anthropic");
  assert.ok(claude, "Claude settings should produce an Anthropic-protocol model candidate");
  assert.equal(claude.source, "Claude", "Claude settings should stay labeled as a Claude profile");
  assert.equal(claude.baseUrl, "https://api.minimaxi.com/anthropic", "Claude import should preserve the configured Anthropic base URL");
  assert.equal(claude.apiKey, "sk-claude-secret", "Claude import should keep the local auth token");
  assert.equal(claude.model, "claude-3-5-sonnet-latest", "Claude import should keep the configured model");
  assert.equal(candidates.length, 2, "auth-only fallback candidates should be hidden when richer configs use the same secret");

  context.__candidates = candidates;
  const importResult = JSON.parse(vm.runInContext("JSON.stringify(autoAddImportedModelProfiles(__candidates))", context));
  assert.equal(importResult.addedProfiles.length, 2, "parsed local configs should be automatically added to model profiles");
  const importedProfiles = JSON.parse(vm.runInContext("JSON.stringify(profiles)", context));
  const profileModels = importedProfiles.map((profile) => profile.model);
  assert.deepEqual(profileModels.sort(), ["claude-3-5-sonnet-latest", "gpt-5.5"].sort(), "auto-added profiles should use imported model names");
  const codexProfile = importedProfiles.find((profile) => profile.model === "gpt-5.5");
  assert.equal(codexProfile.baseUrl, "http://3.237.6.45:8080/v1", "auto-added Codex profile should use a /v1 API Base URL");
  assert.equal(codexProfile.apiKey, "sk-codex-secret", "auto-added Codex profile should keep API Key");
  assert.match(codexProfile.name, /^Local Codex · gpt-5\.5$/, "auto-added profile display name should be local-prefixed");
  const claudeProfile = importedProfiles.find((profile) => profile.model === "claude-3-5-sonnet-latest");
  assert.equal(claudeProfile.provider, "anthropic", "auto-added Claude profile should keep the Anthropic protocol provider");
  assert.equal(claudeProfile.baseUrl, "https://api.minimaxi.com/anthropic", "auto-added Claude profile should keep API Base URL");
  assert.equal(claudeProfile.apiKey, "sk-claude-secret", "auto-added Claude profile should keep API Key");
  assert.match(claudeProfile.name, /^Local Claude · claude-3-5-sonnet-latest$/, "auto-added Claude display name should be local-prefixed");
  const duplicateResult = JSON.parse(vm.runInContext("JSON.stringify(autoAddImportedModelProfiles(__candidates))", context));
  assert.equal(duplicateResult.addedProfiles.length, 0, "re-reading the same local configs should not duplicate profiles");
  assert.equal(duplicateResult.skippedCandidates.length, 2, "duplicate imported configs should be reported as skipped");

  const authOnly = await context.parseLocalModelConfigFiles([
    {
      name: "auth.json",
      text: async () => JSON.stringify({ OPENAI_API_KEY: "sk-auth-only" })
    }
  ]);
  assert.equal(authOnly.length, 0, "auth-only Codex files must not create a fake https://api.openai.com/v1 profile");

  const ccSwitchCandidates = await context.parseLocalModelConfigFiles([
    {
      name: "settings.json",
      text: async () => JSON.stringify({
        currentProviderClaude: "active-provider",
        providers: [
          {
            id: "active-provider",
            name: "cc-switch active",
            apiBaseUrl: "https://api.deepseek.com",
            apiKey: "sk-cc-switch",
            model: "deepseek-chat"
          },
          {
            id: "inactive-provider",
            name: "cc-switch inactive",
            apiBaseUrl: "https://api.openai.com/v1",
            apiKey: "sk-inactive",
            model: "gpt-4o-mini"
          }
        ]
      })
    }
  ]);
  assert.equal(ccSwitchCandidates.length, 1, "cc-switch imports should prefer the current provider instead of every saved provider");
  assert.equal(ccSwitchCandidates[0].provider, "anthropic", "cc-switch Claude imports should keep the Anthropic protocol provider");
  assert.equal(ccSwitchCandidates[0].baseUrl, "https://api.deepseek.com", "cc-switch import should keep the active provider base URL");
  assert.equal(ccSwitchCandidates[0].apiKey, "sk-cc-switch", "cc-switch import should keep the active provider API key");
  assert.equal(ccSwitchCandidates[0].model, "deepseek-chat", "cc-switch import should keep the active provider model");

  console.log("local model import parser ok");
})();
