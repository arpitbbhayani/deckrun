/**
 * Static deck authoring rules, run by `deckrun lint`.
 *
 * Browser-free checks that report the source line, slide number, severity,
 * and rule id. Errors fail the command; warnings fail by default too (so the
 * command is CI-friendly), unless `--max-warnings` raises or removes the
 * threshold.
 */

export type LintSeverity = "error" | "warning";

export interface LintIssue {
  rule: string;
  severity: LintSeverity;
  message: string;
  line: number;
  column: number;
  /** 1-based slide number, when the issue belongs to a specific slide. */
  slide?: number;
}

export interface LintResult {
  issues: LintIssue[];
  slides: number;
  errors: number;
  warnings: number;
}

const HEADING_MAX = 80;
const PROSE_WORDS_MAX = 220;
const BULLETS_MAX = 15;
const REVEALS_PER_SLIDE_MAX = 12;

interface SlideRegion {
  text: string;
  /** Line number (1-based) at which this slide's source starts. */
  startLine: number;
}

/** Split the deck into slides, recording each one's starting line number. */
function splitSlides(markdown: string): SlideRegion[] {
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const regions: SlideRegion[] = [];
  let buffer: string[] = [];
  let startLine = 1;

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text.length > 0) {
      regions.push({ text, startLine });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^[ \t]*---[ \t]*$/.test(line)) {
      // Separator. The slide spans lines [startLine .. current-1].
      const text = buffer.join("\n").trim();
      if (text.length > 0) regions.push({ text, startLine });
      buffer = [];
      startLine = i + 2; // next slide starts after the separator line
    } else {
      if (buffer.length === 0) startLine = i + 1;
      buffer.push(line);
    }
  }
  if (buffer.length > 0) {
    const text = buffer.join("\n").trim();
    if (text.length > 0) regions.push({ text, startLine });
  }
  return regions;
}

/** Absolute (1-based) line of a 0-based offset within a slide region. */
function lineOf(region: SlideRegion, offset: number): number {
  const before = region.text.slice(0, offset);
  return region.startLine + before.split("\n").length - 1;
}

