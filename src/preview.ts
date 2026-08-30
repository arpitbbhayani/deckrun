import { RESET_CSS, SLIDE_CSS, DECOR_CSS } from "./generate.js";
import {
  findFont,
  FONT_IDS,
  fontOverrideCss,
  SIZE_IDS,
  DEFAULT_SIZE,
  DEFAULT_THEME,
  decorMapJson,
  decorOf,
  googleFontsHref,
  hljsHref,
  hljsMapJson,
  resolveSizeName,
  sizeSwitchableCss,
  themeSwitchableCss,
  type SizeName,
  type ThemeName,
} from "./themes.js";
import {
  DEFAULT_TEMPLATE,
  DEFAULT_TRANSITION,
  resolveTemplateName,
  resolveTransitionName,
  TEMPLATE_CSS,
  TRANSITION_CSS,
  type TemplateName,
  type TransitionName,
} from "./presentation-options.js";
import {
  RICH_CONTENT_CSS,
  RICH_CONTENT_RUNTIME,
  richContentHead,
} from "./rich-content.js";
import { FRAGMENT_CSS, FRAGMENT_RUNTIME } from "./fragments.js";

/** Virtual viewport the preview renders at, so `vw` sizing matches a projector. */
export const PREVIEW_WIDTH = 1600;
export const PREVIEW_HEIGHT = 900;

/**
 * The document loaded into the editor's preview iframe. It carries the deck's
 * own stylesheet, so what the editor shows is what `deckrun file.md` renders.
 * Slides arrive over postMessage; nothing is fetched or parsed in here.
 */
