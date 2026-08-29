/**
 * The composition-template and transition registry.
 *
 * A theme owns color and type; a template owns spacing, alignment, rules,
 * image treatment, and the overall reading rhythm. Both compose with the base
 * slide CSS in `SLIDE_CSS` and the theme's custom properties, and switch by
 * changing the root `data-template` / `data-transition` attribute.
 */

// ── Templates ───────────────────────────────────────────────────────────

export type TemplateName = "classic" | "minimal" | "editorial" | "spotlight";

interface TemplateSpec {
  label: string;
  blurb: string;
}

/** Ordered the way the picker and `--list-templates` should show them. */
const TEMPLATE_IDS: TemplateName[] = ["classic", "minimal", "editorial", "spotlight"];

const TEMPLATE_SPECS: Record<TemplateName, TemplateSpec> = {
  classic: {
    label: "Classic",
    blurb: "The original balanced deckrun layout",
  },
  minimal: {
    label: "Minimal",
    blurb: "Quiet surfaces, wider margins, fewer decorative treatments",
  },
  editorial: {
    label: "Editorial",
    blurb: "Strong rules and magazine-like reading rhythm",
  },
  spotlight: {
    label: "Spotlight",
    blurb: "Centered, high-impact composition for concise keynote slides",
  },
};

export const DEFAULT_TEMPLATE: TemplateName = "classic";

/** A template id from untrusted input, or `null` if it names nothing. */
export function findTemplate(input: string | undefined | null): TemplateName | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (key in TEMPLATE_SPECS) return key as TemplateName;
  return null;
}

/** A template id from untrusted input, falling back to the default. */
export function resolveTemplateName(input: string | undefined | null): TemplateName {
  return findTemplate(input) ?? DEFAULT_TEMPLATE;
}

/** What the editor's template picker and the CLI's help text list. */
export function templateSummaries(): Array<{ id: TemplateName; label: string; blurb: string }> {
  return TEMPLATE_IDS.map((id) => ({
    id,
    label: TEMPLATE_SPECS[id].label,
    blurb: TEMPLATE_SPECS[id].blurb,
  }));
}

/** One line per template, for `deckrun --list-templates`. */
export function templateListing(): string[] {
  const pad = Math.max(...TEMPLATE_IDS.map((id) => id.length));
  return TEMPLATE_IDS.map((id) => {
    const t = TEMPLATE_SPECS[id];
    return `${id.padEnd(pad)}  ${t.label.padEnd(10)}  ${t.blurb}`;
  });
}

// ── Transitions ──────────────────────────────────────────────────────────

export type TransitionName = "slide" | "fade" | "zoom" | "lift" | "none";

interface TransitionSpec {
  label: string;
  blurb: string;
}

/** Ordered the way the picker and `--list-transitions` should show them. */
const TRANSITION_IDS: TransitionName[] = ["slide", "fade", "zoom", "lift", "none"];

const TRANSITION_SPECS: Record<TransitionName, TransitionSpec> = {
  slide: {
    label: "Slide",
    blurb: "Slides in from the side",
  },
  fade: {
    label: "Fade",
    blurb: "Crossfade between slides",
  },
  zoom: {
    label: "Zoom",
    blurb: "Slides scale in and out",
  },
  lift: {
    label: "Lift",
    blurb: "Slides lift up as they leave",
  },
  none: {
    label: "None",
    blurb: "No motion between slides",
  },
};

export const DEFAULT_TRANSITION: TransitionName = "slide";

/** A transition id from untrusted input, or `null` if it names nothing. */
export function findTransition(input: string | undefined | null): TransitionName | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (key in TRANSITION_SPECS) return key as TransitionName;
  return null;
}

/** A transition id from untrusted input, falling back to the default. */
export function resolveTransitionName(input: string | undefined | null): TransitionName {
  return findTransition(input) ?? DEFAULT_TRANSITION;
}

/** What the editor's transition picker and the CLI's help text list. */
export function transitionSummaries(): Array<{ id: TransitionName; label: string; blurb: string }> {
  return TRANSITION_IDS.map((id) => ({
    id,
    label: TRANSITION_SPECS[id].label,
    blurb: TRANSITION_SPECS[id].blurb,
  }));
}

/** One line per transition, for `deckrun --list-transitions`. */
export function transitionListing(): string[] {
  const pad = Math.max(...TRANSITION_IDS.map((id) => id.length));
  return TRANSITION_IDS.map((id) => {
    const t = TRANSITION_SPECS[id];
    return `${id.padEnd(pad)}  ${t.label.padEnd(6)}  ${t.blurb}`;
  });
}

// ── Composition templates ───────────────────────────────────────────────

/**
 * Per-template composition overrides. The base slide layout, typography, and
 * entrance animation live in `SLIDE_CSS`; each template here only adjusts the
 * spacing, alignment, rules, and image treatment, keyed on `data-template`.
 */