export function lintMarkdown(markdown: string): LintResult {
  const issues: LintIssue[] = [];
  const slides = splitSlides(markdown);

  if (slides.length === 0) {
    issues.push({
      rule: "empty-deck",
      severity: "error",
      message: "The deck has no slides.",
      line: 1,
      column: 1,
    });
    return { issues, slides: 0, errors: 1, warnings: 0 };
  }

  const add = (issue: Omit<LintIssue, "line" | "column"> & { line: number; column: number }) =>
    issues.push(issue);

  slides.forEach((region, slideIndex) => {
    const slideNumber = slideIndex + 1;
    const lines = region.text.split("\n");
    const rel = (line: number) => region.startLine + line;

    // ── Empty slide ─────────────────────────────────────────────────────
    if (region.text.trim().length === 0) {
      add({
        rule: "empty-slide",
        severity: "error",
        message: "Slide is empty.",
        line: region.startLine,
        column: 1,
        slide: slideNumber,
      });
      return;
    }

    // ── Unclosed code fences ───────────────────────────────────────────
    let fenceState: "open" | "closed" = "closed";
    let fenceOpenLine = -1;
    let lastFenceLine = -1;
    let untagged = false;

    for (let i = 0; i < lines.length; i++) {
      const m = /^[ \t]*`{3,}(.*)$/.exec(lines[i]);
      if (!m) continue;
      lastFenceLine = i;
      const token = m[1].trim();
      if (fenceState === "open") {
        fenceState = "closed";
      } else {
        fenceState = "open";
        fenceOpenLine = i;
        if (token.length === 0) untagged = true;
      }
    }

    if (fenceState === "open") {
      add({
        rule: "unclosed-fence",
        severity: "error",
        message: "Code fence is not closed.",
        line: rel(Math.max(0, fenceOpenLine)),
        column: 1,
        slide: slideNumber,
      });
    } else if (untagged) {
      // Only report the first untagged fence on the slide.
      for (let i = 0; i < lines.length; i++) {
        const m = /^[ \t]*`{3,}(.*)$/.exec(lines[i]);
        if (m && m[1].trim().length === 0) {
          add({
            rule: "untagged-fence",
            severity: "warning",
            message: "Code fence has no language; syntax highlighting won't apply.",
            line: rel(i),
            column: m[0].search(/`/) + 1,
            slide: slideNumber,
          });
          break;
        }
      }
      void lastFenceLine;
    }

    // ── Unclosed display math ──────────────────────────────────────────
    const dollarCount = (region.text.match(/\$\$/g) || []).length;
    if (dollarCount % 2 === 1) {
      const at = region.text.indexOf("$$");
      add({
        rule: "unclosed-math",
        severity: "error",
        message: "Display math ($$ ... $$) is not closed.",
        line: lineOf(region, at),
        column: 1,
        slide: slideNumber,
      });
    }

    // ── Overly long headings ───────────────────────────────────────────
    for (let i = 0; i < lines.length; i++) {
      const m = /^#{1,6}[ \t]+(.+?)[ \t]*$/.exec(lines[i]);
      if (m && m[1].length > HEADING_MAX) {
        add({
          rule: "long-heading",
          severity: "warning",
          message: `Heading is ${m[1].length} characters (over ${HEADING_MAX}).`,
          line: rel(i),
          column: 1,
          slide: slideNumber,
        });
      }
    }

    // ── Excessive prose or bullets ─────────────────────────────────────
    const proseWords = (region.text.match(/[^\s|]+/g) || []).filter(
      (w) => !/^#|^\d+\.$|^[-*+]$|^---$/.test(w),
    ).length;
    if (proseWords > PROSE_WORDS_MAX) {
      add({
        rule: "dense-prose",
        severity: "warning",
        message: `Slide has roughly ${proseWords} words (over ${PROSE_WORDS_MAX}); consider splitting it.`,
        line: region.startLine,
        column: 1,
        slide: slideNumber,
      });
    }

    let bullets = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^[ \t]*[-*+][ \t]/.test(lines[i])) bullets++;
    }
    if (bullets > BULLETS_MAX) {
      add({
        rule: "dense-bullets",
        severity: "warning",
        message: `Slide has ${bullets} bullet items (over ${BULLETS_MAX}).`,
        line: region.startLine,
        column: 1,
        slide: slideNumber,
      });
    }

    // ── Image issues: missing alt text ─────────────────────────────────
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const altRe = /!\[([^\]]*)\]\([^)]*\)/g;
      let m: RegExpExecArray | null;
      while ((m = altRe.exec(line)) !== null) {
        const full = m[0];
        const alt = m[1];
        if (alt.trim().length === 0) {
          add({
            rule: "image-alt",
            severity: "warning",
            message: "Image has no alt text.",
            line: rel(i),
            column: line.indexOf(full) + 1,
            slide: slideNumber,
          });
        }
      }
    }

    // ── Invalid image opacity ──────────────────────────────────────────
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const opacityRe = /!\[[^\]]*\]\([^)]*"([^"]*opacity[^"]*)"\)/gi;
      let m: RegExpExecArray | null;
      while ((m = opacityRe.exec(line)) !== null) {
        const op = m[1].match(/opacity[=:]?\s*([0-9]*\.?[0-9]+)/i);
        const value = op ? parseFloat(op[1]) : NaN;
        if (Number.isNaN(value) || value < 0 || value > 1) {
          add({
            rule: "image-opacity",
            severity: "error",
            message: `Image opacity must be between 0 and 1 (got '${op ? op[1] : m[1]}').`,
            line: rel(i),
            column: line.indexOf(m[0]) + 1,
            slide: slideNumber,
          });
        }
      }
    }

    // ── Reveal markers: malformed or excessive ─────────────────────────
    const malformed = (region.text.match(/\{reveal/g) || []).length -
      (region.text.match(/\{reveal\}/g) || []).length;
    const stray = (region.text.match(/reveal\}/g) || []).length -
      (region.text.match(/\{reveal\}/g) || []).length;

    if (malformed > 0) {
      const at = region.text.indexOf("{reveal");
      add({
        rule: "malformed-reveal",
        severity: "error",
        message: "'{reveal}' marker is not closed with '}'.",
        line: lineOf(region, at),
        column: 1,
        slide: slideNumber,
      });
    } else if (stray > 0) {
      const at = region.text.indexOf("reveal}");
      add({
        rule: "malformed-reveal",
        severity: "warning",
        message: "Stray 'reveal}' marker without an opening '{reveal'.",
        line: lineOf(region, at),
        column: 1,
        slide: slideNumber,
      });
    }

    const revealCount = (region.text.match(/\{reveal\}/g) || []).length;
    if (revealCount > REVEALS_PER_SLIDE_MAX) {
      add({
        rule: "excessive-reveals",
        severity: "warning",
        message: `Slide has ${revealCount} reveal markers (over ${REVEALS_PER_SLIDE_MAX}).`,
        line: region.startLine,
        column: 1,
        slide: slideNumber,
      });
    }
  });

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.length - errors;
  return { issues, slides: slides.length, errors, warnings };
}