const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const oldTokens = [
  "ar" + "XivMate",
  "Arxiv" + "Mate",
  "arxiv" + "mate",
  "arxiv" + "-llm",
  "open" + "Arxiv" + "Mate" + "Panel",
  "alc" + "-",
  "am" + "-thinking"
];

const ignoredDirs = new Set([".git", "dist", ".local-keys", ".superpowers"]);
const textFilePattern = /\.(cmd|css|html|js|json|md|ps1|txt|yml|yaml)$/i;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const failures = [];
for (const file of walk(root)) {
  const relative = path.relative(root, file).replace(/\\/g, "/");
  for (const token of oldTokens) {
    if (relative.includes(token)) failures.push(`${relative}: path contains ${token}`);
  }
  if (!textFilePattern.test(relative)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const token of oldTokens) {
    if (text.includes(token)) failures.push(`${relative}: content contains ${token}`);
  }
}

assert.deepEqual(failures, [], `Old brand remnants found:\n${failures.join("\n")}`);

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.name, "PaperDock", "extension display name should be PaperDock");
assert.equal(manifest.action.default_title, "PaperDock", "browser action title should be PaperDock");

console.log("paperdock brand contract ok");