export const TEMPLATE_CSS = `/* ── Composition templates ────────────────────────────────────────────── */
[data-template="classic"] {
  /* The balanced default — no overrides needed. */
}

[data-template="minimal"] .slide {
  padding: 5.2vh 5.2vw;
}

[data-template="minimal"] .slide__content h1::after {
  opacity: 0.25;
}

[data-template="minimal"] .slide__content pre::before {
  display: none;
}

[data-template="minimal"] .slide__image-panel img {
  border-radius: 8px;
  box-shadow: var(--shadow-md);
}

[data-template="editorial"] .slide__content h1 {
  letter-spacing: -0.02em;
}

[data-template="editorial"] .slide__content h1::after {
  height: 4px;
  background: linear-gradient(var(--accent), var(--accent-3));
}

[data-template="editorial"] .slide__content h2::before {
  content: '';
  display: block;
  width: 2.4em;
  height: 3px;
  margin-bottom: 0.55rem;
  background: var(--accent);
}

[data-template="editorial"] .slide__content > * + * {
  border-top: 1px solid var(--hairline);
  padding-top: 1.4rem;
}

[data-template="editorial"] .slide__content blockquote {
  margin: 1.6rem 0;
  padding: 1rem 1.4rem 1rem 1.9rem;
  border-left: 3px solid var(--accent);
}

[data-template="spotlight"] .slide {
  justify-content: center;
  text-align: center;
}

[data-template="spotlight"] .slide__content {
  max-width: 24em;
  margin-left: auto;
  margin-right: auto;
}

[data-template="spotlight"] .slide__content h1 {
  font-size: calc(clamp(2.6rem, 5.6vw, 4.4rem) * var(--type-display));
}

[data-template="spotlight"] .slide__content h1::after {
  display: none;
}

[data-template="spotlight"] .slide__content img {
  margin-left: auto;
  margin-right: auto;
}

[data-template="spotlight"] .slide__content strong {
  font-weight: 800;
}`;

// ── Slide transitions ───────────────────────────────────────────────────

/**
 * Per-transition overrides. The base slide transition in `SLIDE_CSS` slides in
 * from the right going forward and from the left going back; each transition
 * here replaces that motion per the root's `data-transition` attribute.
 */
export const TRANSITION_CSS = `/* ── Slide transitions ────────────────────────────────────────────────── */
[data-transition="slide"] {
  /* The moving slide is the base — no overrides needed. */
}

[data-transition="fade"] .slide {
  transition: opacity 0.38s ease;
}

[data-transition="fade"] .slide.enter-from-left,
[data-transition="fade"] .slide.enter-from-right {
  transform: none;
  opacity: 0;
}

[data-transition="fade"] .slide.is-active {
  transform: none;
  opacity: 1;
}

[data-transition="fade"] .slide.exit-left,
[data-transition="fade"] .slide.exit-right {
  transform: none;
  opacity: 0;
}

[data-transition="zoom"] .slide {
  transform: none;
  transition: opacity 0.38s ease, transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
}

[data-transition="zoom"] .slide.enter-from-right,
[data-transition="zoom"] .slide.enter-from-left {
  transform: scale(0.94);
  opacity: 0;
}

[data-transition="zoom"] .slide.is-active {
  transform: scale(1);
  opacity: 1;
}

[data-transition="zoom"] .slide.exit-left,
[data-transition="zoom"] .slide.exit-right {
  transform: scale(0.94);
  opacity: 0;
}

[data-transition="lift"] .slide {
  transition: opacity 0.38s ease, transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
}

[data-transition="lift"] .slide.enter-from-right,
[data-transition="lift"] .slide.enter-from-left {
  transform: translateY(26px);
  opacity: 0;
}

[data-transition="lift"] .slide.is-active {
  transform: translateY(0);
  opacity: 1;
}

[data-transition="lift"] .slide.exit-left,
[data-transition="lift"] .slide.exit-right {
  transform: translateY(-26px);
  opacity: 0;
}

[data-transition="none"] .slide {
  transition: none;
  transform: none !important;
  opacity: 1 !important;
}

[data-transition="none"] .slide.enter-from-left,
[data-transition="none"] .slide.enter-from-right,
[data-transition="none"] .slide.exit-left,
[data-transition="none"] .slide.exit-right,
[data-transition="none"] .slide.is-active {
  transform: none !important;
  opacity: 1 !important;
}

@media (prefers-reduced-motion: reduce) {
  [data-transition="slide"] .slide,
  [data-transition="fade"] .slide,
  [data-transition="zoom"] .slide,
  [data-transition="lift"] .slide,
  [data-transition="none"] .slide {
    transition: opacity 0.2s linear;
    transform: none !important;
  }
}

@media print {
  [data-transition="slide"] .slide,
  [data-transition="fade"] .slide,
  [data-transition="zoom"] .slide,
  [data-transition="lift"] .slide,
  [data-transition="none"] .slide {
    transition: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}`;
