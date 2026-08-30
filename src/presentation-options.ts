/**
 * The composition-template and transition registry.
 *
 * A template owns spacing, alignment, rules, image treatment, and the
 * overall reading rhythm. A transition owns the spatial motion between
 * slides. Neither touches the Markdown: switching only changes the root
 * `data-template` / `data-transition` attribute and the CSS below, so an
 * existing deck transforms instantly.
 *
 * Append an entry to the arrays and it appears everywhere: the CLI's
 * `--template` / `--transition` flags, `--list-templates` /
 * `--list-transitions`, the editor's template menu and start screen, the
 * live preview, and the HTML/PDF export.
 */

// ── The templates ─────────────────────────────────────────────────────────

export interface TemplateSpec {
  id: string;
  label: string;
  blurb: string;
}

export const TEMPLATES: TemplateSpec[] = [
  { id: "classic",   label: "classic",   blurb: "The original balanced deckrun layout" },
  { id: "minimal",   label: "minimal",   blurb: "Quiet surfaces, wider margins, fewer decorative treatments" },
  { id: "editorial", label: "editorial", blurb: "Strong rules and magazine-like reading rhythm" },
  { id: "spotlight", label: "spotlight", blurb: "Centered, high-impact composition for concise keynote slides" },
];

export const TEMPLATE_BY_ID: Record<string, TemplateSpec> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t])
);

export const DEFAULT_TEMPLATE = "classic";

export type TemplateName = string;

const TEMPLATE_ALIASES: Record<string, string> = {
  "slide": "classic",
  "simple": "minimal",
  "clean": "minimal",
  "poster": "spotlight",
};

export function findTemplate(input: string | undefined | null): string | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (TEMPLATE_BY_ID[key]) return key;
  return TEMPLATE_ALIASES[key] ?? null;
}

export function resolveTemplateName(input: string | undefined | null): TemplateName {
  return findTemplate(input) ?? DEFAULT_TEMPLATE;
}

export interface TemplateSummary {
  id: string;
  label: string;
  blurb: string;
}

/** What the editor's template picker and menu list. */
export function templateSummaries(): TemplateSummary[] {
  return TEMPLATES;
}

/** One line per template, for `deckrun --list-templates`. */
export function templateListing(): string[] {
  const pad = Math.max(...TEMPLATES.map((t) => t.id.length));
  return TEMPLATES.map((t) => `${t.id.padEnd(pad)}  ${t.blurb}`);
}

// ── The transitions ───────────────────────────────────────────────────────

export interface TransitionSpec {
  id: string;
  label: string;
  blurb: string;
}

export const TRANSITIONS: TransitionSpec[] = [
  { id: "slide", label: "slide", blurb: "Slides in from the side, direction-aware" },
  { id: "fade",  label: "fade",  blurb: "Crossfades between slides" },
  { id: "zoom",  label: "zoom",  blurb: "The incoming slide zooms in from a hint of distance" },
  { id: "lift",  label: "lift",  blurb: "The new slide lifts up from beneath" },
  { id: "none",  label: "none",  blurb: "No motion; slides snap cleanly" },
];

export const TRANSITION_BY_ID: Record<string, TransitionSpec> = Object.fromEntries(
  TRANSITIONS.map((t) => [t.id, t])
);

export const DEFAULT_TRANSITION = "slide";

export type TransitionName = string;

const TRANSITION_ALIASES: Record<string, string> = {
  "slide-left": "slide",
  "fade-in": "fade",
  "crossfade": "fade",
};

export function findTransition(input: string | undefined | null): string | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (TRANSITION_BY_ID[key]) return key;
  return TRANSITION_ALIASES[key] ?? null;
}

export function resolveTransitionName(input: string | undefined | null): TransitionName {
  return findTransition(input) ?? DEFAULT_TRANSITION;
}

export interface TransitionSummary {
  id: string;
  label: string;
  blurb: string;
}

/** What the editor's transition picker and menu list. */
export function transitionSummaries(): TransitionSummary[] {
  return TRANSITIONS;
}

/** One line per transition, for `deckrun --list-transitions`. */
export function transitionListing(): string[] {
  const pad = Math.max(...TRANSITIONS.map((t) => t.id.length));
  return TRANSITIONS.map((t) => `${t.id.padEnd(pad)}  ${t.blurb}`);
}

// ── CSS ───────────────────────────────────────────────────────────────────

/**
 * Composition styles. Each template is scoped to the root `data-template`
 * attribute, and only changes layout and treatment — never color or type,
 * which belong to the theme — so the two compose cleanly.
 */
