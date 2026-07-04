const form = document.querySelector("#settings-form");
const statusNode = document.querySelector("#status");
const addProfileButton = document.querySelector("#add-profile");
const addProfileProviderSelect = document.querySelector("#add-profile-provider");
const profilesNode = document.querySelector("#profiles");
const updateBox = document.querySelector(".update-box");
const updateStatusNode = document.querySelector("#update-status");
const updateCheckedAtNode = document.querySelector("#update-checked-at");
const checkUpdateButton = document.querySelector("#check-update");
const updateActionsNode = document.querySelector("#update-actions");
const updateStepsNode = document.querySelector("#update-steps");
const downloadUpdateLink = document.querySelector("#download-update");
const openReleaseLink = document.querySelector("#open-release");
const globalUpdateBannerNode = document.querySelector("#global-update-banner");
const projectVersionNode = document.querySelector("#project-version");
const modelPresetsNode = document.querySelector("#model-presets");
const exportBackupButton = document.querySelector("#export-backup");
const importBackupInput = document.querySelector("#import-backup");
const backupStatusNode = document.querySelector("#backup-status");
const importLocalModelsButton = document.querySelector("#import-local-models");
const chooseLocalModelFilesButton = document.querySelector("#choose-local-model-files");
const importLocalModelFilesInput = document.querySelector("#import-local-model-files");
const localModelPathsInput = document.querySelector("#local-model-paths");
const localModelImportResultNode = document.querySelector("#local-model-import-result");
const saveUiPreferencesButton = document.querySelector("#save-ui-preferences");
const I18N = window.PaperDockI18n;

const DEFAULT_LOCAL_MODEL_CONFIG_PATHS = [
  "~/.codex/config.toml",
  "~/.codex/auth.json",
  "~/.claude/settings.json"
];

const PROVIDER_PRESETS = {
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini"
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash"
  },
  minimax: {
    label: "MiniMax",
    baseUrl: "https://api.minimaxi.com/v1",
    model: "MiniMax-M3"
  },
  anthropic: {
    label: "Claude / Anthropic-compatible",
    labelZh: "Claude / Anthropic 兼容",
    labelEn: "Claude / Anthropic-compatible",
    baseUrl: "https://api.anthropic.com",
    model: ""
  },
  ollama: {
    label: "Ollama local",
    labelZh: "Ollama 本地",
    labelEn: "Ollama local",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1"
  },
  webchatChatGPT: {
    label: "ChatGPT Web",
    labelZh: "ChatGPT 网页版",
    labelEn: "ChatGPT Web",
    baseUrl: "webchat://chatgpt",
    model: "ChatGPT Web"
  },
  webchatDeepSeek: {
    label: "DeepSeek Web",
    labelZh: "DeepSeek 网页版",
    labelEn: "DeepSeek Web",
    baseUrl: "webchat://deepseek",
    model: "DeepSeek Web"
  },
  custom: {
    label: "Custom OpenAI-compatible",
    labelZh: "自定义 OpenAI-compatible",
    labelEn: "Custom OpenAI-compatible",
    baseUrl: "",
    model: ""
  }
};

const NUMERIC_FIELD_CONFIG = {
  temperature: {
    min: (profile) => getTemperatureBounds(profile).min,
    max: (profile) => getTemperatureBounds(profile).max,
    step: 0.1,
    rangeStep: 0.1,
    fallback: (profile) => getTemperatureBounds(profile).fallback,
    decimals: 1
  },
  maxOutputTokens: {
    min: 128,
    max: (profile) => getModelOutputTokenLimit(profile?.model),
    step: 1,
    rangeStep: 1,
    fallback: (profile) => getModelOutputTokenLimit(profile?.model),
    integer: true
  },
  inputTokenCap: {
    min: 1000,
    max: 1000000,
    step: 1000,
    rangeStep: 1000,
    fallback: (profile) => getModelInputTokenLimit(profile?.model),
    integer: true
  },
  maxContextChars: {
    min: 4000,
    max: 60000,
    step: 1000,
    rangeStep: 1000,
    fallback: 14000,
    integer: true
  },
  historyTurns: {
    min: 0,
    max: 20,
    step: 1,
    rangeStep: 1,
    fallback: 4,
    integer: true
  },
  historyMessageChars: {
    min: 400,
    max: 8000,
    step: 200,
    rangeStep: 200,
    fallback: 1800,
    integer: true
  }
};

const NUMERIC_FIELDS = Object.keys(NUMERIC_FIELD_CONFIG);

let settings = null;
let profiles = [];
let selectedProfileId = "";
let revealApiKey = false;
let currentLanguage = "system";
const modelLoadCache = new Map();
const autoLoadedModelKeys = new Set();
const MESSAGE_TIMEOUTS = {
  saveSettings: 8000,
  testModelProfile: 45000,
  listModelsForProfile: 20000,
  checkForUpdate: 15000,
  default: 15000
};

syncProjectVersion();
renderAddProfileProviderOptions();
loadSettings();

addProfileButton.addEventListener("click", () => {
  const profile = createProfile(addProfileProviderSelect.value || "custom");
  profiles.push(profile);
  selectedProfileId = profile.id;
  revealApiKey = false;
  renderProfiles();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  setStatus(t("chooseSpecificSave"));
});

form.language.addEventListener("change", () => {
  currentLanguage = normalizeLanguage(form.language.value);
  applyLanguage(currentLanguage);
  renderProfiles();
});

form.appearance.addEventListener("change", () => {
  applyAppearance(form.appearance.value);
});

saveUiPreferencesButton?.addEventListener("click", () => {
  saveUiPreferences();
});

checkUpdateButton.addEventListener("click", () => {
  checkForUpdate(true);
});

exportBackupButton.addEventListener("click", exportBackup);
importBackupInput.addEventListener("change", importBackup);
importLocalModelsButton.addEventListener("click", () => {
  importLocalModelPaths();
});
chooseLocalModelFilesButton.addEventListener("click", () => {
  importLocalModelFilesInput.click();
});
importLocalModelFilesInput.addEventListener("change", importLocalModelFiles);

