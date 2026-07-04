# Changelog

## 0.1.22 - 2026-07-04

PaperDock rebrand release.

- Rename the extension, UI, documentation, update links, WebChat bridge names, and native helper identifiers to PaperDock.
- Replace the extension icon with the new PaperDock icon.
- Rename release download guidance and generated package names to `PaperDock-vX.Y.Z.zip`.
- Add a brand contract test to prevent old project-name remnants from returning.

## 0.1.21 - 2026-07-04

Preferred model and fixed-temperature model release.

- Add a preferred model profile that is used by default across paper/PDF chat pages.
- Remember the model a user manually selects in any chat page until they switch again.
- Add a settings action and list badge for setting the preferred model explicitly.
- Fix GPT-5/o-series compatible requests by forcing `temperature: 1` when the model requires it.
- Lock the settings temperature control to the model-supported boundary for fixed-temperature models.
- Add contract tests for preferred model persistence and fixed-temperature request bodies.

## 0.1.20 - 2026-07-03

Zotero suggestion, model settings, and README cleanup release.

- Improve Zotero collection suggestions with tolerant parsing and local fallback matching when model output is empty or unusable.
- Preserve usable Zotero suggestions even when the background response is empty by falling back in the paper panel.
- Clean up removed model-dropdown refresh code and guard against old custom model menu regressions.
- Restore stable PDF panel behavior and protect textarea/model-select interactions.
- Simplify the README into a shorter project introduction.
- Add contract tests for Zotero suggestion parsing, PDF iframe panel behavior, model select stability, and source cleanup.

## 0.1.19 - 2026-07-02

Zotero collection save release.

- Add Zotero Connector integration for reading local Zotero libraries and saving papers into a selected collection.
- Add a compact Zotero save panel with collection search, AI collection suggestions, optional Zotero notes, and tag input.
- Add hover-based collection tree expansion: parent collections expand on hover and collapse after leaving the branch, while manual disclosure stays fixed.
- Save PDF attachments through the local Zotero Connector flow when available, with cookie permission requested only when needed.
- Fix embedded PDF panel loading so Zotero tree helpers load before the paper panel script.
- Add contract tests for Zotero item mapping, tree rendering, hover collapse behavior, and Connector save flow.

## 0.1.18 - 2026-07-02

Browser/site support, WebChat stability, and README restructure release.

- Rewrite the README so GitHub visitors first see supported browsers, supported paper sites, WebChat sites, installation, update, data, and privacy notes.
- Document Chrome, Microsoft Edge, Brave, Arc, other Chromium browsers, and current Firefox limitations.
- Document arXiv, ACM Digital Library, IEEE Xplore, regular/dynamic PDFs, common publisher PDF entry points, and local PDF support.
- Fix ChatGPT Web quick overview mode by switching to fast mode after PDF upload, avoiding ChatGPT resetting the picker back to advanced mode.
- Fix DeepSeek Web quick overview by reliably disabling deep thinking on the real `ds-toggle-button` control.
- Fix DeepSeek Web response capture so thinking-only updates no longer end a normal turn before the final answer arrives.
- Bump the WebChat bridge to v15 so already-open ChatGPT and DeepSeek tabs load the latest adapter.

## 0.1.17 - 2026-07-01

Chat navigation and WebChat thinking-status release.

- Add quick previous/next buttons in the paper chat composer for browsing the current conversation.
- Fix chat navigation during generation: pressing next at the newest message now returns to the live bottom and resumes auto-following streamed output.
- Show active thinking/waiting status for ChatGPT Web and DeepSeek Web, including elapsed wait time and received reasoning length when available.
- Add lightweight contract tests for chat navigation and WebChat thinking status.

## 0.1.16 - 2026-07-01

PDF sites, manual save, and Markdown rendering release.

