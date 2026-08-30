export interface LintIssue {
  rule: string;
  severity: "error" | "warning";
  message: string;
  line: number;
  column: number;
  slide?: number;
}

export interface LintResult {
  slides: number;
  errors: number;
  warnings: number;
  issues: LintIssue[];
}

export function lintMarkdown(markdown: string): LintResult {
  const issues: LintIssue[] = [];

  const trimmed = markdown.trim();
  if (!trimmed) {
    issues.push({
      rule: "empty-deck",
      severity: "error",
      message: "The deck is empty.",
      line: 1,
      column: 1,
    });
    return {
      slides: 0,
      errors: 1,
      warnings: 0,
      issues,
    };
  }

  const lines = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // Track slide boundaries
  interface SlideBoundary {
    slideIndex: number;
    startLine: number;
    endLine: number;
    lines: string[];
  }

  const slides: SlideBoundary[] = [];
  let curSlideLines: string[] = [];
  let curStartLine = 1;
  let slideIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^[ \t]*---[ \t]*$/.test(line)) {
      slides.push({
        slideIndex,
        startLine: curStartLine,
        endLine: i,
        lines: curSlideLines,
      });
      slideIndex++;
      curStartLine = i + 2;
      curSlideLines = [];
    } else {
      curSlideLines.push(line);
    }
  }
  slides.push({
    slideIndex,
    startLine: curStartLine,
    endLine: lines.length,
    lines: curSlideLines,
  });

  // Global & Slide checks
  let inCodeFence = false;
  let fenceStartLine = 1;
  let fenceStartCol = 1;

  let inDisplayMath = false;
  let mathStartLine = 1;
  let mathStartCol = 1;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // Determine current slide number
    const currentSlide =
      slides.find((s) => lineNum >= s.startLine && lineNum <= s.endLine)?.slideIndex ??
      1;

    // Check code fences
    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      if (!inCodeFence) {
        inCodeFence = true;
        fenceStartLine = lineNum;
        fenceStartCol = fenceMatch[1].length + 1;
        const tag = fenceMatch[3].trim();
        if (!tag) {
          issues.push({
            rule: "untagged-code-fence",
            severity: "warning",
            message: "Code fence has no language tag for syntax highlighting.",
            line: lineNum,
            column: fenceStartCol,
            slide: currentSlide,
          });
        }
      } else {
        inCodeFence = false;
      }
    }

    // Check display math
    if (!inCodeFence) {
      if (/^\s*\$\$\s*$/.test(line) || /^\s*\\\[\s*$/.test(line)) {
        if (!inDisplayMath) {
          inDisplayMath = true;
          mathStartLine = lineNum;
          mathStartCol = 1;
        } else {
          inDisplayMath = false;
        }
      } else if (line.includes("$$")) {
        const occurrences = (line.match(/\$\$/g) || []).length;
        if (occurrences % 2 !== 0) {
          inDisplayMath = !inDisplayMath;
          if (inDisplayMath) {
            mathStartLine = lineNum;
            mathStartCol = line.indexOf("$$") + 1;
          }
        }
      }

      // Check headings
      const headingMatch = line.match(/^(\s*#{1,6}\s+)(.*)$/);
      if (headingMatch && headingMatch[2].length > 80) {
        issues.push({
          rule: "long-heading",
          severity: "warning",
          message: `Heading is ${headingMatch[2].length} characters long; consider shortening for presentation readability.`,
          line: lineNum,
          column: headingMatch[1].length + 1,
          slide: currentSlide,
        });
      }

      // Check image directives
      const imgRegex = /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g;
      let imgMatch: RegExpExecArray | null;
      while ((imgMatch = imgRegex.exec(line)) !== null) {
        const alt = imgMatch[1].trim();
        const title = imgMatch[3] ?? "";
        const col = imgMatch.index + 1;

        if (!alt) {
          issues.push({
            rule: "missing-image-alt",
            severity: "warning",
            message: "Image is missing alt text.",
            line: lineNum,
            column: col,
            slide: currentSlide,
          });
        }

        if (title) {
          const opMatch = title.toLowerCase().match(/opacity[=:]?\s*([^\s"]+)/);
          if (opMatch) {
            const val = parseFloat(opMatch[1]);
            if (isNaN(val) || val < 0 || val > 1) {
              issues.push({
                rule: "invalid-image-opacity",
                severity: "warning",
                message: `Invalid image opacity '${opMatch[1]}'; expected a number between 0 and 1.`,
                line: lineNum,
                column: col,
                slide: currentSlide,
              });
            }
          }
        }
      }
    }
  }

  if (inCodeFence) {
    issues.push({
      rule: "unclosed-code-fence",
      severity: "error",
      message: "Code fence was opened but never closed.",
      line: fenceStartLine,
      column: fenceStartCol,
    });
  }

  if (inDisplayMath) {
    issues.push({
      rule: "unclosed-math",
      severity: "error",
      message: "Display math block was opened but never closed.",
      line: mathStartLine,
      column: mathStartCol,
    });
  }

  // Per-slide checks
  for (const s of slides) {
    const slideContent = s.lines.join("\n").trim();
    if (!slideContent) {
      issues.push({
        rule: "empty-slide",
        severity: "warning",
        message: `Slide ${s.slideIndex} is empty.`,
        line: s.startLine,
        column: 1,
        slide: s.slideIndex,
      });
      continue;
    }

    // Check bullet density
    const bullets = s.lines.filter((l) =>
      /^\s*([-*+]|\d+[.)])\s+/.test(l)
    );
    if (bullets.length > 8) {
      issues.push({
        rule: "dense-slide",
        severity: "warning",
        message: `Slide ${s.slideIndex} has ${bullets.length} bullets (recommended maximum is 8).`,
        line: s.startLine,
        column: 1,
        slide: s.slideIndex,
      });
    }

    // Check reveal markers
    const revealCount = (slideContent.match(/\{reveal\}/g) || []).length;
    if (revealCount > 10) {
      issues.push({
        rule: "reveal-excessive",
        severity: "warning",
        message: `Slide ${s.slideIndex} has ${revealCount} reveal markers (recommended maximum is 10).`,
        line: s.startLine,
        column: 1,
        slide: s.slideIndex,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  return {
    slides: slides.length,
    errors,
    warnings,
    issues,
  };
}