async function loadSettings() {
  try {
    settings = await sendMessage({ type: "getSettings" });
    profiles = normalizeProfiles(settings.modelProfiles, settings);
    selectedProfileId = getPreferredProfileId() || profiles[0]?.id || "";
    localModelPathsInput.value = normalizeLocalModelConfigPaths(settings.localModelConfigPaths).join("\n");
    form.language.value = normalizeLanguage(settings.language);
    currentLanguage = form.language.value;
    form.appearance.value = normalizeAppearance(settings.appearance);
    applyAppearance(form.appearance.value);
    applyLanguage(currentLanguage);
    renderProfiles();
    checkForUpdate(false);
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
}

async function saveModelProfile(id = selectedProfileId) {
  readSelectedProfileFromDom();
  selectedProfileId = id || selectedProfileId;
  const profile = profiles.find((item) => item.id === selectedProfileId);
  setStatus(t("saving"));
  setFormBusy(true);
  try {
    await saveCurrentSettings({
      modelProfiles: profiles,
      localModelConfigPaths: readLocalModelPaths()
    }, { syncProfiles: true });
    const warning = settings?.storageWarning ? `（同步备份未完成：${settings.storageWarning}；本地设置已保存）` : "";
    setStatus(`${t("modelProfileSaved", { name: profile?.name || profile?.model || t("untitledProfile") })}${warning}`);
  } catch (error) {
    setStatus(error.message || String(error), true);
  } finally {
    setFormBusy(false);
  }
}

async function saveModelProfilesAfterMutation(message) {
  setStatus(t("saving"));
  setFormBusy(true);
  try {
    await saveCurrentSettings({
      modelProfiles: profiles,
      localModelConfigPaths: readLocalModelPaths()
    }, { syncProfiles: true });
    const warning = settings?.storageWarning ? `（同步备份未完成：${settings.storageWarning}；本地设置已保存）` : "";
    setStatus(`${message}${warning}`);
  } catch (error) {
    setStatus(error.message || String(error), true);
  } finally {
    setFormBusy(false);
  }
}

async function setPreferredModelProfile(id = selectedProfileId) {
  readSelectedProfileFromDom();
  selectedProfileId = id || selectedProfileId;
  const profile = profiles.find((item) => item.id === selectedProfileId);
  if (!profile) return;
  setStatus(t("saving"));
  setFormBusy(true);
  try {
    settings = await sendMessage({
      type: "setPreferredModelProfile",
      profileId: profile.id
    });
    setStatus(t("preferredModelSaved", { name: profile.name || profile.model || t("untitledProfile") }));
    renderProfiles();
  } catch (error) {
    setStatus(error.message || String(error), true);
  } finally {
    setFormBusy(false);
  }
}

async function saveUiPreferences() {
  const nextLanguage = normalizeLanguage(form.language.value);
  const nextAppearance = normalizeAppearance(form.appearance.value);
  setStatus(t("saving"));
  setFormBusy(true);
  try {
    const saved = await sendMessage({
      type: "saveSettings",
      settings: {
        ...(settings || {}),
        language: nextLanguage,
        appearance: nextAppearance,
        modelProfiles: settings?.modelProfiles || profiles,
        localModelConfigPaths: normalizeLocalModelConfigPaths(settings?.localModelConfigPaths || readLocalModelPaths())
      }
    });
    settings = {
      ...saved,
      modelProfiles: settings?.modelProfiles || saved.modelProfiles
    };
    form.language.value = nextLanguage;
    form.appearance.value = nextAppearance;
    currentLanguage = nextLanguage;
    applyAppearance(nextAppearance);
    applyLanguage(currentLanguage);
    renderProfiles();
    const warning = saved?.storageWarning ? `（同步备份未完成：${saved.storageWarning}；本地设置已保存）` : "";
    setStatus(`${t("uiPreferencesSaved")}${warning}`);
  } catch (error) {
    setStatus(error.message || String(error), true);
  } finally {
    setFormBusy(false);
  }
}

async function saveCurrentSettings(patch = {}, { syncProfiles = true } = {}) {
  const next = {
    ...(settings || {}),
    ...patch
  };
  settings = await sendMessage({ type: "saveSettings", settings: next });
  if (syncProfiles) {
    profiles = normalizeProfiles(settings.modelProfiles, settings);
    if (!profiles.some((profile) => profile.id === selectedProfileId)) {
      selectedProfileId = getPreferredProfileId() || profiles[0]?.id || "";
    }
    renderProfiles();
  }
}

async function importLocalModelFiles(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  setStatus(t("importingLocalModels"));
  try {
    const candidates = await parseLocalModelConfigFiles(files);
    if (!candidates.length) {
      setStatus(t("noImportedModelsFound"), true);
      return;
    }
    const importResult = autoAddImportedModelProfiles(candidates);
    renderLocalModelImportResult(importResult);
    setStatus(importResult.addedProfiles.length
      ? t("importedModelAutoAdded", { count: importResult.addedProfiles.length })
      : t("importedModelAlreadyAdded"));
  } catch (error) {
    setStatus(error.message || String(error), true);
  } finally {
    event.target.value = "";
  }
}

async function importLocalModelPaths() {
  const paths = readLocalModelPaths();
  if (!paths.length) {
    setStatus(t("noImportedModelsFound"), true);
    return;
  }
  setStatus(t("importingLocalModels"));
  setFormBusy(true);
  try {
    const result = await sendMessage({
      type: "readLocalModelConfigPaths",
      paths
    });
    const candidates = parseLocalModelConfigDocuments(result.documents || []);
    const errors = Array.isArray(result.errors) ? result.errors.filter(Boolean) : [];
    const readableErrors = summarizeLocalModelReadErrors(errors);
    if (!candidates.length) {
      renderLocalModelImportResult({
        addedProfiles: [],
        skippedCandidates: [],
        errors: readableErrors,
        isError: true
      });
      setStatus(readableErrors[0] || t("noImportedModelsFound"), true);
      return;
    }
    const importResult = autoAddImportedModelProfiles(candidates);
    renderLocalModelImportResult({
      ...importResult,
      errors: readableErrors
    });
    setStatus(importResult.addedProfiles.length
      ? t("importedModelAutoAdded", { count: importResult.addedProfiles.length })
      : t("importedModelAlreadyAdded"));
  } catch (error) {
    const errors = summarizeLocalModelReadErrors([error.message || String(error)]);
    renderLocalModelImportResult({
      addedProfiles: [],
      skippedCandidates: [],
      errors,
      isError: true
    });
    setStatus(errors[0], true);
  } finally {
    setFormBusy(false);
  }
}

async function parseLocalModelConfigFiles(files) {
  const documents = await Promise.all(Array.from(files || []).map(async (file) => ({
    name: file.name || "config",
    text: typeof file.text === "function" ? await file.text() : String(file.text || file.content || "")
  })));
  return parseLocalModelConfigDocuments(documents);
}

function parseLocalModelConfigDocuments(documents) {
  const secrets = {};
  const candidates = [];

  (documents || []).forEach((document) => {
    const name = document.name || "";
    const text = document.text || "";
    const lowerName = name.toLowerCase();

    Object.assign(secrets, collectEnvValuesFromText(text, lowerName));

    if (lowerName.endsWith(".toml") || /\[model_providers\./.test(text) || /\bmodel_provider\s*=/.test(text)) {
      candidates.push(...parseCodexConfigToml(text, name));
    }

    if (lowerName.endsWith(".json") || looksLikeJson(text)) {
      try {
        candidates.push(...parseClaudeSettingsJson(JSON.parse(text), name));
      } catch {
        // Not every .txt/.env snippet that starts with "{" is useful JSON.
      }
    }

    if (lowerName.endsWith(".env") || /(^|\n)\s*(OPENAI|ANTHROPIC|CLAUDE|CODEX)_[A-Z0-9_]+\s*=/.test(text)) {
      candidates.push(...parseEnvModelConfig(text, name));
    }
  });

  const hydrated = candidates.map((candidate) => hydrateImportedCandidate(candidate, secrets));
  return dedupeImportedModelCandidates(suppressHydratedFallbackCandidates(hydrated));
}

function readLocalModelPaths() {
  return normalizeLocalModelConfigPaths(localModelPathsInput?.value);
}

function normalizeLocalModelConfigPaths(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(/\r?\n|,/);
  const normalized = list
    .map((pathValue) => String(pathValue || "").trim())
    .filter(Boolean);
  const paths = normalized.length ? normalized : DEFAULT_LOCAL_MODEL_CONFIG_PATHS;
  return [...new Set(paths)];
}

function parseCodexConfigToml(text, sourceName = "config.toml") {
  const parsed = parseSimpleToml(text);
  const root = parsed.root || {};
  const candidates = [];
  Object.entries(parsed.sections || {}).forEach(([sectionName, section]) => {
    if (!sectionName.startsWith("model_providers.")) return;
    const providerName = sectionName.replace(/^model_providers\./, "") || section.name || "custom";
    const baseUrl = normalizeCodexApiBaseUrl(section.base_url || section.baseUrl || "");
    const model = String(section.model || root.model || "").trim();
    const provider = inferProvider(baseUrl);
    const authKeyName = section.env_key || (section.requires_openai_auth ? "OPENAI_API_KEY" : "");
    candidates.push({
      source: "Codex",
      sourceName,
      name: buildImportedProfileName("Codex", section.name || providerName, model),
      provider,
      baseUrl,
      apiKey: section.api_key || section.experimental_bearer_token || "",
      authKeyName,
      model,
      warning: section.wire_api && section.wire_api !== "chat" && section.wire_api !== "chat_completions"
        ? t("localModelImportWarning")
        : ""
    });
  });

  if (!candidates.length && (root.base_url || root.api_key || root.model)) {
    const baseUrl = normalizeCodexApiBaseUrl(root.base_url || "");
    candidates.push({
      source: "Codex",
      sourceName,
      name: buildImportedProfileName("Codex", root.model_provider || "custom", root.model),
      provider: inferProvider(baseUrl),
      baseUrl,
      apiKey: root.api_key || root.experimental_bearer_token || "",
      authKeyName: root.requires_openai_auth ? "OPENAI_API_KEY" : "",
      model: String(root.model || "").trim(),
      warning: root.wire_api && root.wire_api !== "chat" && root.wire_api !== "chat_completions"
        ? t("localModelImportWarning")
        : ""
    });
  }

  return candidates.filter(hasImportedModelSignal);
}

function parseClaudeSettingsJson(value, sourceName = "settings.json") {
  const env = collectLocalModelEnvValues(value);
  const candidates = [];

  if (env.CODEX_API_KEY || env.CODEX_BASE_URL || env.CODEX_MODEL) {
    const baseUrl = normalizeApiBaseUrl(env.CODEX_BASE_URL || env.BASE_URL || "");
    candidates.push({
      source: "Codex",
      sourceName,
      name: buildImportedProfileName("Codex", sourceName, env.CODEX_MODEL || env.MODEL),
      provider: inferProvider(baseUrl),
      baseUrl,
      apiKey: env.CODEX_API_KEY || "",
      authKeyName: "CODEX_API_KEY",
      model: env.CODEX_MODEL || env.MODEL || "",
      fallbackOnly: !(env.CODEX_BASE_URL || env.BASE_URL || env.CODEX_MODEL || env.MODEL)
    });
  }

  if (env.OPENAI_BASE_URL || env.OPENAI_MODEL || (env.OPENAI_API_KEY && env.BASE_URL)) {
    const baseUrl = normalizeApiBaseUrl(env.OPENAI_BASE_URL || env.BASE_URL || "");
    candidates.push({
      source: sourceName.toLowerCase().includes("auth") ? "Codex" : "OpenAI",
      sourceName,
      name: buildImportedProfileName("OpenAI", sourceName, env.OPENAI_MODEL || (baseUrl ? env.MODEL : "")),
      provider: inferProvider(baseUrl),
      baseUrl,
      apiKey: env.OPENAI_API_KEY || "",
      authKeyName: "OPENAI_API_KEY",
      model: env.OPENAI_MODEL || (baseUrl ? env.MODEL : "") || PROVIDER_PRESETS.openai.model,
      fallbackOnly: false
    });
  }

  if (env.ANTHROPIC_BASE_URL || env.CLAUDE_BASE_URL || env.ANTHROPIC_MODEL || env.CLAUDE_MODEL) {
    const baseUrl = normalizeApiBaseUrl(env.ANTHROPIC_BASE_URL || env.CLAUDE_BASE_URL || "");
    const model = env.ANTHROPIC_MODEL || env.CLAUDE_MODEL || env.MODEL || "";
    candidates.push({
      source: "Claude",
      sourceName,
      name: buildImportedProfileName("Claude", sourceName, model),
      provider: "anthropic",
      baseUrl,
      apiKey: env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || "",
      authKeyName: env.ANTHROPIC_AUTH_TOKEN ? "ANTHROPIC_AUTH_TOKEN" : "ANTHROPIC_API_KEY",
      model
    });
  }

  candidates.push(...parseProviderSwitchCandidates(value, sourceName));

  return candidates.filter(hasImportedModelSignal);
}

function parseProviderSwitchCandidates(value, sourceName = "settings.json") {
  const activeRefs = collectActiveProviderRefs(value);
  const entries = [];
  collectProviderLikeObjects(value, entries);
  const selected = activeRefs.length
    ? entries
      .map((entry) => ({
        entry,
        ref: activeRefs.find((active) => providerEntryMatchesActiveRef(entry, active))
      }))
      .filter((item) => item.ref)
    : entries.map((entry) => ({ entry, ref: null }));

  return selected
    .map(({ entry, ref }) => providerEntryToImportedCandidate(entry, ref, sourceName))
    .filter(Boolean);
}

function collectActiveProviderRefs(value, refs = []) {
  if (!value || typeof value !== "object") return refs;
  Object.entries(value).forEach(([key, item]) => {
    const keyText = String(key || "");
    if (typeof item === "string" && /(?:current|active|selected).*provider|provider.*(?:current|active|selected)/i.test(keyText)) {
      refs.push({
        id: item,
        source: /claude|anthropic/i.test(keyText) ? "Claude" : /codex/i.test(keyText) ? "Codex" : ""
      });
    }
    if (item && typeof item === "object") collectActiveProviderRefs(item, refs);
  });
  return refs;
}

function collectProviderLikeObjects(value, entries = [], path = []) {
  if (!value || typeof value !== "object") return entries;
  if (!Array.isArray(value)) {
    const baseUrl = firstConfigField(value, ["apiBaseUrl", "api_base_url", "baseUrl", "base_url", "apiUrl", "api_url", "url", "endpoint"]);
    const apiKey = firstConfigField(value, ["apiKey", "api_key", "authToken", "auth_token", "token", "key"]);
    const model = firstConfigField(value, ["model", "modelName", "model_name", "defaultModel", "default_model"]);
    if (baseUrl && (apiKey || model)) {
      entries.push({
        value,
        path: path.join("."),
        id: firstConfigField(value, ["id", "providerId", "provider_id", "name", "provider", "slug"]),
        name: firstConfigField(value, ["name", "label", "title", "provider", "id"]),
        baseUrl,
        apiKey,
        model,
        protocol: firstConfigField(value, ["protocol", "apiProtocol", "api_protocol", "wireApi", "wire_api"])
      });
    }
  }
  Object.entries(value).forEach(([key, item]) => {
    if (item && typeof item === "object") collectProviderLikeObjects(item, entries, [...path, key]);
  });
  return entries;
}

function providerEntryMatchesActiveRef(entry, active) {
  const target = normalizeImportCompare(active?.id);
  if (!target) return false;
  return [
    entry.id,
    entry.name,
    entry.value?.id,
    entry.value?.name,
    entry.value?.provider,
    entry.value?.slug
  ].some((item) => normalizeImportCompare(item) === target);
}

function providerEntryToImportedCandidate(entry, activeRef, sourceName) {
  const source = activeRef?.source || guessImportedProviderSource(entry, sourceName);
  const provider = source === "Claude" || /anthropic|claude/i.test(entry.protocol || "")
    ? "anthropic"
    : inferProvider(entry.baseUrl);
  const label = entry.name || activeRef?.id || sourceName;
  return {
    source,
    sourceName,
    name: buildImportedProfileName(source, label, entry.model),
    provider,
    baseUrl: normalizeApiBaseUrl(entry.baseUrl),
    apiKey: entry.apiKey || "",
    model: String(entry.model || "").trim()
  };
}

function guessImportedProviderSource(entry, sourceName) {
  const text = [sourceName, entry.path, entry.name, entry.protocol, entry.baseUrl].join(" ");
  if (/claude|anthropic/i.test(text)) return "Claude";
  if (/codex/i.test(text)) return "Codex";
  if (/openai/i.test(text)) return "OpenAI";
  if (/minimax|minimaxi/i.test(text)) return "MiniMax";
  if (/deepseek/i.test(text)) return "DeepSeek";
  return "Local";
}

function firstConfigField(object, keys) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(object, key)) continue;
    const value = object[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return "";
}

function normalizeImportCompare(value) {
  return String(value || "").trim().toLowerCase();
}

function parseEnvModelConfig(text, sourceName = ".env") {
  const env = parseEnvVars(text);
  return parseClaudeSettingsJson({ env }, sourceName);
}

function autoAddImportedModelProfiles(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!list.length) return { addedProfiles: [], skippedCandidates: [] };
  readSelectedProfileFromDom();
  const addedProfiles = [];
  const skippedCandidates = [];
  list.forEach((candidate) => {
    if (!candidate) return;
    if (hasMatchingImportedProfile(candidate)) {
      skippedCandidates.push(candidate);
      return;
    }
    addedProfiles.push(addImportedModelProfile(candidate, { render: false }));
  });
  if (addedProfiles.length) {
    revealApiKey = false;
    renderProfiles();
  }
  return { addedProfiles, skippedCandidates };
}

