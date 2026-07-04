const notesNode = document.querySelector("#notes");
const searchNode = document.querySelector("#search");
const countNode = document.querySelector("#count");
const exportButton = document.querySelector("#export");
const exportVisibleButton = document.querySelector("#export-visible");
const subjectFilterNode = document.querySelector("#subject-filter");
const viewFilterNode = document.querySelector("#view-filter");
const sortModeNode = document.querySelector("#sort-mode");
const statPapersNode = document.querySelector("#stat-papers");
const statTurnsNode = document.querySelector("#stat-turns");
const statSubjectsNode = document.querySelector("#stat-subjects");
const statSavedNode = document.querySelector("#stat-saved");
const updateBannerNode = document.querySelector("#update-banner");
const I18N = window.PaperDockI18n;

let notes = [];
let filteredNotes = [];
let reviewState = {};
let currentLanguage = "system";

loadSettingsAndNotes();
searchNode.addEventListener("input", render);
subjectFilterNode.addEventListener("change", render);
viewFilterNode.addEventListener("change", render);
sortModeNode.addEventListener("change", render);
exportButton.addEventListener("click", () => exportMarkdown(notes));
exportVisibleButton.addEventListener("click", () => exportMarkdown(filteredNotes));

async function loadSettingsAndNotes() {
  try {
    const { settings = {} } = await chrome.storage.sync.get("settings");
    currentLanguage = I18N.normalizeLanguage(settings.language);
    document.body.dataset.appearance = resolveAppearance(settings.appearance);
  } catch {
    currentLanguage = "system";
    document.body.dataset.appearance = resolveAppearance("system");
  }
  applyLanguage();
  renderUpdateBanner();
  await loadNotes();
}

function applyLanguage() {
  document.documentElement.lang = I18N.resolveLanguage(currentLanguage);
  document.title = t("reviewTitle");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
}

function renderUpdateBanner() {
  window.PaperDockUpdateBanner?.checkAndRender({
    container: updateBannerNode,
    language: currentLanguage
  });
}

async function loadNotes() {
  const {
    notes: noteMap = {},
    conversations = {},
    reviewState: storedReviewState = {}
  } = await chrome.storage.local.get(["notes", "conversations", "reviewState"]);
  reviewState = storedReviewState || {};
  const merged = new Map();

  for (const note of Object.values(noteMap)) {
    if (note?.id) merged.set(note.id, { ...note, hasNote: true });
  }
  for (const conversation of Object.values(conversations)) {
    if (!conversation?.id) continue;
    const previous = merged.get(conversation.id) || {};
    merged.set(conversation.id, {
      ...previous,
      ...conversation,
      conversation,
      hasConversation: true,
      updatedAt: maxDate(previous.updatedAt, conversation.updatedAt),
      title: previous.title || conversation.title,
      authors: previous.authors || conversation.authors,
      subjects: previous.subjects || conversation.subjects,
      submittedAt: previous.submittedAt || conversation.submittedAt,
      paperUpdatedAt: previous.paperUpdatedAt || conversation.paperUpdatedAt,
      abstract: previous.abstract || conversation.abstract,
      pdfUrl: previous.pdfUrl || conversation.pdfUrl
    });
  }

  notes = [...merged.values()].map((note) => ({
    ...note,
    review: reviewState[note.id] || {}
  }));
  renderSubjectOptions();
  renderStats();
  render();
}

function renderStats() {
  const subjects = new Set(notes.flatMap((note) => parseSubjects(note.subjects)));
  statPapersNode.textContent = String(notes.length);
  statTurnsNode.textContent = String(notes.reduce((sum, note) => sum + Number(note.conversation?.turnCount || 0), 0));
  statSubjectsNode.textContent = String(subjects.size);
  statSavedNode.textContent = String(notes.filter((note) => note.hasNote).length);
}

function renderSubjectOptions() {
  const selected = subjectFilterNode.value;
  const subjects = [...new Set(notes.flatMap((note) => parseSubjects(note.subjects)))].sort((a, b) => a.localeCompare(b));
  subjectFilterNode.innerHTML = [
    `<option value="">${escapeHtml(t("subjectFilterAll"))}</option>`,
    ...subjects.map((subject) => `<option value="${escapeAttr(subject)}">${escapeHtml(subject)}</option>`)
  ].join("");
  if (subjects.includes(selected)) subjectFilterNode.value = selected;
}

