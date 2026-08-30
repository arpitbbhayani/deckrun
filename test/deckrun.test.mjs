import test from "node:test";
import assert from "node:assert/strict";
import { parseSlides } from "../dist/parser.js";
import {
  findTemplate,
  resolveTemplateName,
  templateSummaries,
  templateListing,
  findTransition,
  resolveTransitionName,
  transitionSummaries,
  transitionListing,
  TEMPLATE_CSS,
  TRANSITION_CSS,
} from "../dist/presentation-options.js";
import { richContentFeatures, richContentHead } from "../dist/rich-content.js";
import { lintMarkdown } from "../dist/lint.js";
import { generateHtml } from "../dist/generate.js";
import { generatePreviewHtml } from "../dist/preview.js";

test("Parser handles slides, notes, images, math, and reveals", () => {
  const md = `# Slide 1
Welcome to deckrun

<!-- notes: Introduction slide notes -->
---
# Slide 2
Here is a list:
- Point A
- Point B {reveal}

{reveal}
> Important quote

$$
E = mc^2
$$

Inline math $a^2 + b^2 = c^2$ here.
`;

  const slides = parseSlides(md);
  assert.equal(slides.length, 2);
  assert.equal(slides[0].notes, "Introduction slide notes");
  assert.match(slides[1].html, /deckrun-fragment-marker/);
  assert.match(slides[1].html, /class="math-source"/);
  assert.match(slides[1].html, /data-display="true"/);
  assert.match(slides[1].html, /data-display="false"/);
});

test("Presentation options resolve correctly", () => {
  assert.equal(findTemplate("minimal"), "minimal");
  assert.equal(findTemplate("Classic"), "classic");
  assert.equal(findTemplate("non-existent"), null);
  assert.equal(resolveTemplateName("spotlight"), "spotlight");
  assert.equal(resolveTemplateName("invalid"), "classic");

  assert.equal(findTransition("fade"), "fade");
  assert.equal(findTransition("Zoom"), "zoom");
  assert.equal(findTransition("non-existent"), null);
  assert.equal(resolveTransitionName("lift"), "lift");
  assert.equal(resolveTransitionName("invalid"), "slide");

  assert.equal(templateSummaries().length, 4);
  assert.equal(transitionSummaries().length, 5);
  assert.equal(templateListing().length, 4);
  assert.equal(transitionListing().length, 5);

  assert.ok(TEMPLATE_CSS.includes("spotlight"));
  assert.ok(TRANSITION_CSS.includes("lift"));
});

test("Rich content detection and head tags work", () => {
  const slidesWithoutRich = parseSlides("# Simple\nHello");
  const feat1 = richContentFeatures(slidesWithoutRich);
  assert.equal(feat1.math, false);
  assert.equal(feat1.mermaid, false);
  assert.equal(richContentHead(feat1, "local"), "");

  const slidesWithRich = parseSlides("# Math\n$$\nx = y\n$$\n```mermaid\ngraph TD; A-->B;\n```");
  const feat2 = richContentFeatures(slidesWithRich);
  assert.equal(feat2.math, true);
  assert.equal(feat2.mermaid, true);

  const localHead = richContentHead(feat2, "local");
  assert.ok(localHead.includes("/__vendor/katex.min.css"));
  assert.ok(localHead.includes("/__vendor/mermaid.min.js"));

  const cdnHead = richContentHead(feat2, "cdn");
  assert.ok(cdnHead.includes("cdn.jsdelivr.net/npm/katex"));
  assert.ok(cdnHead.includes("cdn.jsdelivr.net/npm/mermaid"));
});

test("Linting catches errors and warnings properly", () => {
  // Empty deck
  const emptyRes = lintMarkdown("   ");
  assert.equal(emptyRes.errors, 1);
  assert.equal(emptyRes.issues[0].rule, "empty-deck");

  // Valid deck
  const validMd = `# Clean Slide
- Item 1
- Item 2
`;
  const validRes = lintMarkdown(validMd);
  assert.equal(validRes.errors, 0);
  assert.equal(validRes.warnings, 0);

  // Deck with untagged fence and unclosed fence
  const unclosedMd = `# Slide
\`\`\`
unclosed code
`;
  const unclosedRes = lintMarkdown(unclosedMd);
  assert.ok(unclosedRes.issues.some((i) => i.rule === "untagged-code-fence"));
  assert.ok(unclosedRes.issues.some((i) => i.rule === "unclosed-code-fence"));
  assert.equal(unclosedRes.errors, 1);

  // Deck with empty alt image and invalid opacity
  const badImgMd = `# Slide
![](pic.png "opacity=2.5")
`;
  const badImgRes = lintMarkdown(badImgMd);
  assert.ok(badImgRes.issues.some((i) => i.rule === "missing-image-alt"));
  assert.ok(badImgRes.issues.some((i) => i.rule === "invalid-image-opacity"));
});

test("Generate HTML produces valid complete document with templates and transitions", () => {
  const slides = parseSlides("# Slide 1\nHello\n<!-- notes: Test note -->");
  const html = generateHtml(
    slides,
    "My Test Deck",
    false,
    "nord",
    "l",
    { head: null, body: null },
    { template: "editorial", transition: "fade" }
  );

  assert.ok(html.includes('data-theme="nord"'));
  assert.ok(html.includes('data-template="editorial"'));
  assert.ok(html.includes('data-transition="fade"'));
  assert.ok(html.includes('data-size="l"'));
  assert.ok(html.includes("Test note"));
});

test("Generate preview HTML produces valid preview structure", () => {
  const html = generatePreviewHtml("gruvbox", "m", {}, "minimal", "zoom");
  assert.ok(html.includes('data-theme="gruvbox"'));
  assert.ok(html.includes('data-template="minimal"'));
  assert.ok(html.includes('data-transition="zoom"'));
  assert.ok(html.includes('id="presentation"'));
});

test("Theme-dependent text selection highlight is configured", async () => {
  const { themeRootCss, themeSwitchableCss } = await import("../dist/themes.js");
  const nordCss = themeRootCss("nord");
  assert.ok(nordCss.includes("--selection-bg:"));
  assert.ok(nordCss.includes("--selection-text:"));

  const switchableCss = themeSwitchableCss();
  assert.ok(switchableCss.includes("--selection-bg:"));

  const slides = parseSlides("# Test\nSelection styling");
  const html = generateHtml(slides, "Test Deck", false, "nord", "m");
  assert.ok(html.includes("::selection"));
  assert.ok(html.includes("var(--selection-bg"));
});