function renderLocalModelImportResult(result = {}) {
  if (!localModelImportResultNode) return;
  const addedProfiles = Array.isArray(result.addedProfiles) ? result.addedProfiles : [];
  const skippedCandidates = Array.isArray(result.skippedCandidates) ? result.skippedCandidates : [];
  const errors = Array.isArray(result.errors) ? result.errors.filter(Boolean) : [];
  if (!addedProfiles.length && !skippedCandidates.length && !errors.length) {
    localModelImportResultNode.hidden = true;
    localModelImportResultNode.innerHTML = "";
    return;
  }
  const title = addedProfiles.length
    ? t("importedModelAutoAdded", { count: addedProfiles.length })
    : skippedCandidates.length
      ? t("importedModelAlreadyAdded")
      : t("noImportedModelsFound");
  const names = addedProfiles.map((profile) => profile.name || profile.model || t("untitledProfile"));
  const skippedNames = skippedCandidates.map((candidate) => candidate.name || candidate.model || t("untitledProfile"));
  localModelImportResultNode.hidden = false;
  localModelImportResultNode.classList.toggle("is-error", Boolean(result.isError) && !addedProfiles.length);
  localModelImportResultNode.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    ${addedProfiles.length ? `<p>${escapeHtml(t("importedModelResultHint"))}</p>` : ""}
    ${names.length ? `<ul>${names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : ""}
    ${skippedNames.length ? `<p>${escapeHtml(t("importedModelSkippedExisting", { names: skippedNames.join("、") }))}</p>` : ""}
    ${errors.length ? `<p>${escapeHtml(errors.slice(0, 2).join("；"))}</p>` : ""}
  `;
}

function summarizeLocalModelReadErrors(errors) {
  const list = (Array.isArray(errors) ? errors : [])
    .map((error) => String(error || "").trim())
    .filter(Boolean);
  if (!list.length) return [];
  if (list.some((error) => /native messaging host not found|specified native messaging host not found/i.test(error))) {
    return [t("localModelHelperMissing")];
  }
  if (list.some((error) => /不是可直接读取的绝对路径|~ 路径需要 native helper|not a directly readable absolute path/i.test(error))) {
    return [t("localModelAbsolutePathNeeded")];
  }
  return [t("localModelReadFallback"), ...list.slice(0, 2)];
}

function hasMatchingImportedProfile(candidate) {
  const provider = isWebChatProvider(candidate.provider) ? "custom" : (candidate.provider || inferProvider(candidate.baseUrl));
  const baseUrl = normalizeApiBaseUrl(candidate.baseUrl || (PROVIDER_PRESETS[provider]?.baseUrl || "")).toLowerCase();
  const model = normalizeModelName(candidate.model || PROVIDER_PRESETS[provider]?.model || "");
  return profiles.some((profile) => {
    const profileProvider = isWebChatProvider(profile.provider) ? "custom" : (profile.provider || inferProvider(profile.baseUrl));
    return profileProvider === provider
      && normalizeApiBaseUrl(profile.baseUrl).toLowerCase() === baseUrl
      && normalizeModelName(profile.model) === model;
  });
}

function addImportedModelProfile(candidate, { render = true } = {}) {
  const provider = isWebChatProvider(candidate.provider) ? "custom" : (candidate.provider || inferProvider(candidate.baseUrl));
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
  const profile = createProfile(provider);
  profile.name = candidate.name || providerDisplayName(provider);
  profile.provider = provider;
  profile.baseUrl = candidate.baseUrl || preset.baseUrl || "";
  profile.apiKey = candidate.apiKey || "";
  profile.model = candidate.model || preset.model || "";
  profile.reasoningLevel = defaultReasoningLevel(provider, profile.model);
  normalizeProfileNumbers(profile);
  profiles.push(profile);
  selectedProfileId = profile.id;
  if (render) {
    revealApiKey = false;
    renderProfiles();
    setStatus(t("importedModelNeedsSave"));
  }
  return profile;
}

function hydrateImportedCandidate(candidate, secrets) {
  const provider = candidate.provider || inferProvider(candidate.baseUrl);
  const apiKey = candidate.apiKey
    || (candidate.authKeyName && secrets[candidate.authKeyName])
    || (provider === "openai" && secrets.OPENAI_API_KEY)
    || (candidate.source === "Claude" && (secrets.ANTHROPIC_AUTH_TOKEN || secrets.ANTHROPIC_API_KEY))
    || "";
  return {
    ...candidate,
    provider,
    baseUrl: normalizeApiBaseUrl(candidate.baseUrl),
    apiKey,
    model: String(candidate.model || "").trim()
  };
}

function dedupeImportedModelCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!hasImportedModelSignal(candidate)) return false;
    const key = [
      candidate.source,
      candidate.provider,
      normalizeApiBaseUrl(candidate.baseUrl).toLowerCase(),
      String(candidate.model || "").toLowerCase(),
      String(candidate.apiKey || "").slice(0, 12)
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function suppressHydratedFallbackCandidates(candidates) {
  const richSecrets = new Set(
    candidates
      .filter((candidate) => !candidate.fallbackOnly && candidate.apiKey)
      .map((candidate) => candidate.apiKey)
  );
  return candidates.filter((candidate) => !(candidate.fallbackOnly && candidate.apiKey && richSecrets.has(candidate.apiKey)));
}

function hasImportedModelSignal(candidate) {
  return Boolean(candidate && (candidate.baseUrl || candidate.apiKey || candidate.model || candidate.authKeyName));
}

function collectEnvValuesFromText(text, lowerName = "") {
  if (lowerName.endsWith(".json") || looksLikeJson(text)) {
    try {
      return collectLocalModelEnvValues(JSON.parse(text));
    } catch {
      return {};
    }
  }
  return parseEnvVars(text);
}

function collectLocalModelEnvValues(value, target = {}) {
  if (!value || typeof value !== "object") return target;
  Object.entries(value).forEach(([key, item]) => {
    const normalizedKey = normalizeEnvKey(key);
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      if (isKnownModelEnvKey(normalizedKey)) {
        target[normalizedKey] = String(item);
      }
      return;
    }
    collectLocalModelEnvValues(item, target);
  });
  return target;
}