export function generatePreviewHtml(
  initialTheme: ThemeName = DEFAULT_THEME,
  initialSize: SizeName = DEFAULT_SIZE,
  fonts: { head?: string | null; body?: string | null } = {},
  initialTemplate: TemplateName = DEFAULT_TEMPLATE,
  initialTransition: TransitionName = DEFAULT_TRANSITION
): string {
  const size = resolveSizeName(initialSize);
  const template = resolveTemplateName(initialTemplate);
  const transition = resolveTransitionName(initialTransition);
  const head = findFont(fonts.head);
  const body = findFont(fonts.body);
  const fontAttrs =
    (head ? ` data-head="${head}"` : "") + (body ? ` data-body="${body}"` : "");
  return `<!DOCTYPE html>
<html lang="en" data-theme="${initialTheme}" data-decor="${decorOf(initialTheme)}" data-size="${size}" data-template="${template}" data-transition="${transition}"${fontAttrs}>
<head>
  <meta charset="UTF-8">
  <title>preview · deckrun</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsHref()}" rel="stylesheet">
  <link rel="stylesheet" id="hljs-theme" href="${hljsHref(initialTheme)}">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  ${richContentHead({ math: true, mermaid: true }, "local")}
  <style>
${RESET_CSS}

${themeSwitchableCss()}

${sizeSwitchableCss()}

${fontOverrideCss()}

${SLIDE_CSS}

${TEMPLATE_CSS}

${TRANSITION_CSS}

${FRAGMENT_CSS}

${RICH_CONTENT_CSS}

${DECOR_CSS}

/* ── Preview overrides ────────────────────────────────────────────────── */
html, body { overflow: hidden; }
body.is-grid, body.is-grid #presentation { overflow-y: auto; height: auto; min-height: 100%; }

.slide {
  transition: none !important;
  transform: none !important;
}

/* The deck staggers each block in as a slide opens. Here the slide is rebuilt
   on every keystroke, so the same animation would flicker while typing. */
.slide.is-active .slide__content > * { animation: none !important; }

#presentation { background: transparent; }

/* Grid of every slide, laid out at the same virtual width as a single slide. */
body.is-grid #presentation {
  position: static;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
  gap: 34px;
  padding: 34px;
  width: 100%;
}

.pv-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--surface0);
  border-radius: 12px;
  overflow: hidden;
  background: var(--base);
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.pv-thumb:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: var(--shadow-md); }
.pv-thumb.is-current { border-color: var(--accent-2); box-shadow: 0 0 0 1px var(--accent-2); }

.pv-thumb__inner {
  position: absolute;
  top: 0;
  left: 0;
  width: ${PREVIEW_WIDTH}px;
  height: ${PREVIEW_HEIGHT}px;
  transform-origin: top left;
  pointer-events: none;
}

.pv-thumb__num {
  position: absolute;
  bottom: 8px;
  right: 12px;
  z-index: 2;
  font-family: var(--font-mono);
  font-size: 15px;
  color: var(--overlay1);
  background: var(--crust-overlay);
  border-radius: 5px;
  padding: 2px 8px;
}

/* Empty state */
#pv-empty {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 26px;
  color: var(--overlay0);
  letter-spacing: 0.04em;
}

body.is-empty #pv-empty { display: flex; }
  </style>
</head>
<body>
<div id="backdrop" aria-hidden="true"></div>
<div id="presentation"></div>
<div id="pv-empty">nothing to preview yet</div>
<script>
${FRAGMENT_RUNTIME}

${RICH_CONTENT_RUNTIME}
</script>
<script>
(function () {
  'use strict';

  var VW = ${PREVIEW_WIDTH};
  var HLJS = ${hljsMapJson()};
  var DECOR = ${decorMapJson()};
  var SIZES = ${JSON.stringify(SIZE_IDS)};
  var FONTS = ${JSON.stringify(FONT_IDS)};

  var stage = document.getElementById('presentation');
  var slides = [];
  var mode = 'single';
  var index = 0;

  function send(msg) {
    if (window.parent !== window) window.parent.postMessage(msg, '*');
  }

  function applyFont(slot, id) {
    if (FONTS.indexOf(id) !== -1) document.documentElement.dataset[slot] = id;
    else delete document.documentElement.dataset[slot];
  }

  function highlight(root) {
    if (!window.hljs) return;
    var blocks = root.querySelectorAll('pre code:not(.language-mermaid):not(.lang-mermaid)');
    for (var i = 0; i < blocks.length; i++) {
      if (!blocks[i].dataset.highlighted) {
        try { window.hljs.highlightElement(blocks[i]); } catch (e) {}
      }
    }
  }

  /** Report whether the visible slide clips its own content. */
  function reportOverflow() {
    if (mode !== 'single') return;
    var content = stage.querySelector('.slide__content');
    var over = false;
    if (content) {
      over = content.scrollHeight - content.clientHeight > 6 ||
        content.scrollWidth - content.clientWidth > 6;

      // KaTeX display equations and Mermaid hosts deliberately hide their own
      // overflow to keep a projected slide tidy. Inspect them separately so a
      // clipped formula or diagram still triggers the editor's overflow nudge.
      var rich = content.querySelectorAll('.katex-display, .mermaid');
      for (var i = 0; !over && i < rich.length; i++) {
        over = rich[i].scrollHeight - rich[i].clientHeight > 6 ||
          rich[i].scrollWidth - rich[i].clientWidth > 6;
      }
    }
    send({ type: 'overflow', index: index, overflow: over });
  }

  function renderSingle() {
    document.body.classList.remove('is-grid');
    stage.innerHTML = slides[index] || '';
    var el = stage.querySelector('.slide');
    if (el) el.classList.add('is-active');
    if (window.deckrunPrepareFragments) window.deckrunPrepareFragments(stage, true);
    highlight(stage);
    var rich = window.deckrunRenderRichContent ? window.deckrunRenderRichContent(stage) : Promise.resolve();
    rich.then(function () { requestAnimationFrame(reportOverflow); });
  }

  function renderGrid() {
    document.body.classList.add('is-grid');
    stage.innerHTML = '';
    var frag = document.createDocumentFragment();
    slides.forEach(function (html, i) {
      var thumb = document.createElement('div');
      thumb.className = 'pv-thumb' + (i === index ? ' is-current' : '');
      thumb.dataset.index = String(i);

      var inner = document.createElement('div');
      inner.className = 'pv-thumb__inner';
      inner.innerHTML = html;
      var el = inner.querySelector('.slide');
      if (el) el.classList.add('is-active');

      var num = document.createElement('span');
      num.className = 'pv-thumb__num';
      num.textContent = String(i + 1);

      thumb.appendChild(inner);
      thumb.appendChild(num);
      frag.appendChild(thumb);
    });
    stage.appendChild(frag);
    scaleThumbs();
    if (window.deckrunPrepareFragments) window.deckrunPrepareFragments(stage, true);
    highlight(stage);
    var rich = window.deckrunRenderRichContent ? window.deckrunRenderRichContent(stage) : Promise.resolve();
    rich.then(scaleThumbs);
  }

  function scaleThumbs() {
    var thumbs = stage.querySelectorAll('.pv-thumb');
    for (var i = 0; i < thumbs.length; i++) {
      var inner = thumbs[i].querySelector('.pv-thumb__inner');
      if (inner) inner.style.transform = 'scale(' + (thumbs[i].clientWidth / VW) + ')';
    }
  }

  function render() {
    document.body.classList.toggle('is-empty', slides.length === 0);
    if (slides.length === 0) { stage.innerHTML = ''; return; }
    if (index >= slides.length) index = slides.length - 1;
    if (index < 0) index = 0;
    if (mode === 'grid') renderGrid(); else renderSingle();
  }

  stage.addEventListener('click', function (e) {
    if (mode !== 'grid') return;
    var thumb = e.target.closest ? e.target.closest('.pv-thumb') : null;
    if (thumb) send({ type: 'goto', index: parseInt(thumb.dataset.index, 10) });
  });

  window.addEventListener('keydown', function (e) {
    var mod = e.metaKey || e.ctrlKey;
    if (mod) {
      var k = e.key.toLowerCase();
      if (k === 'enter') { e.preventDefault(); send({ type: 'action', action: 'present' }); }
      else if (k === 'k' && !e.shiftKey) { e.preventDefault(); send({ type: 'action', action: 'palette' }); }
      else if (k === 'g') { e.preventDefault(); send({ type: 'action', action: 'grid' }); }
      else if (k === 'o') { e.preventDefault(); send({ type: 'action', action: 'decks' }); }
      else if (k === '/') { e.preventDefault(); send({ type: 'action', action: 'guide' }); }
      else if (k === 'p' || (k === 's' && e.shiftKey)) { e.preventDefault(); send({ type: 'action', action: 'pdf' }); }
      else if (k === 's') { e.preventDefault(); send({ type: 'action', action: 'download' }); }
      else if (k === 'l' && e.shiftKey) { e.preventDefault(); send({ type: 'action', action: 'theme' }); }
      return;
    }

    if (mode === 'grid') {
      var thumbs = stage.querySelectorAll('.pv-thumb');
      if (!thumbs.length) return;
      var cols = 1;
      if (thumbs.length > 1) {
        var firstTop = thumbs[0].offsetTop;
        for (var c = 1; c < thumbs.length; c++) {
          if (thumbs[c].offsetTop !== firstTop) { cols = c; break; }
        }
        if (cols === 1 && thumbs.length > 1 && thumbs[1].offsetTop === firstTop) {
          cols = thumbs.length;
        }
      }
      var step = 0;
      if (e.key === 'ArrowRight') step = 1;
      else if (e.key === 'ArrowLeft') step = -1;
      else if (e.key === 'ArrowDown') step = cols;
      else if (e.key === 'ArrowUp') step = -cols;
      else if (e.key === 'Home') { e.preventDefault(); send({ type: 'goto', index: 0 }); return; }
      else if (e.key === 'End') { e.preventDefault(); send({ type: 'goto', index: slides.length - 1 }); return; }
      else if (e.key === 'Enter') { e.preventDefault(); send({ type: 'goto', index: index }); return; }
      else if (e.key === 'Escape') { e.preventDefault(); send({ type: 'goto', index: index }); return; }
      else return;

      e.preventDefault();
      var next = Math.max(0, Math.min(slides.length - 1, index + step));
      index = next;
      var cur = stage.querySelector('.pv-thumb.is-current');
      if (cur) cur.classList.remove('is-current');
      var nextThumb = stage.querySelector('.pv-thumb[data-index="' + index + '"]');
      if (nextThumb) {
        nextThumb.classList.add('is-current');
        nextThumb.scrollIntoView({ block: 'nearest' });
      }
      send({ type: 'index-select', index: index });
      return;
    }

    // Single mode: Alt navigation or standard keys
    if (e.altKey) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        send({ type: 'nav', delta: 1 });
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        send({ type: 'nav', delta: -1 });
      }
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      send({ type: 'nav', delta: 1 });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      send({ type: 'nav', delta: -1 });
    } else if (e.key === 'Home') {
      e.preventDefault();
      send({ type: 'goto', index: 0 });
    } else if (e.key === 'End') {
      e.preventDefault();
      send({ type: 'goto', index: slides.length - 1 });
    }
  });

  window.addEventListener('resize', function () {
    if (mode === 'grid') scaleThumbs();
  });

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return;
    var m = e.data || {};
    if (m.type === 'render') {
      var sameSet = m.slides && slides.length === m.slides.length &&
        m.slides.every(function (h, i) { return h === slides[i]; });
      slides = m.slides || [];
      var modeChanged = m.mode !== mode;
      var indexChanged = m.index !== index;
      mode = m.mode || 'single';
      index = typeof m.index === 'number' ? m.index : 0;
      if (sameSet && !modeChanged && !indexChanged) { reportOverflow(); return; }
      render();
    } else if (m.type === 'theme') {
      if (HLJS[m.theme]) {
        document.documentElement.dataset.theme = m.theme;
        document.documentElement.dataset.decor = DECOR[m.theme];
        var link = document.getElementById('hljs-theme');
        if (link) link.href = HLJS[m.theme];
      }
      if (SIZES.indexOf(m.size) !== -1) {
        document.documentElement.dataset.size = m.size;
      }
      // An empty string clears the override and hands the slot back to the
      // theme, which delete does and an assignment of '' would not.
      applyFont('head', m.head);
      applyFont('body', m.body);
      if (m.template) document.documentElement.dataset.template = m.template;
      if (m.transition) document.documentElement.dataset.transition = m.transition;
      // Type size and face both change how tall a slide's content runs, so the
      // editor's overflow warning has to be re-measured against them.
      render();
    } else if (m.type === 'index') {
      index = m.index;
      if (mode === 'grid') {
        var cur = stage.querySelector('.pv-thumb.is-current');
        if (cur) cur.classList.remove('is-current');
        var next = stage.querySelector('.pv-thumb[data-index="' + index + '"]');
        if (next) {
          next.classList.add('is-current');
          next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        render();
      }
    }
  });

  send({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