- Add ACM Digital Library detection and page/full-text fallback for DOI, PDF, EPDF, and Full HTML pages.
- Improve WebChat PDF preparation for ACM/IEEE pages by falling back to readable page text and generated context PDFs when direct PDF download is blocked.
- Stop auto-saving generated chat history; conversations now enter the review library only when the user clicks Save, while current-page follow-up context still works.
- Improve Markdown rendering for escaped math, math-only code spans, and compact section dividers.
- Rewrite the README opening so supported sites and PDF page types are visible first.

## 0.1.15 - 2026-07-01

WebChat PDF attachment and thinking display release.

- Add ChatGPT Web and DeepSeek Web bridge support for real PDF attachment workflows, including attachment-button and upload-menu based file selection.
- Require verified `pdfAttached` WebChat sessions before reusing a chat, so old text-only sessions no longer skip PDF upload.
- Persist verified WebChat attachment metadata locally, including filename, size, and attachment timestamp, while preserving existing model settings and paper chat history.
- Fold ChatGPT/DeepSeek thinking or reasoning output into a collapsible thinking block and prevent thinking DOM nodes from being captured as the final answer.
- Add a Markdown fallback renderer for PaperDock thinking blocks so folded reasoning still works if the full Markdown renderer is unavailable.

## 0.1.14 - 2026-06-30

IEEE and dynamic PDF reading release.

- Add IEEE Xplore REST full-text extraction for `stamp.jsp?arnumber=...` papers, avoiding invalid PDF parsing on dynamic IEEE PDF pages.
- Improve detection for non-`.pdf` PDF entry URLs across IEEE, ACM, Springer, Wiley, ScienceDirect, ResearchGate, and repository download paths.
- Add lightweight background probing for likely PDF download URLs using response headers and PDF magic bytes.
- Preserve already streamed assistant text when the user stops generation, and save stopped turns into local paper chat history.
- Keep stopped assistant turns visibly marked in Chinese and English chat UIs.

## 0.1.13 - 2026-06-30

Model loading dropdown fix.

- Add an explicit model picker next to the model-name input in settings.
- Refresh the picker immediately after loading models from the provider `/models` endpoint.
- Keep manual model input available while making loaded models selectable without relying on browser datalist behavior.

## 0.1.12 - 2026-06-30

PDF, Markdown, and reading-layout release.

- Support arXiv and general PDF pages with full-text-first reading for quick, deep, study, and follow-up chats.
- Move PDF text extraction to the page context so Chrome service-worker PDF.js loading failures no longer block summaries.
- Add KaTeX-backed math rendering and broader Markdown rendering for tables, task lists, code, blockquotes, images, and loose formulas.
- Add local panel layout controls: docked split view, floating window, draggable floating header, resizable edges, and restore layout.
- Clamp model numeric settings to supported bounds so oversized user input is automatically corrected.
- Improve model thinking/reasoning compatibility for DeepSeek, MiniMax, OpenAI-compatible, and custom providers.

## 0.1.11 - 2026-06-30

Hard fix for paper-chat model selector hydration.

- Persist model profiles both inside `settings` and as a separate local `modelProfiles` snapshot.
- Let the paper panel read the separate local model snapshot when the full settings object is empty or stale.
- Broadcast full settings to open arXiv tabs after saving, and reload stale tabs that cannot receive the message.
- Add the `tabs` permission so arXiv tabs can be reliably refreshed after settings changes.

## 0.1.10 - 2026-06-30

Root fix for missing model profiles.

- Add a stable extension key so unpacked installs keep the same Chrome extension ID across release folders.
- Make `chrome.storage.local.settings` the authoritative settings store; sync storage is only a backup copy.
- Route settings reads and writes through the background service worker, and refresh already-open paper panels from local settings changes.
- Remove the fragile multi-source content-script storage fallback that could leave the chat panel reading an empty model list.
- Save model profiles after field validation; connection testing stays available per profile but no longer blocks profiles from appearing in the paper chat.

## 0.1.9 - 2026-06-30

Model profile storage fallback.