export const TEMPLATE_CSS = `
/* ── Template: classic ──────────────────────────────────────────────── */
html[data-template="classic"] .slide__content {
  max-width: 56rem;
}

html[data-template="classic"] .slide {
  --slide-pad-x: 9vw;
  --slide-pad-y: 8vh;
}

/* ── Template: minimal ──────────────────────────────────────────────── */
html[data-template="minimal"] .slide {
  --slide-pad-x: 13vw;
  --slide-pad-y: 10vh;
}

html[data-template="minimal"] .slide__content {
  max-width: 46rem;
}

html[data-template="minimal"] #backdrop {
  opacity: 0.35;
}

html[data-template="minimal"] h1,
html[data-template="minimal"] h2,
html[data-template="minimal"] h3 {
  text-shadow: none;
}

/* ── Template: editorial ────────────────────────────────────────────── */
html[data-template="editorial"] .slide {
  --slide-pad-x: 11vw;
  --slide-pad-y: 9vh;
}

html[data-template="editorial"] .slide__content {
  max-width: 52rem;
}

html[data-template="editorial"] .slide h1 {
  border-bottom: 2px solid var(--accent);
  padding-bottom: 0.5em;
  margin-bottom: 1.1em;
}

html[data-template="editorial"] .slide h2 {
  color: var(--accent2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.82em;
  margin-bottom: 0.6em;
}

html[data-template="editorial"] .slide ul,
html[data-template="editorial"] .slide ol {
  line-height: 1.7;
}

/* ── Template: spotlight ────────────────────────────────────────────── */
html[data-template="spotlight"] .slide {
  --slide-pad-x: 12vw;
  --slide-pad-y: 10vh;
}

html[data-template="spotlight"] .slide__content {
  max-width: 40rem;
  margin: auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

html[data-template="spotlight"] .slide__content h1,
html[data-template="spotlight"] .slide__content h2 {
  text-align: center;
}

html[data-template="spotlight"] .slide__content ul,
html[data-template="spotlight"] .slide__content ol {
  text-align: left;
}

html[data-template="spotlight"] .slide__content p,
html[data-template="spotlight"] .slide__content ul,
html[data-template="spotlight"] .slide__content ol {
  font-size: 1.15em;
}
`;

/**
 * Motion styles, scoped to the root `data-transition` attribute. The base
 * `.slide` rule in `generate.ts` already implements the default slide
 * transition (translate X in/out over 380ms); these override it per choice.
 * `prefers-reduced-motion` and print are handled there too.
 */
export const TRANSITION_CSS = `
/* ── Transition: fade ───────────────────────────────────────────────── */
html[data-transition="fade"] .slide,
html[data-transition="fade"] .slide.is-active,
html[data-transition="fade"] .slide.exit-left,
html[data-transition="fade"] .slide.exit-right,
html[data-transition="fade"] .slide.enter-from-left,
html[data-transition="fade"] .slide.enter-from-right {
  transform: none !important;
}

/* ── Transition: zoom ───────────────────────────────────────────────── */
html[data-transition="zoom"] .slide {
  transform: scale(0.92);
}
html[data-transition="zoom"] .slide.is-active {
  transform: scale(1);
}
html[data-transition="zoom"] .slide.exit-left,
html[data-transition="zoom"] .slide.exit-right {
  transform: scale(1.06);
}
html[data-transition="zoom"] .slide.enter-from-left,
html[data-transition="zoom"] .slide.enter-from-right {
  transform: scale(0.92);
}

/* ── Transition: lift ───────────────────────────────────────────────── */
html[data-transition="lift"] .slide {
  transform: translateY(42px);
}
html[data-transition="lift"] .slide.is-active {
  transform: none;
}
html[data-transition="lift"] .slide.exit-left,
html[data-transition="lift"] .slide.exit-right {
  transform: translateY(-42px);
}
html[data-transition="lift"] .slide.enter-from-left,
html[data-transition="lift"] .slide.enter-from-right {
  transform: translateY(42px);
}

/* ── Transition: none ───────────────────────────────────────────────── */
html[data-transition="none"] .slide,
html[data-transition="none"] .slide.is-active,
html[data-transition="none"] .slide.exit-left,
html[data-transition="none"] .slide.exit-right,
html[data-transition="none"] .slide.enter-from-left,
html[data-transition="none"] .slide.enter-from-right {
  transform: none !important;
  transition: none !important;
}
`;