window.PaperDockMath = (() => {
  const PLACEHOLDER_PREFIX = "\uE000AMATH";
  const PLACEHOLDER_SUFFIX = "\uE001";
  const DISPLAY_ENVIRONMENTS = new Set([
    "align",
    "align*",
    "aligned",
    "array",
    "bmatrix",
    "cases",
    "equation",
    "equation*",
    "gather",
    "gather*",
    "matrix",
    "multline",
    "multline*",
    "pmatrix",
    "smallmatrix",
    "split",
    "subequations",
    "vmatrix",
    "Vmatrix"
  ]);

  const KATEX_MACROS = {
    "\\argmax": "\\operatorname*{arg\\,max}",
    "\\argmin": "\\operatorname*{arg\\,min}",
    "\\softmax": "\\operatorname{softmax}",
    "\\diag": "\\operatorname{diag}",
    "\\tr": "\\operatorname{tr}",
    "\\rank": "\\operatorname{rank}",
    "\\Var": "\\operatorname{Var}",
    "\\Cov": "\\operatorname{Cov}",
    "\\E": "\\mathbb{E}",
    "\\R": "\\mathbb{R}",
    "\\N": "\\mathbb{N}",
    "\\Z": "\\mathbb{Z}"
  };

  const COMMANDS = {
    alpha: "&alpha;",
    beta: "&beta;",
    gamma: "&gamma;",
    delta: "&delta;",
    epsilon: "&epsilon;",
    varepsilon: "&epsilon;",
    zeta: "&zeta;",
    eta: "&eta;",
    theta: "&theta;",
    vartheta: "&theta;",
    iota: "&iota;",
    kappa: "&kappa;",
    lambda: "&lambda;",
    mu: "&mu;",
    nu: "&nu;",
    xi: "&xi;",
    pi: "&pi;",
    rho: "&rho;",
    sigma: "&sigma;",
    tau: "&tau;",
    upsilon: "&upsilon;",
    phi: "&phi;",
    varphi: "&phi;",
    chi: "&chi;",
    psi: "&psi;",
    omega: "&omega;",
    Gamma: "&Gamma;",
    Delta: "&Delta;",
    Theta: "&Theta;",
    Lambda: "&Lambda;",
    Xi: "&Xi;",
    Pi: "&Pi;",
    Sigma: "&Sigma;",
    Phi: "&Phi;",
    Psi: "&Psi;",
    Omega: "&Omega;",
    sim: "&sim;",
    approx: "&asymp;",
    simeq: "&simeq;",
    neq: "&ne;",
    le: "&le;",
    leq: "&le;",
    ge: "&ge;",
    geq: "&ge;",
    times: "&times;",
    cdot: "&middot;",
    pm: "&plusmn;",
    mp: "&#8723;",
    infty: "&infin;",
    partial: "&part;",
    nabla: "&nabla;",
    sum: "&sum;",
    prod: "&prod;",
    int: "&int;",
    forall: "&forall;",
    exists: "&exist;",
    in: "&isin;",
    notin: "&notin;",
    subset: "&sub;",
    subseteq: "&sube;",
    supset: "&sup;",
    supseteq: "&supe;",
    cup: "&cup;",
    cap: "&cap;",
    emptyset: "&empty;",
    varnothing: "&empty;",
    to: "&rarr;",
    rightarrow: "&rarr;",
    leftarrow: "&larr;",
    leftrightarrow: "&harr;",
    Rightarrow: "&rArr;",
    Leftarrow: "&lArr;",
    Leftrightarrow: "&hArr;",
    mapsto: "&#8614;",
    propto: "&prop;",
    degree: "&deg;",
    ldots: "&hellip;",
    dots: "&hellip;",
    cdots: "&ctdot;",
    ell: "&#8467;",
    log: "log",
    ln: "ln",
    exp: "exp",
    sin: "sin",
    cos: "cos",
    tan: "tan",
    min: "min",
    max: "max",
    argmin: "arg min",
    argmax: "arg max",
    softmax: "softmax"
  };

  const SPACING_COMMANDS = new Set([" ", ",", ";", ":", "quad", "qquad"]);
  const IGNORED_COMMANDS = new Set(["left", "right", "big", "Big", "bigg", "Bigg"]);
  const FONT_COMMANDS = new Set(["text", "mathrm", "mathbf", "mathit", "mathsf", "mathtt", "mathbb", "mathcal", "operatorname"]);

  function extractMath(markdown) {
    const segments = [];
    const text = splitFencedSections(String(markdown || ""))
      .map((section) => {
        if (section.type === "code") return section.text;
        return protectMathInText(section.text, segments);
      })
      .join("");
    return { text, segments };
  }

  function normalizeLooseMath(markdown) {
    return splitFencedSections(String(markdown || ""))
      .map((section) => {
        if (section.type === "code") return section.text;
        return protectInlineCodeAndMath(section.text, normalizeLooseMathText);
      })
      .join("");
  }

  function restoreMath(html, segments) {
    let output = String(html || "");
    (segments || []).forEach((segment, index) => {
      const placeholder = makePlaceholder(index);
      const rendered = renderMath(segment.tex, segment.display);
      const escaped = escapeRegExp(placeholder);
      const paragraphPattern = new RegExp(`<p>\\s*${escaped}\\s*</p>`, "g");
      output = output.replace(paragraphPattern, rendered);
      output = output.replace(new RegExp(escaped, "g"), rendered);
    });
    return output;
  }

  function renderInlineMath(text) {
    const extracted = extractMath(String(text || ""));
    return restoreMath(extracted.text, extracted.segments);
  }

  function renderDisplayMath(tex) {
    return renderMath(tex, true);
  }

  function renderMath(tex, display) {
    const source = normalizeTex(tex);
    if (!source) return "";

    const katex = getKatex();
    if (katex?.renderToString) {
      try {
        const rendered = katex.renderToString(source, {
          displayMode: Boolean(display),
          throwOnError: false,
          strict: "ignore",
          trust: false,
          output: "htmlAndMathml",
          macros: KATEX_MACROS
        });
        return `<span class="pd-math ${display ? "pd-math-display" : "pd-math-inline"}">${rendered}</span>`;
      } catch (_error) {
        return `<span class="pd-math pd-math-error ${display ? "pd-math-display" : "pd-math-inline"}">${escapeHtml(source)}</span>`;
      }
    }

    return `<span class="pd-math ${display ? "pd-math-display" : "pd-math-inline"}">${renderExpression(source)}</span>`;
  }

  function splitFencedSections(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const sections = [];
    let buffer = [];
    let inFence = null;

    const flush = (type) => {
      if (!buffer.length) return;
      sections.push({ type, text: buffer.join("") });
      buffer = [];
    };

    lines.forEach((line, index) => {
      const hasNewline = index < lines.length - 1;
      const value = hasNewline ? `${line}\n` : line;
      const fence = line.match(/^ {0,3}(`{3,}|~{3,})/);

      if (!inFence && fence) {
        flush("markdown");
        inFence = { marker: fence[1][0], length: fence[1].length };
        buffer.push(value);
        return;
      }

      if (inFence) {
        buffer.push(value);
        if (isClosingFence(line, inFence)) {
          flush("code");
          inFence = null;
        }
        return;
      }

      buffer.push(value);
    });

    flush(inFence ? "code" : "markdown");
    return sections;
  }

  function protectMathInText(text, segments) {
    let output = "";
    let index = 0;

    while (index < text.length) {
      const codeSpan = readCodeSpan(text, index);
      if (codeSpan) {
        output += codeSpan.value;
        index = codeSpan.next;
        continue;
      }

      const displayStart = readDisplayStart(text, index);
      if (displayStart) {
        const end = findClosingDelimiter(text, displayStart.contentStart, displayStart.close);
        if (end >= 0) {
          const tex = text.slice(displayStart.contentStart, end);
          output += pushSegment(segments, tex, true);
          index = end + displayStart.close.length;
          continue;
        }
      }

      const envStart = readEnvironmentStart(text, index);
      if (envStart) {
        const close = `\\end{${envStart.name}}`;
        const end = text.indexOf(close, envStart.contentStart);
        if (end >= 0) {
          const tex = text.slice(index, end + close.length);
          output += pushSegment(segments, tex, true);
          index = end + close.length;
          continue;
        }
      }

      if (text.startsWith("\\$", index) && !isEscaped(text, index)) {
        const end = findClosingEscapedDollar(text, index + 2);
        if (end >= 0) {
          output += pushSegment(segments, text.slice(index + 2, end), false);
          index = end + 2;
          continue;
        }
      }

      if (text.startsWith("\\(", index)) {
        const end = findClosingDelimiter(text, index + 2, "\\)");
        if (end >= 0) {
          output += pushSegment(segments, text.slice(index + 2, end), false);
          index = end + 2;
          continue;
        }
      }

      if (text[index] === "$" && shouldOpenDollar(text, index)) {
        const end = findClosingDollar(text, index + 1);
        if (end >= 0) {
          output += pushSegment(segments, text.slice(index + 1, end), false);
          index = end + 1;
          continue;
        }
      }

      output += text[index];
      index += 1;
    }

    return output;
  }

  function protectInlineCodeAndMath(text, transform) {
    const segments = [];
    const protectedText = protectMathInText(String(text || ""), segments);
    let output = "";
    let buffer = "";
    let index = 0;
    const flush = () => {
      if (!buffer) return;
      output += transform(buffer);
      buffer = "";
    };
    while (index < protectedText.length) {
      const codeSpan = readCodeSpan(protectedText, index);
      if (codeSpan) {
        flush();
        output += codeSpan.value;
        index = codeSpan.next;
        continue;
      }
      buffer += protectedText[index];
      index += 1;
    }
    flush();
    const transformed = output;
    return restorePlaceholders(transformed, segments);
  }

  function normalizeLooseMathText(text) {
    return String(text || "")
      .split("\n")
      .map(normalizeLooseMathLine)
      .join("\n");
  }

  function normalizeLooseMathLine(line) {
    if (!line.trim()) return line;
    if (/^\s{0,3}(#{1,6}|>|[-*+]\s+\[[ xX]\])/.test(line)) {
      return normalizeMathInNaturalLine(line);
    }
    if (/^\s{0,3}([-*+]|\d+[.)])\s+/.test(line)) {
      return normalizeMathInNaturalLine(line);
    }
    return normalizeMathInNaturalLine(line);
  }

  function normalizeMathInNaturalLine(line) {
    const source = String(line || "");
    const ranges = collectLooseMathRanges(source);
    if (!ranges.length) return source;
    let output = source;
    mergeRanges(ranges).reverse().forEach((range) => {
      const raw = output.slice(range.start, range.end);
      if (!shouldWrapLooseMath(raw, output, range.start)) return;
      output = `${output.slice(0, range.start)}\\(${normalizeLooseTex(raw)}\\)${output.slice(range.end)}`;
    });
    return output;
  }

  function collectLooseMathRanges(line) {
    const ranges = [];
    collectRegexRanges(line, /\b[A-Za-z][A-Za-z0-9]*\s*\([^()\n]{1,120}\)/g, ranges);
    collectRegexRanges(line, /\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9']+|\^[A-Za-z0-9']+)+(?:\s*(?:=|->|←|→|\+|-|\*|\/|·|,|;)\s*[A-Za-z0-9_{}^\\()[\]|+\-*/·.,;:' ]+)?/g, ranges);
    collectRegexRanges(line, /\b[A-Za-z]\([^()\n]{1,120}\s*\|\s*[^()\n]{1,120}\)/g, ranges);
    return ranges.map((range) => expandLooseMathRange(line, range));
  }

  function collectRegexRanges(line, regex, ranges) {
    let match;
    while ((match = regex.exec(line)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
      if (match[0].length === 0) regex.lastIndex += 1;
    }
  }

  function expandLooseMathRange(line, range) {
    let start = range.start;
    let end = range.end;
    while (start > 0 && /[([{]/.test(line[start - 1]) && !isLikelyMarkdownBoundary(line, start - 1)) start -= 1;
    while (end < line.length && /[\])}'"]/.test(line[end])) end += 1;
    while (end < line.length) {
      const tail = line.slice(end);
      const op = tail.match(/^\s*(=|->|←|→|\+|-|\*|\/|·|,|;|\|)\s*/);
      if (!op) break;
      const operand = tail.slice(op[0].length).match(/^[A-Za-z0-9_{}^\\()[\]'+\-*/·.,;: ]{1,120}/);
      if (!operand || !/[A-Za-z0-9_]/.test(operand[0])) break;
      end += op[0].length + trimOperandEnd(operand[0]).length;
    }
    return { start, end };
  }

  function trimOperandEnd(value) {
    return String(value || "").replace(/\s+$/g, "").replace(/[，。；：、]+$/g, "");
  }

  function isLikelyMarkdownBoundary(line, index) {
    return index === 0 || /\s/.test(line[index - 1] || "");
  }

  function mergeRanges(ranges) {
    const sorted = ranges
      .filter((range) => range.end > range.start)
      .sort((left, right) => left.start - right.start || right.end - left.end);
    const merged = [];
    for (const range of sorted) {
      const last = merged[merged.length - 1];
      if (!last || range.start > last.end) {
        merged.push({ ...range });
        continue;
      }
      last.end = Math.max(last.end, range.end);
    }
    return merged;
  }

  function shouldWrapLooseMath(value, source, offset) {
    const text = String(value || "").trim();
    if (!text || text.length < 2 || text.length > 180) return false;
    if (text.includes(PLACEHOLDER_PREFIX)) return false;
    if (/^https?:\/\//i.test(text)) return false;
    if (/^[A-Za-z]+$/.test(text)) return false;
    if (isInsideExistingMath(source, offset)) return false;
    if (/[A-Za-z]\w*_[A-Za-z0-9]+/.test(text)) return true;
    if (/[A-Za-z]\w*\^[A-Za-z0-9]+/.test(text)) return true;
    if (/\\[A-Za-z]+/.test(text)) return true;
    if (/[A-Za-z]\([^)]*[|=+\-*/_][^)]*\)/.test(text) && /[_^\\]|\b(?:hat|theta|alpha|beta|gamma|delta|sum|prod|frac)\b/.test(text)) return true;
    if (/(->|←|→|=|\+|·|\*)/.test(text) && /[A-Za-z]/.test(text) && /[_^()]/.test(text) && /\\|[_^]|\b(?:frac|sum|prod|theta|hat|mathbb|operatorname)\b/.test(text)) return true;
    return false;
  }

  function isInsideExistingMath(source, offset) {
    const before = String(source || "").slice(Math.max(0, offset - 3), offset);
    const after = String(source || "").slice(offset, offset + 3);
    return /\\\($/.test(before) || /^\)/.test(after);
  }

  function normalizeLooseTex(value) {
    return String(value || "")
      .replace(/→/g, "\\to ")
      .replace(/←/g, "\\leftarrow ")
      .replace(/->/g, "\\to ")
      .replace(/·/g, "\\cdot ")
      .replace(/\b([A-Za-z][A-Za-z0-9]*')_([A-Za-z0-9]+)/g, "$1_{$2}")
      .replace(/\b([A-Za-z][A-Za-z0-9]*)_([A-Za-z0-9]+)/g, "$1_{$2}")
      .replace(/\b([A-Za-z][A-Za-z0-9]*)\^([A-Za-z][A-Za-z0-9]*)/g, "$1^{$2}")
      .replace(/\b(tanh|softmax|MLP|GAT|CA|q|p)\s*\(/g, (match, name) => {
        if (name === "q" || name === "p") return `${name}(`;
        return `\\operatorname{${name}}(`;
      })
      .replace(/\s+/g, " ")
      .trim();
  }

  function restorePlaceholders(text, segments) {
    let output = String(text || "");
    (segments || []).forEach((segment, index) => {
      output = output.replace(new RegExp(escapeRegExp(makePlaceholder(index)), "g"), segment.display ? `\\[${segment.tex}\\]` : `\\(${segment.tex}\\)`);
    });
    return output;
  }

  function readDisplayStart(text, index) {
    if (text.startsWith("\\[", index)) {
      return { contentStart: index + 2, close: "\\]" };
    }
    if (text.startsWith("$$", index) && !isEscaped(text, index)) {
      return { contentStart: index + 2, close: "$$" };
    }
    return null;
  }

  function readEnvironmentStart(text, index) {
    if (text[index] !== "\\" || text.slice(index, index + 6) !== "\\begin") return null;
    const match = text.slice(index).match(/^\\begin\{([^}]+)\}/);
    if (!match || !DISPLAY_ENVIRONMENTS.has(match[1])) return null;
    return {
      name: match[1],
      contentStart: index + match[0].length
    };
  }

  function readCodeSpan(text, index) {
    if (text[index] !== "`") return null;
    let ticks = 1;
    while (text[index + ticks] === "`") ticks += 1;
    const marker = "`".repeat(ticks);
    const end = text.indexOf(marker, index + ticks);
    if (end < 0) return null;
    return {
      value: text.slice(index, end + ticks),
      next: end + ticks
    };
  }

  function findClosingDelimiter(text, start, delimiter) {
    let index = start;
    while (index < text.length) {
      if (text.startsWith(delimiter, index) && !isEscaped(text, index)) return index;
      index += 1;
    }
    return -1;
  }

  function findClosingDollar(text, start) {
    let index = start;
    while (index < text.length) {
      if (text[index] === "$" && shouldCloseDollar(text, index)) return index;
      index += 1;
    }
    return -1;
  }

  function findClosingEscapedDollar(text, start) {
    let index = start;
    while (index < text.length) {
      if (text.startsWith("\\$", index) && !isEscaped(text, index)) return index;
      index += 1;
    }
    return -1;
  }

  function shouldOpenDollar(text, index) {
    if (isEscaped(text, index) || text[index + 1] === "$") return false;
    const next = text[index + 1] || "";
    if (!next || /\s/.test(next)) return false;
    return true;
  }

  function shouldCloseDollar(text, index) {
    if (isEscaped(text, index) || text[index + 1] === "$") return false;
    const previous = text[index - 1] || "";
    const next = text[index + 1] || "";
    if (!previous || /\s/.test(previous)) return false;
    if (/\d/.test(next)) return false;
    return true;
  }

  function isEscaped(text, index) {
    let slashCount = 0;
    let cursor = index - 1;
    while (cursor >= 0 && text[cursor] === "\\") {
      slashCount += 1;
      cursor -= 1;
    }
    return slashCount % 2 === 1;
  }

  function isClosingFence(line, fence) {
    const escapedMarker = escapeRegExp(fence.marker);
    const pattern = new RegExp(`^ {0,3}${escapedMarker}{${fence.length},}\\s*$`);
    return pattern.test(line);
  }

  function pushSegment(segments, tex, display) {
    const index = segments.length;
    segments.push({ tex, display });
    return makePlaceholder(index);
  }

  function makePlaceholder(index) {
    return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
  }

  function renderExpression(tex) {
    let out = "";
    let index = 0;
    while (index < tex.length) {
      const char = tex[index];
      if (char === "\\") {
        const parsed = parseCommand(tex, index);
        out += parsed.html;
        index = parsed.next;
        continue;
      }
      if (char === "^" || char === "_") {
        const parsed = parseScript(tex, index + 1);
        const tag = char === "^" ? "sup" : "sub";
        out += `<${tag}>${renderExpression(parsed.value)}</${tag}>`;
        index = parsed.next;
        continue;
      }
      if (char === "{") {
        const group = readGroup(tex, index);
        if (group) {
          out += renderExpression(group.value);
          index = group.next;
          continue;
        }
      }
      if (char === "}") {
        index += 1;
        continue;
      }
      if (char === "~") {
        out += "&nbsp;";
        index += 1;
        continue;
      }
      out += escapeHtml(char);
      index += 1;
    }
    return out.replace(/\s+/g, " ").trim();
  }

  function parseCommand(tex, start) {
    if (tex[start + 1] === "\\" && !/[A-Za-z]/.test(tex[start + 2] || "")) {
      return { html: "<br>", next: start + 2 };
    }

    const special = tex[start + 1] || "";
    if (!/[A-Za-z]/.test(special)) {
      if (SPACING_COMMANDS.has(special)) {
        return { html: "&nbsp;", next: start + 2 };
      }
      return { html: escapeHtml(special), next: start + 2 };
    }

    let end = start + 1;
    while (end < tex.length && /[A-Za-z]/.test(tex[end])) end += 1;
    const name = tex.slice(start + 1, end);

    if (SPACING_COMMANDS.has(name)) {
      return { html: "&nbsp;", next: end };
    }
    if (IGNORED_COMMANDS.has(name)) {
      return { html: "", next: end };
    }
    if (name === "frac" || name === "dfrac" || name === "tfrac") {
      const top = readNextGroup(tex, end);
      const bottom = top ? readNextGroup(tex, top.next) : null;
      if (top && bottom) {
        return {
          html: `<span class="pd-math-frac"><span>${renderExpression(top.value)}</span><span>${renderExpression(bottom.value)}</span></span>`,
          next: bottom.next
        };
      }
    }
    if (name === "sqrt") {
      const group = readNextGroup(tex, end);
      if (group) {
        return {
          html: `<span class="pd-math-root"><span>&radic;</span><span>${renderExpression(group.value)}</span></span>`,
          next: group.next
        };
      }
    }
    if (FONT_COMMANDS.has(name)) {
      const group = readNextGroup(tex, end);
      if (group) {
        const className = `pd-math-${name.toLowerCase()}`;
        return {
          html: `<span class="${className}">${renderExpression(group.value)}</span>`,
          next: group.next
        };
      }
    }
    if (name === "begin" || name === "end") {
      const group = readNextGroup(tex, end);
      return { html: "", next: group ? group.next : end };
    }
    return {
      html: COMMANDS[name] || escapeHtml(name),
      next: end
    };
  }

  function parseScript(tex, start) {
    let index = skipSpaces(tex, start);
    const group = readGroup(tex, index);
    if (group) return group;
    if (tex[index] === "\\") {
      const parsed = parseCommand(tex, index);
      return {
        value: parsed.html,
        next: parsed.next
      };
    }
    return {
      value: tex[index] || "",
      next: index + 1
    };
  }

  function readNextGroup(tex, start) {
    const index = skipSpaces(tex, start);
    return readGroup(tex, index);
  }

  function readGroup(tex, start) {
    if (tex[start] !== "{") return null;
    let depth = 0;
    for (let index = start; index < tex.length; index += 1) {
      const char = tex[index];
      if (char === "\\" && index + 1 < tex.length) {
        index += 1;
        continue;
      }
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      if (depth === 0) {
        return {
          value: tex.slice(start + 1, index),
          next: index + 1
        };
      }
    }
    return null;
  }

  function skipSpaces(tex, index) {
    while (index < tex.length && /\s/.test(tex[index])) index += 1;
    return index;
  }

  function renderStandaloneMath(value) {
    const parsed = readStandaloneMath(value);
    return parsed ? renderMath(parsed.tex, parsed.display) : "";
  }

  function readStandaloneMath(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    if (text.startsWith("\\$") && text.endsWith("\\$") && text.length > 4) {
      return { tex: text.slice(2, -2), display: false };
    }
    if (text.startsWith("$$") && text.endsWith("$$") && text.length > 4) {
      return { tex: text.slice(2, -2), display: true };
    }
    if (text.startsWith("$") && text.endsWith("$") && text.length > 2 && !text.startsWith("$$")) {
      return { tex: text.slice(1, -1), display: false };
    }
    if (text.startsWith("\\(") && text.endsWith("\\)") && text.length > 4) {
      return { tex: text.slice(2, -2), display: false };
    }
    if (text.startsWith("\\[") && text.endsWith("\\]") && text.length > 4) {
      return { tex: text.slice(2, -2), display: true };
    }
    return null;
  }

  function normalizeTex(tex) {
    return decodeHtmlEntities(String(tex || ""))
      .replace(/\\\\(?=[A-Za-z])/g, "\\")
      .replace(/\u00a0/g, " ")
      .trim();
  }

  function getKatex() {
    return window.katex || globalThis.katex;
  }

  function decodeHtmlEntities(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return {
    normalizeLooseMath,
    extractMath,
    restoreMath,
    renderInlineMath,
    renderStandaloneMath,
    renderDisplayMath
  };
})();