function parseEnvVars(text) {
  const env = {};
  String(text || "").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) return;
    const key = normalizeEnvKey(match[1]);
    if (!isKnownModelEnvKey(key)) return;
    env[key] = unquoteConfigValue(match[2]);
  });
  return env;
}

function isKnownModelEnvKey(key) {
  return [
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "OPENAI_MODEL",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_MODEL",
    "CLAUDE_API_KEY",
    "CLAUDE_BASE_URL",
    "CLAUDE_MODEL",
    "CODEX_API_KEY",
    "CODEX_BASE_URL",
    "CODEX_MODEL",
    "BASE_URL",
    "MODEL"
  ].includes(key);
}

function normalizeEnvKey(key) {
  return String(key || "").trim().toUpperCase();
}

function parseSimpleToml(text) {
  const root = {};
  const sections = {};
  let current = root;
  String(text || "").split(/\r?\n/).forEach((rawLine) => {
    const line = stripTomlComment(rawLine).trim();
    if (!line) return;
    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      current = sections[section[1].trim()] ||= {};
      return;
    }
    const pair = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/);
    if (!pair) return;
    current[pair[1]] = parseTomlValue(pair[2]);
  });
  return { root, sections };
}

function stripTomlComment(line) {
  let quote = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === "\"" || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? "" : quote || char;
    }
    if (char === "#" && !quote) return line.slice(0, index);
  }
  return line;
}

function parseTomlValue(rawValue) {
  const value = rawValue.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^["']/.test(value)) return unquoteConfigValue(value);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function unquoteConfigValue(value) {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\"/g, "\"").replace(/\\'/g, "'");
  }
  return trimmed;
}

