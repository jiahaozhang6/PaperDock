(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.PaperDockZotero = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ZOTERO_CONNECTOR_API_VERSION = 3;
  const ZOTERO_CONNECTOR_BASE_URL = "http://127.0.0.1:23119/";
  const ZOTERO_EXTENSION_VERSION = "PaperDock";
  const SOURCE_ITEM_TYPE_RULES = {
    arxiv: { itemType: "preprint" },
    acm: { itemType: "conferencePaper" },
    ieee: { itemType: "conferencePaper" }
  };

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function randomId(prefix = "am") {
    const cryptoObj = typeof crypto !== "undefined" ? crypto : null;
    if (cryptoObj?.randomUUID) return `${prefix}-${cryptoObj.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  }

  function extractDoi(paper = {}) {
    const candidates = [
      paper.doi,
      clean(paper.id).replace(/^acm:/i, "").replace(/^doi:/i, ""),
      paper.pageUrl,
      paper.pdfUrl
    ];
    for (const candidate of candidates) {
      const text = clean(candidate);
      const match = text.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
      if (match) return match[0].replace(/[.)\]]+$/, "");
    }
    return "";
  }

  function extractYearDate(raw) {
    const text = clean(raw);
    if (!text) return "";
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : text;
  }

  function parseCreators(authors) {
    const text = clean(authors)
      .replace(/^Authors?:/i, "")
      .replace(/\s+and\s+/gi, ", ");
    if (!text) return [];
    return text
      .split(/\s*,\s*|;\s*/)
      .map((name) => clean(name))
      .filter(Boolean)
      .slice(0, 60)
      .map((name) => {
        if (name.includes(" ")) {
          const parts = name.split(/\s+/);
          return {
            creatorType: "author",
            firstName: parts.slice(0, -1).join(" "),
            lastName: parts.at(-1)
          };
        }
        return { creatorType: "author", name };
      });
  }

  function inferItemType(paper = {}) {
    const sourceType = clean(paper.sourceType).toLowerCase();
    if (SOURCE_ITEM_TYPE_RULES[sourceType]) return SOURCE_ITEM_TYPE_RULES[sourceType].itemType;
    if (extractDoi(paper)) return "journalArticle";
    return "document";
  }

  function buildZoteroAttachment(paper = {}, itemId = randomId("item")) {
    const pdfUrl = clean(paper.pdfUrl || paper.webchatPdf?.url);
    if (!pdfUrl) return null;
    let referrer = clean(paper.pageUrl);
    try {
      referrer = referrer ? new URL(referrer).origin : new URL(pdfUrl).origin;
    } catch (_) {
      referrer = "";
    }
    return {
      id: randomId("att"),
      parentItem: itemId,
      title: "Full Text PDF",
      url: pdfUrl,
      mimeType: "application/pdf",
      isPrimary: true,
      referrer
    };
  }

  function buildZoteroItem(paper = {}, options = {}) {
    const includeAttachment = options.includeAttachment !== false;
    const itemType = inferItemType(paper);
    const id = randomId("item");
    const doi = extractDoi(paper);
    const arxivId = clean(paper.sourceType).toLowerCase() === "arxiv"
      ? clean(paper.id).replace(/^arXiv:/i, "")
      : "";
    const item = {
      id,
      itemType,
      title: clean(paper.title) || clean(paper.id) || "Untitled paper",
      creators: parseCreators(paper.authors),
      abstractNote: clean(paper.abstract),
      url: clean(paper.pageUrl || paper.pdfUrl),
      accessDate: new Date().toISOString(),
      attachments: []
    };

    const date = extractYearDate(paper.submittedAt || paper.paperUpdatedAt || paper.date);
    if (date) item.date = date;
    if (doi) item.DOI = doi;

    if (itemType === "preprint") {
      item.repository = arxivId ? "arXiv" : clean(paper.sourceType || "Preprint");
      if (arxivId) item.archiveID = arxivId;
      item.genre = "preprint";
    } else if (itemType === "conferencePaper") {
      item.conferenceName = clean(paper.venue || paper.comments);
      item.proceedingsTitle = clean(paper.publicationTitle || paper.venue);
    } else if (itemType === "journalArticle") {
      item.publicationTitle = clean(paper.publicationTitle || paper.venue);
    }

    const extra = [
      arxivId ? `arXiv: ${arxivId}` : "",
      clean(paper.subjects) ? `Subjects: ${clean(paper.subjects)}` : "",
      clean(paper.comments) ? `Comments: ${clean(paper.comments)}` : "",
      clean(paper.pdfUrl) ? `PDF: ${clean(paper.pdfUrl)}` : "",
      "Saved with PaperDock"
    ].filter(Boolean).join("\n");
    if (extra) item.extra = extra;

    if (includeAttachment) {
      const attachment = buildZoteroAttachment(paper, id);
      if (attachment) item.attachments.push(attachment);
    }
    return item;
  }

  function htmlEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildZoteroNoteHtml({ paper = {}, summary = "", conversation = null, noteText = "" } = {}) {
    const answer = clean(summary);
    const userNote = clean(noteText);
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    const title = clean(paper.title || paper.id || "PaperDock Note");
    const lines = [
      `<h2>${htmlEscape(title)}</h2>`,
      clean(paper.pageUrl) ? `<p><b>URL:</b> ${htmlEscape(clean(paper.pageUrl))}</p>` : "",
      userNote ? `<h3>User Note</h3><p>${htmlEscape(userNote).replace(/\n/g, "<br>")}</p>` : "",
      answer ? `<h3>PaperDock</h3><p>${htmlEscape(answer).replace(/\n/g, "<br>")}</p>` : "",
      messages.length ? `<p><b>Chat turns:</b> ${messages.length}</p>` : ""
    ];
    return lines.filter(Boolean).join("\n");
  }

  function normalizeTargetsPayload(payload = {}) {
    const targets = Array.isArray(payload.targets) ? payload.targets : [];
    let currentId = clean(payload.id);
    if (!currentId && payload.libraryID) currentId = `L${payload.libraryID}`;
    if (currentId && !/^[LC]/.test(currentId) && payload.id) currentId = `C${payload.id}`;
    return {
      libraryID: payload.libraryID,
      libraryName: clean(payload.libraryName),
      editable: payload.editable !== false && payload.libraryEditable !== false,
      filesEditable: payload.filesEditable !== false,
      selectedTargetId: currentId || targets[0]?.id || "",
      selectedTargetName: clean(payload.name || targets.find((target) => target.id === currentId)?.name),
      targets: targets.map((target) => ({
        id: clean(target.id),
        name: clean(target.name),
        level: Number.isFinite(Number(target.level)) ? Number(target.level) : 0,
        filesEditable: target.filesEditable !== false,
        disabled: target.disabled === true,
        recent: target.recent === true
      })).filter((target) => target.id && target.name),
      tags: payload.tags || {}
    };
  }

  function formatZoteroTargetPath(targets = [], id = "") {
    const index = targets.findIndex((target) => target.id === id);
    if (index < 0) return "";
    const row = targets[index];
    const path = [row.name];
    let level = Number(row.level) || 0;
    for (let i = index - 1; i >= 0 && level > 0; i -= 1) {
      const parent = targets[i];
      const parentLevel = Number(parent.level) || 0;
      if (parentLevel < level) {
        path.unshift(parent.name);
        level = parentLevel;
      }
    }
    return path.join(" / ");
  }

  function getZoteroTargetAncestorIds(targets = [], id = "") {
    const index = targets.findIndex((target) => target.id === id);
    if (index < 0) return [];
    const ancestors = [];
    let level = Number(targets[index].level) || 0;
    for (let i = index - 1; i >= 0 && level > 0; i -= 1) {
      const parent = targets[i];
      const parentLevel = Number(parent.level) || 0;
      if (parentLevel < level) {
        ancestors.unshift(parent.id);
        level = parentLevel;
      }
    }
    return ancestors;
  }

  function isZoteroTargetInBranch(targets = [], branchId = "", targetId = "") {
    const cleanBranchId = clean(branchId);
    const cleanTargetId = clean(targetId);
    if (!cleanBranchId || !cleanTargetId) return false;
    if (cleanBranchId === cleanTargetId) return true;
    return getZoteroTargetAncestorIds(targets, cleanTargetId).includes(cleanBranchId);
  }

  function pruneZoteroHoverExpandedTargetIds(targets = [], hoverIds = [], pointerTargetId = "") {
    const cleanPointerTargetId = clean(pointerTargetId);
    if (!cleanPointerTargetId) return [];
    return (Array.isArray(hoverIds) ? hoverIds : [])
      .map((id) => clean(id))
      .filter(Boolean)
      .filter((id) => isZoteroTargetInBranch(targets, id, cleanPointerTargetId));
  }

  function buildZoteroTargetTreeRows(targets = [], options = {}) {
    const rows = targets
      .map((target, index) => {
        const level = Number(target.level) || 0;
        const nextLevel = Number(targets[index + 1]?.level);
        return {
          ...target,
          level,
          hasChildren: Number.isFinite(nextLevel) && nextLevel > level
        };
      })
      .filter((target) => target.id && target.name);
    const expandedIds = new Set(Array.isArray(options.expandedIds) ? options.expandedIds.map(clean) : []);
    const activeId = clean(options.activeId);
    for (const ancestorId of getZoteroTargetAncestorIds(rows, activeId)) expandedIds.add(ancestorId);
    const filter = clean(options.filter).toLowerCase();
    const visibleIds = new Set();

    if (filter) {
      for (const target of rows) {
        const path = formatZoteroTargetPath(rows, target.id) || target.name;
        if (!path.toLowerCase().includes(filter)) continue;
        visibleIds.add(target.id);
        for (const ancestorId of getZoteroTargetAncestorIds(rows, target.id)) {
          visibleIds.add(ancestorId);
          expandedIds.add(ancestorId);
        }
      }
    }

    return rows
      .filter((target) => {
        if (filter) return visibleIds.has(target.id);
        if (target.level <= 0) return true;
        return getZoteroTargetAncestorIds(rows, target.id)
          .every((ancestorId) => {
            const ancestor = rows.find((row) => row.id === ancestorId);
            return ancestor?.level <= 0 || expandedIds.has(ancestorId);
          });
      })
      .map((target) => ({
        ...target,
        isExpanded: target.hasChildren && (target.level <= 0 || expandedIds.has(target.id))
      }));
  }

  function targetRowsForPrompt(targets = []) {
    return targets
      .filter((target) => target.id && !target.id.startsWith("L") && target.disabled !== true)
      .map((target) => ({
        id: target.id,
        name: target.name,
        path: formatZoteroTargetPath(targets, target.id)
      }));
  }

  function buildSuggestionPrompt(paper = {}, targets = []) {
    const rows = targetRowsForPrompt(targets).slice(0, 160);
    return [
      "You are helping choose a Zotero collection for a research paper.",
      "Return only JSON with this shape: {\"suggestions\":[{\"targetId\":\"C...\",\"reason\":\"short reason\",\"confidence\":0.0}]}",
      "Choose up to 3 targetId values from the provided collection list. Do not invent IDs.",
      "",
      `Title: ${clean(paper.title) || "Unknown"}`,
      `Authors: ${clean(paper.authors) || "Unknown"}`,
      `Abstract: ${clean(paper.abstract).slice(0, 2400) || "Unknown"}`,
      `Subjects: ${clean(paper.subjects) || "Unknown"}`,
      "",
      "Collections:",
      JSON.stringify(rows, null, 2)
    ].join("\n");
  }

  function parseSuggestionResponse(text = "", targets = []) {
    const rows = extractSuggestionRows(parseSuggestionPayload(text), text);
    const candidates = targetRowsForPrompt(targets);
    const seen = new Set();
    return rows
      .map((row) => normalizeSuggestionRow(row, candidates, targets))
      .filter((row) => {
        if (!row || seen.has(row.targetId)) return false;
        seen.add(row.targetId);
        return true;
      })
      .slice(0, 3);
  }

  function createSuggestionFallback(paper = {}, targets = [], options = {}) {
    const candidates = targetRowsForPrompt(targets);
    if (!candidates.length) return [];
    const selectedTarget = candidates.find((target) => target.id === clean(options.selectedTargetId));
    const paperText = normalizeSuggestionLookupText([
      paper.title,
      paper.abstract,
      paper.subjects,
      paper.comments,
      paper.venue,
      paper.fullText
    ].filter(Boolean).join(" "));
    const scored = candidates
      .map((target) => {
        const path = formatZoteroTargetPath(targets, target.id) || target.path || target.name;
        const score = scoreTargetForPaper(target, path, paperText);
        return { target, path, score };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || Number(right.target.recent === true) - Number(left.target.recent === true));

    const picked = scored.slice(0, 3).map((item) => ({
      targetId: item.target.id,
      name: item.target.name,
      path: item.path,
      reason: "本地分类名与论文信息匹配",
      confidence: Math.min(0.72, Math.max(0.35, item.score / 160))
    }));

    if (picked.length) return picked;
    const fallbackTarget = selectedTarget || candidates.find((target) => target.recent === true) || candidates[0];
    return [{
      targetId: fallbackTarget.id,
      name: fallbackTarget.name,
      path: formatZoteroTargetPath(targets, fallbackTarget.id) || fallbackTarget.path || fallbackTarget.name,
      reason: selectedTarget ? "保留当前 Zotero 分类" : "未匹配到明确分类，使用最近可用分类",
      confidence: 0.2
    }];
  }

  function scoreTargetForPaper(target, path, paperText) {
    if (!paperText) return 0;
    const nameKey = normalizeSuggestionLookupText(target.name);
    const pathKey = normalizeSuggestionLookupText(path);
    let score = 0;
    if (nameKey && paperText.includes(nameKey)) score += 95;
    if (pathKey && paperText.includes(pathKey)) score += 120;
    const tokens = tokenizeSuggestionText(`${target.name} ${path}`);
    for (const token of tokens) {
      if (paperText.includes(token)) score += token.length <= 3 ? 12 : 20;
    }
    if (target.recent === true && score > 0) score += 6;
    return score;
  }

  function tokenizeSuggestionText(value) {
    const stopwords = new Set([
      "the", "and", "for", "with", "from", "into", "other", "misc", "model", "models",
      "paper", "generation", "learning", "computer", "science", "我的文库"
    ]);
    return [...new Set(normalizeSuggestionLookupText(value)
      .split(/[^a-z0-9\u4e00-\u9fff]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !stopwords.has(token)))];
  }

  function parseSuggestionPayload(text = "") {
    const raw = String(text || "").trim();
    if (!raw) return null;
    const fenced = Array.from(raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((match) => match[1]);
    const candidates = [
      ...fenced,
      raw.match(/\{[\s\S]*\}/)?.[0],
      raw.match(/\[[\s\S]*\]/)?.[0],
      raw
    ].filter(Boolean);
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (_) {}
    }
    return null;
  }

  function extractSuggestionRows(payload, text = "") {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") {
      for (const key of ["suggestions", "recommendations", "collections", "targets", "choices"]) {
        if (Array.isArray(payload[key])) return payload[key];
      }
      return [payload];
    }
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => clean(line).replace(/^[-*\d.)\s]+/, ""))
      .filter(Boolean);
  }

  function normalizeSuggestionRow(row, candidates = [], targets = []) {
    const target = resolveSuggestionTarget(row, candidates, targets);
    if (!target) return null;
    const reason = typeof row === "object" && row
      ? clean(row.reason || row.rationale || row.explanation || row.why).slice(0, 240)
      : "";
    const confidence = typeof row === "object" && row
      ? Math.max(0, Math.min(1, Number(row.confidence) || 0))
      : 0;
    return {
      targetId: target.id,
      name: target.name,
      path: formatZoteroTargetPath(targets, target.id) || target.path || target.name,
      reason,
      confidence
    };
  }

  function resolveSuggestionTarget(row, candidates = [], targets = []) {
    const idValues = suggestionIdValues(row);
    const byId = new Map(candidates.map((target) => [target.id, target]));
    const byLowerId = new Map(candidates.map((target) => [target.id.toLowerCase(), target]));
    for (const value of idValues) {
      const direct = clean(value);
      if (byId.has(direct)) return byId.get(direct);
      const lower = direct.toLowerCase();
      if (byLowerId.has(lower)) return byLowerId.get(lower);
      const embedded = direct.match(/\bC[\w-]+\b/i)?.[0] || "";
      if (byId.has(embedded)) return byId.get(embedded);
      if (byLowerId.has(embedded.toLowerCase())) return byLowerId.get(embedded.toLowerCase());
    }

    const textValues = suggestionTextValues(row);
    for (const value of textValues) {
      const target = resolveSuggestionTargetByText(value, candidates, targets);
      if (target) return target;
    }
    return null;
  }

  function suggestionIdValues(row) {
    if (typeof row === "string") return [row];
    if (!row || typeof row !== "object") return [];
    return [
      row.targetId,
      row.id,
      row.collectionId,
      row.collection_id,
      row.zoteroCollectionId,
      row.zotero_collection_id
    ];
  }

  function suggestionTextValues(row) {
    if (typeof row === "string") return [row];
    if (!row || typeof row !== "object") return [];
    return [
      row.path,
      row.collection,
      row.collectionName,
      row.collection_name,
      row.target,
      row.name,
      row.label,
      row.title,
      row.targetId,
      row.id
    ];
  }

  function resolveSuggestionTargetByText(value, candidates = [], targets = []) {
    const key = normalizeSuggestionLookupText(value);
    if (!key) return null;
    const scored = candidates
      .map((target) => {
        const path = formatZoteroTargetPath(targets, target.id) || target.path || target.name;
        const pathKey = normalizeSuggestionLookupText(path);
        const nameKey = normalizeSuggestionLookupText(target.name);
        let score = 0;
        if (key === pathKey) score = 120;
        else if (key === nameKey) score = 90;
        else if (key.endsWith(`/${nameKey}`)) score = 70;
        else if (pathKey.endsWith(`/${key}`)) score = 60;
        else if (key.length >= 4 && pathKey.includes(key)) score = 40;
        return { target, score };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score);
    if (!scored.length) return null;
    const best = scored[0];
    const second = scored[1];
    if (second && second.score === best.score && best.score < 120) return null;
    return best.target;
  }

  function normalizeSuggestionLookupText(value) {
    return clean(value)
      .toLowerCase()
      .replace(/[\\>｜|→»]+/g, "/")
      .replace(/\s*\/\s*/g, "/")
      .replace(/[，,;；。.!?()[\]{}"'`]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\/+/g, "/")
      .replace(/^\/|\/$/g, "")
      .trim();
  }

  return {
    ZOTERO_CONNECTOR_API_VERSION,
    ZOTERO_CONNECTOR_BASE_URL,
    ZOTERO_EXTENSION_VERSION,
    buildZoteroAttachment,
    buildZoteroItem,
    buildZoteroNoteHtml,
    buildZoteroTargetTreeRows,
    buildSuggestionPrompt,
    clean,
    createSuggestionFallback,
    extractDoi,
    formatZoteroTargetPath,
    getZoteroTargetAncestorIds,
    isZoteroTargetInBranch,
    normalizeTargetsPayload,
    parseSuggestionResponse,
    parseCreators,
    pruneZoteroHoverExpandedTargetIds,
    targetRowsForPrompt
  };
});
