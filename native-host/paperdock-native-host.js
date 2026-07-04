#!/usr/bin/env node

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const DEFAULT_LOCAL_MODEL_CONFIG_PATHS = [
  "~/.codex/config.toml",
  "~/.codex/auth.json",
  "~/.claude/settings.json"
];
const MAX_LOCAL_CONFIG_BYTES = 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".toml", ".json", ".env", ".txt"]);

async function main() {
  if (process.argv.includes("--self-test")) {
    const result = await readLocalModelConfigPaths(DEFAULT_LOCAL_MODEL_CONFIG_PATHS);
    console.log(JSON.stringify({ ok: true, count: result.documents.length, errors: result.errors }, null, 2));
    return;
  }

  const message = await readNativeMessage();
  if (!message || message.type !== "readLocalModelConfigPaths") {
    writeNativeMessage({ ok: false, error: "Unsupported native host message." });
    return;
  }
  const result = await readLocalModelConfigPaths(message.paths);
  writeNativeMessage({ ok: true, ...result });
}

function readNativeMessage() {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    process.stdin.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < 4) return;
      const length = buffer.readUInt32LE(0);
      if (buffer.length < 4 + length) return;
      try {
        resolve(JSON.parse(buffer.slice(4, 4 + length).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    process.stdin.on("error", reject);
  });
}

function writeNativeMessage(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
}

async function readLocalModelConfigPaths(paths) {
  const normalizedPaths = normalizeLocalModelConfigPaths(paths);
  const documents = [];
  const errors = [];

  for (const requestedPath of normalizedPaths) {
    try {
      const resolvedPath = resolveLocalPath(requestedPath);
      assertAllowedConfigPath(resolvedPath);
      const stat = await fs.stat(resolvedPath);
      if (!stat.isFile()) throw new Error("not a file");
      if (stat.size > MAX_LOCAL_CONFIG_BYTES) throw new Error("file is too large");
      const text = await fs.readFile(resolvedPath, "utf8");
      documents.push({
        name: path.basename(resolvedPath),
        path: requestedPath,
        resolvedPath,
        text,
        reader: "native"
      });
    } catch (error) {
      errors.push(`${requestedPath}: ${error.message || String(error)}`);
    }
  }

  return { documents, errors };
}

function normalizeLocalModelConfigPaths(paths) {
  const list = Array.isArray(paths) ? paths : [];
  const normalized = list.map((item) => String(item || "").trim()).filter(Boolean);
  return [...new Set(normalized.length ? normalized : DEFAULT_LOCAL_MODEL_CONFIG_PATHS)];
}

function resolveLocalPath(value) {
  const home = os.homedir();
  let next = String(value || "").trim();
  next = next.replace(/^~(?=$|[\\/])/, home);
  next = next.replace(/\$\{HOME\}|\$HOME/g, home);
  next = next.replace(/%USERPROFILE%/gi, home);
  next = next.replace(/%APPDATA%/gi, process.env.APPDATA || path.join(home, "AppData", "Roaming"));
  next = next.replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA || path.join(home, "AppData", "Local"));
  if (!path.isAbsolute(next)) {
    next = path.join(home, next);
  }
  return path.normalize(next);
}

function assertAllowedConfigPath(resolvedPath) {
  const extension = path.extname(resolvedPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`unsupported config extension: ${extension || "(none)"}`);
  }
}

main().catch((error) => {
  writeNativeMessage({ ok: false, error: error.message || String(error) });
});