function looksLikeJson(text) {
  return /^[\s\r\n]*[\[{]/.test(String(text || ""));
}

function normalizeApiBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeCodexApiBaseUrl(value) {
  const baseUrl = normalizeApiBaseUrl(value);
  if (!baseUrl) return "";
  if (/\/v1(?:\/|$)/i.test(baseUrl)) return baseUrl;
  if (/\/(?:chat\/completions|responses|messages|models)$/i.test(baseUrl)) return baseUrl;
  return `${baseUrl}/v1`;
}

function buildImportedProfileName(source, label, model) {
  const localPrefix = I18N.resolveLanguage(currentLanguage) === "zh-CN" ? "本地" : "Local";
  const parts = [`${localPrefix} ${source}`, model || label].filter(Boolean);
  return parts.join(" · ");
}

function renderProfiles() {
  if (!profiles.length) {
    selectedProfileId = "";
    profilesNode.innerHTML = `
      ${renderSetupGuide()}
      ${renderEmptyProfiles()}
    `;
    return;
  }
  if (!profiles.some((profile) => profile.id === selectedProfileId)) {
    selectedProfileId = getPreferredProfileId() || profiles[0].id;
  }

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) || profiles[0];
  profilesNode.innerHTML = `
    ${renderSetupGuide()}
    <div class="profile-manager">
      <aside class="profile-list" aria-label="${escapeAttr(t("profileList"))}">
        <div class="profile-list-head">
          <span>${escapeHtml(t("modelProfiles"))}</span>
          <b>${escapeHtml(String(profiles.length))}</b>
        </div>
        ${profiles.map((profile) => renderProfileListItem(profile)).join("")}
      </aside>
      <article class="profile-editor profile-card" data-id="${escapeAttr(selectedProfile.id)}">
        ${renderProfileEditor(selectedProfile)}
      </article>
    </div>
  `;

  profilesNode.querySelectorAll("[data-action]").forEach((node) => {
    node.addEventListener("click", handleProfileAction);
  });
  profilesNode.querySelectorAll(".profile-editor input, .profile-editor select").forEach((node) => {
    node.addEventListener("input", handleProfileInput);
    node.addEventListener("change", handleProfileInput);
  });
  profilesNode.querySelectorAll('.profile-editor [data-field="model"]').forEach((node) => {
    node.addEventListener("focus", handleModelInputFocus);
  });
  profilesNode.querySelectorAll(".profile-editor [data-model-picker]").forEach((node) => {
    node.addEventListener("change", handleModelPickerChange);
  });
  renderModelDatalist();
}

function getPreferredProfileId() {
  const preferred = String(settings?.preferredModelProfileId || "").trim();
  return profiles.some((profile) => profile.id === preferred) ? preferred : "";
}

function renderProfileListItem(profile) {
  const isSelected = profile.id === selectedProfileId;
  const isPreferred = profile.id === settings?.preferredModelProfileId;
  return `
    <button class="profile-list-item ${isSelected ? "is-selected" : ""}" type="button" data-action="select" data-id="${escapeAttr(profile.id)}">
      <span class="profile-list-title">${escapeHtml(profile.name || profile.model || t("untitledProfile"))}</span>
      <span class="profile-list-meta">${escapeHtml(profile.model || t("modelName"))}</span>
      <span class="profile-list-tags">
        <span>${escapeHtml(providerDisplayName(profile.provider))}</span>
        ${isPreferred ? `<span>${escapeHtml(t("preferredModel"))}</span>` : ""}
      </span>
    </button>
  `;
}

function renderEmptyProfiles() {
  return `
    <div class="profile-empty">
      <strong>${escapeHtml(t("noModelProfilesTitle"))}</strong>
      <p>${escapeHtml(t("noModelProfilesBody"))}</p>
    </div>
  `;
}

function renderSetupGuide() {
  const steps = [
    t("setupGuideProvider"),
    t("setupGuideCredentials"),
    t("setupGuideModel"),
    t("setupGuideTestSave")
  ];
  return `
    <section class="setup-guide">
      <strong>${escapeHtml(t("setupGuideTitle"))}</strong>
      <ol>
        ${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
      </ol>
    </section>
  `;
}

function renderProfileChecklist(profile) {
  const isWebChat = isWebChatProvider(profile.provider);
  const hasProvider = Boolean(profile.provider);
  const hasCredentials = isWebChat
    || profile.provider === "ollama"
    || (Boolean(String(profile.baseUrl || "").trim()) && Boolean(String(profile.apiKey || "").trim()));
  const hasModel = Boolean(String(profile.model || "").trim());
  const credentialText = isWebChat
    ? `${t("checkCredentialReady")} · ${t("webchatNoApiKey")}`
    : t("checkCredentialReady");
  const checks = [
    { ok: hasProvider, text: t("checkProviderReady", { provider: providerDisplayName(profile.provider) }) },
    { ok: hasCredentials, text: credentialText },
    { ok: hasModel, text: t("checkModelReady") },
    { ok: hasProvider && hasModel, text: t("checkTestReady") }
  ];
  return `
    <section class="profile-checklist" aria-label="${escapeAttr(t("profileChecklist"))}">
      <strong>${escapeHtml(t("profileChecklist"))}</strong>
      <div>
        ${checks.map((check) => `
          <span class="${check.ok ? "is-ok" : "is-missing"}">
            <b aria-hidden="true">${check.ok ? "OK" : "!"}</b>
            ${escapeHtml(check.text)}
          </span>
        `).join("")}
      </div>
    </section>
  `;
}

function renderProviderNotice(profile) {
  if (isWebChatProvider(profile.provider)) {
    return renderWebChatLoginNotice(profile);
  }
  const noticeKey = profile.provider === "anthropic" ? "providerNoticeAnthropic" : "providerNoticeApi";
  return `
    <section class="provider-notice">
      <strong>${escapeHtml(providerDisplayName(profile.provider))}</strong>
      <p>${escapeHtml(t(noticeKey, { provider: providerDisplayName(profile.provider) }))}</p>
    </section>
  `;
}

function renderWebChatLoginNotice(profile) {
  const provider = profile.provider;
  const label = providerDisplayName(provider);
  return `
    <section class="provider-notice webchat-login-notice">
      <div>
        <strong>${escapeHtml(t("webchatLoginTitle", { provider: label }))}</strong>
        <p>${escapeHtml(t("webchatLoginBody", { provider: label }))}</p>
        <small>${escapeHtml(t("webchatNoApiKey"))}</small>
      </div>
      <button type="button" data-action="open-webchat" data-provider="${escapeAttr(provider)}">${escapeHtml(t("openWebChatPage", { provider: label }))}</button>
    </section>
  `;
}

function renderProfileEditor(profile) {
  const isWebChat = isWebChatProvider(profile.provider);
  return `
    <header class="profile-editor-header">
      <div class="profile-editor-title">
        <span>${escapeHtml(t("editingProfile"))}</span>
        <strong>${escapeHtml(profile.name || profile.model || t("untitledProfile"))}</strong>
      </div>
      <div class="profile-editor-actions">
        <output id="profile-action-status" class="profile-action-status" aria-live="polite"></output>
        <button type="button" data-action="set-preferred">${escapeHtml(t("setPreferredModel"))}</button>
        <button type="button" class="primary-action" data-action="save-profile">${escapeHtml(t("saveThisModel"))}</button>
        <button type="button" data-action="test-profile">${escapeHtml(t("testModel"))}</button>
        <button type="button" data-action="duplicate">${escapeHtml(t("duplicateProfile"))}</button>
        <button type="button" class="danger" data-action="remove">${escapeHtml(t("remove"))}</button>
      </div>
    </header>
    ${renderProfileChecklist(profile)}
    ${renderProviderNotice(profile)}

    <section class="profile-section">
      <h3>${escapeHtml(t("connectionSettings"))}</h3>
      <div class="profile-grid">
        <label>
          <span>${escapeHtml(t("name"))}</span>
          <input data-field="name" value="${escapeAttr(profile.name)}" placeholder="DeepSeek fast">
        </label>
        <label>
          <span>${escapeHtml(t("provider"))}</span>
          <select data-field="provider">
            ${Object.entries(PROVIDER_PRESETS).map(([key, preset]) => `
              <option value="${key}" ${profile.provider === key ? "selected" : ""}>${escapeHtml(providerDisplayName(key))}</option>
            `).join("")}
          </select>
        </label>
        ${isWebChat ? `
          <label>
            <span>WebChat</span>
            <input data-field="baseUrl" value="${escapeAttr(profile.baseUrl)}" readonly>
            <small>${escapeHtml(t("webchatHelp"))}</small>
          </label>
        ` : `
          <label>
            <span>API Base URL</span>
            <input data-field="baseUrl" value="${escapeAttr(profile.baseUrl)}" placeholder="https://api.openai.com/v1">
          </label>
          <label>
            <span>API Key</span>
            <div class="secret-row">
              <input data-field="apiKey" type="${revealApiKey ? "text" : "password"}" autocomplete="off" value="${escapeAttr(profile.apiKey)}" placeholder="sk-...">
              <button type="button" data-action="toggle-secret">${escapeHtml(revealApiKey ? t("hideApiKey") : t("showApiKey"))}</button>
            </div>
          </label>
        `}
        <label>
          <span>${escapeHtml(t("modelName"))}</span>
          <div class="model-row model-combo">
            <input data-field="model" list="model-presets" value="${escapeAttr(profile.model)}" placeholder="gpt-4o-mini" ${isWebChat ? "readonly" : ""}>
            ${isWebChat ? "" : `
              <select data-model-picker aria-label="${escapeAttr(t("modelName"))}">
                ${renderModelPickerOptions(profile)}
              </select>
              <button type="button" data-action="load-models">${escapeHtml(t("loadModels"))}</button>
            `}
          </div>
          <small>${escapeHtml(isWebChat ? t("webchatModelHelp") : t("loadModelsHelp"))}</small>
        </label>
      </div>
    </section>

    ${isWebChat ? "" : `<section class="profile-section">
      <h3>${escapeHtml(t("generationSettings"))}</h3>
      <div class="profile-grid">
        ${renderNumericControl(profile, "temperature", "Temperature")}
        ${renderNumericControl(profile, "maxOutputTokens", t("outputTokens"))}
      </div>
    </section>`}

    <details class="profile-advanced" open>
      <summary>${escapeHtml(t("advanced"))}</summary>
      <div class="profile-grid">
        ${renderNumericControl(profile, "inputTokenCap", t("contextWindowTokens"), t("contextWindowHelp"))}
        ${renderNumericControl(profile, "maxContextChars", t("bodyChars"))}
        ${renderNumericControl(profile, "historyTurns", t("historyTurns"))}
        ${renderNumericControl(profile, "historyMessageChars", t("historyMessageChars"))}
        <label>
          <span>${escapeHtml(t("defaultContext"))}</span>
          <select data-field="defaultContextMode">
            <option value="fast" ${profile.defaultContextMode !== "full" ? "selected" : ""}>${escapeHtml(t("fastContext"))}</option>
            <option value="full" ${profile.defaultContextMode === "full" ? "selected" : ""}>${escapeHtml(t("fullContext"))}</option>
          </select>
        </label>
        ${isWebChat ? "" : `<label>
          <span>${escapeHtml(t("thinkingOutput"))}</span>
          <select data-field="thinkingMode">
            <option value="hide" ${profile.thinkingMode !== "show" && profile.thinkingMode !== "disabled" ? "selected" : ""}>${escapeHtml(t("thinkingHide"))}</option>
            <option value="show" ${profile.thinkingMode === "show" ? "selected" : ""}>${escapeHtml(t("thinkingShow"))}</option>
            <option value="disabled" ${profile.thinkingMode === "disabled" ? "selected" : ""}>${escapeHtml(t("thinkingDisabled"))}</option>
          </select>
          <small>${escapeHtml(t("thinkingOutputHelp"))}</small>
        </label>
        <label>
          <span>${escapeHtml(t("reasoningLevel"))}</span>
          <select data-field="reasoningLevel">
            ${renderReasoningLevelOptions(profile.reasoningLevel)}
          </select>
          <small>${escapeHtml(t("reasoningLevelHelp"))}</small>
        </label>`}
        <label class="checkbox">
          <input data-field="useAr5iv" type="checkbox" ${profile.useAr5iv ? "checked" : ""}>
          <span>${escapeHtml(t("allowAr5iv"))}</span>
        </label>
      </div>
    </details>
  `;
}

function renderNumericControl(profile, field, label, helpText = "") {
  const config = getNumericConfig(field, profile);
  const value = normalizeNumericField(field, profile?.[field], profile);
  profile[field] = value;
  const rangeValue = clampForRange(value, config);
  const note = t("numericRange", {
    min: formatNumericValue(config.min, field),
    max: formatNumericValue(config.max, field)
  });
  return `
    <label class="numeric-control">
      <span>${escapeHtml(label)}</span>
      <div class="numeric-input-row">
        <input
          data-field="${escapeAttr(field)}"
          data-numeric-input="number"
          type="number"
          min="${escapeAttr(config.min)}"
          max="${escapeAttr(config.max)}"
          step="${escapeAttr(config.step)}"
          value="${escapeAttr(formatNumericValue(value, field))}"
          inputmode="${config.integer ? "numeric" : "decimal"}"
        >
        <small class="numeric-range-note" data-numeric-range-note="${escapeAttr(field)}">${escapeHtml(note)}</small>
      </div>
      <input
        class="numeric-slider"
        data-field="${escapeAttr(field)}"
        data-numeric-input="range"
        type="range"
        min="${escapeAttr(config.min)}"
        max="${escapeAttr(config.max)}"
        step="${escapeAttr(config.rangeStep)}"
        value="${escapeAttr(formatNumericValue(rangeValue, field))}"
        aria-label="${escapeAttr(label)}"
      >
      ${helpText ? `<small>${escapeHtml(helpText)}</small>` : ""}
    </label>
  `;
}

function updateNumericProfileField(card, profile, field, target, eventType) {
  const config = getNumericConfig(field, profile);
  const parsed = Number(target.value);
  const isRange = target.dataset.numericInput === "range";

  if (!Number.isFinite(parsed)) {
    if (eventType === "change") {
      const value = normalizeNumericField(field, target.value, profile);
      profile[field] = value;
      writeNumericControlValue(card, field, value);
    }
    return;
  }

  const shouldClampHigh = parsed > config.max;
  const shouldClampLow = parsed < config.min && (isRange || eventType !== "input");
  if (parsed < config.min && !shouldClampLow) {
    return;
  }

  const value = shouldClampHigh || shouldClampLow || isRange || eventType !== "input"
    ? clampNumber(parsed, config)
    : normalizeNumericField(field, parsed, profile);

  profile[field] = value;

  if (isRange || eventType !== "input" || shouldClampHigh || shouldClampLow) {
    writeNumericControlValue(card, field, value);
    return;
  }

  writeNumericControlValue(card, field, value, { updateNumber: false });
}

function syncNumericControls(card, profile) {
  NUMERIC_FIELDS.forEach((field) => {
    const config = getNumericConfig(field, profile);
    const value = normalizeNumericField(field, profile[field], profile);
    profile[field] = value;
    card.querySelectorAll(`[data-field="${field}"]`).forEach((node) => {
      node.min = String(config.min);
      node.max = String(config.max);
      node.step = String(node.dataset.numericInput === "range" ? config.rangeStep : config.step);
    });
    const note = card.querySelector(`[data-numeric-range-note="${field}"]`);
    if (note) {
      note.textContent = t("numericRange", {
        min: formatNumericValue(config.min, field),
        max: formatNumericValue(config.max, field)
      });
    }
    writeNumericControlValue(card, field, value);
  });
}

function writeNumericControlValue(card, field, value, { updateNumber = true, updateRange = true } = {}) {
  const formatted = formatNumericValue(value, field);
  if (updateNumber) {
    const numberInput = card.querySelector(`[data-field="${field}"][data-numeric-input="number"]`);
    if (numberInput && numberInput.value !== formatted) {
      numberInput.value = formatted;
    }
  }
  if (updateRange) {
    const rangeInput = card.querySelector(`[data-field="${field}"][data-numeric-input="range"]`);
    if (rangeInput) {
      const config = getNumericConfig(field, profiles.find((item) => item.id === card.dataset.id));
      const rangeValue = formatNumericValue(clampForRange(value, config), field);
      if (rangeInput.value !== rangeValue) {
        rangeInput.value = rangeValue;
      }
    }
  }
}

function normalizeProfileNumbers(profile) {
  if (!profile) return profile;
  NUMERIC_FIELDS.forEach((field) => {
    profile[field] = normalizeNumericField(field, profile[field], profile);
  });
  return profile;
}

function normalizeNumericField(field, value, profile) {
  return clampNumber(value, getNumericConfig(field, profile));
}

function getNumericConfig(field, profile) {
  const base = NUMERIC_FIELD_CONFIG[field];
  const min = resolveNumericOption(base.min, profile);
  const max = Math.max(min, resolveNumericOption(base.max, profile));
  const fallback = clampNumberLoose(resolveNumericOption(base.fallback, profile), min, max, base.integer);
  return {
    ...base,
    min,
    max,
    fallback,
    step: base.step,
    rangeStep: base.rangeStep || base.step
  };
}

function getTemperatureBounds(profile) {
  const fixed = getFixedTemperatureValueForModel(profile?.model);
  if (fixed !== null) {
    return { min: fixed, max: fixed, fallback: fixed };
  }
  return { min: 0, max: 2, fallback: 0.2 };
}

function getFixedTemperatureValueForModel(model) {
  const name = normalizeModelName(model);
  if (name.startsWith("gpt-5") || /^o\d/.test(name)) return 1;
  return null;
}

function resolveNumericOption(value, profile) {
  return typeof value === "function" ? value(profile || {}) : value;
}

function clampNumber(value, config) {
  return clampNumberLoose(value, config.min, config.max, config.integer, config.fallback);
}

function clampNumberLoose(value, min, max, integer, fallback = min) {
  const parsed = Number(value);
  const base = Number.isFinite(parsed) ? parsed : Number(fallback);
  const bounded = Math.min(max, Math.max(min, Number.isFinite(base) ? base : min));
  return integer ? Math.floor(bounded) : bounded;
}

function clampForRange(value, config) {
  return clampNumber(value, config);
}

function formatNumericValue(value, field) {
  const config = NUMERIC_FIELD_CONFIG[field];
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  if (config?.integer) return String(Math.floor(parsed));
  return String(Number(parsed.toFixed(3)));
}

function handleProfileInput(event) {
  const card = event.target.closest(".profile-editor");
  if (!card) return;
  const profile = profiles.find((item) => item.id === card.dataset.id);
  if (!profile) return;

  const field = event.target.dataset.field;
  if (!field) return;

  if (field === "provider") {
    const nextProvider = event.target.value;
    const preset = PROVIDER_PRESETS[nextProvider] || PROVIDER_PRESETS.custom;
    const oldPresetNames = providerDisplayNames(profile.provider);
    profile.provider = nextProvider;
    profile.baseUrl = preset.baseUrl;
    profile.model = preset.model;
    if (nextProvider === "ollama" || isWebChatProvider(nextProvider)) profile.apiKey = "";
    if (!profile.name || oldPresetNames.includes(profile.name) || Object.keys(PROVIDER_PRESETS).some((provider) => providerDisplayNames(provider).includes(profile.name))) {
      profile.name = providerDisplayName(nextProvider);
    }
    revealApiKey = false;
    renderProfiles();
    autoLoadModelsForProfile(profile, { silent: true });
    return;
  }

  if (NUMERIC_FIELDS.includes(field)) {
    updateNumericProfileField(card, profile, field, event.target, event.type);
  } else if (field === "useAr5iv") {
    profile.useAr5iv = event.target.checked;
  } else {
    profile[field] = event.target.value;
  }

  if (field === "baseUrl") {
    profile.provider = resolveSelectedProvider(profile.provider, profile.baseUrl);
    const providerSelect = card.querySelector('[data-field="provider"]');
    if (providerSelect && providerSelect.value !== profile.provider) {
      providerSelect.value = profile.provider;
    }
  }

  if (field === "model" && event.type !== "input") {
    normalizeProfileNumbers(profile);
    syncNumericControls(card, profile);
  }
}

function handleProfileAction(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id || event.currentTarget.closest(".profile-editor")?.dataset.id;
  if (action === "open-webchat") {
    const profile = profiles.find((item) => item.id === id);
    openWebChatPage(profile?.provider || event.currentTarget.dataset.provider);
    return;
  }
  if (action === "select") {
    readSelectedProfileFromDom();
    selectedProfileId = id;
    revealApiKey = false;
    renderProfiles();
    return;
  }
  const profile = profiles.find((item) => item.id === id);
  if (!profile) return;

  if (action === "test-profile") {
    testProfile(id);
    return;
  }

  if (action === "save-profile") {
    saveModelProfile(id);
    return;
  }

  if (action === "set-preferred") {
    setPreferredModelProfile(id);
    return;
  }

  if (action === "load-models") {
    loadModelsForProfile(id);
    return;
  }

  if (action === "duplicate") {
    readSelectedProfileFromDom();
    const duplicate = {
      ...profile,
      id: createId(),
      name: t("profileCopyName", { name: profile.name || profile.model || t("untitledProfile") })
    };
    profiles.push(duplicate);
    selectedProfileId = duplicate.id;
    revealApiKey = false;
    renderProfiles();
    return;
  }

  if (action === "toggle-secret") {
    readSelectedProfileFromDom();
    revealApiKey = !revealApiKey;
    renderProfiles();
    return;
  }

  if (action === "remove") {
    if (!confirm(t("confirmRemoveProfile", { name: profile.name || profile.model || t("untitledProfile") }))) return;
    const removedName = profile.name || profile.model || t("untitledProfile");
    profiles = profiles.filter((item) => item.id !== id);
    if (selectedProfileId === id) selectedProfileId = profiles[0]?.id || "";
    revealApiKey = false;
    renderProfiles();
    saveModelProfilesAfterMutation(t("modelProfileRemoved", { name: removedName }));
  }
}

function handleModelInputFocus(event) {
  const card = event.target.closest(".profile-editor");
  const profile = profiles.find((item) => item.id === card?.dataset.id);
  if (!profile) return;
  autoLoadModelsForProfile(profile, { silent: true });
}

function handleModelPickerChange(event) {
  const model = event.target.value;
  if (!model) return;
  const card = event.target.closest(".profile-editor");
  const profile = profiles.find((item) => item.id === card?.dataset.id);
  if (!profile) return;
  profile.model = model;
  const input = card.querySelector('[data-field="model"]');
  if (input) input.value = model;
  normalizeProfileNumbers(profile);
  syncNumericControls(card, profile);
  renderModelDatalist();
}

async function testProfile(id) {
  readSelectedProfileFromDom();
  selectedProfileId = id;
  const profile = profiles.find((item) => item.id === id);
  if (!profile) return;
  setStatus(t("testing"));
  setFormBusy(true);
  try {
    const response = await sendMessage({
      type: "testModelProfile",
      profile
    });
    setStatus(t("testSuccess", { text: String(response.text || "OK").slice(0, 100) }));
  } catch (error) {
    setStatus(error.message || String(error), true);
  } finally {
    setFormBusy(false);
  }
}

async function loadModelsForProfile(id, { silent = false, force = true } = {}) {
  readSelectedProfileFromDom();
  selectedProfileId = id;
  const profile = profiles.find((item) => item.id === id);
  if (!profile) return [];
  if (isWebChatProvider(profile.provider)) {
    const models = [profile.model || PROVIDER_PRESETS[profile.provider]?.model].filter(Boolean);
    if (!silent) setStatus(t("modelsLoaded", { count: models.length }));
    return models;
  }
  const cacheKey = buildModelLoadCacheKey(profile);
  if (!force && modelLoadCache.has(cacheKey)) {
    const cached = modelLoadCache.get(cacheKey);
    updateModelPickerForProfile(id);
    return cached;
  }
  if (!profile.baseUrl) {
    if (!silent) setStatus(t("modelLoadMissingBaseUrl"), true);
    return [];
  }
  if (!silent) setStatus(t("loadingModels"));
  if (!silent) setFormBusy(true);
  try {
    const response = await sendMessage({
      type: "listModelsForProfile",
      profile
    });
    const models = Array.isArray(response.models) ? response.models : [];
    modelLoadCache.set(cacheKey, models);
    autoLoadedModelKeys.add(cacheKey);
    if (models.length && (!profile.model || !models.includes(profile.model))) {
      profile.model = models[0];
      renderProfiles();
    } else {
      updateModelPickerForProfile(id);
    }
    if (!silent) focusModelPickerForProfile(id);
    if (!silent) setStatus(response.warning || t("modelsLoaded", { count: models.length }));
    return models;
  } catch (error) {
    if (!silent) {
      setStatus(error.message || String(error), true);
    }
    return [];
  } finally {
    if (!silent) setFormBusy(false);
  }
}

function autoLoadModelsForProfile(profile, { silent = true } = {}) {
  if (isWebChatProvider(profile?.provider)) return;
  const cacheKey = buildModelLoadCacheKey(profile);
  if (!profile.baseUrl || autoLoadedModelKeys.has(cacheKey)) return;
  autoLoadedModelKeys.add(cacheKey);
  loadModelsForProfile(profile.id, { silent, force: false });
}

function buildModelLoadCacheKey(profile) {
  return [
    String(profile.baseUrl || "").replace(/\/+$/, "").toLowerCase(),
    String(profile.provider || ""),
    String(profile.apiKey || "").slice(0, 10)
  ].join("|");
}

function getModelOptionsForProfile(profile) {
  const cacheKey = buildModelLoadCacheKey(profile || {});
  const cachedModels = modelLoadCache.get(cacheKey) || [];
  const providerPreset = PROVIDER_PRESETS[profile?.provider] || PROVIDER_PRESETS.custom;
  return [...new Set([
    profile?.model,
    providerPreset.model,
    ...cachedModels
  ])]
    .map((model) => String(model || "").trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

function renderModelPickerOptions(profile) {
  const models = getModelOptionsForProfile(profile);
  const current = String(profile?.model || "").trim();
  const hasCurrent = current && models.includes(current);
  return [
    `<option value="">${escapeHtml(t("modelName"))}</option>`,
    current && !hasCurrent ? `<option value="${escapeAttr(current)}" selected>${escapeHtml(current)}</option>` : "",
    ...models.map((model) => `
      <option value="${escapeAttr(model)}" ${model === current ? "selected" : ""}>${escapeHtml(model)}</option>
    `)
  ].join("");
}

function updateModelPickerForProfile(id) {
  const card = profilesNode.querySelector(`.profile-editor[data-id="${cssEscape(id)}"]`);
  const profile = profiles.find((item) => item.id === id);
  const picker = card?.querySelector("[data-model-picker]");
  if (!profile || !picker) return;
  picker.innerHTML = renderModelPickerOptions(profile);
  picker.value = getModelOptionsForProfile(profile).includes(profile.model) ? profile.model : "";
}

function focusModelPickerForProfile(id) {
  const picker = profilesNode.querySelector(`.profile-editor[data-id="${cssEscape(id)}"] [data-model-picker]`);
  if (!picker || picker.disabled) return;
  picker.focus();
}

function renderModelDatalist() {
  if (!modelPresetsNode) return;
  const models = getModelOptionsForProfile(profiles.find((profile) => profile.id === selectedProfileId) || {});
  modelPresetsNode.replaceChildren(...models.map((model) => {
    const option = document.createElement("option");
    option.value = model;
    return option;
  }));
}

function setFormBusy(isBusy, options = {}) {
  form.querySelectorAll("button, input, select").forEach((node) => {
    if (options.keepModelLoadButtons && node.dataset.action === "load-models") return;
    node.disabled = Boolean(isBusy);
  });
}

function readSelectedProfileFromDom() {
  const card = profilesNode.querySelector(".profile-editor");
  if (!card) return;
  const profile = profiles.find((item) => item.id === card.dataset.id);
  if (!profile) return;
  const get = (field) => card.querySelector(`[data-field="${field}"]`);
  const baseUrl = get("baseUrl")?.value || "";
  const selectedProvider = get("provider")?.value || profile.provider;
  const provider = resolveSelectedProvider(selectedProvider, baseUrl);
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
  Object.assign(profile, {
    name: get("name")?.value || "",
    provider,
    baseUrl: isWebChatProvider(provider) ? preset.baseUrl : baseUrl,
    apiKey: isWebChatProvider(provider) ? "" : (get("apiKey")?.value || ""),
    model: get("model")?.value || preset.model || "",
    defaultContextMode: get("defaultContextMode")?.value || "fast",
    thinkingMode: normalizeThinkingMode(get("thinkingMode")?.value),
    reasoningLevel: normalizeReasoningLevel(get("reasoningLevel")?.value),
    useAr5iv: Boolean(get("useAr5iv")?.checked)
  });
  NUMERIC_FIELDS.forEach((field) => {
    profile[field] = normalizeNumericField(field, get(field)?.value, profile);
  });
  syncNumericControls(card, profile);
}

function normalizeProfiles(value, fallbackSettings) {
  const list = Array.isArray(value) ? value : [];
  if (list.length) {
    return list.map((profile) => {
      const provider = resolveSelectedProvider(profile.provider || "custom", profile.baseUrl);
      const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
      const model = profile.model || preset.model || "";
      return normalizeProfileNumbers({
        id: profile.id || createId(),
        name: profile.name || profile.model || "Model",
        provider,
        baseUrl: profile.baseUrl || preset.baseUrl || "",
        apiKey: isWebChatProvider(provider) ? "" : (profile.apiKey || ""),
        model,
        temperature: Number(profile.temperature ?? 0.2),
        maxOutputTokens: normalizeProfileMaxOutputTokens(profile.maxOutputTokens, model, provider),
        inputTokenCap: Number(profile.inputTokenCap ?? inferInputTokenCap(model)),
        maxContextChars: Number(profile.maxContextChars ?? 14000),
        historyTurns: Number(profile.historyTurns ?? 4),
        historyMessageChars: Number(profile.historyMessageChars ?? 1800),
        defaultContextMode: profile.defaultContextMode === "full" ? "full" : "fast",
        thinkingMode: normalizeThinkingMode(profile.thinkingMode),
        reasoningLevel: normalizeReasoningLevel(profile.reasoningLevel),
        useAr5iv: profile.useAr5iv !== false
      });
    });
  }
  const hasLegacyConfig = Boolean(fallbackSettings?.baseUrl || fallbackSettings?.apiKey || fallbackSettings?.model);
  if (!hasLegacyConfig) return [];
  const inferredProvider = inferProvider(fallbackSettings.baseUrl);
  const model = fallbackSettings.model || "";
  return [normalizeProfileNumbers({
    id: "profile-migrated",
    name: "Migrated model",
    provider: inferredProvider !== "custom" ? inferredProvider : (fallbackSettings.provider || "custom"),
    baseUrl: fallbackSettings.baseUrl || "",
    apiKey: fallbackSettings.apiKey || "",
    model,
    temperature: Number(fallbackSettings.temperature ?? 0.2),
    maxOutputTokens: normalizeProfileMaxOutputTokens(fallbackSettings.maxOutputTokens, model, inferredProvider),
    inputTokenCap: Number(fallbackSettings.inputTokenCap ?? inferInputTokenCap(model)),
    maxContextChars: Number(fallbackSettings.maxContextChars ?? 14000),
    historyTurns: Number(fallbackSettings.historyTurns ?? 4),
    historyMessageChars: Number(fallbackSettings.historyMessageChars ?? 1800),
    defaultContextMode: fallbackSettings.defaultContextMode === "full" ? "full" : "fast",
    thinkingMode: normalizeThinkingMode(fallbackSettings.thinkingMode),
    reasoningLevel: normalizeReasoningLevel(fallbackSettings.reasoningLevel),
    useAr5iv: fallbackSettings.useAr5iv !== false
  })];
}

function resolveSelectedProvider(selectedProvider, baseUrl) {
  const explicit = normalizeProviderKey(selectedProvider);
  if (isProtocolLockedProvider(explicit)) return explicit;
  const inferred = inferProvider(baseUrl);
  return inferred !== "custom" ? inferred : explicit;
}

function normalizeProviderKey(provider) {
  const value = String(provider || "").trim();
  const match = Object.keys(PROVIDER_PRESETS).find((key) => key.toLowerCase() === value.toLowerCase());
  return match || "custom";
}

function isProtocolLockedProvider(provider) {
  return provider === "anthropic" || isWebChatProvider(provider);
}

function createProfile(provider) {
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
  const isWebChat = isWebChatProvider(provider);
  const model = preset.model || "";
  return normalizeProfileNumbers({
    id: createId(),
    name: providerDisplayName(provider),
    provider,
    baseUrl: preset.baseUrl,
    apiKey: "",
    model,
    temperature: 0.2,
    maxOutputTokens: getModelOutputTokenLimit(model),
    inputTokenCap: isWebChat ? 64000 : provider === "deepseek" || provider === "minimax" ? 128000 : provider === "ollama" ? 16000 : 32000,
    maxContextChars: isWebChat ? 18000 : provider === "ollama" ? 12000 : 14000,
    historyTurns: provider === "ollama" ? 3 : 4,
    historyMessageChars: provider === "ollama" ? 1200 : 1800,
    defaultContextMode: "fast",
    thinkingMode: "hide",
    reasoningLevel: defaultReasoningLevel(provider, preset.model),
    useAr5iv: true
  });
}

function normalizeProfileMaxOutputTokens(value, model, provider) {
  const limit = getModelOutputTokenLimit(model);
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 128 || isOldDefaultMaxOutputTokens(parsed, provider)) {
    return limit;
  }
  return Math.min(parsed, limit);
}

function isOldDefaultMaxOutputTokens(value, provider) {
  const parsed = Math.floor(Number(value));
  if (parsed === 1600) return true;
  if (provider === "ollama" && parsed === 1200) return true;
  if ((provider === "deepseek" || provider === "minimax") && parsed === 1800) return true;
  return false;
}

function renderAddProfileProviderOptions() {
  if (!addProfileProviderSelect) return;
  addProfileProviderSelect.innerHTML = Object.entries(PROVIDER_PRESETS).map(([key, preset]) => `
    <option value="${key}">${escapeHtml(providerDisplayName(key))}</option>
  `).join("");
  addProfileProviderSelect.value = "custom";
}

function providerDisplayName(provider) {
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
  return I18N.resolveLanguage(currentLanguage) === "zh-CN"
    ? preset.labelZh || preset.label
    : preset.labelEn || preset.label;
}

function providerDisplayNames(provider) {
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
  return [...new Set([preset.label, preset.labelZh, preset.labelEn].filter(Boolean))];
}

function renderReasoningLevelOptions(selectedValue) {
  const selected = normalizeReasoningLevel(selectedValue);
  const options = [
    ["default", t("reasoningDefault")],
    ["minimal", t("reasoningMinimal")],
    ["low", t("reasoningLow")],
    ["medium", t("reasoningMedium")],
    ["high", t("reasoningHigh")],
    ["xhigh", t("reasoningXHigh")]
  ];
  return options.map(([value, label]) => `
    <option value="${value}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>
  `).join("");
}

function defaultReasoningLevel(provider, model) {
  const name = String(model || "").toLowerCase();
  if (provider === "deepseek" && (/^deepseek-v4-(flash|pro)/.test(name) || /^deepseek-(reasoner|r1)/.test(name))) {
    return "default";
  }
  return "default";
}

function normalizeThinkingMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "show") return "show";
  if (mode === "disabled" || mode === "disable" || mode === "off") return "disabled";
  return "hide";
}