function render() {
  filteredNotes = getFilteredNotes();
  countNode.textContent = t("paperCount", { shown: filteredNotes.length, total: notes.length });
  if (!filteredNotes.length) {
    notesNode.innerHTML = `<div class="empty">${escapeHtml(notes.length ? t("noVisibleNotes") : t("emptyNotes"))}</div>`;
    return;
  }

  const groups = groupNotesByDate(filteredNotes);
  notesNode.innerHTML = groups.map(([groupKey, groupNotes]) => `
    <section class="day-group">
      <header class="day-header">
        <div>
          <h2>${escapeHtml(formatGroupLabel(groupKey))}</h2>
          <p>${escapeHtml(t("groupByDay"))}</p>
        </div>
        <span>${escapeHtml(t("paperCount", { shown: groupNotes.length, total: groupNotes.length }))}</span>
      </header>
      <div class="day-notes">
        ${groupNotes.map(renderNoteCard).join("")}
      </div>
    </section>
  `).join("");

  notesNode.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", handleNoteAction);
  });
}

function getFilteredNotes() {
  const query = searchNode.value.trim().toLowerCase();
  const subject = subjectFilterNode.value;
  const view = viewFilterNode.value;
  const sortMode = sortModeNode.value;

  return notes.filter((note) => {
    if (subject && !parseSubjects(note.subjects).includes(subject)) return false;
    if (view === "favorites" && !note.review?.favorite) return false;
    if (view === "archived" && !note.review?.archived) return false;
    if (view === "notes" && !note.hasNote) return false;
    if (view === "chats" && !note.hasConversation) return false;
    if (view === "all" && note.review?.archived) return false;

    const haystack = [
      note.title,
      note.id,
      note.authors,
      note.subjects,
      note.summary,
      note.abstract,
      conversationToSearchText(note.conversation)
    ].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  }).sort((a, b) => compareNotes(a, b, sortMode));
}

function renderNoteCard(note) {
  const date = getNoteDate(note);
  const hasSummary = Boolean(clean(note.summary));
  const badges = [
    note.review?.favorite ? t("favoriteBadge") : "",
    note.review?.archived ? t("archivedBadge") : "",
    note.hasNote ? t("savedBadge") : "",
    note.hasConversation ? t("chattedBadge") : "",
    t("markdownRendered")
  ].filter(Boolean);

  return `
    <article class="note" data-id="${escapeAttr(note.id)}">
      <div class="note-header">
        <div class="note-title-block">
          <div class="badge-row">${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}</div>
          <h3>${escapeHtml(note.title || note.id)}</h3>
          <div class="meta">
            ${escapeHtml(formatNoteId(note))}
            ${note.submittedAt ? ` · ${escapeHtml(t("submittedMeta", { date: note.submittedAt }))}` : ""}
            ${note.paperUpdatedAt ? ` · ${escapeHtml(t("paperUpdatedMeta", { date: note.paperUpdatedAt }))}` : ""}
            ${date ? ` · ${escapeHtml(formatDate(date))}` : ""}
            ${note.conversation?.turnCount ? ` · ${escapeHtml(t("turns", { count: note.conversation.turnCount }))}` : ""}
          </div>
          <div class="meta">${escapeHtml(note.authors || "")}</div>
          ${renderSubjectChips(note.subjects)}
        </div>
        <div class="note-actions">
          <button class="secondary" data-action="favorite">${escapeHtml(note.review?.favorite ? t("unfavorite") : t("favorite"))}</button>
          <button class="secondary" data-action="copy">${escapeHtml(t("copy"))}</button>
          <button class="secondary" data-action="toggle-note">${escapeHtml(hasSummary ? t("showNote") : t("noteAbstract"))}</button>
          <button class="secondary" data-action="toggle-chat">${escapeHtml(t("conversation"))}</button>
          ${note.pdfUrl ? `<a class="button-link" href="${escapeAttr(note.pdfUrl)}" target="_blank" rel="noreferrer">${escapeHtml(t("openPaper"))}</a>` : ""}
          <button class="secondary" data-action="archive">${escapeHtml(note.review?.archived ? t("unarchive") : t("archive"))}</button>
          <button class="danger" data-action="delete">${escapeHtml(t("delete"))}</button>
        </div>
      </div>
      <div class="summary markdown-body" hidden>${markdownToHtml(hasSummary ? note.summary : note.abstract || "")}</div>
      <div class="conversation" hidden>${renderConversation(note.conversation)}</div>
    </article>
  `;
}

function renderSubjectChips(subjects) {
  const list = parseSubjects(subjects);
  if (!list.length) return "";
  return `<div class="subject-chips">${list.map((subject) => `<span>${escapeHtml(subject)}</span>`).join("")}</div>`;
}

function formatNoteId(note) {
  if (!note?.id) return "";
  if (note.sourceType === "acm") return "ACM";
  return note.sourceType === "pdf" ? "PDF" : note.id;
}

