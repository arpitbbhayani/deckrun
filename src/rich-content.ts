import type { Slide } from "./parser.js";

export interface RichFeatures {
  math: boolean;
  mermaid: boolean;
}

export function richContentFeatures(slides: Slide[]): RichFeatures {
  let math = false;
  let mermaid = false;
  for (const slide of slides) {
    if (!math && (slide.html.includes('class="math-source"') || slide.html.includes("math-source"))) {
      math = true;
    }
    if (
      !mermaid &&
      (slide.html.includes("language-mermaid") ||
        slide.html.includes("lang-mermaid") ||
        slide.html.includes('class="mermaid"'))
    ) {
      mermaid = true;
    }
  }
  return { math, mermaid };
}

export function richContentHead(
  features: RichFeatures,
  source: "local" | "cdn" = "local"
): string {
  const parts: string[] = [];
  if (features.math) {
    if (source === "cdn") {
      parts.push('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.css">');
      parts.push('<script src="https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.js"></script>');
    } else {
      parts.push('<link rel="stylesheet" href="/__vendor/katex.min.css">');
      parts.push('<script src="/__vendor/katex.min.js"></script>');
    }
  }
  if (features.mermaid) {
    if (source === "cdn") {
      parts.push('<script src="https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js"></script>');
    } else {
      parts.push('<script src="/__vendor/mermaid.min.js"></script>');
    }
  }
  return parts.join("\n  ");
}

export const RICH_CONTENT_CSS = `/* ── Rich Content (Math & Diagrams) ─────────────────────────────────────── */

.math-source {
  font-family: inherit;
}

div.math-source {
  display: flex;
  justify-content: center;
  margin: 1.2em 0;
  overflow-x: auto;
  overflow-y: hidden;
}

span.math-source {
  display: inline;
}

.katex-display {
  margin: 0.8em 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.katex {
  font-size: 1.15em;
  text-rendering: auto;
}

.math-error {
  color: var(--maroon, #f38ba8);
  background: var(--surface0, rgba(255, 0, 0, 0.1));
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono, monospace);
  font-size: 0.85em;
}

.mermaid {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1.2em auto;
  max-width: 100%;
  overflow: hidden;
}

.mermaid svg {
  max-width: 100%;
  height: auto;
}

.mermaid-error {
  color: var(--maroon, #f38ba8);
  background: var(--surface0, rgba(255, 0, 0, 0.1));
  border: 1px solid var(--maroon, #f38ba8);
  border-radius: 6px;
  padding: 12px 16px;
  font-family: var(--font-mono, monospace);
  font-size: 0.9em;
  white-space: pre-wrap;
  margin: 1em 0;
}
`;

export const RICH_CONTENT_RUNTIME = `(function () {
  window.deckrunRenderRichContent = function (root) {
    if (!root) return Promise.resolve();

    // 1. Render KaTeX math
    if (window.katex) {
      var mathNodes = root.querySelectorAll('.math-source:not([data-rendered])');
      for (var i = 0; i < mathNodes.length; i++) {
        var el = mathNodes[i];
        var tex = el.textContent || '';
        var isDisplay = el.dataset.display === 'true';
        try {
          window.katex.render(tex, el, {
            displayMode: isDisplay,
            throwOnError: false,
            output: 'htmlAndMathml'
          });
          el.setAttribute('data-rendered', 'true');
        } catch (err) {
          el.innerHTML = '<span class="math-error">' + (err && err.message ? err.message : 'Math rendering error') + '</span>';
          el.setAttribute('data-rendered', 'true');
        }
      }
    }

    // 2. Render Mermaid diagrams
    var mermaidPromises = [];
    var codeBlocks = root.querySelectorAll('pre code.language-mermaid, pre code.lang-mermaid');
    if (codeBlocks.length > 0 && window.mermaid) {
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose'
        });
      } catch (e) {}

      for (var j = 0; j < codeBlocks.length; j++) {
        (function (codeEl) {
          var preEl = codeEl.closest('pre');
          if (!preEl || preEl.dataset.rendered) return;
          preEl.dataset.rendered = 'true';
          var code = codeEl.textContent || '';
          var container = document.createElement('div');
          container.className = 'mermaid';
          preEl.parentNode.insertBefore(container, preEl);
          preEl.style.display = 'none';

          var id = 'mermaid-' + Math.random().toString(36).slice(2, 10);
          var p = window.mermaid.render(id, code)
            .then(function (res) {
              container.innerHTML = res.svg;
              preEl.remove();
            })
            .catch(function (err) {
              container.className = 'mermaid-error';
              container.textContent = 'Mermaid Error: ' + (err && err.message ? err.message : String(err));
              preEl.remove();
            });
          mermaidPromises.push(p);
        })(codeBlocks[j]);
      }
    }

    return Promise.all(mermaidPromises).then(function () {});
  };
})();
`;