function normalizeReasoningLevel(value) {
  const level = String(value || "").trim().toLowerCase();
  if (["minimal", "low", "medium", "high", "xhigh"].includes(level)) return level;
  if (level === "max") return "xhigh";
  return "default";
}

function inferInputTokenCap(model) {
  return getModelInputTokenLimit(model);
}

function getModelInputTokenLimit(model) {
  const name = normalizeModelName(model);
  if (/^deepseek-v4-(flash|pro)/.test(name) || /^deepseek-(chat|reasoner)/.test(name)) return 1000000;
  if (/^gpt-4o/.test(name)) return 128000;
  if (/^gpt-5/.test(name)) return 400000;
  if (/^o(1|3)/.test(name)) return 200000;
  if (/^gemini-(1\.5|2\.5|3)/.test(name)) return 1000000;
  if (/^claude/.test(name)) return 200000;
  if (/^qwen-long/.test(name)) return 1000000;
  if (/^qwen/.test(name)) return 128000;
  if (/llama|mistral|mixtral|ollama/.test(name)) return 16000;
  return 32000;
}

function getModelOutputTokenLimit(model) {
  const name = normalizeModelName(model);
  if (/^deepseek-v4-(flash|pro)/.test(name) || /^deepseek-(chat|reasoner)/.test(name)) return 64000;
  if (/^claude/.test(name)) return 64000;
  if (/^gpt-5/.test(name)) return 32768;
  if (/^gpt-4o/.test(name)) return 16384;
  return 8192;
}

