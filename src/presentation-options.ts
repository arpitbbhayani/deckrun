export type TemplateName = "classic" | "minimal" | "editorial" | "spotlight";
export type TransitionName = "slide" | "fade" | "zoom" | "lift" | "none";

export const DEFAULT_TEMPLATE: TemplateName = "classic";
export const DEFAULT_TRANSITION: TransitionName = "slide";

export const TEMPLATE_IDS: readonly TemplateName[] = [
  "classic",
  "minimal",
  "editorial",
  "spotlight",
] as const;

export const TRANSITION_IDS: readonly TransitionName[] = [
  "slide",
  "fade",
  "zoom",
  "lift",
  "none",
] as const;

export interface OptionSummary<T extends string> {
  id: T;
  label: string;
  blurb: string;
}

export const TEMPLATE_SPECS: Record<TemplateName, { label: string; blurb: string }> = {
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

export const TRANSITION_SPECS: Record<TransitionName, { label: string; blurb: string }> = {
  slide: {
    label: "Slide",
    blurb: "Horizontal sliding transition between slides",
  },
  fade: {
    label: "Fade",
    blurb: "Cross-fade between slides",
  },
  zoom: {
    label: "Zoom",
    blurb: "Scale up and down between slides",
  },
  lift: {
    label: "Lift",
    blurb: "Vertical rising transition between slides",
  },
  none: {
    label: "None",
    blurb: "Instant cut between slides",
  },
};

export function findTemplate(input: string | undefined | null): TemplateName | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  for (const id of TEMPLATE_IDS) {
    if (id === key) return id;
    if (TEMPLATE_SPECS[id].label.toLowerCase() === key) return id;
  }
  return null;
}

export function resolveTemplateName(input: string | undefined | null): TemplateName {
  return findTemplate(input) ?? DEFAULT_TEMPLATE;
}

export function templateSummaries(): Array<OptionSummary<TemplateName>> {
  return TEMPLATE_IDS.map((id) => ({
    id,
    label: TEMPLATE_SPECS[id].label,
    blurb: TEMPLATE_SPECS[id].blurb,
  }));
}

export function templateListing(): string[] {
  const pad = Math.max(...TEMPLATE_IDS.map((id) => id.length));
  return TEMPLATE_IDS.map((id) => {
    const s = TEMPLATE_SPECS[id];
    return `${id.padEnd(pad)}  ${s.label.padEnd(10)}  ${s.blurb}`;
  });
}

export function findTransition(input: string | undefined | null): TransitionName | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  for (const id of TRANSITION_IDS) {
    if (id === key) return id;
    if (TRANSITION_SPECS[id].label.toLowerCase() === key) return id;
  }
  return null;
}

export function resolveTransitionName(input: string | undefined | null): TransitionName {
  return findTransition(input) ?? DEFAULT_TRANSITION;
}

export function transitionSummaries(): Array<OptionSummary<TransitionName>> {
  return TRANSITION_IDS.map((id) => ({
    id,
    label: TRANSITION_SPECS[id].label,
    blurb: TRANSITION_SPECS[id].blurb,
  }));
}

export function transitionListing(): string[] {
  const pad = Math.max(...TRANSITION_IDS.map((id) => id.length));
  return TRANSITION_IDS.map((id) => {
    const s = TRANSITION_SPECS[id];
    return `${id.padEnd(pad)}  ${s.label.padEnd(8)}  ${s.blurb}`;
  });
}

