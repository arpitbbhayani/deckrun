export type LintSeverity = "error" | "warning";

export interface LintIssue {
  rule: string;
  severity: LintSeverity;
  message: string;
  /** One-based source location. */
  line: number;
  /** One-based source location. */
  column: number;
  /** One-based slide number, omitted for document-wide issues. */
  slide?: number;
}

export interface LintResult {
  issues: LintIssue[];
  slides: number;
  errors: number;
  warnings: number;
}

/** Public so editor/CI integrations can explain the same density limits. */
export const LINT_LIMITS = {
  bulletsPerSlide: 9,
  proseWordsPerSlide: 160,
  headingCharacters: 72,
  revealsPerSlide: 12,
} as const;

interface SourceSlide {
  number: number;
  startLine: number;
  endLine: number;
  /** A useful location even when this is an empty trailing segment. */
  anchorLine: number;
  lines: string[];
}

interface FenceScan {
  masked: boolean[];
  issues: LintIssue[];
}

interface MathScan {
  masked: boolean[];
  issues: LintIssue[];
}

function spaces(value: string): string {
  return " ".repeat(value.length);
}

function splitSlides(lines: string[]): SourceSlide[] {
  const slides: SourceSlide[] = [];
  let start = 0;

  const add = (end: number, anchor: number): void => {
    slides.push({
      number: slides.length + 1,
      startLine: start + 1,
      endLine: Math.max(start + 1, end),
      anchorLine: Math.max(1, Math.min(lines.length, start + 1, anchor)),
      lines: lines.slice(start, end),
    });
  };

  for (let i = 0; i < lines.length; i += 1) {
    if (/^[ \t]*---[ \t]*$/.test(lines[i])) {
      add(i, i + 1);
      start = i + 1;
    }
  }
  add(lines.length, Math.min(lines.length, start + 1));
  return slides;
}

/** Mask HTML comments without moving any subsequent source column. */
function maskComments(lines: string[]): string[] {
  let inComment = false;
  return lines.map((line) => {
    let out = "";
    let at = 0;
    while (at < line.length) {
      if (inComment) {
        const end = line.indexOf("-->", at);
        if (end < 0) {
          out += spaces(line.slice(at));
          at = line.length;
        } else {
          out += spaces(line.slice(at, end + 3));
          at = end + 3;
          inComment = false;
        }
      } else {
        const begin = line.indexOf("<!--", at);
        if (begin < 0) {
          out += line.slice(at);
          at = line.length;
        } else {
          out += line.slice(at, begin);
          const end = line.indexOf("-->", begin + 4);
          if (end < 0) {
            out += spaces(line.slice(begin));
            at = line.length;
            inComment = true;
          } else {
            out += spaces(line.slice(begin, end + 3));
            at = end + 3;
          }
        }
      }
    }
    return out;
  });
}