function normalizeModelName(model) {
  return String(model || "").replace(/\s+/g, " ").trim().toLowerCase().split("/").pop() || "";
}

function normalizeLanguage(value) {
  return I18N.normalizeLanguage(value);
}

function normalizeAppearance(value) {
  if (value === "system" || value === "跟随系统") return "system";
  if (value === "light" || value === "浅色") return "light";
  if (value === "dark" || value === "深色") return "dark";
  if (value === "sepia" || value === "护眼") return "sepia";
  return "system";
}

function applyAppearance(value) {
  document.body.dataset.appearance = resolveAppearance(value);
}

function resolveAppearance(value) {
  const normalized = normalizeAppearance(value);
  if (normalized !== "system") return normalized;
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function applyLanguage(value) {
  currentLanguage = normalizeLanguage(value);
  const resolved = I18N.resolveLanguage(currentLanguage);
  document.documentElement.lang = resolved;
  document.title = t("optionsTitle");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelector(".hero h1").textContent = t("modelConfig");
  document.querySelector(".section-head h2").textContent = t("modelProfiles");
  addProfileButton.textContent = t("addProfile");
  renderAddProfileProviderOptions();
  checkUpdateButton.textContent = t("checkUpdate");
}

function renderGlobalUpdateBanner(result) {
  if (result) {
    window.PaperDockUpdateBanner?.renderResult({
      container: globalUpdateBannerNode,
      result,
      language: currentLanguage
    });
    return;
  }
  window.PaperDockUpdateBanner?.checkAndRender({
    container: globalUpdateBannerNode,
    language: currentLanguage
  });
}

function t(key, vars = {}) {
  return I18N.t(currentLanguage, key, vars);
}

function syncProjectVersion() {
  if (!projectVersionNode) return;
  projectVersionNode.textContent = chrome.runtime.getManifest().version;
}

async function checkForUpdate(force) {
  updateBox.classList.remove("is-update", "is-error");
  updateStatusNode.textContent = t("checkingUpdate");
  updateCheckedAtNode.textContent = "";
  renderUpdateActions(null);
  checkUpdateButton.disabled = true;
  try {
    const result = await sendMessage({ type: "checkForUpdate", force });
    renderUpdateStatus(result);
  } catch (error) {
    renderUpdateStatus({ error: error.message || String(error) });
  } finally {
    checkUpdateButton.disabled = false;
  }
}

async function exportBackup() {
  setBackupStatus(t("exportingBackup"));
  exportBackupButton.disabled = true;
  try {
    const backup = await sendMessage({ type: "exportLocalData" });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paperdock-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupStatus(t("backupExported"));
  } catch (error) {
    setBackupStatus(error.message || String(error), true);
  } finally {
    exportBackupButton.disabled = false;
  }
}

async function importBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!confirm(t("confirmImportBackup"))) return;
  setBackupStatus(t("importingBackup"));
  setFormBusy(true);
  try {
    const text = await file.text();
    const result = await sendMessage({
      type: "importLocalData",
      backup: text
    });
    settings = result.settings;
    profiles = normalizeProfiles(result.modelProfiles, settings);
    selectedProfileId = getPreferredProfileId() || profiles[0]?.id || "";
    form.language.value = normalizeLanguage(settings.language);
    currentLanguage = form.language.value;
    form.appearance.value = normalizeAppearance(settings.appearance);
    applyAppearance(form.appearance.value);
    applyLanguage(currentLanguage);
    renderProfiles();
    setBackupStatus(t("backupImported", {
      models: profiles.length,
      conversations: result.conversations || 0,
      notes: result.notes || 0
    }));
  } catch (error) {
    setBackupStatus(error.message || String(error), true);
  } finally {
    setFormBusy(false);
  }
}

