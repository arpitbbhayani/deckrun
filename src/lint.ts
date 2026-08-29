/**
 * Static deck authoring rules, the engine behind `deckrun lint`.
 *
 * Given the raw Markdown of a deck, `lintMarkdown` splits it into slides and
 * walks each slide to surface authoring mistakes: empty slides, unclosed code
 * fences or display math, untagged fences, overly dense prose, long headings,
 * missing image alt text, invalid image opacity, and stray reveal markers. It
 * never throws; any input is normalized to a well-formed report.
 */

export interface LintIssue {
	rule: string;
	severity: "error" | "warning";
	message: string;
	line: number;    // 1-based source line
	column: number;  // 1-based column
	slide?: number;  // 1-based slide index
}

const IMAGE_RE = /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g;
const MAX_BULLETS = 7;
const MAX_REVEAL_MARKERS = 12;
const MAX_PROSE_WORDS = 200;
const MAX_HEADING_LENGTH = 64;

interface SourceLine {
	no: number;
	text: string;
}

interface Section {
	index: number;
	startLine: number;
	lines: SourceLine[];
}

/**
 * Lint a Markdown deck. Never throws; returns a summary object shaped for the
 * `deckrun lint` report.
 */
export function lintMarkdown(markdown: string): {
	issues: LintIssue[];
	slides: number;
	errors: number;
	warnings: number;
} {
	const issues: LintIssue[] = [];
	const source =
		typeof markdown === "string"
			? markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
			: "";

	const rawLines = source.split("\n").map((text, index) => ({ no: index + 1, text }));
	const sections = buildSections(rawLines);
	const slides = sections.filter((section) =>
		section.lines.some((line) => line.text.trim().length > 0),
	).length;

	if (slides === 0) {
		issues.push({
			rule: "empty-deck",
			severity: "error",
			message: "Deck has no slide content",
			line: 1,
			column: 1,
			slide: 0,
		});
		return finalize(issues, slides);
	}

	for (const section of sections) lintSection(section, issues);

	return finalize(issues, slides);
}

/**
 * Group the normalized lines into slide sections. A line whose only content is
 * `---` (optionally padded with spaces/tabs) separates slides; those separator
 * lines are consumed and never become section content.
 */
function buildSections(lines: SourceLine[]): Section[] {
	const sections: Section[] = [];
	let current: Section | null = null;

	for (const line of lines) {
		if (/^[ \t]*---[ \t]*$/.test(line.text)) {
			if (current) {
				sections.push(current);
				current = null;
			}
			continue;
		}
		if (!current) {
			current = { index: sections.length + 1, startLine: line.no, lines: [] };
		}
		current.lines.push(line);
	}
	if (current) sections.push(current);

	return sections;
}

/**
 * Run every rule against one slide. Empty slides get a single `empty-slide`
 * error; otherwise the fence-aware per-line rules run in a fixed order.
 */
function lintSection(section: Section, issues: LintIssue[]): void {
	if (!section.lines.some((line) => line.text.trim().length > 0)) {
		issues.push({
			rule: "empty-slide",
			severity: "error",
			message: "Slide is empty",
			line: section.startLine,
			column: 1,
			slide: section.index,
		});
		return;
	}

	const zone = lintFences(section, issues);
	lintDisplayMath(section, zone, issues);
	lintProse(section, zone, issues);
	lintBullets(section, zone, issues);
	lintHeadings(section, zone, issues);
	lintImages(section, zone, issues);
	lintRevealMarkers(section, zone, issues);
}

/**
 * Detect and report unclosed code fences and untagged fence openings. Returns
 * a per-line "code zone" mask marking fence delimiters and the content inside
 * fences, so the other rules can skip code that should not read as markup.
 */
