/** Shape used by feature detection and conditional asset emission. */
export interface RichContentFeatures {
  math: boolean;
  mermaid: boolean;
}

export type RichContentAssetMode = "local" | "cdn" | "standalone";

export const KATEX_VERSION = "0.18.4";
export const MERMAID_VERSION = "11.17.2";

const LOCAL_KATEX_CSS = "/__vendor/katex.min.css";
const LOCAL_KATEX_JS = "/__vendor/katex.min.js";
const LOCAL_MERMAID_JS = "/__vendor/mermaid.min.js";

const CDN_KATEX_CSS = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
const CDN_KATEX_JS = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`;
const CDN_MERMAID_JS = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`;

/** Detect which optional browser libraries a rendered deck actually needs. */
export function richContentFeatures(
  slides: ReadonlyArray<{ html: string }>
): RichContentFeatures {
  let math = false;
  let mermaid = false;

  for (const slide of slides) {
    const html = String(slide?.html ?? "");
    if (!math && /\bmath-source\b/i.test(html)) math = true;
    if (!mermaid && /\b(?:language|lang)-mermaid\b/i.test(html)) mermaid = true;
    if (math && mermaid) break;
  }

  return { math, mermaid };
}

/**
 * Styles and blocking UMD scripts for the features in a deck.  Served decks
 * use package-local copies (including KaTeX's relative font files), while a
 * standalone export uses version-pinned jsDelivr URLs that travel with it.
 */
export function richContentHead(
  features: RichContentFeatures,
  mode: RichContentAssetMode = "local"
): string {
  const local = mode === "local";
  const lines: string[] = [];

  if (features.math) {
    lines.push(`<link rel="stylesheet" href="${local ? LOCAL_KATEX_CSS : CDN_KATEX_CSS}">`);
    lines.push(`<script src="${local ? LOCAL_KATEX_JS : CDN_KATEX_JS}"></script>`);
  }
  if (features.mermaid) {
    lines.push(`<script src="${local ? LOCAL_MERMAID_JS : CDN_MERMAID_JS}"></script>`);
  }

  return lines.join("\n  ");
}

/** Slide-safe equation, diagram, and visible error styling. */
export const RICH_CONTENT_CSS = `/* ── Math and diagrams ────────────────────────────────────────── */
.math-source {
  color: var(--text);
  font-size: calc(1em * var(--type-body));
}

.math-source[data-display="true"] {
  display: block;
  width: 100%;
  margin: 1.15rem 0 1.35rem;
  text-align: center;
  font-size: calc(clamp(1rem, 1.55vw, 1.35rem) * var(--type-body));
}

.math-source[data-display="false"] { display: inline; }

.slide__content .katex-display {
  margin: 0;
  padding: 0.18em 0.1em;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.slide__content .katex-display > .katex { white-space: nowrap; }

.slide__content .mermaid {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 5rem;
  max-height: min(58vh, 34rem);
  margin: 1.15rem auto;
  overflow: hidden;
  color: var(--text);
  font-family: var(--font-body);
  text-align: center;
}

.slide__content .mermaid svg {
  display: block;
  width: auto !important;
  max-width: 100% !important;
  height: auto !important;
  max-height: min(58vh, 34rem) !important;
  margin: auto;
}

.slide__content .rich-content-error {
  display: block;
  position: relative;
  width: 100%;
  min-height: 0;
  margin: 1rem 0;
  padding: 1rem 1.15rem;
  overflow: auto;
  border: 1px solid var(--red);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--red);
  font-family: var(--font-mono);
  font-size: calc(clamp(0.72rem, 0.95vw, 0.92rem) * var(--type-code));
  line-height: 1.55;
  text-align: left;
  white-space: pre-wrap;
}

.slide__content .rich-content-error::before {
  content: attr(data-rich-label);
  display: block;
  margin-bottom: 0.4rem;
  color: var(--subtext1);
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media print {
  .slide__content .katex-display,
  .slide__content .mermaid { overflow: visible !important; }
}`;

/**
 * Dependency-free browser runtime shared by preview, presentation, HTML, and
 * PDF.  Every call updates `window.deckrunRichContentReady` and resolves even
 * when a library or one input is invalid; the source is left visible as an
 * error block so layout measurement and printing can still complete.
 */
