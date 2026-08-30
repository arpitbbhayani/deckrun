/**
 * Rich content support: KaTeX math and Mermaid diagrams.
 *
 * The parser marks math as `.math-source` nodes (inline span or block div,
 * carrying the TeX in text and `data-display` as the display mode), and
 * Mermaid slides come through as standard marked fenced `<code
 * class="language-mermaid">` blocks. At runtime `deckrunRenderRichContent`
 * walks the deck, renders KaTeX in place, replaces Mermaid code blocks with
 * rendered svg, and returns a promise that resolves when everything is ready
 * (used to gate print/PDF export).
 *
 * `richContentHead` chooses either the locally-vendored assets (`/__vendor`)
 * or pinned CDNs for a standalone page.
 */

import type { Slide } from "./parser.js";

export interface RichFeatures {
  math: boolean;
  mermaid: boolean;
}

const MATH_CLASS = "math-source";
const MERMAID_LANG = "language-mermaid";

/** Scan a deck's rendered slides for anything that needs KaTeX or Mermaid. */
export function richContentFeatures(slides: Slide[]): RichFeatures {
  let math = false;
  let mermaid = false;
  for (const slide of slides) {
    const html = slide.html ?? "";
    if (!math && html.includes(MATH_CLASS)) math = true;
    if (!mermaid && html.includes(MERMAID_LANG)) mermaid = true;
    if (math && mermaid) break;
  }
  return { math, mermaid };
}

// Pinned versions, matched to the vendored packages in package.json.
const KATEX_VERSION = "0.18.4";
const MERMAID_VERSION = "11.17.2";

/**
 * The `<head>` fragment that pulls in KaTeX and/or Mermaid.
 * `mode: "local"` points at this server's `/__vendor` routes; `"cdn"` points
 * at pinned CDNs, which is what a standalone page export uses.
 */
export function richContentHead(features: RichFeatures, mode: "local" | "cdn"): string {
  const base = "https://cdn.jsdelivr.net";
  const parts: string[] = [];

  if (features.math) {
    if (mode === "cdn") {
      parts.push(
        `<link rel="stylesheet" href="${base}/npm/katex@${KATEX_VERSION}/dist/katex.min.css">`,
        `<script defer src="${base}/npm/katex@${KATEX_VERSION}/dist/katex.min.js"></script>`,
      );
    } else {
      parts.push(
        `<link rel="stylesheet" href="/__vendor/katex.min.css">`,
        `<script defer src="/__vendor/katex.min.js"></script>`,
      );
    }
  }

  if (features.mermaid) {
    if (mode === "cdn") {
      parts.push(
        `<script defer type="module" src="${base}/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js"></script>`,
      );
    } else {
      parts.push(
        `<script defer src="/__vendor/mermaid.min.js"></script>`,
      );
    }
  }

  return parts.join("\n  ");
}

export const RICH_CONTENT_CSS = `
/* TeX placeholder before KaTeX takes over. */
.math-source {
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--accent2);
  white-space: pre-wrap;
  word-break: break-word;
  opacity: 0.85;
}

.math-source[data-display="true"] {
  display: block;
  text-align: center;
  margin: 0.8em 0;
}

.math-source[data-display="false"] {
  display: inline;
}

/* Mermaid wrapper: keep the diagram from blowing past the slide. */
.mermaid {
  max-width: 100%;
  overflow: auto;
  text-align: center;
  margin: 0.6em 0;
}

.mermaid svg {
  max-width: 100%;
  height: auto;
}
`;

export const RICH_CONTENT_RUNTIME = `
(function () {
  'use strict';

  function katexReady() {
    return typeof window.katex !== 'undefined' && window.katex.render;
  }

  function renderMath(root) {
    var nodes = root.querySelectorAll('.math-source');
    var pending = [];
    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        if (katexReady()) {
          var tex = node.textContent || '';
          var display = node.getAttribute('data-display') === 'true';
          try {
            window.katex.render(tex, node, {
              displayMode: display,
              throwOnError: false,
            });
            return; // rendered synchronously
          } catch (e) {
            node.textContent = tex; // leave the raw TeX visible
          }
        }
        // If KaTeX hasn't loaded yet, retry briefly then give up.
        pending.push(node);
      })(nodes[i]);
    }
    return pending.length === 0
      ? Promise.resolve()
      : new Promise(function (resolve) {
          var tries = 0;
          var timer = setInterval(function () {
            tries++;
            var remaining = [];
            for (var j = 0; j < pending.length; j++) {
              var node = pending[j];
              var tex = node.textContent || '';
              var display = node.getAttribute('data-display') === 'true';
              if (katexReady()) {
                try {
                  window.katex.render(tex, node, { displayMode: display, throwOnError: false });
                  continue;
                } catch (e) { /* fall through */ }
              }
              remaining.push(node);
            }
            pending = remaining;
            if (pending.length === 0 || tries > 40) {
              clearInterval(timer);
              resolve();
            }
          }, 125);
        });
  }

  function renderMermaid(root) {
    var blocks = root.querySelectorAll('pre > code.' + 'language-mermaid');
    var codes = Array.prototype.slice.call(blocks);
    if (codes.length === 0) return Promise.resolve();

    // Hide the raw source while rendering.
    codes.forEach(function (code) {
      var pre = code.parentElement;
      if (pre) pre.style.display = 'none';
    });

    function renderNext(i) {
      if (i >= codes.length) return Promise.resolve();
      var code = codes[i];
      var text = (code.textContent || '').trim();
      var pre = code.parentElement;
      var wrapper = document.createElement('div');
      wrapper.className = 'mermaid';
      pre.parentNode.replaceChild(wrapper, pre);

      var mmd = window.mermaid ||
        (window.mermaid && window.mermaid.default) ||
        null;
      if (!mmd) {
        wrapper.textContent = 'mermaid unavailable';
        return renderNext(i + 1);
      }

      try {
        var init = mmd.initialize || mmd.default && mmd.default.initialize;
        if (init) init.call(mmd, { startOnLoad: false, theme: 'neutral' });
      } catch (e) { /* ignore init errors */ }

      var render = mmd.render || (mmd.default && mmd.default.render);
      return Promise.resolve()
        .then(function () {
          if (render) return render('mermaid-' + i, text);
          return Promise.reject(new Error('no render'));
        })
        .then(function (result) {
          wrapper.innerHTML = result.svg || '';
        })
        .catch(function () {
          wrapper.textContent = text;
        })
        .then(function () { return renderNext(i + 1); });
    }

    return renderNext(0);
  }

  window.deckrunRenderRichContent = function (root) {
    if (!root) return Promise.resolve();
    return Promise.all([renderMath(root), renderMermaid(root)]);
  };
})();
`;