async function handleNoteAction(event) {
  const article = event.target.closest(".note");
  const id = article?.dataset.id;
  const note = notes.find((item) => item.id === id);
  if (!note) return;
  const action = event.target.dataset.action;

  if (action === "copy") {
    await navigator.clipboard.writeText(buildMarkdown(note));
    event.target.textContent = t("copied");
    setTimeout(() => {
      event.target.textContent = t("copy");
    }, 1200);
    return;
  }

  if (action === "toggle-note") {
    const summary = article.querySelector(".summary");
    if (!summary) return;
    summary.hidden = !summary.hidden;
    event.target.textContent = summary.hidden ? t("showNote") : t("hideNote");
    return;
  }

  if (action === "toggle-chat") {
    const conversation = article.querySelector(".conversation");
    if (!conversation) return;
    conversation.hidden = !conversation.hidden;
    event.target.textContent = conversation.hidden ? t("conversation") : t("collapse");
    return;
  }

  if (action === "favorite") {
    await updateReviewState(id, { favorite: !note.review?.favorite });
    return;
  }

  if (action === "archive") {
    await updateReviewState(id, { archived: !note.review?.archived });
    return;
  }

  if (action === "delete") {
    if (!confirm(t("confirmDelete", { id: note.id }))) return;
    const { notes: noteMap = {}, conversations = {}, reviewState: storedReviewState = {} } =
      await chrome.storage.local.get(["notes", "conversations", "reviewState"]);
    delete noteMap[id];
    delete conversations[id];
    delete storedReviewState[id];
    await chrome.storage.local.set({ notes: noteMap, conversations, reviewState: storedReviewState });
    notes = notes.filter((item) => item.id !== id);
    reviewState = storedReviewState;
    renderSubjectOptions();
    renderStats();
    render();
  }
}

async function updateReviewState(id, patch) {
  const nextState = {
    ...(reviewState[id] || {}),
    ...patch,
    updatedAt: new Date().toISOString()
  };
  reviewState = {
    ...reviewState,
    [id]: nextState
  };
  notes = notes.map((note) => note.id === id ? { ...note, review: nextState } : note);
  await chrome.storage.local.set({ reviewState });
  renderStats();
  render();
}

async function exportMarkdown(items) {
  if (!items.length) return;
  const text = items.map(buildMarkdown).join("\n\n---\n\n");
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `paperdock-notes-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildMarkdown(note) {
  return [
    `# ${note.title || note.id || "Paper"}`,
    "",
    `- Type: ${note.sourceType === "pdf" ? "PDF" : note.sourceType === "acm" ? "ACM" : "arXiv"}`,
    `- ID: ${note.id || ""}`,
    `- Authors: ${note.authors || ""}`,
    `- Submitted: ${note.submittedAt || ""}`,
    `- Paper updated: ${note.paperUpdatedAt || ""}`,
    `- Subjects: ${note.subjects || ""}`,
    `- Updated: ${note.updatedAt || ""}`,
    `- Favorite: ${note.review?.favorite ? "yes" : "no"}`,
    `- Archived: ${note.review?.archived ? "yes" : "no"}`,
    `- PDF: ${note.pdfUrl || ""}`,
    "",
    `## ${t("noteAbstract")}`,
    note.abstract || "",
    "",
    `## ${t("noteLLMNote")}`,
    note.summary || "",
    "",
    "## Conversation",
    conversationToMarkdown(note.conversation)
  ].join("\n");
}

function renderConversation(conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  if (!messages.length) return `<div class="empty-inline">${escapeHtml(t("noConversation"))}</div>`;
  return messages.map((message) => `
    <div class="message ${escapeAttr(message.role)}">
      <div class="message-meta">${message.role === "user" ? escapeHtml(t("you")) : "AI"} · ${escapeHtml(formatDate(message.createdAt))}${message.mode ? ` · ${escapeHtml(modeLabel(message.mode))}` : ""}${message.role === "assistant" ? formatMessageUsageMeta(message) : ""}</div>
      <div class="message-body markdown-body">${message.role === "assistant" ? markdownToHtml(message.text || "") : escapeHtml(message.text || "")}</div>
    </div>
  `).join("");
}

function conversationToMarkdown(conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  if (!messages.length) return "";
  return messages.map((message) => [
    `### ${message.role === "user" ? "User" : "Assistant"} ${message.createdAt || ""}`,
    "",
    message.text || ""
  ].join("\n")).join("\n\n");
}

function conversationToSearchText(conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  return messages.map((message) => message.text || "").join(" ");
}

function groupNotesByDate(items) {
  const groups = new Map();
  for (const note of items) {
    const key = getDateKey(getNoteDate(note));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(note);
  }
  return [...groups.entries()];
}

