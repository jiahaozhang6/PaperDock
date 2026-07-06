const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");

assert.match(
  content,
  /const fallbackToNonStreamingRequest = \(/,
  "stream disconnects without generated text should use a non-streaming fallback request"
);
assert.match(
  content,
  /if \(!latestText\) \{[\s\S]*?fallbackToNonStreamingRequest\(payload,\s*resolve,\s*reject\);[\s\S]*?return;[\s\S]*?\}/,
  "empty stream disconnect should not immediately show the retry-only error"
);
assert.match(
  content,
  /reject\(Object\.assign\(new Error\(getRuntimeLastErrorMessage\(\) \|\| "流式连接已断开，已保留已生成内容。"\),[\s\S]*?partialText: latestText/,
  "disconnects after partial output should still preserve generated text"
);
assert.doesNotMatch(
  content,
  /new Error\(getRuntimeLastErrorMessage\(\) \|\| "流式连接已断开，请重试。"\)/,
  "the old retry-only disconnect message should not remain"
);

console.log("stream disconnect fallback contract ok");
