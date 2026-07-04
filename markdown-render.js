window.PaperDockMarkdown = (() => {
  let renderer = null;

  function toHtml(markdown, options = {}) {
    const source = window.PaperDockMath?.normalizeLooseMath
      ? window.PaperDockMath.normalizeLooseMath(String(markdown || ""))
      : String(markdown || "");
    const math = window.PaperDockMath?.extractMath
      ? window.PaperDockMath.extractMath(source)
      : { text: source, segments: [] };
    const md = getRenderer();

    if (!md) {
      const fallback = fallbackToHtml(math.text, options);
      return window.PaperDockMath?.restoreMath
        ? window.PaperDockMath.restoreMath(fallback, math.segments)
        : fallback;
    }

    const html = md.render(math.text, {
      headingOffset: Number.isFinite(options.headingOffset) ? options.headingOffset : 0
    });
    return window.PaperDockMath?.restoreMath
      ? window.PaperDockMath.restoreMath(html, math.segments)
      : html;
  }

  function getRenderer() {
    if (renderer) return renderer;
    const MarkdownIt = window.markdownit || globalThis.markdownit;
    if (!MarkdownIt) return null;

    renderer = MarkdownIt({
      html: false,
      linkify: true,
      typographer: false,
      breaks: false
    });

    renderer.validateLink = (url) => isSafeUrl(url);
    installHeadingOffset(renderer);
    installSectionBreaks(renderer);
    installLinkAttributes(renderer);
    installImageAttributes(renderer);
    installTableWrapper(renderer);
    installTaskLists(renderer);
    installMathCodeSpans(renderer);
    installThinkingBlocks(renderer);
    return renderer;
  }

  function installHeadingOffset(md) {
    md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
      tokens[index].tag = offsetHeadingTag(tokens[index].tag, env.headingOffset);
      return self.renderToken(tokens, index, options);
    };
    md.renderer.rules.heading_close = (tokens, index, options, env, self) => {
      tokens[index].tag = offsetHeadingTag(tokens[index].tag, env.headingOffset);
      return self.renderToken(tokens, index, options);
    };
  }

  function installSectionBreaks(md) {
    md.renderer.rules.hr = () => '<hr class="pd-section-break">';
  }

  function installLinkAttributes(md) {
    const defaultRender = md.renderer.rules.link_open || renderToken;
    md.renderer.rules.link_open = (tokens, index, options, env, self) => {
      const href = tokens[index].attrGet("href") || "";
      if (!isSafeUrl(href)) {
        tokens[index].attrSet("href", "#");
      }
      tokens[index].attrSet("target", "_blank");
      tokens[index].attrSet("rel", "noreferrer");
      return defaultRender(tokens, index, options, env, self);
    };
  }

  function installImageAttributes(md) {
    const defaultRender = md.renderer.rules.image || renderToken;
    md.renderer.rules.image = (tokens, index, options, env, self) => {
      const token = tokens[index];
      token.attrJoin("class", "pd-markdown-image");
      token.attrSet("loading", "lazy");
      token.attrSet("decoding", "async");
      return defaultRender(tokens, index, options, env, self);
    };
  }

  function installTableWrapper(md) {
    md.renderer.rules.table_open = () => '<div class="pd-table-wrap"><table>';
    md.renderer.rules.table_close = () => "</table></div>";
  }

  function installTaskLists(md) {
    md.core.ruler.after("inline", "paperdock_task_lists", (state) => {
      const tokens = state.tokens;
      for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (token.type !== "inline" || !token.children?.length) continue;
        if (tokens[index - 1]?.type !== "paragraph_open" || tokens[index - 2]?.type !== "list_item_open") continue;

        const first = token.children[0];
        if (first.type !== "text") continue;

        const match = first.content.match(/^\[([ xX])\]\s+/);
        if (!match) continue;

        first.content = first.content.slice(match[0].length);
        const checkbox = new state.Token("html_inline", "", 0);
        checkbox.content = `<input class="pd-task-checkbox" type="checkbox" disabled ${/[xX]/.test(match[1]) ? "checked " : ""}aria-hidden="true">`;
        token.children.unshift(checkbox);
        tokens[index - 2].attrJoin("class", "pd-task-list-item");
      }
    });
  }

  function installMathCodeSpans(md) {
    const defaultRender = md.renderer.rules.code_inline || ((tokens, index) =>
      `<code>${escapeHtml(tokens[index].content || "")}</code>`);
    md.renderer.rules.code_inline = (tokens, index, options, env, self) => {
      const rendered = window.PaperDockMath?.renderStandaloneMath?.(tokens[index].content || "");
      return rendered || defaultRender(tokens, index, options, env, self);
    };
  }

  function installThinkingBlocks(md) {
    md.block.ruler.before("fence", "paperdock_thinking_block", (state, startLine, endLine, silent) => {
      const start = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      const marker = state.src.slice(start, max).trim();
      if (!marker.startsWith(":::paperdock-thinking")) return false;
      if (silent) return true;

      const title = marker.slice(":::paperdock-thinking".length).trim() || "Thinking";
      let nextLine = startLine + 1;
      while (nextLine < endLine) {
        const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
        const lineMax = state.eMarks[nextLine];
        if (state.src.slice(lineStart, lineMax).trim() === ":::") break;
        nextLine += 1;
      }
      const content = state.getLines(startLine + 1, nextLine, state.blkIndent, false);

      const open = state.push("paperdock_thinking_open", "details", 1);
      open.block = true;
      open.info = title;

      const summary = state.push("paperdock_thinking_summary", "summary", 0);
      summary.block = true;
      summary.content = title;

      state.md.block.parse(content, state.md, state.env, state.tokens);

      const close = state.push("paperdock_thinking_close", "details", -1);
      close.block = true;
      state.line = nextLine < endLine ? nextLine + 1 : nextLine;
      return true;
    }, {
      alt: ["paragraph", "reference", "blockquote", "list"]
    });

    md.renderer.rules.paperdock_thinking_open = () => '<details class="pd-thinking-block">';
    md.renderer.rules.paperdock_thinking_summary = (tokens, index) =>
      `<summary>${escapeHtml(tokens[index].content || "Thinking")}</summary>`;
    md.renderer.rules.paperdock_thinking_close = () => "</details>";
  }

  function offsetHeadingTag(tag, offset) {
    const current = Number(String(tag || "").replace(/^h/i, ""));
    if (!Number.isFinite(current)) return tag;
    const level = Math.max(1, Math.min(6, current + (Number(offset) || 0)));
    return `h${level}`;
  }

  function renderToken(tokens, index, options, _env, self) {
    return self.renderToken(tokens, index, options);
  }

  function fallbackToHtml(markdown, options) {
    const headingOffset = Number.isFinite(options.headingOffset) ? options.headingOffset : 0;
    const lines = String(markdown || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let thinking = null;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      html.push(`<p>${escapeHtml(paragraph.join(" "))}</p>`);
      paragraph = [];
    };

    const flushThinking = () => {
      if (!thinking) return;
      flushParagraph();
      html.push(`<details class="pd-thinking-block"><summary>${escapeHtml(thinking.title || "Thinking")}</summary>${fallbackToHtml(thinking.lines.join("\n"), options)}</details>`);
      thinking = null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();
      if (thinking) {
        if (trimmed === ":::") {
          flushThinking();
        } else {
          thinking.lines.push(line);
        }
        continue;
      }
      if (trimmed.startsWith(":::paperdock-thinking")) {
        flushParagraph();
        thinking = {
          title: trimmed.slice(":::paperdock-thinking".length).trim() || "Thinking",
          lines: []
        };
        continue;
      }
      if (!trimmed) {
        flushParagraph();
        continue;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/);
      if (heading) {
        flushParagraph();
        const level = Math.max(1, Math.min(6, heading[1].length + headingOffset));
        html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
        continue;
      }

      paragraph.push(trimmed);
    }

    flushThinking();
    flushParagraph();
    return html.join("");
  }

  function isSafeUrl(url) {
    const value = String(url || "").trim().replace(/[\u0000-\u001F\u007F\s]+/g, "");
    if (!value) return false;
    return /^(https?:\/\/|mailto:|#)/i.test(value);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    toHtml
  };
})();