function setBackupStatus(text, isError = false) {
  if (!backupStatusNode) return;
  backupStatusNode.textContent = text || "";
  backupStatusNode.classList.toggle("is-error", Boolean(isError));
}

function renderUpdateStatus(result) {
  updateBox.classList.toggle("is-update", Boolean(result?.updateAvailable));
  updateBox.classList.toggle("is-error", Boolean(result?.error));
  if (result?.error) {
    updateStatusNode.textContent = t("updateCheckFailed", { error: result.error });
  } else if (result?.updateAvailable) {
    updateStatusNode.textContent = t("updateAvailable", {
      local: result.localVersion,
      latest: result.latestVersion
    });
  } else {
    updateStatusNode.textContent = t("upToDate", { version: result?.localVersion || chrome.runtime.getManifest().version });
  }
  const checkedAt = formatUpdateTime(result?.checkedAt);
  updateCheckedAtNode.textContent = [
    checkedAt ? t("updateCheckedAt", { time: checkedAt }) : "",
    result?.updateAvailable ? t("updateMethodsHint") : ""
  ].filter(Boolean).join(" ");
  renderGlobalUpdateBanner(result);
  renderUpdateActions(result);
}

function renderUpdateActions(result) {
  const show = Boolean(result?.updateAvailable && result.latestTag && result.latestZipUrl);
  updateActionsNode.hidden = !show;
  updateStepsNode.hidden = !show;
  if (!show) {
    downloadUpdateLink.removeAttribute("href");
    openReleaseLink.removeAttribute("href");
    updateStepsNode.innerHTML = "";
    return;
  }

  downloadUpdateLink.href = result.latestZipUrl;
  openReleaseLink.href = result.releaseUrl || result.sourceUrl || "https://github.com/jiahaozhang6/PaperDock/releases";
  updateStepsNode.innerHTML = `
    <strong>${escapeHtml(t("gitUpgradeTitle"))}</strong>
    <ol>
      <li>${escapeHtml(t("gitUpgradeStep1"))}</li>
      <li>${escapeHtml(t("gitUpgradeStep2"))}</li>
      <li>${escapeHtml(t("gitUpgradeStep3"))}</li>
    </ol>
    <pre><code>cd PaperDock
git pull</code></pre>
    <strong>${escapeHtml(t("zipUpgradeTitle"))}</strong>
    <ol>
      <li>${escapeHtml(t("zipUpgradeStep1", { version: result.latestVersion, release: result.latestTag }))}</li>
      <li>${escapeHtml(t("zipUpgradeStep2"))}</li>
      <li>${escapeHtml(t("zipUpgradeStep3"))}</li>
      <li>${escapeHtml(t("zipUpgradeStep4"))}</li>
    </ol>
  `;
}

function formatUpdateTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(I18N.resolveLanguage(currentLanguage), {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function inferProvider(baseUrl) {
  const normalized = String(baseUrl || "").replace(/\/+$/, "").toLowerCase();
  for (const [provider, preset] of Object.entries(PROVIDER_PRESETS)) {
    if (preset.baseUrl && normalized === preset.baseUrl.toLowerCase()) {
      return provider;
    }
  }
  const host = extractProviderHost(normalized);
  if (host.includes("anthropic") || /\/anthropic(?:\/|$)/.test(normalized)) return "anthropic";
  if (host.includes("minimax") || host.includes("minimaxi")) return "minimax";
  if (host.includes("deepseek")) return "deepseek";
  if (host.includes("openai")) return "openai";
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "ollama";
  return "custom";
}

function isWebChatProvider(provider) {
  return provider === "webchatChatGPT" || provider === "webchatDeepSeek";
}

function openWebChatPage(provider) {
  const url = provider === "webchatDeepSeek" ? "https://chat.deepseek.com/" : "https://chatgpt.com/";
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    chrome.tabs.create({ url });
    return;
  }
  window.open(url, "_blank", "noopener");
}

function extractProviderHost(baseUrl) {
  if (!baseUrl) return "";
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return String(baseUrl).replace(/^[a-z]+:\/\//i, "").split("/")[0].trim().toLowerCase();
  }
}

function createId() {
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function setStatus(text, isError = false) {
  const inlineStatusNode = document.querySelector("#profile-action-status");
  const target = inlineStatusNode || statusNode;
  if (!target) return;
  target.textContent = text;
  target.classList.toggle("is-error", Boolean(isError));
  if (inlineStatusNode && statusNode) {
    statusNode.textContent = "";
    statusNode.classList.remove("is-error");
  }
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutMs = MESSAGE_TIMEOUTS[payload?.type] || MESSAGE_TIMEOUTS.default;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("插件后台响应超时。请重新加载扩展后再试。"));
    }, timeoutMs);
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || "插件后台没有返回有效结果。"));
          return;
        }
        resolve(response.data);
      });
    } catch (error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    }
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(String(value || ""));
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
