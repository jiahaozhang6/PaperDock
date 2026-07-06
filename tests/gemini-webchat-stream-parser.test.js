const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "webchat-injected.js"), "utf8");

const messages = [];
const context = {
  console,
  setTimeout,
  clearTimeout,
  TextDecoder,
  URLSearchParams,
  FormData: class FormData {},
  Request: class Request {},
  Response: class Response {},
  window: {
    __PAPERDOCK_TEST__: true,
    fetch: async () => ({ body: null }),
    postMessage(message) {
      messages.push(message);
    },
    addEventListener() {},
    removeEventListener() {},
    location: {
      hostname: "gemini.google.com",
      href: "https://gemini.google.com/app/test",
      pathname: "/app/test",
      origin: "https://gemini.google.com"
    }
  },
  document: {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { remove() {}, set src(_) {}, onload: null, onerror: null }; },
    documentElement: { appendChild() {} },
    body: { appendChild() {} }
  },
  chrome: {
    runtime: {
      onMessage: { addListener() {} },
      onConnect: { addListener() {} }
    }
  }
};
context.window.window = context.window;
context.window.document = context.document;
context.window.chrome = context.chrome;
context.globalThis = context.window;

vm.createContext(context);
vm.runInContext(source, context, { filename: "webchat-injected.js" });

const parser = context.window.__paperDockGeminiStreamParserForTest;
assert.equal(typeof parser?.parseGeminiStreamText, "function", "Gemini stream parser should be exposed in test mode");

const promptLeak = [
  "You are being used through PaperDock WebChat mode.",
  "Current WebChat profile: Gemini 网页版",
  "[SYSTEM]",
  "Document Context:",
  "Full Paper Contexts:"
].join("\n");

const answer = [
  "## 核心问题",
  "这篇论文研究 LLM agent planning 中 world model 如何自我演化。",
  "",
  "- 方法：用环境反馈更新世界模型。",
  "- 局限：评估仍依赖模拟任务。"
].join("\n");

const nestedPayload = JSON.stringify([
  ["wrb.fr", "BardFrontendService/StreamGenerate", JSON.stringify([
    null,
    null,
    JSON.stringify([
      [promptLeak],
      [answer]
    ])
  ])]
]);
const rpcText = `)]}'\n${nestedPayload}\n`;

const state = { text: "", thinking: "" };
const parsed = parser.parseGeminiStreamText(rpcText, state);

assert.ok(parsed, "Gemini batched RPC payload should produce a parsed snapshot");
assert.match(parsed.text, /核心问题/, "Gemini parser should extract the answer body from nested RPC JSON");
assert.match(parsed.text, /world model/, "Gemini parser should preserve substantive answer text");
assert.doesNotMatch(parsed.text, /PaperDock WebChat mode|Document Context|Current WebChat profile/, "Gemini parser must not surface PaperDock's submitted prompt");
assert.equal(state.text, parsed.text, "Gemini parser should update the rolling stream state");

const paperContext = [
  "Self-Evolving World Models for LLM Agent Planning",
  "3 Methodology 3.1 Problem Formulation We focus on learning next-state predictors for web navigation and robotic planning.",
  "Let s_t denote the current state, a_t the selected action, and o_t the observation returned by the environment.",
  "The agent iteratively improves a world model through trajectories collected from prior attempts and uses the model to guide planning.",
  "Experiments compare the self-evolving predictor against static baselines across long-horizon tasks.",
  "This paragraph is intentionally much longer than the final answer candidate so that length-only scoring would incorrectly select it.",
  "The paper discusses data collection, training objectives, evaluation protocols, ablation studies, and failure cases in detail."
].join(" ").repeat(20);
const conciseGeminiAnswer = [
  "上下文局限性说明：以下总结基于当前文档内容。",
  "",
  "## 一句话概括",
  "这篇论文提出让 LLM agent 的世界模型在交互反馈中持续自我演化。",
  "",
  "## 研究问题",
  "现有规划方法缺少可随经验更新的环境预测能力。",
  "",
  "## 方法",
  "利用历史轨迹训练 next-state predictor，并把预测结果用于后续规划。"
].join("\n");
const mixedPayload = JSON.stringify([
  ["wrb.fr", "BardFrontendService/StreamGenerate", JSON.stringify([
    null,
    null,
    JSON.stringify([
      [paperContext],
      [conciseGeminiAnswer]
    ])
  ])]
]);
const mixedState = { text: "", thinking: "" };
const mixedParsed = parser.parseGeminiStreamText(`)]}'\n${mixedPayload}\n`, mixedState);

