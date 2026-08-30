export const FRAGMENT_CSS = `/* ── Fragments / Incremental Reveals ─────────────────────────────────────── */

.fragment {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 1, 0.3, 1);
  pointer-events: none;
}

.fragment.is-revealed {
  opacity: 1;
  transform: none;
  pointer-events: all;
}

.deckrun-fragment-marker {
  display: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .fragment {
    transform: none !important;
    transition: opacity 0.2s linear !important;
  }
}

@media print {
  .fragment {
    opacity: 1 !important;
    transform: none !important;
    pointer-events: all !important;
  }
}
`;

export const FRAGMENT_RUNTIME = `(function () {
  window.deckrunPrepareFragments = function (root, allVisible) {
    if (!root) return;
    var markers = root.querySelectorAll('.deckrun-fragment-marker');
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var parent = marker.parentElement;
      if (!parent) continue;

      var textContent = parent.textContent ? parent.textContent.trim() : '';
      if (textContent === '' && parent.tagName.toLowerCase() === 'p') {
        var next = parent.nextElementSibling;
        if (next) {
          next.classList.add('fragment');
          if (allVisible) {
            next.classList.add('is-revealed');
            next.setAttribute('aria-hidden', 'false');
          } else {
            next.setAttribute('aria-hidden', 'true');
          }
        }
        parent.remove();
      } else {
        var target = marker.closest('li') || parent;
        target.classList.add('fragment');
        if (allVisible) {
          target.classList.add('is-revealed');
          target.setAttribute('aria-hidden', 'false');
        } else {
          target.setAttribute('aria-hidden', 'true');
        }
        marker.remove();
      }
    }
  };
})();
`;