/** Inline code is literal: examples containing `{reveal}` are not commands. */
function maskInlineCode(line: string): string {
  return line.replace(/(`+)([^\n]*?)\1/g, (whole) => spaces(whole));
}

function issue(
  rule: string,
  severity: LintSeverity,
  message: string,
  line: number,
  column: number,
  slide?: number
): LintIssue {
  return { rule, severity, message, line, column, ...(slide ? { slide } : {}) };
}

function scanFences(slide: SourceSlide): FenceScan {
  const masked = slide.lines.map(() => false);
  const issues: LintIssue[] = [];
  let open: {
    char: "`" | "~";
    length: number;
    index: number;
    column: number;
  } | null = null;

  for (let i = 0; i < slide.lines.length; i += 1) {
    const line = slide.lines[i];
    if (open) {
      masked[i] = true;
      const close = line.match(/^[ \t]*(`+|~+)[ \t]*$/);
      if (close && close[1][0] === open.char && close[1].length >= open.length) {
        open = null;
      }
      continue;
    }

    const match = line.match(/^([ \t]*)(`{3,}|~{3,})(.*)$/);
    if (!match) continue;
    masked[i] = true;
    const info = match[3].trim();
    open = {
      char: match[2][0] as "`" | "~",
      length: match[2].length,
      index: i,
      column: match[1].length + 1,
    };
    if (!info) {
      issues.push(issue(
        "fence-language",
        "warning",
        "Add a language after the opening code fence so the block can be highlighted.",
        slide.startLine + i,
        open.column,
        slide.number
      ));
    }
  }

  if (open) {
    issues.push(issue(
      "unclosed-fence",
      "error",
      `The ${open.char.repeat(open.length)} code fence is not closed.`,
      slide.startLine + open.index,
      open.column,
      slide.number
    ));
  }

  return { masked, issues };
}

function escapedAt(line: string, at: number): boolean {
  let slashes = 0;
  for (let i = at - 1; i >= 0 && line[i] === "\\"; i -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function scanMath(
  slide: SourceSlide,
  lines: string[],
  fenceMask: boolean[]
): MathScan {
  const masked = slide.lines.map(() => false);
  const issues: LintIssue[] = [];
  let dollars: { index: number; column: number } | null = null;
  let brackets: { index: number; column: number } | null = null;

  const maskThrough = (from: number, to: number): void => {
    for (let i = from; i <= to; i += 1) masked[i] = true;
  };

  for (let i = 0; i < lines.length; i += 1) {
    if (fenceMask[i]) continue;
    const line = maskInlineCode(lines[i]);
    const tokens = /\$\$|\\\[|\\\]/g;
    let token: RegExpExecArray | null;
    while ((token = tokens.exec(line)) !== null) {
      if (escapedAt(line, token.index)) continue;
      const value = token[0];
      const column = token.index + 1;
      if (value === "$$") {
        if (dollars) {
          maskThrough(dollars.index, i);
          dollars = null;
        } else {
          dollars = { index: i, column };
        }
      } else if (value === "\\[") {
        if (brackets) {
          issues.push(issue(
            "unclosed-math",
            "error",
            "A new \\[ display equation starts before the previous one is closed with \\].",
            slide.startLine + i,
            column,
            slide.number
          ));
        } else {
          brackets = { index: i, column };
        }
      } else if (brackets) {
        maskThrough(brackets.index, i);
        brackets = null;
      } else {
        issues.push(issue(
          "unclosed-math",
          "error",
          "This \\] display-math delimiter has no matching \\[.",
          slide.startLine + i,
          column,
          slide.number
        ));
      }
    }
  }

  if (dollars) {
    maskThrough(dollars.index, Math.max(0, lines.length - 1));
    issues.push(issue(
      "unclosed-math",
      "error",
      "Display math opened with $$ is not closed with another $$.",
      slide.startLine + dollars.index,
      dollars.column,
      slide.number
    ));
  }
  if (brackets) {
    maskThrough(brackets.index, Math.max(0, lines.length - 1));
    issues.push(issue(
      "unclosed-math",
      "error",
      "Display math opened with \\[ is not closed with \\].",
      slide.startLine + brackets.index,
      brackets.column,
      slide.number
    ));
  }

  return { masked, issues };
}

function cleanHeading(value: string): string {
  return value
    .replace(/\{reveal\}/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_~`]/g, "")
    .replace(/\\([\\`*{}\[\]()#+.!_-])/g, "$1")
    .trim();
}

function wordCount(value: string): number {
  const words = value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return words?.length ?? 0;
}

function proseFrom(line: string): string {
  if (/^[ \t]{0,3}#{1,6}(?:[ \t]+|$)/.test(line)) return "";
  if (/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+/.test(line)) return "";
  if (/^[ \t]*\|.*\|[ \t]*$/.test(line)) return "";
  if (/^[ \t]*<\/?(?:table|thead|tbody|tr|td|th|svg|iframe|video)\b/i.test(line)) return "";
  return line
    .replace(/\{reveal\}/g, " ")
    .replace(/^[ \t]*>[ \t]?/, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[|*_~#>{}\[\]()`]/g, " ");
}

function scanImages(
  slide: SourceSlide,
  lines: string[],
  unavailable: boolean[]
): LintIssue[] {
  const issues: LintIssue[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (unavailable[i]) continue;
    const line = maskInlineCode(lines[i]);
    const images = /!\[([^\]]*)\]\(([^)\n]*)\)/g;
    let match: RegExpExecArray | null;
    while ((match = images.exec(line)) !== null) {
      const sourceLine = slide.startLine + i;
      const imageColumn = match.index + 1;
      if (!match[1].trim()) {
        issues.push(issue(
          "image-alt",
          "warning",
          "Give this image concise alt text for accessibility and failed-image fallback.",
          sourceLine,
          imageColumn + 2,
          slide.number
        ));
      }

      const opacityAt = match[0].search(/\bopacity\b/i);
      if (opacityAt >= 0) {
        const directive = /\bopacity\s*(?:(?:=|:)\s*)?(-?(?:\d+(?:\.\d*)?|\.\d+))/i.exec(match[0]);
        const opacity = directive ? Number.parseFloat(directive[1]) : Number.NaN;
        if (!directive || !Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
          issues.push(issue(
            "image-opacity",
            "warning",
            "Image opacity must be a number from 0 to 1.",
            sourceLine,
            imageColumn + opacityAt,
            slide.number
          ));
        }
      }
    }
  }
  return issues;
}

function scanReveals(
  slide: SourceSlide,
  activeLines: string[],
  commentLines: string[],
  unavailable: boolean[]
): { issues: LintIssue[]; count: number } {
  const issues: LintIssue[] = [];
  let count = 0;

  for (let i = 0; i < activeLines.length; i += 1) {
    if (unavailable[i]) continue;
    const line = maskInlineCode(activeLines[i]);
    const candidates = /\{[^{}\n]*reveal[^{}\n]*\}/gi;
    let candidate: RegExpExecArray | null;
    let exactOnLine = 0;
    while ((candidate = candidates.exec(line)) !== null) {
      if (candidate[0] !== "{reveal}") {
        issues.push(issue(
          "reveal-marker",
          "error",
          "Reveal markers use the exact lowercase form {reveal}.",
          slide.startLine + i,
          candidate.index + 1,
          slide.number
        ));
        continue;
      }

      count += 1;
      exactOnLine += 1;
      const before = line.slice(0, candidate.index);
      const after = line.slice(candidate.index + candidate[0].length);

      if (exactOnLine > 1) {
        issues.push(issue(
          "reveal-marker",
          "error",
          "Use at most one reveal marker on a Markdown block.",
          slide.startLine + i,
          candidate.index + 1,
          slide.number
        ));
      }
      if (after.trim()) {
        issues.push(issue(
          "reveal-marker",
          "error",
          "An inline reveal marker must be the last content on its Markdown block.",
          slide.startLine + i,
          candidate.index + 1,
          slide.number
        ));
      }

      if (!before.trim()) {
        let next = i + 1;
        while (next < commentLines.length && !commentLines[next].trim()) next += 1;
        const nextText = next < commentLines.length
          ? maskInlineCode(commentLines[next]).trim()
          : "";
        if (!nextText || nextText === "{reveal}") {
          issues.push(issue(
            "reveal-marker",
            "error",
            "A standalone reveal marker must be followed by a Markdown block on the same slide.",
            slide.startLine + i,
            candidate.index + 1,
            slide.number
          ));
        }
      }
    }

    // Catch common half-written forms that have only one brace.  The more
    // general candidate expression above owns complete-but-misspelled forms.
    const withoutCompleteCandidates = line.replace(
      /\{[^{}\n]*reveal[^{}\n]*\}/gi,
      (whole) => spaces(whole)
    );
    const incomplete = /(?:\{\s*reveal\b(?![^{}]*\})|(?<!\{)\breveal\s*\})/ig;
    let broken: RegExpExecArray | null;
    while ((broken = incomplete.exec(withoutCompleteCandidates)) !== null) {
      issues.push(issue(
        "reveal-marker",
        "error",
        "This reveal marker is missing a brace; use {reveal}.",
        slide.startLine + i,
        broken.index + 1,
        slide.number
      ));
    }
  }

  if (count > LINT_LIMITS.revealsPerSlide) {
    const first = activeLines.findIndex((line) => line.includes("{reveal}"));
    issues.push(issue(
      "reveal-count",
      "warning",
      `This slide has ${count} reveal steps; keep it to ${LINT_LIMITS.revealsPerSlide} or fewer.`,
      slide.startLine + Math.max(0, first),
      first >= 0 ? activeLines[first].indexOf("{reveal}") + 1 : 1,
      slide.number
    ));
  }

  return { issues, count };
}

function lintSlide(slide: SourceSlide): LintIssue[] {
  const issues: LintIssue[] = [];
  const commentLines = maskComments(slide.lines);
  const fence = scanFences(slide);
  issues.push(...fence.issues);

  const math = scanMath(slide, commentLines, fence.masked);
  issues.push(...math.issues);

  const unavailable = slide.lines.map((_, i) => fence.masked[i] || math.masked[i]);
  const activeLines = commentLines.map((line, i) => unavailable[i] ? spaces(line) : line);

  // Notes and comments do not make a rendered slide non-empty.  Code and
  // display math do, so this check uses the comment mask before other masks.
  if (!commentLines.join("\n").trim()) {
    issues.push(issue(
      "empty-slide",
      "error",
      "This slide has no visible content.",
      slide.anchorLine,
      1,
      slide.number
    ));
  }

  let bullets = 0;
  let firstBullet = -1;
  let proseWords = 0;
  let firstProse = -1;

  for (let i = 0; i < activeLines.length; i += 1) {
    const line = maskInlineCode(activeLines[i]);
    const bullet = /^[ \t]*(?:[-+*]|\d+[.)])[ \t]+/.test(line);
    if (bullet) {
      if (firstBullet < 0) firstBullet = i;
      bullets += 1;
    }

    const heading = line.match(/^[ \t]{0,3}#{1,6}[ \t]+(.+?)\s*#*\s*$/);
    if (heading) {
      const clean = cleanHeading(heading[1]);
      if (clean.length > LINT_LIMITS.headingCharacters) {
        issues.push(issue(
          "heading-length",
          "warning",
          `This heading is ${clean.length} characters; keep headings to ${LINT_LIMITS.headingCharacters} or fewer.`,
          slide.startLine + i,
          line.indexOf("#") + 1,
          slide.number
        ));
      }
    }

    const prose = wordCount(proseFrom(line));
    if (prose > 0 && firstProse < 0) firstProse = i;
    proseWords += prose;
  }

  if (bullets > LINT_LIMITS.bulletsPerSlide) {
    issues.push(issue(
      "bullet-count",
      "warning",
      `This slide has ${bullets} bullets; keep it to ${LINT_LIMITS.bulletsPerSlide} or fewer.`,
      slide.startLine + Math.max(0, firstBullet),
      1,
      slide.number
    ));
  }

  if (proseWords > LINT_LIMITS.proseWordsPerSlide) {
    issues.push(issue(
      "prose-density",
      "warning",
      `This slide has about ${proseWords} prose words; keep it to ${LINT_LIMITS.proseWordsPerSlide} or fewer.`,
      slide.startLine + Math.max(0, firstProse),
      1,
      slide.number
    ));
  }

  issues.push(...scanImages(slide, commentLines, unavailable));
  issues.push(...scanReveals(slide, activeLines, commentLines, unavailable).issues);
  return issues;
}

/** Fast, browser-free checks for mistakes that commonly break projected decks. */
export function lintMarkdown(markdown: string): LintResult {
  const normalized = String(markdown ?? "").replace(/\r\n?/g, "\n");
  if (!normalized.trim()) {
    const issues = [issue(
      "empty-deck",
      "error",
      "The deck has no Markdown content.",
      1,
      1
    )];
    return { issues, slides: 0, errors: 1, warnings: 0 };
  }

  const sourceLines = normalized.split("\n");
  const slides = splitSlides(sourceLines);
  const issues = slides.flatMap(lintSlide);

  issues.sort((a, b) =>
    a.line - b.line ||
    a.column - b.column ||
    (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1) ||
    a.rule.localeCompare(b.rule)
  );

  const errors = issues.filter((item) => item.severity === "error").length;
  const warnings = issues.length - errors;
  return { issues, slides: slides.length, errors, warnings };
}