- Save a local `settingsMirror` copy whenever settings are saved.
- Load model profiles from background settings, sync storage, or the local mirror, whichever has profiles.
- Show a diagnostic status in the paper assistant with profile counts from background, sync, and local mirror when no model is found.

## 0.1.8 - 2026-06-30

Settings refresh fix.

- Refresh model profiles from storage when the paper assistant opens, gains focus, the model selector is opened, or a request starts.
- Move model testing into each model editor card and remove the global settings-page test button.
- Rename the test action to "Test this model" / "测试此模型".
- Test every configured model before saving settings; if any model fails, settings are not saved.
- Clarify the storage-safe ZIP update path: overwrite the same extension folder and reload the existing extension card so local notes and chat history remain attached to the same extension ID.

## 0.1.7 - 2026-06-30

Model selection and cancellation polish.

- Start new installations with an empty model profile list so users create their own profiles.
- Remove the global active-model setting; saved profiles can be selected per paper chat request.
- Add a Stop action during streaming generation to interrupt the current conversation turn.
- Update the MiniMax preset and documentation to `https://api.minimaxi.com/v1`.

## 0.1.6 - 2026-06-30

Release-based updates.

- Use GitHub Releases, not Tags, as the source for user-facing update checks.
- Point update buttons and documentation to the latest stable Release download flow.
- Keep tag names only as the version identifier behind a Release.

## 0.1.5 - 2026-06-30

Stable update prompts.

- Add a latest stable tag ZIP download button to the popup and settings update prompts.
- Show two update methods when a new version is available: `git pull` for cloned installs, or stable ZIP download for regular users.
- Show update reminders across the popup, settings page, review library, arXiv assistant panel, and PDF iframe panel.
- Redesign model profile management with a profile list, focused editor, provider presets, duplicate, delete, set-active, and API key visibility controls.
- Add an in-chat model switcher so paper conversations can change the active model without leaving the arXiv assistant.
- Restrict update checks to stable `vX.Y.Z` tags and ignore prerelease-style tags.
- Document the updated two-path upgrade workflow in both Chinese and English README sections.

## 0.1.4 - 2026-06-30

Stable tag installation guidance.

- Tell users to download stable release/tag ZIP archives instead of the moving `main` branch ZIP.
- Clarify that `git clone` tracks the latest source and is better for updates or development.
- Keep update checks and release instructions aligned with GitHub `vX.Y.Z` tags.

## 0.1.3 - 2026-06-30

Documentation and release metadata.

- Add the project icon to the README header.
- Rewrite download, installation, first-use, and update instructions for source-code users.
- Add recommended GitHub topics and release tag description.
- Base user update checks on GitHub `vX.Y.Z` tags instead of the `main` branch manifest.
- Keep public version metadata aligned across `manifest.json`, README, and settings.

## 0.1.2 - 2026-06-30

Release polish.

- Add Chrome extension icons in 16, 32, 48, and 128 pixel sizes.
- Wire extension and toolbar icons into `manifest.json`.
- Keep release metadata aligned for the public GitHub version.

## 0.1.1 - 2026-06-30

Maintenance release.

- Ignore unknown Chrome runtime messages instead of surfacing extension errors.
- Show the settings-page version directly from `manifest.json`.
- Document the `Unknown message type` troubleshooting flow.
- Keep README version metadata in sync with the extension manifest.

## 0.1.0 - 2026-06-30

Initial public source release.

- Add split-screen arXiv paper assistant.
- Add quick summary, deep reading, and study-card modes.
- Add per-paper local conversation history.
- Add local PDF text extraction with bundled PDF.js.
- Add ar5iv fallback for full-text context.
- Add OpenAI-compatible model profiles for OpenAI, DeepSeek, MiniMax, Ollama, and custom endpoints.
- Add streaming Chat Completions with fallback to non-streaming requests.
- Add context-window budgeting and estimated usage display.
- Add searchable local review library with Markdown export.
- Add Chrome PDF viewer iframe panel to avoid input focus issues.
