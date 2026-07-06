const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const backgroundJs = fs.readFileSync(path.join(root, "background.js"), "utf8");

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

const buildPaperContextPlan = vm.runInContext("buildPaperContextPlan", context);
const buildPrompt = vm.runInContext("buildPrompt", context);
const buildEnrichedPaperRetrievalQuery = vm.runInContext("buildEnrichedPaperRetrievalQuery", context);
const applyInputBudget = vm.runInContext("applyInputBudget", context);
const buildPaperContextPlanSystemMessages = vm.runInContext("buildPaperContextPlanSystemMessages", context);

const paper = {
  id: "2503.20314",
  sourceType: "arxiv",
  title: "Graph Diffusion Retrieval for Scientific Reading",
  authors: "Ada Zhang, Bruno Li",
  submittedAt: "2026-03-28",
  paperUpdatedAt: "2026-04-02",
  subjects: "cs.CL; cs.IR",
  comments: "12 pages",
  pdfUrl: "https://arxiv.org/pdf/2503.20314",
  abstract: "We study retrieval-augmented scientific reading with graph diffusion and contrastive evidence alignment."
};

const fullText = [
  "Abstract",
  "We study retrieval-augmented scientific reading with graph diffusion and contrastive evidence alignment.",
  "",
  "1 Introduction",
  "Daily paper reading is slowed down when models repeatedly receive the entire article without focused evidence.",
  "",
  "2 Method",
  "The proposed method builds a graph over paper sections, runs a gated contrastive retrieval module, and aligns retrieved snippets with the user's evolving question.",
  "The method keeps the abstract as an anchor and then selects focused evidence chunks for follow-up turns.",
  "",
  "3 Experiments",
  "Ablation results show that contrastive retrieval improves factual grounding and reduces repeated full-context prompts.",
  "",
  "References",
  "[1] A reference entry that should not be used as empirical evidence."
].join("\n");

const history = [
  {
    role: "user",
    text: "这篇论文的方法主线是什么？"
  },
  {
    role: "assistant",
    text: "它用 graph diffusion 组织论文段落，并用 contrastive retrieval 找证据。"
  }
];

const firstPlan = buildPaperContextPlan({
  paper,
  mode: "ask",
  question: "这篇论文解决什么问题？",
  fullText,
  contextSource: "PDF 文本抽取",
  conversationMessages: []
});

assert.equal(firstPlan.strategy, "paper-first-full");
assert.match(firstPlan.contextText, /Full Paper Contexts:/);
assert.match(firstPlan.contextText, /Paper Text:/);
assert.match(firstPlan.contextText, /gated contrastive retrieval module/);
assert.doesNotMatch(firstPlan.contextText, /Retrieved Evidence:/);

const followupPlan = buildPaperContextPlan({
  paper,
  mode: "ask",
  question: "它为什么要保留 abstract anchor？",
  fullText,
  contextSource: "PDF 文本抽取",
  conversationMessages: history
});

assert.equal(followupPlan.strategy, "paper-followup-retrieval");
assert.match(followupPlan.contextText, /Retrieved Evidence:/);
assert.match(followupPlan.contextText, /focused grounding subset|primary evidence pack/);
assert.match(followupPlan.contextText, /The full paper remains available in paper chat\./);
assert.match(followupPlan.contextText, /Do not use snippets from references as empirical evidence\./);
assert.match(followupPlan.contextText, /If support is weak or indirect, say so instead of overstating the claim\./);
assert.match(followupPlan.contextText, /Section: Abstract/);
assert.match(followupPlan.contextText, /abstract as an anchor|contrastive retrieval/);
assert.doesNotMatch(followupPlan.contextText, /Full Paper Contexts:/);
assert.ok(followupPlan.selectedChunkCount <= 5, "follow-up retrieval should stay within Zotero-style compact evidence bounds");
assert.equal(
  (followupPlan.contextText.match(/Section: Abstract/g) || []).length,
  1,
  "follow-up retrieval should include exactly one abstract anchor"
);
assert.ok(
  followupPlan.systemMessages.some((message) => /full text/i.test(message) && /focused grounding subset/i.test(message)),
  "follow-up retrieval should remind the model that snippets are a focused subset, not the whole access boundary"
);

const enrichedQuery = buildEnrichedPaperRetrievalQuery("它为什么要保留 abstract anchor？", [
  { role: "user", text: "USER_HISTORY_TOKEN should not be copied into retrieval query." },
  { role: "assistant", text: "LAST_ASSISTANT_TOKEN: graph diffusion 和 contrastive retrieval 是上一轮答案核心。" }
]);
assert.match(enrichedQuery, /Prior answer context: .*LAST_ASSISTANT_TOKEN/);
assert.doesNotMatch(enrichedQuery, /USER_HISTORY_TOKEN|User history excerpt|Assistant history excerpt/);

const cachePlan = buildPaperContextPlan({
  paper,
  mode: "ask",
  question: "结果部分说明了什么？",
  fullText: `${fullText}\n\n${"cache stable full context ".repeat(700)}`,
  contextSource: "PDF 文本抽取",
  conversationMessages: history,
  settings: {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.4",
    inputTokenCap: 128000,
    maxOutputTokens: 8192
  }
});
assert.equal(cachePlan.strategy, "paper-cache-full");
assert.equal(cachePlan.mode, "full");
assert.match(cachePlan.contextText, /Full Paper Contexts:/);
assert.doesNotMatch(cachePlan.contextText, /Retrieved Evidence:/);

const capped = applyInputBudget(
  buildPrompt({
    paper,
    mode: "ask",
    question: "请总结。",
    paperContextText: `Full Paper Contexts:\n\nPaper 1\n\nPaper Text:\n${"very long paper text ".repeat(1600)}`,
    contextSource: "PDF 文本抽取",
    language: "zh-CN",
    conversationMessages: history,
    systemMessages: []
  }),
  {
    model: "gpt-4o-mini",
    inputTokenCap: 1600,
    maxOutputTokens: 256
  }
);
assert.equal(capped.effects.documentContextTrimmed, true);
const truncationMessages = buildPaperContextPlanSystemMessages("paper-first-full", "", capped.effects);
assert.ok(
  truncationMessages.some((message) => /truncated|model input limit/i.test(message)),
  "full-context requests should disclose when the document context was trimmed by the input budget"
);

const messages = buildPrompt({
  paper,
  mode: "ask",
  question: "它为什么要保留 abstract anchor？",
  paperContextText: followupPlan.contextText,
  contextSource: followupPlan.contextSource,
  language: "zh-CN",
  conversationMessages: history,
  systemMessages: followupPlan.systemMessages
});

const documentContextMessage = messages.find((message) =>
  message.role === "system" &&
  typeof message.content === "string" &&
  message.content.startsWith("Document Context:\n")
);
assert.ok(documentContextMessage, "paper evidence should be sent as a system Document Context message");
assert.match(documentContextMessage.content, /Retrieved Evidence:/);
assert.ok(
  messages.some((message) => message.role === "system" && /focused grounding subset/i.test(message.content)),
  "follow-up system guidance should remain separate from chat history"
);
assert.ok(
  messages.some((message) => message.role === "assistant" && /graph diffusion/.test(message.content)),
  "assistant history should be preserved as an assistant message"
);
assert.ok(
  messages.some((message) => message.role === "user" && /方法主线/.test(message.content)),
  "user history should be preserved as a user message"
);
assert.doesNotMatch(
  messages[messages.length - 1].content,
  /graph diffusion|contrastive retrieval 找证据/,
  "final user request should not inline previous conversation history"
);

console.log("paper context plan contract ok");