assert.ok(mixedParsed, "Gemini parser should extract an answer from mixed context/answer payloads");
assert.match(mixedParsed.text, /一句话概括|研究问题|方法/, "Gemini parser should prefer the generated Chinese answer");
assert.doesNotMatch(mixedParsed.text, /3 Methodology|Problem Formulation|next-state predictors/, "Gemini parser must not return the submitted paper context");
assert.equal(mixedState.text, mixedParsed.text, "Gemini parser should keep the generated answer in rolling state");

const englishAnswer = [
  "## One-sentence summary",
  "This paper proposes WorldEvolver, a deployment-time memory mechanism that improves a frozen world model for LLM agent planning.",
  "",
  "## Research problem",
  "The main problem is that static world models become unreliable when the environment shifts during long-horizon tasks.",
  "",
  "## Methodology",
  "The method uses episodic memory, semantic memory, and selective foresight to update non-parametric context without changing model weights.",
  "",
  "## Limitations",
  "The evidence is still bounded by the provided paper context and benchmark setup."
].join("\n");
const englishPayload = JSON.stringify([
  ["wrb.fr", "BardFrontendService/StreamGenerate", JSON.stringify([
    null,
    null,
    JSON.stringify([[englishAnswer]])
  ])]
]);
const englishState = { text: "", thinking: "" };
const englishParsed = parser.parseGeminiStreamText(`)]}'\n${englishPayload}\n`, englishState);

assert.ok(englishParsed, "Gemini parser should keep English structured answers");
assert.match(englishParsed.text, /One-sentence summary|Research problem|Methodology/, "English Gemini answers should not be mistaken for raw paper context");
assert.equal(englishState.text, englishParsed.text, "English answer should update the rolling stream state");

const compactAnswer = [
  "1. 一句话概括本文提出了 WorldEvolver，用于提升 LLM 智能体规划。",
  "2. 研究问题：它到底想解决什么？文章试图解决世界模型预见不可靠的问题。",
  "3. 方法：核心方法/模型/算法是什么？作者使用情景记忆、语义记忆和选择性预见。",
  "4. 结果：最重要的实验发现是什么？模型在多个基准上提升成功率。"
].join("");
const compactPayload = JSON.stringify([
  ["wrb.fr", "BardFrontendService/StreamGenerate", JSON.stringify([
    null,
    null,
    JSON.stringify([[compactAnswer]])
  ])]
]);
const compactState = { text: "", thinking: "" };
const compactParsed = parser.parseGeminiStreamText(`)]}'\n${compactPayload}\n`, compactState);