function lintFences(section: Section, issues: LintIssue[]): boolean[] {
	const zone: boolean[] = new Array(section.lines.length).fill(false);
	let inFence = false;
	let fenceDelim = "";
	let currentOpenLine = -1;
	const untaggedLines: number[] = [];

	for (let i = 0; i < section.lines.length; i++) {
		const line = section.lines[i];
		const match = line.text.match(/^[ \t]*(```|~~~)(.*)$/);
		if (!match) {
			if (inFence) zone[i] = true;
			continue;
		}
		const delim = match[1];
		const rest = match[2];
		zone[i] = true;

		if (!inFence) {
			inFence = true;
			fenceDelim = delim;
			currentOpenLine = line.no;
			if (rest.trim() === "") untaggedLines.push(line.no);
		} else if (delim === fenceDelim && /^[ \t]*$/.test(rest)) {
			inFence = false;
			currentOpenLine = -1;
		}
	}

	if (inFence) {
		issues.push({
			rule: "unclosed-code-fence",
			severity: "error",
			message: "Unclosed code fence",
			line: currentOpenLine,
			column: 1,
			slide: section.index,
		});
	}
	for (const lineNo of untaggedLines) {
		issues.push({
			rule: "untagged-code-fence",
			severity: "warning",
			message: "Code fence has no language tag",
			line: lineNo,
			column: 1,
			slide: section.index,
		});
	}

	return zone;
}

/**
 * Report display math delimiters that are not closed: an odd count of `$$`, or
 * a `\[` without a matching `\]`.
 */
function lintDisplayMath(section: Section, zone: boolean[], issues: LintIssue[]): void {
	let dollarCount = 0;
	let lastDollarLine = -1;
	let lastDollarColumn = -1;
	let bracketDelta = 0;
	let lastBracketLine = -1;
	let lastBracketColumn = -1;

	for (let i = 0; i < section.lines.length; i++) {
		if (zone[i]) continue;
		const line = section.lines[i];

		let searchFrom = 0;
		while (true) {
			const found = line.text.indexOf("$$", searchFrom);
			if (found === -1) break;
			dollarCount++;
			lastDollarLine = line.no;
			lastDollarColumn = found + 1;
			searchFrom = found + 2;
		}

		const openBrackets = line.text.match(/\\\[/g)?.length ?? 0;
		const closeBrackets = line.text.match(/\\\]/g)?.length ?? 0;
		if (openBrackets > 0) {
			lastBracketLine = line.no;
			lastBracketColumn = line.text.indexOf("\\[") + 1;
		}
		bracketDelta += openBrackets - closeBrackets;
	}

	if (dollarCount % 2 === 1) {
		issues.push({
			rule: "unclosed-display-math",
			severity: "error",
			message: "Unclosed display math",
			line: lastDollarLine,
			column: lastDollarColumn,
			slide: section.index,
		});
	} else if (bracketDelta > 0) {
		issues.push({
			rule: "unclosed-display-math",
			severity: "error",
			message: "Unclosed display math",
			line: lastBracketLine,
			column: lastBracketColumn,
			slide: section.index,
		});
	}
}

/** A line counts as paragraph prose when it is not blank and not a structural Markdown line. */
function isParagraphLine(text: string): boolean {
	const trimmed = text.trim();
	if (trimmed === "") return false;
	if (/^#{1,6}(\s|$)/.test(trimmed)) return false;
	if (/^[-*+>|]/.test(trimmed)) return false;
	if (/^`/.test(trimmed)) return false;
	if (/^~~~/.test(trimmed)) return false;
	return true;
}

/** Report paragraphs longer than the dense-prose word limit. */
function lintProse(section: Section, zone: boolean[], issues: LintIssue[]): void {
	let paragraph: { startLine: number; lines: string[] } | null = null;

	for (let i = 0; i < section.lines.length; i++) {
		if (zone[i]) {
			if (paragraph) checkParagraph(paragraph, section.index, issues);
			paragraph = null;
			continue;
		}
		const line = section.lines[i];
		if (isParagraphLine(line.text)) {
			if (!paragraph) paragraph = { startLine: line.no, lines: [] };
			paragraph.lines.push(line.text);
		} else {
			if (paragraph) checkParagraph(paragraph, section.index, issues);
			paragraph = null;
		}
	}
	if (paragraph) checkParagraph(paragraph, section.index, issues);
}

function checkParagraph(
	paragraph: { startLine: number; lines: string[] },
	slide: number,
	issues: LintIssue[],
): void {
	const words = paragraph.lines.join(" ").split(/\s+/).filter((word) => word.length > 0);
	if (words.length > MAX_PROSE_WORDS) {
		issues.push({
			rule: "dense-prose",
			severity: "warning",
			message: `Prose paragraph is ${words.length} words; consider splitting it`,
			line: paragraph.startLine,
			column: 1,
			slide,
		});
	}
}

/** Report lists with more than `MAX_BULLETS` top-level items within one block. */
function lintBullets(section: Section, zone: boolean[], issues: LintIssue[]): void {
	let bulletCount = 0;
	let reported = false;

	for (let i = 0; i < section.lines.length; i++) {
		if (zone[i]) {
			bulletCount = 0;
			reported = false;
			continue;
		}
		const line = section.lines[i];
		if (/^[ \t]*[-*+](\s|$)/.test(line.text)) {
			bulletCount++;
			if (bulletCount === MAX_BULLETS + 1 && !reported) {
				issues.push({
					rule: "excessive-bullets",
					severity: "warning",
					message: `Slide has more than ${MAX_BULLETS} list items`,
					line: line.no,
					column: 1,
					slide: section.index,
				});
				reported = true;
			}
		} else {
			bulletCount = 0;
			reported = false;
		}
	}
}

/** Report headings whose text runs past the length limit. */
function lintHeadings(section: Section, zone: boolean[], issues: LintIssue[]): void {
	for (let i = 0; i < section.lines.length; i++) {
		if (zone[i]) continue;
		const line = section.lines[i];
		const trimmed = line.text.trim();
		if (!/^#{1,6}(\s|$)/.test(trimmed)) continue;

		const text = trimmed.replace(/^#{1,6}[ \t]*/, "").trim();
		if (text.length > MAX_HEADING_LENGTH) {
			issues.push({
				rule: "long-heading",
				severity: "warning",
				message: `Heading is ${text.length} characters; consider shortening it`,
				line: line.no,
				column: 1,
				slide: section.index,
			});
		}
	}
}

/**
 * Report images with empty alt text and positioned-image titles carrying an
 * `opacity:` value that is out of range (error) or not numeric (warning).
 */
function lintImages(section: Section, zone: boolean[], issues: LintIssue[]): void {
	for (let i = 0; i < section.lines.length; i++) {
		if (zone[i]) continue;
		const line = section.lines[i];
		IMAGE_RE.lastIndex = 0;

		let match: RegExpExecArray | null;
		while ((match = IMAGE_RE.exec(line.text)) !== null) {
			const alt = match[1];
			const title = match[3];
			const column = match.index + 1;

			if (alt === "") {
				issues.push({
					rule: "missing-image-alt",
					severity: "warning",
					message: "Image is missing alt text",
					line: line.no,
					column,
					slide: section.index,
				});
			}

			if (title && /opacity[=:]/i.test(title)) {
				const opacityMatch = title.match(/opacity[=:]\s*(-?[0-9]*\.?[0-9]+)/i);
				if (opacityMatch) {
					const value = parseFloat(opacityMatch[1]);
					if (value < 0 || value > 1) {
						issues.push({
							rule: "invalid-image-opacity",
							severity: "error",
							message: `Image opacity ${value} is outside the 0..1 range`,
							line: line.no,
							column,
							slide: section.index,
						});
					}
				} else {
					issues.push({
						rule: "invalid-image-opacity",
						severity: "warning",
						message: "Image opacity value is not a number",
						line: line.no,
						column,
						slide: section.index,
					});
				}
			}
		}
	}
}

/**
 * Report stray reveal markers: a `{reveal` that is never closed on its line,
 * or a slide carrying more than `MAX_REVEAL_MARKERS` valid `{reveal}` entries.
 */
function lintRevealMarkers(section: Section, zone: boolean[], issues: LintIssue[]): void {
	let revealCount = 0;
	const revealRe = /\{reveal\}/g;

	for (let i = 0; i < section.lines.length; i++) {
		if (zone[i]) continue;
		const line = section.lines[i];

		let idx = line.text.indexOf("{reveal");
		while (idx !== -1) {
			const rest = line.text.slice(idx + "{reveal".length);
			if (!rest.includes("}")) {
				issues.push({
					rule: "malformed-reveal-marker",
					severity: "error",
					message: "Reveal marker is missing its closing brace",
					line: line.no,
					column: idx + 1,
					slide: section.index,
				});
			}
			idx = line.text.indexOf("{reveal", idx + 1);
		}

		revealRe.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = revealRe.exec(line.text)) !== null) {
			revealCount++;
			if (revealCount === MAX_REVEAL_MARKERS + 1) {
				issues.push({
					rule: "excessive-reveal-markers",
					severity: "warning",
					message: `Slide has more than ${MAX_REVEAL_MARKERS} reveal markers`,
					line: line.no,
					column: match.index + 1,
					slide: section.index,
				});
			}
		}
	}
}

/** Sort issues by source position, then compute the error/warning counts. */
function finalize(issues: LintIssue[], slides: number): {
	issues: LintIssue[];
	slides: number;
	errors: number;
	warnings: number;
} {
	issues.sort((a, b) => a.line - b.line || a.column - b.column);

	const errors = issues.filter((issue) => issue.severity === "error").length;
	const warnings = issues.filter((issue) => issue.severity === "warning").length;

	return { issues, slides, errors, warnings };
}
