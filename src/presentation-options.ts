/**
 * Presentation-wide composition and motion options.
 *
 * A template changes layout only; a transition changes motion only.  Keeping
 * the two registries independent lets the editor switch either by changing a
 * single data attribute on the document root.
 */

export const TEMPLATE_IDS = ["classic", "minimal", "editorial", "spotlight"] as const;
export type TemplateName = (typeof TEMPLATE_IDS)[number];

export const TRANSITION_IDS = ["slide", "fade", "zoom", "lift", "none"] as const;
export type TransitionName = (typeof TRANSITION_IDS)[number];

export interface PresentationOptionSummary<T extends string = string> {
  id: T;
  label: string;
  blurb: string;
}

export type TemplateSummary = PresentationOptionSummary<TemplateName>;
export type TransitionSummary = PresentationOptionSummary<TransitionName>;

export const TEMPLATES: Record<TemplateName, TemplateSummary> = {
  classic: {
    id: "classic",
    label: "classic",
    blurb: "The original balanced deckrun layout.",
  },
  minimal: {
    id: "minimal",
    label: "minimal",
    blurb: "Quiet surfaces, wider margins, and fewer decorative treatments.",
  },
  editorial: {
    id: "editorial",
    label: "editorial",
    blurb: "Strong rules and a magazine-like reading rhythm.",
  },
  spotlight: {
    id: "spotlight",
    label: "spotlight",
    blurb: "Centered, high-impact composition for concise keynote slides.",
  },
};

export const TRANSITIONS: Record<TransitionName, TransitionSummary> = {
  slide: {
    id: "slide",
    label: "slide",
    blurb: "Direction-aware horizontal movement.",
  },
  fade: {
    id: "fade",
    label: "fade",
    blurb: "A quiet crossfade with no spatial movement.",
  },
  zoom: {
    id: "zoom",
    label: "zoom",
    blurb: "The next slide settles forward from a small scale.",
  },
  lift: {
    id: "lift",
    label: "lift",
    blurb: "Slides rise and fall with navigation direction.",
  },
  none: {
    id: "none",
    label: "none",
    blurb: "No transition; slides change immediately.",
  },
};

export const DEFAULT_TEMPLATE: TemplateName = "classic";
export const DEFAULT_TRANSITION: TransitionName = "slide";

/** A template id from untrusted input, or `null` if it names nothing. */
export function findTemplate(input: string | undefined | null): TemplateName | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TEMPLATES, key)
    ? (key as TemplateName)
    : null;
}

/** A template id from untrusted input, falling back to the default. */
export function resolveTemplateName(input: string | undefined | null): TemplateName {
  return findTemplate(input) ?? DEFAULT_TEMPLATE;
}

/** A transition id from untrusted input, or `null` if it names nothing. */
export function findTransition(input: string | undefined | null): TransitionName | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TRANSITIONS, key)
    ? (key as TransitionName)
    : null;
}

/** A transition id from untrusted input, falling back to the default. */
export function resolveTransitionName(input: string | undefined | null): TransitionName {
  return findTransition(input) ?? DEFAULT_TRANSITION;
}

/** JSON-ready option rows for the editor. */
export function templateSummaries(): TemplateSummary[] {
  return TEMPLATE_IDS.map((id) => ({ ...TEMPLATES[id] }));
}

/** JSON-ready option rows for the editor. */
export function transitionSummaries(): TransitionSummary[] {
  return TRANSITION_IDS.map((id) => ({ ...TRANSITIONS[id] }));
}

/** One line per template, for `deckrun --list-templates`. */
export function templateListing(): string[] {
  const pad = Math.max(...TEMPLATE_IDS.map((id) => id.length));
  return TEMPLATE_IDS.map((id) => `${id.padEnd(pad)}  ${TEMPLATES[id].blurb}`);
}

/** One line per transition, for `deckrun --list-transitions`. */
export function transitionListing(): string[] {
  const pad = Math.max(...TRANSITION_IDS.map((id) => id.length));
  return TRANSITION_IDS.map((id) => `${id.padEnd(pad)}  ${TRANSITIONS[id].blurb}`);
}

/**
 * Template rules are deliberately rooted at `data-template`.  They only
 * recompose existing semantic slide markup, so changing templates never
 * requires reparsing or mutating the Markdown.
 */
