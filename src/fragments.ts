/**
 * Incremental reveals.
 *
 * The parser turns `{reveal}` markers into `<span class="deckrun-fragment-marker">`.
 * At runtime `deckrunPrepareFragments` walks the rendered deck and promotes the
 * block that each marker belongs to into a `.fragment` element (or, for a marker
 * alone on its line, the block that follows it). Presentation then reveals those
 * fragments step by step before advancing slides.
 *
 * The editor preview and overview grid call `deckrunPrepareFragments` with
 * `all: true` so they always show the complete slide while authoring.
 */

export const FRAGMENT_CSS = `
.fragment {
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.34s ease,
    transform 0.34s ease;
}

.fragment.is-revealed {
  opacity: 1;
  transform: none;
}

/* A lone marker line promoted to a fragment carries no visible box. */
.deckrun-fragment-marker {
  display: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .fragment { transform: none !important; }
}

@media print {
  .fragment,
  .fragment.is-revealed {
    opacity: 1 !important;
    transform: none !important;
  }
}
`;

export const FRAGMENT_RUNTIME = `
(function () {
  'use strict';

  var FRAGMENT_CLASS = 'fragment';
  var MARKER_CLASS = 'deckrun-fragment-marker';
  var REVEALED_CLASS = 'is-revealed';

  // A marker whose carrying block is otherwise empty marks "reveal the next
  // block instead". We detect that by checking the block's own text length.
  function isLoneMarker(block) {
    var text = '';
    for (var i = 0; i < block.childNodes.length; i++) {
      var node = block.childNodes[i];
      if (node.nodeType === 3) text += node.data;
    }
    return block.getElementsByClassName(MARKER_CLASS).length > 0 &&
      text.trim().length === 0;
  }

  window.deckrunPrepareFragments = function (root, all) {
    if (!root) return;
    all = !!all;

    var fragments = [];
    var seen = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

    function addFragment(el) {
      if (!el || el.classList.contains(FRAGMENT_CLASS)) return;
      if (seen && seen.has(el)) return;
      if (seen) seen.add(el);
      el.classList.add(FRAGMENT_CLASS);
      el.setAttribute('aria-hidden', all ? 'false' : 'true');
      fragments.push(el);
    }

    var markers = root.querySelectorAll('.' + MARKER_CLASS);
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      // Walk up to the nearest block-level container inside .slide__content.
      var block = marker.parentElement;
      while (block && block !== root && !/^(P|LI|UL|OL|BLOCKQUOTE|H[1-6]|PRE|DIV|TABLE|TR|FIGCAPTION)$/.test(block.tagName)) {
        block = block.parentElement;
      }
      if (!block || block === root) {
        // Fall back to the smallest stamped container.
        block = marker.parentElement;
      }

      if (isLoneMarker(block)) {
        // Reveal the block that follows this (empty) marker paragraph.
        var next = block.nextElementSibling;
        addFragment(next || block);
        if (block.parentElement) block.parentElement.removeChild(block);
      } else {
        addFragment(block);
        // Drop the inline marker; the block itself is the fragment now.
        if (marker.parentNode) marker.parentNode.removeChild(marker);
      }
    }

    // Order fragments in document order so reveal order matches source.
    fragments.sort(function (a, b) {
      return (a.compareDocumentPosition(b) & 2) ? 1 : -1;
    });

    if (all) {
      for (var j = 0; j < fragments.length; j++) {
        fragments[j].classList.add(REVEALED_CLASS);
        fragments[j].setAttribute('aria-hidden', 'false');
      }
    }

    return fragments;
  };
})();
`;