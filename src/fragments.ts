/**
 * Incremental reveals.
 *
 * The parser turns a `{reveal}` marker into a hidden `<span
 * class="deckrun-fragment-marker">`. This module's stylesheet hides that
 * marker and defines the reveal transition, and its runtime walks the deck
 * once, converting each marker into a `.fragment` block the presentation
 * navigation can step through.
 *
 * Shared verbatim by the editor preview and a presented deck; the preview
 * calls `deckrunPrepareFragments(root, true)` (show everything) while the
 * deck passes `false` so the navigation reveals blocks one at a time.
 */

/**
 * Fragment reveal styling. Hidden by default, shown when `.is-revealed`;
 * printed and exported slides always show every fragment.
 */
export const FRAGMENT_CSS = `/* ── Incremental reveals ─────────────────────────────────────────────── */
/* The marker is a parser hook, not content; it never takes space. */
.deckrun-fragment-marker { display: none; }

/* A fragment stays in the layout (so the slide never reflows as it is
   revealed) but is invisible until its step is reached. */
.slide .fragment {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s;
}

.slide .fragment.is-revealed {
  opacity: 1;
  visibility: visible;
}

/* A top-level fragment is its own slide block; the slide-wide stagger
   animation would fight the reveal, so that block is exempt from it. */
.slide.is-active .slide__content > .fragment { animation: none !important; }

@media (prefers-reduced-motion: reduce) {
  .slide .fragment { transition: none; }
}

/* Printed and exported slides never omit content: every fragment is shown. */
@media print {
  .slide .fragment { opacity: 1 !important; visibility: visible !important; }
}`;

/**
 * Runtime: turn `deckrun-fragment-marker` spans into `.fragment` blocks.
 *
 * Attached as `window.deckrunPrepareFragments(root, revealAll)` so the deck
 * and the editor preview share the exact same reveal semantics:
 * - `{reveal}` appended to a block makes that block the fragment;
 * - `{reveal}` on its own line makes the block after it the fragment.
 */
export const FRAGMENT_RUNTIME = `;(function () {
  'use strict';

  function blockish(el) {
    // Walk up from the marker to the closest block-level unit a reveal can
    // wrap: a list item, paragraph, heading, code block, quote, or figure.
    var node = el;
    while (node && node.nodeType === 1) {
      var tag = node.tagName.toLowerCase();
      if (tag === 'li' || tag === 'p' || tag === 'pre' || tag === 'blockquote' ||
          tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' ||
          tag === 'h5' || tag === 'h6' || tag === 'div' || tag === 'section' ||
          tag === 'figure' || tag === 'table' || tag === 'ol' || tag === 'ul') {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function isBareSlot(parent) {
    // The marker counts as sitting alone when its wrapper has no other
    // element children and no text of its own (an own-line \`{reveal}\`).
    if (!parent) return false;
    if (parent.children.length !== 1) return false;
    return parent.textContent.trim() === '';
  }

  function fragmentOf(marker) {
    var parent = marker.parentNode;
    // Own-line marker: the fragment is the block after the wrapper.
    if (isBareSlot(parent) && parent.nextElementSibling) {
      return parent.nextElementSibling;
    }
    // Inline marker: the block the marker lives in is the fragment.
    return blockish(marker) || parent;
  }

  window.deckrunPrepareFragments = function (root, revealAll) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    var markers = root.querySelectorAll('.deckrun-fragment-marker');
    var i;
    for (i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var block = fragmentOf(marker);
      if (marker.parentNode) marker.parentNode.removeChild(marker);
      if (!block) continue;
      if (block.classList.contains('fragment')) continue;
      block.classList.add('fragment');
      if (revealAll) {
        block.classList.add('is-revealed');
        block.setAttribute('aria-hidden', 'false');
      }
    }
  };
})();`;