export const TEMPLATE_CSS = `/* ── Templates ──────────────────────────────────────────────────────────── */

/* Minimal */
:root[data-template="minimal"] {
  --slide-pad-x: 10vw;
  --slide-pad-y: 8vh;
}
:root[data-template="minimal"] #backdrop {
  opacity: 0.15;
}
:root[data-template="minimal"] .slide__content h1 {
  letter-spacing: -0.02em;
}
:root[data-template="minimal"] blockquote {
  border-left-width: 2px;
  background: transparent;
}
:root[data-template="minimal"] pre {
  border: 1px solid var(--surface0);
}

/* Editorial */
:root[data-template="editorial"] {
  --slide-pad-x: 7vw;
}
:root[data-template="editorial"] .slide__content h1 {
  border-bottom: 3px solid var(--accent);
  padding-bottom: 0.3em;
  margin-bottom: 0.6em;
}
:root[data-template="editorial"] .slide__content h2 {
  border-bottom: 1px solid var(--surface1);
  padding-bottom: 0.2em;
}
:root[data-template="editorial"] blockquote {
  border-left: 4px solid var(--accent);
  font-style: italic;
  background: var(--surface0);
}
:root[data-template="editorial"] table th {
  border-bottom: 2px solid var(--accent);
}
:root[data-template="editorial"] hr {
  border: none;
  border-top: 2px solid var(--surface2);
  margin: 2em 0;
}

/* Spotlight */
:root[data-template="spotlight"] .slide {
  justify-content: center;
  align-items: center;
  text-align: center;
}
:root[data-template="spotlight"] .slide__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
:root[data-template="spotlight"] .slide__content h1 {
  /* A shade larger than a normal heading: on a template built around one
     statement a slide, the statement carries it. */
  font-size: calc(clamp(2.1rem, 4.6vw, 3.6rem) * 1.15);
  text-align: center;
}
:root[data-template="spotlight"] .slide__content p {
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
}
:root[data-template="spotlight"] .slide__content ul,
:root[data-template="spotlight"] .slide__content ol {
  text-align: left;
  display: inline-block;
  margin-left: auto;
  margin-right: auto;
}
:root[data-template="spotlight"] .slide__content blockquote {
  text-align: center;
  border-left: none;
  border-top: 2px solid var(--accent);
  border-bottom: 2px solid var(--accent);
  padding: 1em 2em;
  background: transparent;
}
:root[data-template="spotlight"] .slide__content pre {
  text-align: left;
}
`;

export const TRANSITION_CSS = `/* ── Transitions ────────────────────────────────────────────────────────── */

/* Fade */
:root[data-transition="fade"] .slide {
  transition: opacity 0.3s ease;
  transform: none !important;
}
:root[data-transition="fade"] .slide.exit-left,
:root[data-transition="fade"] .slide.exit-right,
:root[data-transition="fade"] .slide.enter-from-left,
:root[data-transition="fade"] .slide.enter-from-right {
  transform: none !important;
  opacity: 0;
}
:root[data-transition="fade"] .slide.is-active {
  opacity: 1;
  transform: none !important;
}

/* Zoom */
:root[data-transition="zoom"] .slide {
  transform: scale(0.92);
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
:root[data-transition="zoom"] .slide.is-active {
  transform: scale(1);
  opacity: 1;
}
:root[data-transition="zoom"] .slide.exit-left,
:root[data-transition="zoom"] .slide.exit-right {
  transform: scale(1.08);
  opacity: 0;
}
:root[data-transition="zoom"] .slide.enter-from-left,
:root[data-transition="zoom"] .slide.enter-from-right {
  transform: scale(0.92);
  opacity: 0;
}

/* Lift */
:root[data-transition="lift"] .slide {
  transform: translateY(48px);
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
:root[data-transition="lift"] .slide.is-active {
  transform: translateY(0);
  opacity: 1;
}
:root[data-transition="lift"] .slide.exit-left,
:root[data-transition="lift"] .slide.exit-right {
  transform: translateY(-48px);
  opacity: 0;
}
:root[data-transition="lift"] .slide.enter-from-left,
:root[data-transition="lift"] .slide.enter-from-right {
  transform: translateY(48px);
  opacity: 0;
}

/* None */
:root[data-transition="none"] .slide,
:root[data-transition="none"] .slide.is-active,
:root[data-transition="none"] .slide.exit-left,
:root[data-transition="none"] .slide.exit-right,
:root[data-transition="none"] .slide.enter-from-left,
:root[data-transition="none"] .slide.enter-from-right {
  transition: none !important;
  transform: none !important;
}

@media (prefers-reduced-motion: reduce) {
  :root[data-transition] .slide {
    transition: opacity 0.2s linear !important;
    transform: none !important;
  }
}

@media print {
  :root[data-transition] .slide {
    transition: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
`;