export const TEMPLATE_CSS = `/* ── Composition templates ────────────────────────────────────────── */
/* classic intentionally inherits the balanced base rules in generate.ts. */

:root[data-template="minimal"] .slide {
  padding-left: calc(var(--slide-pad-x) + 1.8rem);
  padding-right: calc(var(--slide-pad-x) + 1.8rem);
}

:root[data-template="minimal"] .slide__content:not(.slide__split .slide__content) {
  width: min(100%, 72rem);
  margin-inline: auto;
}

:root[data-template="minimal"] .slide__content h1::after { display: none; }
:root[data-template="minimal"] .slide__content h1 { padding-bottom: 0; }
:root[data-template="minimal"] .slide__content pre,
:root[data-template="minimal"] .slide__image-panel img {
  border-color: transparent;
  box-shadow: none;
}
:root[data-template="minimal"] .slide__content pre::before { opacity: 0.32; }
:root[data-template="minimal"] .slide__content blockquote {
  background: transparent;
  border-radius: 0;
}

:root[data-template="editorial"] .slide {
  padding-top: calc(var(--slide-pad-y) + 0.25rem);
}

:root[data-template="editorial"] .slide__content {
  border-top: 1px solid var(--accent-line);
  padding-top: 1.35rem;
}

:root[data-template="editorial"] .slide__split .slide__content {
  align-self: stretch;
}

:root[data-template="editorial"] .slide__content h1,
:root[data-template="editorial"] .slide__content h2 {
  max-width: 18ch;
}

:root[data-template="editorial"] .slide__content h1::after {
  width: 100%;
  max-width: none;
  height: 1px;
  border-radius: 0;
}

:root[data-template="editorial"] .slide__content h2 {
  padding-bottom: 0.55rem;
  border-bottom: 3px solid var(--accent);
}

:root[data-template="editorial"] .slide__content blockquote {
  border-left-width: 7px;
  border-radius: 0;
}

:root[data-template="editorial"] .slide__image-panel img,
:root[data-template="editorial"] .slide__content pre {
  border-radius: 2px;
}

:root[data-template="spotlight"] .slide {
  justify-content: center;
  text-align: center;
}

:root[data-template="spotlight"] .slide__content:not(.slide__split .slide__content) {
  width: min(100%, 68rem);
  margin-inline: auto;
}

:root[data-template="spotlight"] .slide__content h1,
:root[data-template="spotlight"] .slide__content h2,
:root[data-template="spotlight"] .slide__content h3 {
  margin-left: auto;
  margin-right: auto;
  text-wrap: balance;
}

:root[data-template="spotlight"] .slide__content h1 {
  font-size: calc(clamp(2.6rem, 6.2vw, 5.4rem) * var(--type-display));
}

:root[data-template="spotlight"] .slide__content h1::after {
  left: 50%;
  transform: translateX(-50%);
}

:root[data-template="spotlight"] .slide__content p {
  margin-left: auto;
  margin-right: auto;
  max-width: 42em;
}

:root[data-template="spotlight"] .slide__content ul,
:root[data-template="spotlight"] .slide__content ol,
:root[data-template="spotlight"] .slide__content table {
  text-align: left;
}

:root[data-template="spotlight"] .slide__content ul,
:root[data-template="spotlight"] .slide__content ol {
  display: inline-block;
  max-width: 46em;
}

:root[data-template="spotlight"] .slide__split { text-align: left; }
:root[data-template="spotlight"] .slide__split .slide__content h1,
:root[data-template="spotlight"] .slide__split .slide__content h2,
:root[data-template="spotlight"] .slide__split .slide__content h3 {
  margin-left: 0;
  margin-right: 0;
}

@media print {
  :root[data-template="spotlight"] .slide { justify-content: center !important; }
}`;

/** Independent motion presets selected through `data-transition`. */
export const TRANSITION_CSS = `/* ── Slide transitions ───────────────────────────────────────────── */
:root[data-transition="slide"] .slide {
  transition: opacity 0.38s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
}

:root[data-transition="fade"] .slide,
:root[data-transition="fade"] .slide.exit-left,
:root[data-transition="fade"] .slide.exit-right,
:root[data-transition="fade"] .slide.enter-from-left,
:root[data-transition="fade"] .slide.enter-from-right {
  transform: none;
}
:root[data-transition="fade"] .slide { transition: opacity 0.3s ease; }

:root[data-transition="zoom"] .slide {
  transform: scale(0.965);
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
:root[data-transition="zoom"] .slide.is-active { transform: scale(1); }
:root[data-transition="zoom"] .slide.exit-left,
:root[data-transition="zoom"] .slide.exit-right { transform: scale(1.035); }
:root[data-transition="zoom"] .slide.enter-from-left,
:root[data-transition="zoom"] .slide.enter-from-right { transform: scale(0.965); }

:root[data-transition="lift"] .slide {
  transform: translateY(38px);
  transition: opacity 0.38s ease, transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}
:root[data-transition="lift"] .slide.is-active { transform: translateY(0); }
:root[data-transition="lift"] .slide.exit-left { transform: translateY(-38px); }
:root[data-transition="lift"] .slide.exit-right { transform: translateY(38px); }
:root[data-transition="lift"] .slide.enter-from-left { transform: translateY(-38px); }
:root[data-transition="lift"] .slide.enter-from-right { transform: translateY(38px); }

:root[data-transition="none"] .slide,
:root[data-transition="none"] .slide.exit-left,
:root[data-transition="none"] .slide.exit-right,
:root[data-transition="none"] .slide.enter-from-left,
:root[data-transition="none"] .slide.enter-from-right {
  transform: none;
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  :root .slide,
  :root .slide.exit-left,
  :root .slide.exit-right,
  :root .slide.enter-from-left,
  :root .slide.enter-from-right {
    transform: none !important;
    transition: opacity 0.2s linear !important;
  }
}

@media print {
  :root .slide { transition: none !important; transform: none !important; }
}`;
