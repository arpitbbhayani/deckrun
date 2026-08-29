/**
 * Rich content: KaTeX math and Mermaid diagrams.
 *
 * The parser leaves math source in `<span class="math-source">` /
 * `<div class="math-source">` nodes and Mermaid source in
 * `<pre><code class="language-mermaid">` fences. This module provides the
 * stylesheet, the `<head>` asset tags, and the runtime that swaps the source
 * for rendered output. When the vendored library is unavailable (an offline
 * standalone export) the source stays readable rather than vanishing.
 */

import type { Slide } from "./parser.js";

/**
 * Which rich-content libraries a set of slides needs. Math is flagged when any
 * slide carries a `math-source` node the parser emitted; Mermaid when any
 * fence was tagged with the mermaid language.
 */
export function richContentFeatures(slides: Slide[]): {
  math: boolean;
  mermaid: boolean;
} {
  let math = false;
  let mermaid = false;
  for (const slide of slides) {
    const html = slide.html ?? "";
    if (!math && html.includes("math-source")) math = true;
    if (
      !mermaid &&
      (html.includes("language-mermaid") || html.includes("lang-mermaid"))
    ) {
      mermaid = true;
    }
    if (math && mermaid) break;
  }
  return { math, mermaid };
}

/**
 * The `<head>` tags for the libraries a deck needs. `"local"` points at the
 * vendor routes the deckrun server serves from the installed npm package,
 * `"cdn"` at pinned CDN copies, for an export opened as a plain file.
 */
export function richContentHead(
  features: { math: boolean; mermaid: boolean },
  mode: "cdn" | "local"
): string {
  const katexCss =
    mode === "cdn"
      ? "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
      : "/__vendor/katex.min.css";
  const katexJs =
    mode === "cdn"
      ? "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"
      : "/__vendor/katex.min.js";
  const mermaidJs =
    mode === "cdn"
      ? "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"
      : "/__vendor/mermaid.min.js";

  const parts: string[] = [];
  if (features.math) {
    parts.push(`  <link rel="stylesheet" href="${katexCss}">`);
    parts.push(`  <script src="${katexJs}"></script>`);
  }
  if (features.mermaid) {
    parts.push(`  <script src="${mermaidJs}"></script>`);
  }
  return parts.join("\n");
}

/**
 * Styling for rendered math and diagrams, plus the error panel shown when a
 * source could not be rendered.
 */
export const RICH_CONTENT_CSS = `/* ── Rich content: KaTeX & Mermaid ───────────────────────────────────── */
/* Inline math keeps its footprint while KaTeX swaps the source, so a line
   never reflows as an equation lands. */
.slide__content .math-source { display: inline-block; }

/* A display equation sits on its own line, centered above the block rhythm. */
.slide__content .math-source[data-display="true"] {
  display: block;
  margin: 1.1rem 0;
  text-align: center;
  overflow-x: auto;
}

.slide__content .katex { font-size: 1.06em; }
.slide__content .katex-display { margin: 1.1rem 0; }

/* Diagrams render into the fence's slot, scaled to the content column. */
.slide__content .mermaid {
  display: block;
  margin: 1.1rem 0;
  text-align: center;
  overflow-x: auto;
}

.slide__content .mermaid svg { max-width: 100%; height: auto; }

/* Unrendered or invalid source reads as a muted panel, not a broken glyph. */
.slide__content .deckrun-rich-error {
  display: block;
  padding: 0.75em 1em;
  border: 1px solid var(--hairline);
  border-left: 3px solid var(--red);
  border-radius: 0 10px 10px 0;
  color: var(--subtext1);
  font-family: var(--font-mono);
  font-size: 0.85em;
  overflow-x: auto;
}`;

/**
 * Runtime: render KaTeX and Mermaid content inside a slide container.
 *
 * Attached as `window.deckrunRenderRichContent(root)`, returning a Promise so
 * the editor can wait for the equation or diagram before measuring slide
 * overflow. Unprocessed nodes are skipped on a later call.
 */
export const RICH_CONTENT_RUNTIME = `;(function () {
  'use strict';

  window.deckrunRenderRichContent = function (root) {
    if (!root || typeof root.querySelectorAll !== 'function') return Promise.resolve();
    return Promise.all([renderMath(root), renderMermaid(root)]).then(function () {});
  };

  function renderMath(root) {
    var nodes = root.querySelectorAll('.math-source:not([data-rich])');
    if (!nodes.length || !window.katex) return Promise.resolve();
    var jobs = [];
    Array.prototype.forEach.call(nodes, function (el) {
      var display = el.getAttribute('data-display') === 'true';
      jobs.push(new Promise(function (resolve) {
        try {
          window.katex.render(el.textContent, el, {
            displayMode: display,
            throwOnError: false,
            output: 'html',
          });
        } catch (err) {
          el.classList.add('deckrun-rich-error');
        }
        el.setAttribute('data-rich', 'done');
        resolve();
      }));
    });
    return Promise.all(jobs);
  }

  function renderMermaid(root) {
    var codes = Array.prototype.slice.call(
      root.querySelectorAll('pre > code.language-mermaid, pre > code.lang-mermaid')
    );
    if (!codes.length || !window.mermaid) return Promise.resolve();
    var hosts = [];
    codes.forEach(function (code) {
      if (code.getAttribute('data-rich')) return;
      var pre = code.parentNode;
      var host = document.createElement('div');
      host.className = 'mermaid';
      host.textContent = code.textContent;
      if (pre) {
        // A \`{reveal}\` before the diagram may have made the fence a fragment;
        // carry that class over so reveal control survives the swap.
        if (pre.classList.contains('fragment')) host.classList.add('fragment');
        if (pre.classList.contains('is-revealed')) host.classList.add('is-revealed');
        var hidden = pre.getAttribute('aria-hidden');
        if (hidden) host.setAttribute('aria-hidden', hidden);
        if (pre.parentNode) pre.parentNode.replaceChild(host, pre);
      }
      hosts.push(host);
    });
    if (!hosts.length) return Promise.resolve();

    var run;
    try { window.mermaid.initialize({ startOnLoad: false }); } catch (err) {}
    try {
      if (typeof window.mermaid.run === 'function') {
        run = window.mermaid.run({ nodes: hosts });
      } else {
        run = Promise.all(hosts.map(function (host, i) {
          return window.mermaid.render('deckrun-mermaid-' + i, host.textContent)
            .then(function (out) { host.innerHTML = out.svg; })
            .catch(function () {});
        }));
      }
    } catch (err) {
      run = Promise.resolve();
    }

    return Promise.resolve(run).then(
      function () {
        hosts.forEach(function (h) {
          h.setAttribute('data-rich', 'done');
          if (!h.querySelector('svg')) h.classList.add('deckrun-rich-error');
        });
      },
      function () {
        hosts.forEach(function (h) {
          h.setAttribute('data-rich', 'done');
          if (!h.querySelector('svg')) h.classList.add('deckrun-rich-error');
        });
      }
    );
  }
})();`;
