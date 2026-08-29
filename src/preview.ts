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
  fonts: { head?: string | null; body?: string | null } = {}
): string {
  const size = resolveSizeName(initialSize);
  const head = findFont(fonts.head);
  const body = findFont(fonts.body);
  const fontAttrs =
    (head ? ` data-head="${head}"` : "") + (body ? ` data-body="${body}"` : "");
  return `<!DOCTYPE html>
<html lang="en" data-theme="${initialTheme}" data-decor="${decorOf(initialTheme)}" data-size="${size}"${fontAttrs}>
<head>
  <meta charset="UTF-8">
  <title>preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsHref()}" rel="stylesheet">
  <link rel="stylesheet" id="hljs-theme" href="${hljsHref(initialTheme)}">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <style>
${RESET_CSS}

${themeSwitchableCss()}

${sizeSwitchableCss()}

${fontOverrideCss()}

${SLIDE_CSS}

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
    var blocks = root.querySelectorAll('pre code');
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
    if (content) over = content.scrollHeight - content.clientHeight > 6;
    send({ type: 'overflow', index: index, overflow: over });
  }

  function renderSingle() {
    document.body.classList.remove('is-grid');
    stage.innerHTML = slides[index] || '';
    var el = stage.querySelector('.slide');
    if (el) el.classList.add('is-active');
    highlight(stage);
    requestAnimationFrame(reportOverflow);
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
    highlight(stage);
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

  window.addEventListener('resize', function () {
    if (mode === 'grid') scaleThumbs();
  });

  window.addEventListener('message', function (e) {
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
      // Type size and face both change how tall a slide's content runs, so the
      // editor's overflow warning has to be re-measured against them.
      requestAnimationFrame(reportOverflow);
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