assert.ok(compactParsed, "Gemini parser should parse compact numbered answers");
assert.match(compactParsed.text, /^## 1\. 一句话概括\n\n本文提出了/m, "compact Gemini numbered headings should be expanded into Markdown sections");
assert.match(compactParsed.text, /\n\n## 2\. 研究问题：它到底想解决什么？\n\n文章试图解决/m, "compact Gemini second heading should start on its own Markdown section");
assert.match(compactParsed.text, /\n\n## 3\. 方法：核心方法\/模型\/算法是什么？\n\n作者使用/m, "compact Gemini method heading should start on its own Markdown section");
assert.doesNotMatch(compactParsed.text, /WorldEvolver[^\n]*2\. 研究问题/, "compact Gemini headings should not remain glued to previous paragraphs");

const prefacedCompactAnswer = [
  "基于你提供的 PDF 前 4 页内容（ICML 2026 立场论文 / Position Paper），我为你整理了结构化的核心导读：",
  "1. 一句话概括这篇发表于 ICML 2026 的立场论文通过文献全景分析指出，当前 AI/ML 社区的 Deepfake 防御研究几乎全部聚焦于信息真伪。",
  "2. 研究问题：它到底想解决什么？核心痛点：技术防御与真实滥用的结构性错位。",
  "3. 方法：核心方法与分析框架是什么？本文是一篇立场/揭示性论文，而非提出某具体的深度学习模型。",
  "4. 结果：最重要的实验发现是什么？现有安全研究对人格伤害覆盖不足。"
].join("");
const prefacedPayload = JSON.stringify([
  ["wrb.fr", "BardFrontendService/StreamGenerate", JSON.stringify([
    null,
    null,
    JSON.stringify([[prefacedCompactAnswer]])
  ])]
]);
const prefacedState = { text: "", thinking: "" };
const prefacedParsed = parser.parseGeminiStreamText(`)]}'\n${prefacedPayload}\n`, prefacedState);

assert.ok(prefacedParsed, "Gemini parser should parse prefaced compact numbered answers");
assert.match(prefacedParsed.text, /^基于你提供的 PDF 前 4 页内容[\s\S]*?核心导读：\n\n## 1\. 一句话概括\n\n这篇发表于/m, "prefaced compact Gemini answers should keep the intro and split the first numbered section");
assert.match(prefacedParsed.text, /\n\n## 2\. 研究问题：它到底想解决什么？\n\n- 核心痛点/m, "prefaced compact Gemini second heading should be split into its own section");
assert.match(prefacedParsed.text, /\n\n## 4\. 结果：最重要的实验发现是什么？\n\n现有安全研究/m, "prefaced compact Gemini result heading should be split into its own section");
assert.doesNotMatch(prefacedParsed.text, /核心导读：[^\n]*1\. 一句话概括/, "first heading should not stay glued to the intro");

const denseLimitationsAnswer = [
  "6. 局限哪些结论需要谨慎看？文献上下文局限（当前 PDF 截断影响）：提供文本仅到第 3.1 节。",
  "缺乏量化实证评测：本文是概念性和伦理性的警示，没有提出具体的量化测试框架。",
  "仍需判断该论文是否值得深读？值得。7. 今日学习建议：建议我重点读哪 2-3 个部分？",
  "重点一：Section 2 的论证。重点二：Table 1 及其配套说明。重点三：Section 4 的缓解策略。",
  "8. 3 个追问问题，帮助我判断这篇论文是否值得深读：你会如何验证这些风险？"
].join("");
const densePayload = JSON.stringify([
  ["wrb.fr", "BardFrontendService/StreamGenerate", JSON.stringify([
    null,
    null,
    JSON.stringify([[denseLimitationsAnswer]])
  ])]
]);
const denseState = { text: "", thinking: "" };
const denseParsed = parser.parseGeminiStreamText(`)]}'\n${densePayload}\n`, denseState);

assert.ok(denseParsed, "Gemini parser should parse dense limitation sections");
assert.match(denseParsed.text, /^## 6\. 局限：哪些结论需要谨慎看？\n\n- 文献上下文局限（当前 PDF 截断影响）：/m, "dense limitation heading should keep its question in the heading");
assert.match(denseParsed.text, /\n\n- 缺乏量化实证评测：/m, "dense limitation subtopics should become separate bullets");
assert.match(denseParsed.text, /\n\n## 7\. 今日学习建议：建议我重点读哪 2-3 个部分？\n\n- 重点一：Section 2 的论证。/m, "dense learning advice should keep its question in the heading");
assert.match(denseParsed.text, /\n\n- 重点一：Section 2 的论证。/m, "dense focus points should become bullets");
assert.match(denseParsed.text, /\n\n## 8\. 3 个追问问题，帮助我判断这篇论文是否值得深读\n\n1\. 你会如何验证这些风险？/m, "dense follow-up questions should become an ordered list");
assert.doesNotMatch(denseParsed.text, /PDF 截断影响）：[^\n]*缺乏量化实证评测/, "dense limitation subtopics should not stay glued on one line");

const multiQuestionAnswer = "8. 3 个追问问题，帮助我判断这篇论文是否值得深读：研究方向关联：您当前的研究是否涉及数据过滤、RLHF、DPO 或推理安全护栏？研究视角匹配：您是否在寻找一个将 AI 伦理审查与底层大模型训练技术结合的理论框架？成果类型期望：这是一篇没有复杂数学公式和 SOTA 实验打分表的立场论文。";
const multiQuestionPayload = JSON.stringify([
  ["wrb.fr", "BardFrontendService/StreamGenerate", JSON.stringify([
    null,
    null,
    JSON.stringify([[multiQuestionAnswer]])
  ])]
]);
const multiQuestionParsed = parser.parseGeminiStreamText(`)]}'\n${multiQuestionPayload}\n`, { text: "", thinking: "" });
assert.ok(multiQuestionParsed, "Gemini parser should parse multi-question sections");
assert.match(multiQuestionParsed.text, /^## 8\. 3 个追问问题，帮助我判断这篇论文是否值得深读\n\n1\. 研究方向关联：/m, "first follow-up category should be numbered");
assert.match(multiQuestionParsed.text, /\n\n2\. 研究视角匹配：/m, "second follow-up category should be numbered");
assert.match(multiQuestionParsed.text, /\n\n3\. 成果类型期望：/m, "third follow-up category should be numbered");

console.log("gemini webchat stream parser ok");