export const RICH_CONTENT_RUNTIME = `(function () {
  'use strict';

  var mermaidSequence = 0;
  var resolved = Promise.resolve();
  window.deckrunRichContentReady = resolved;

  function messageOf(error, fallback) {
    if (error && typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }
    return fallback;
  }

  function showError(node, label, source, error) {
    if (!node) return;
    node.classList.remove('math-source');
    node.classList.add('rich-content-error');
    node.dataset.richLabel = label;
    node.dataset.richError = messageOf(error, label + ' could not be rendered.');
    node.textContent = source;
    node.title = node.dataset.richError;
  }

  function renderMath(root) {
    var nodes = Array.prototype.slice.call(
      root.querySelectorAll('.math-source:not([data-deckrun-rendered])')
    );
    nodes.forEach(function (node) {
      var source = node.textContent || '';
      var display = node.getAttribute('data-display') === 'true';
      if (!window.katex || typeof window.katex.render !== 'function') {
        showError(node, 'KaTeX unavailable', source, new Error('KaTeX failed to load.'));
        return;
      }
      try {
        window.katex.render(source, node, {
          displayMode: display,
          throwOnError: true,
          strict: false,
          trust: false,
          output: 'htmlAndMathml'
        });
        node.dataset.deckrunRendered = 'true';
        node.classList.add('is-rendered');
      } catch (error) {
        showError(node, 'KaTeX error', source, error);
      }
    });
  }

  function copyFragmentState(from, to) {
    if (!from || !from.classList) return;
    if (from.classList.contains('fragment')) to.classList.add('fragment');
    if (from.classList.contains('is-revealed')) to.classList.add('is-revealed');
    var hidden = from.getAttribute('aria-hidden');
    if (hidden !== null) to.setAttribute('aria-hidden', hidden);
  }

  function prepareMermaid(root) {
    var blocks = Array.prototype.slice.call(
      root.querySelectorAll('pre code.language-mermaid, pre code.lang-mermaid')
    );
    blocks.forEach(function (code) {
      var pre = code.closest ? code.closest('pre') : code.parentElement;
      if (!pre || !pre.parentNode) return;
      var host = document.createElement('div');
      host.className = 'mermaid';
      host.textContent = code.textContent || '';
      host.dataset.deckrunSource = code.textContent || '';
      copyFragmentState(pre, host);
      pre.parentNode.replaceChild(host, pre);
    });
    return Array.prototype.slice.call(
      root.querySelectorAll('.mermaid:not([data-deckrun-rendered]):not(.rich-content-error)')
    );
  }

  function cssValue(name, fallback) {
    try {
      var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return value || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function configureMermaid(api) {
    api.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: cssValue('--font-body', 'system-ui, sans-serif'),
      themeVariables: {
        background: cssValue('--base', '#ffffff'),
        primaryColor: cssValue('--surface-soft', '#eeeeee'),
        primaryBorderColor: cssValue('--accent', '#666666'),
        primaryTextColor: cssValue('--text', '#111111'),
        secondaryColor: cssValue('--surface0', '#dddddd'),
        secondaryBorderColor: cssValue('--accent-2', '#777777'),
        secondaryTextColor: cssValue('--text', '#111111'),
        tertiaryColor: cssValue('--mantle', '#f5f5f5'),
        tertiaryBorderColor: cssValue('--accent-3', '#888888'),
        tertiaryTextColor: cssValue('--text', '#111111'),
        lineColor: cssValue('--overlay1', '#666666'),
        textColor: cssValue('--text', '#111111'),
        mainBkg: cssValue('--surface-soft', '#eeeeee'),
        nodeBorder: cssValue('--accent', '#666666'),
        clusterBkg: cssValue('--mantle', '#f5f5f5'),
        clusterBorder: cssValue('--accent-line', '#999999'),
        edgeLabelBackground: cssValue('--base', '#ffffff')
      }
    });
  }

  function renderMermaid(root) {
    var hosts = prepareMermaid(root);
    if (!hosts.length) return Promise.resolve();

    var globalValue = window.mermaid;
    var api = globalValue && globalValue.default ? globalValue.default : globalValue;
    if (!api || typeof api.initialize !== 'function' || typeof api.run !== 'function') {
      hosts.forEach(function (host) {
        var source = host.dataset.deckrunSource || host.textContent || '';
        showError(host, 'Mermaid unavailable', source, new Error('Mermaid failed to load.'));
      });
      return Promise.resolve();
    }

    try {
      configureMermaid(api);
    } catch (error) {
      hosts.forEach(function (host) {
        showError(host, 'Mermaid error', host.dataset.deckrunSource || '', error);
      });
      return Promise.resolve();
    }

    // Render one host at a time.  A malformed diagram then cannot prevent the
    // remaining diagrams on the slide from being laid out.
    var chain = Promise.resolve();
    hosts.forEach(function (host) {
      chain = chain.then(function () {
        var source = host.dataset.deckrunSource || host.textContent || '';
        host.id = host.id || 'deckrun-mermaid-' + (++mermaidSequence);
        return Promise.resolve(api.run({ nodes: [host], suppressErrors: false }))
          .then(function () { host.dataset.deckrunRendered = 'true'; })
          .catch(function (error) { showError(host, 'Mermaid error', source, error); });
      });
    });
    return chain;
  }

  window.deckrunRenderRichContent = function (root) {
    root = root && root.querySelectorAll ? root : document;
    var ready = Promise.resolve().then(function () {
      renderMath(root);
      return renderMermaid(root);
    }).catch(function () {
      // Per-node failures are handled above.  This final guard keeps printing,
      // preview overflow reporting, and future render calls alive.
    }).then(function () {
      try {
        document.dispatchEvent(new CustomEvent('deckrun:rich-content-ready', {
          detail: { root: root }
        }));
      } catch (error) {}
    });
    window.deckrunRichContentReady = ready;
    return ready;
  };
})();`;