function compareNotes(a, b, sortMode) {
  if (sortMode === "title") {
    return String(a.title || a.id).localeCompare(String(b.title || b.id));
  }
  const left = getTimestamp(getNoteDate(a));
  const right = getTimestamp(getNoteDate(b));
  if (sortMode === "oldest") return left - right;
  return right - left;
}

function getNoteDate(note) {
  return note.review?.updatedAt || note.updatedAt || note.conversation?.updatedAt || note.createdAt || note.generatedAt || "";
}

function getDateKey(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatGroupLabel(key) {
  if (key === "unknown") return t("unknownDate");
  const today = getDateKey(new Date().toISOString());
  const yesterday = getDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (key === today) return t("today");
  if (key === yesterday) return t("yesterday");
  try {
    return new Intl.DateTimeFormat(I18N.resolveLanguage(currentLanguage), {
      year: "numeric",
      month: "long",
      day: "2-digit",
      weekday: "short"
    }).format(new Date(`${key}T00:00:00`));
  } catch {
    return key;
  }
}

function parseSubjects(value) {
  const text = String(value || "");
  const categories = [...text.matchAll(/\b[a-z-]+(?:\.[A-Z]{2})\b/g)]
    .map((match) => match[0]);
  if (categories.length) return [...new Set(categories)].slice(0, 12);
  return text
    .split(/[,;，；]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function modeLabel(mode) {
  if (mode === "deep") return t("deep");
  if (mode === "study") return t("study");
  if (mode === "ask") return t("ask");
  return t("quick");
}

function maxDate(left, right) {
  if (!left) return right;
  if (!right) return left;
  return String(left).localeCompare(String(right)) >= 0 ? left : right;
}

function getTimestamp(value) {
  const date = new Date(value || 0);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(I18N.resolveLanguage(currentLanguage), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMessageUsageMeta(message) {
  const tokens = Number(message?.contextTokens);
  const windowTokens = Number(message?.contextWindow);
  if (!Number.isFinite(tokens) || tokens <= 0 || !Number.isFinite(windowTokens) || windowTokens <= 0) return "";
  const percent = Math.max(0, Math.min(100, Math.round((tokens / windowTokens) * 100)));
  const usage = t("contextUsage", {
    tokens: formatTokenCount(tokens),
    window: formatTokenCount(windowTokens),
    percent,
    capped: message.contextCapped ? t("capped") : ""
  });
  return ` · ${escapeHtml(usage)}`;
}

function formatTokenCount(value) {
  const tokens = Math.max(0, Math.floor(Number(value) || 0));
  if (tokens < 1000) return String(tokens);
  if (tokens < 1000000) {
    return tokens < 10000
      ? `${(tokens / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : `${Math.round(tokens / 1000)}k`;
  }
  return `${(tokens / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
}

function markdownToHtml(markdown) {
  if (window.PaperDockMarkdown?.toHtml) {
    return window.PaperDockMarkdown.toHtml(markdown, { headingOffset: 2 });
  }
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listType = "";
  let paragraph = [];
  let codeBlock = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${formatInline(escapeHtml(paragraph.join(" ")))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = "";
  };
  const closeCodeBlock = () => {
    if (!codeBlock) return;
    html.push(`<pre><code>${escapeHtml(codeBlock.join("\n"))}</code></pre>`);
    codeBlock = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^```/.test(line.trim())) {
      if (codeBlock) {
        closeCodeBlock();
      } else {
        flushParagraph();
        closeList();
        codeBlock = [];
      }
      continue;
    }
    if (codeBlock) {
      codeBlock.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(4, heading[1].length) + 2;
      html.push(`<h${level}>${formatInline(escapeHtml(heading[2]))}</h${level}>`);
      continue;
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (ordered || unordered) {
      flushParagraph();
      const nextType = ordered ? "ol" : "ul";
      if (listType && listType !== nextType) closeList();
      if (!listType) {
        listType = nextType;
        html.push(`<${listType}>`);
      }
      html.push(`<li>${formatInline(escapeHtml((ordered || unordered)[1]))}</li>`);
      continue;
    }
    const quote = line.match(/^\s*>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${formatInline(escapeHtml(quote[1]))}</blockquote>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      closeList();
      html.push("<hr>");
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  closeList();
  closeCodeBlock();
  return html.join("");
}

function formatInline(value) {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function normalizeAppearance(value) {
  if (value === "system" || value === "跟随系统") return "system";
  if (value === "light" || value === "浅色") return "light";
  if (value === "dark" || value === "深色") return "dark";
  if (value === "sepia" || value === "护眼") return "sepia";
  return "system";
}

function resolveAppearance(value) {
  const normalized = normalizeAppearance(value);
  if (normalized !== "system") return normalized;
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function t(key, vars = {}) {
  return I18N.t(currentLanguage, key, vars);
}

function clean(value) {
  return String(value || "").trim();
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
