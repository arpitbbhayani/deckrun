/** Styles shared by the live preview and the presented deck. */
export const FRAGMENT_CSS = `/* ── Incremental reveals ──────────────────────────────────────── */
.fragment {
  opacity: 0;
  transform: translateY(0.65rem);
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.28s ease,
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear 0.34s;
}

/* A top-level fragment must not inherit the slide's entrance animation: an
   animation-level opacity would otherwise make a concealed fragment visible. */
.slide.is-active .slide__content > .fragment,
.slide.is-active .slide__content > blockquote.fragment,
.slide.is-active .slide__content > pre.fragment {
  animation: none !important;
}

.fragment.is-revealed {
  opacity: 1;
  transform: none;
  visibility: visible;
  pointer-events: auto;
  transition-delay: 0s;
}

@media (prefers-reduced-motion: reduce) {
  .fragment {
    transform: none !important;
    transition: none !important;
  }
}

@media print {
  .fragment {
    opacity: 1 !important;
    transform: none !important;
    visibility: visible !important;
    pointer-events: auto !important;
    transition: none !important;
  }
}`;

/**
 * Browser runtime that turns the inert marker nodes emitted by parser.ts into
 * `.fragment` blocks.  It is a string because both generated documents embed
 * exactly the same dependency-free implementation.
 *
 * `deckrunPrepareFragments(root, revealAll)` is idempotent and returns the
 * fragments in DOM order.  Preview, overview, and print preparation pass
 * `true`; the presenter passes `false` and drives `is-revealed` itself.
 */
export const FRAGMENT_RUNTIME = `(function () {
  'use strict';

  function isWhitespaceText(node) {
    return node.nodeType === 3 && !String(node.nodeValue || '').trim();
  }

  function isMarkerOnly(parent, marker) {
    var nodes = Array.prototype.slice.call(parent.childNodes || []);
    return nodes.every(function (node) {
      return node === marker || isWhitespaceText(node) ||
        (node.nodeType === 1 && node.tagName === 'BR');
    });
  }

  function inlineTarget(marker) {
    if (!marker || !marker.closest) return marker && marker.parentElement;
    var target = marker.closest(
      'li, h1, h2, h3, h4, h5, h6, p, blockquote, pre, table, tr, figure, .math-source, .mermaid'
    );

    // Hiding only the paragraph inside a quote leaves its background, border,
    // and opening glyph behind.  Treat the quote as the authored block.
    if (target && target.tagName === 'P' &&
        target.parentElement && target.parentElement.tagName === 'BLOCKQUOTE') {
      target = target.parentElement;
    }
    return target || marker.parentElement;
  }

  function targetFor(marker) {
    var parent = marker.parentElement;
    if (!parent) return null;

    // A marker paragraph on its own applies to the following Markdown block.
    if (parent.tagName === 'P' && isMarkerOnly(parent, marker)) {
      var next = parent.nextElementSibling;
      parent.remove();
      return next;
    }

    var target = inlineTarget(marker);
    marker.remove();
    return target;
  }

  window.deckrunPrepareFragments = function (root, revealAll) {
    root = root && root.querySelectorAll ? root : document;
    var markers = Array.prototype.slice.call(
      root.querySelectorAll('.deckrun-fragment-marker')
    );

    markers.forEach(function (marker) {
      var target = targetFor(marker);
      if (target && target.classList) target.classList.add('fragment');
    });

    var fragments = Array.prototype.slice.call(root.querySelectorAll('.fragment'));
    fragments.forEach(function (fragment) {
      fragment.classList.toggle('is-revealed', !!revealAll);
      fragment.setAttribute('aria-hidden', revealAll ? 'false' : 'true');
    });
    return fragments;
  };
})();`;
