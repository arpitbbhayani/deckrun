import type { Slide } from "./parser.js";
import {
  DECOR_CSS,
  DEFAULT_SIZE,
  DEFAULT_THEME,
  decorOf,
  findFont,
  fontOverrideCss,
  googleFontsHref,
  hljsHref,
  resolveSizeName,
  resolveThemeName,
  sizeRootCss,
  themeRootCss,
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
  richContentFeatures,
  richContentHead,
} from "./rich-content.js";
import { FRAGMENT_CSS, FRAGMENT_RUNTIME } from "./fragments.js";

export {
  DECOR_CSS,
  decorOf,
  googleFontsHref,
  hljsHref,
  hljsMapJson,
  decorMapJson,
  themeRootCss,
  themeSwitchableCss,
  themeSummaries,
  resolveThemeName,
  findTheme,
  THEME_IDS,
  THEMES,
  DEFAULT_THEME,
  type ThemeName,
  sizeRootCss,
  sizeSwitchableCss,
  sizeSummaries,
  resolveSizeName,
  findSize,
  SIZE_IDS,
  DEFAULT_SIZE,
  type SizeName,
  fontOverrideCss,
  fontSummaries,
  fontListing,
  fontName,
  findFont,
  FONT_IDS,
  FONTS,
  type FontSummary,
} from "./themes.js";

function escAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderSlide(slide: Slide, index: number): string {
  const bgStyle = slide.bgImage
    ? ` style="--slide-bg-url: url('${escAttr(slide.bgImage.src)}'); --slide-bg-opacity: ${slide.bgImage.opacity};"`
    : "";

  const bgLayer = slide.bgImage
    ? `<div class="slide__bg" aria-hidden="true"></div>`
    : "";

  let innerHtml: string;

  if (slide.rightImage) {
    innerHtml = `
      <div class="slide__split">
        <div class="slide__content">${slide.html}</div>
        <div class="slide__image-panel" style="opacity:${slide.rightImage.opacity}">
          <img src="${escAttr(slide.rightImage.src)}" alt="${escAttr(slide.rightImage.alt)}" />
        </div>
      </div>`;
  } else if (slide.leftImage) {
    innerHtml = `
      <div class="slide__split slide__split--left-image">
        <div class="slide__image-panel" style="opacity:${slide.leftImage.opacity}">
          <img src="${escAttr(slide.leftImage.src)}" alt="${escAttr(slide.leftImage.alt)}" />
        </div>
        <div class="slide__content">${slide.html}</div>
      </div>`;
  } else {
    innerHtml = `<div class="slide__content">${slide.html}</div>`;
  }

  return `<div class="slide${slide.bgImage ? " slide--has-bg" : ""}" data-index="${index}"${bgStyle}>
  ${bgLayer}
  ${innerHtml}
</div>`;
}

/** Box-model reset shared by the deck and the editor preview. */
export const RESET_CSS = `/* ── Reset & base ─────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`;

/** Slide rendering rules. Shared verbatim by the deck and the editor preview. */
export const SLIDE_CSS = `html, body {
  height: 100%;
  overflow: hidden;
  background: var(--crust);
  color: var(--text);
  font-family: var(--font-body);
  letter-spacing: var(--body-tracking);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-variant-ligatures: common-ligatures;
}

/* ── Presentation shell ───────────────────────────────────────────────── */
#presentation {
  position: relative;
  z-index: 1;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ── Slide base ───────────────────────────────────────────────────────── */
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: var(--slide-pad-y) var(--slide-pad-x);
  opacity: 0;
  pointer-events: none;
  /* forward: enter from right */
  transform: translateX(48px);
  transition:
    opacity 0.38s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide.is-active {
  opacity: 1;
  transform: translateX(0);
  pointer-events: all;
}

/* Exiting slide direction classes — set by JS before transition */
.slide.exit-left  { opacity: 0; transform: translateX(-48px); }
.slide.exit-right { opacity: 0; transform: translateX(48px); }
.slide.enter-from-left  { transform: translateX(-48px); opacity: 0; }
.slide.enter-from-right { transform: translateX(48px);  opacity: 0; }

/* ── Background image layer ───────────────────────────────────────────── */
.slide--has-bg {
  background: var(--base);
}

.slide__bg {
  position: absolute;
  inset: 0;
  background-image: var(--slide-bg-url);
  background-size: cover;
  background-position: center;
  opacity: var(--slide-bg-opacity, 0.5);
  z-index: 0;
}

/* ── Content area ─────────────────────────────────────────────────────── */
.slide__content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 100%;
  max-height: calc(100vh - var(--slide-pad-y) * 2);
  overflow: hidden;
}

/* Each block lands a beat after the one above it, so a slide assembles
   itself instead of appearing all at once. */
.slide.is-active .slide__content > * {
  animation: slide-rise 0.52s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.slide.is-active .slide__content > *:nth-child(1) { animation-delay: 0.05s; }
.slide.is-active .slide__content > *:nth-child(2) { animation-delay: 0.11s; }
.slide.is-active .slide__content > *:nth-child(3) { animation-delay: 0.17s; }
.slide.is-active .slide__content > *:nth-child(4) { animation-delay: 0.23s; }
.slide.is-active .slide__content > *:nth-child(5) { animation-delay: 0.29s; }
.slide.is-active .slide__content > *:nth-child(6) { animation-delay: 0.34s; }
.slide.is-active .slide__content > *:nth-child(n+7) { animation-delay: 0.39s; }

@keyframes slide-rise {
  from { opacity: 0; transform: translateY(15px); }
  to   { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .slide { transition: opacity 0.2s linear; transform: none !important; }
  .slide.is-active .slide__content > * { animation: none !important; }
}

/* ── Split layouts ────────────────────────────────────────────────────── */
.slide__split {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: 100%;
  height: calc(100vh - var(--slide-pad-y) * 2);
  align-items: center;
  gap: 3.2rem;
}

.slide__split .slide__content {
  flex: 1;
  max-width: none;
}

.slide__image-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 80vh;
}

.slide__image-panel img {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
  border-radius: 12px;
  border: 1px solid var(--hairline);
  box-shadow: var(--shadow-lg);
}

/* ── Typography ───────────────────────────────────────────────────────── */
.slide__content h1,
.slide__content h2,
.slide__content h3,
.slide__content h4 {
  font-family: var(--font-display);
  letter-spacing: var(--display-tracking);
  text-wrap: balance;
}

.slide__content h1 {
  position: relative;
  font-size: calc(clamp(2.1rem, 4.6vw, 3.6rem) * var(--type-display));
  font-weight: var(--display-weight);
  text-transform: var(--display-case);
  color: var(--accent);
  margin-bottom: 1.5rem;
  padding-bottom: 0.55rem;
  line-height: 1.1;
}

/* A gradient rule under the title, fading out rather than stopping dead. */
.slide__content h1::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 2.4em;
  max-width: 55%;
  height: 3px;
  border-radius: 3px;
  background: var(--accent-fade);
}

.slide__content h2 {
  font-size: calc(clamp(1.55rem, 3vw, 2.5rem) * var(--type-display));
  font-weight: 600;
  color: var(--accent-2);
  margin-bottom: 1.05rem;
  line-height: 1.2;
}

.slide__content h3 {
  font-size: calc(clamp(1.15rem, 2vw, 1.8rem) * var(--type-display));
  font-weight: 600;
  color: var(--accent-3);
  margin-bottom: 0.75rem;
  line-height: 1.28;
}

.slide__content h4 {
  font-size: calc(1.3rem * var(--type-display));
  font-weight: 600;
  color: var(--subtext1);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.55rem;
}

.slide__content p {
  font-size: calc(clamp(1rem, 1.6vw, 1.35rem) * var(--type-body));
  line-height: calc(1.72 * var(--type-lead));
  margin-bottom: 1rem;
  color: var(--subtext1);
}

.slide__content strong {
  color: var(--text);
  font-weight: 700;
  /* A tinted underlay instead of a second color, so emphasis reads without
     turning the sentence into a swatch. */
  background: linear-gradient(transparent 62%, var(--accent-soft) 62%);
}

.slide__content em {
  color: var(--accent-3);
  font-style: italic;
}

/* ── Lists ────────────────────────────────────────────────────────────── */
.slide__content ul,
.slide__content ol {
  font-size: calc(clamp(0.95rem, 1.5vw, 1.28rem) * var(--type-body));
  line-height: calc(1.72 * var(--type-lead));
  margin-bottom: 1rem;
  color: var(--subtext1);
}

.slide__content ul { list-style: none; padding-left: 1.35em; }

/* Numbers live in the marker box, outside the content box, so an ordered list
   needs room for "10." before its text starts. */
.slide__content ol { padding-left: 2.05em; }

.slide__content li {
  margin-bottom: 0.42em;
  padding-left: 0.15em;
}

.slide__content ol li::marker {
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.86em;
  font-weight: 600;
}

/* A custom bullet: small, accent-colored, and vertically centred on the
   first line rather than sitting on the baseline like a period. */
.slide__content ul > li {
  position: relative;
  padding-left: 0.9em;
}

.slide__content ul > li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 0.33em;
  height: 0.33em;
  border-radius: 0.1em;
  background: var(--accent);
  transform: rotate(45deg);
}

.slide__content ul ul > li::before {
  background: transparent;
  border: 1.5px solid var(--accent-3);
}

.slide__content ul ul,
.slide__content ol ol,
.slide__content ul ol,
.slide__content ol ul {
  margin-top: 0.34em;
  margin-bottom: 0;
  padding-left: 1em;
  font-size: 0.94em;
  color: var(--subtext0);
}

/* ── Code ─────────────────────────────────────────────────────────────── */
.slide__content pre {
  position: relative;
  margin: 1.2rem 0;
  border-radius: 12px;
  border: 1px solid var(--hairline);
  overflow-x: auto;
  font-size: calc(clamp(0.75rem, 1.1vw, 1rem) * var(--type-code));
  box-shadow: var(--code-shadow);
  background: var(--mantle);
}

/* A hairline of accent along the top edge, so a code block reads as a panel
   rather than as a hole in the slide. */
.slide__content pre::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  border-radius: 12px 12px 0 0;
  background: var(--accent-fade);
  opacity: 0.8;
}

/* Override hljs background to match our theme */
.slide__content pre code.hljs {
  background: transparent !important;
  border-radius: 12px;
  padding: 1.5rem 1.7rem;
  font-family: var(--font-mono);
  font-size: inherit;
  line-height: calc(1.66 * var(--type-lead));
  letter-spacing: 0;
}

/* Inline code */
.slide__content :not(pre) > code {
  font-family: var(--font-mono);
  font-size: 0.86em;
  background: var(--surface-soft);
  color: var(--accent-3);
  border-radius: 5px;
  padding: 0.16em 0.42em;
  border: 1px solid var(--hairline);
  letter-spacing: 0;
}

/* ── Blockquotes ──────────────────────────────────────────────────────── */
.slide__content blockquote {
  position: relative;
  padding: 0.78em 1.25em 0.78em 1.7em;
  margin: 1.2rem 0;
  background: var(--accent-soft);
  border-left: 3px solid var(--accent);
  border-radius: 0 10px 10px 0;
  color: var(--subtext1);
  font-size: calc(clamp(1rem, 1.5vw, 1.3rem) * var(--type-body));
}

.slide__content blockquote::before {
  content: '\\201C';
  position: absolute;
  /* em here is the glyph's own 2.6em, not the quote's. */
  left: 0.16em;
  top: 0.04em;
  font-family: var(--font-display);
  font-size: 2.6em;
  line-height: 1;
  color: var(--accent-line);
  pointer-events: none;
}

.slide__content blockquote p {
  font-size: inherit;
  margin-bottom: 0;
  color: inherit;
  max-width: none;
}

/* ── Tables ───────────────────────────────────────────────────────────── */
.slide__content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.2rem 0;
  font-size: calc(clamp(0.85rem, 1.2vw, 1.05rem) * var(--type-code));
  /* Rules, not boxes: a grid of borders fights the text for attention. */
  border-bottom: 1px solid var(--hairline);
}

.slide__content th {
  background: transparent;
  color: var(--accent);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.86em;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.5rem 1rem;
  text-align: left;
  border: none;
  border-bottom: 2px solid var(--accent-line);
}

.slide__content td {
  padding: 0.6rem 1rem;
  border: none;
  border-bottom: 1px solid var(--hairline);
  color: var(--subtext1);
}

.slide__content tr:nth-child(even) td {
  background: var(--surface-soft);
}

/* ── Links ────────────────────────────────────────────────────────────── */
.slide__content a {
  color: var(--accent-2);
  text-decoration: none;
  background: linear-gradient(var(--accent-2), var(--accent-2)) 0 100% / 100% 1px no-repeat;
  padding-bottom: 2px;
  transition: color 0.18s ease, background-size 0.18s ease;
}

.slide__content a:hover {
  color: var(--accent);
  background-image: linear-gradient(var(--accent), var(--accent));
  background-size: 100% 2px;
}

/* ── Inline images (no positioning) ──────────────────────────────────── */
.slide__content img {
  max-width: 100%;
  max-height: 55vh;
  border-radius: 10px;
  display: block;
  margin: 1rem auto;
  box-shadow: var(--shadow-md);
}

/* ── Embeds: raw HTML iframe / video ─────────────────────────────────── */
.slide__content iframe {
  display: block;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
  margin: 1.1rem auto;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--mantle);
  box-shadow: var(--shadow-md);
}

.slide__content video {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  margin: 1.1rem auto;
  border-radius: 12px;
  background: var(--crust);
  object-fit: contain;
  box-shadow: var(--shadow-md);
}

/* ── Inline HTML accents ──────────────────────────────────────────────── */
.slide__content kbd {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.8em;
  background: var(--surface0);
  border: 1px solid var(--surface2);
  border-bottom-width: 2px;
  border-radius: 6px;
  padding: 0.12em 0.45em;
  color: var(--text);
  white-space: nowrap;
}

.slide__content mark {
  background: var(--accent-soft);
  color: var(--accent);
  box-shadow: inset 0 -0.42em 0 var(--accent-soft);
  border-radius: 3px;
  padding: 0.05em 0.24em;
  font-weight: 600;
}

/* ── Horizontal rule ──────────────────────────────────────────────────── */
.slide__content hr {
  border: none;
  height: 1px;
  margin: 1.8rem 0;
  background: linear-gradient(90deg, var(--accent-line), var(--hairline) 40%, transparent);
}`;

/** Presentation chrome: HUD, arrows, overview, pets, cursor, print rules. */
const CHROME_CSS = `/* ── HUD (progress + counter) ────────────────────────────────────────── */
#hud {
  font-family: var(--font-mono);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  pointer-events: none;
}

#progress-bar {
  height: 2px;
  background: var(--surface0);
}

#progress-fill {
  height: 100%;
  background: var(--gradient);
  transition: width 0.3s ease;
  width: 0%;
}

#slide-counter {
  flex: 0 0 auto;
  text-align: right;
  font-size: 0.72rem;
  color: var(--overlay1);
  letter-spacing: 0.08em;
  white-space: nowrap;
}

/* ── Nav arrows ───────────────────────────────────────────────────────── */
.nav-arrow {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--surface1);
  cursor: pointer;
  padding: 1.2rem 0.8rem;
  z-index: 200;
  transition: color 0.2s ease;
  line-height: 1;
  font-size: 1.4rem;
  pointer-events: all;
}

.nav-arrow:hover { color: var(--text); }
.nav-arrow--prev { left: 0.5rem; }
.nav-arrow--next { right: 0.5rem; }

/* ── Overview mode ────────────────────────────────────────────────────── */
#overview {
  font-family: var(--font-mono);
  position: fixed;
  inset: 0;
  background: var(--crust);
  z-index: 300;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
  overflow-y: auto;
}

#overview.hidden { display: none; }

.overview-thumb {
  background: var(--base);
  border: 1px solid var(--surface0);
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.overview-thumb:hover { border-color: var(--accent); transform: translateY(-3px) scale(1.02); box-shadow: var(--shadow-md); }
.overview-thumb.is-current { border-color: var(--accent-2); box-shadow: 0 0 0 1px var(--accent-2); }

.overview-thumb__number {
  position: absolute;
  top: 0.4rem;
  left: 0.5rem;
  font-size: 0.65rem;
  color: var(--overlay0);
  z-index: 1;
}

.overview-thumb__inner {
  width: 100%;
  height: 100%;
  transform: scale(0.28);
  transform-origin: top left;
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
}

/* ── Kbd hint ─────────────────────────────────────────────────────────── */
#kbd-hint {
  font-family: var(--font-mono);
  position: fixed;
  bottom: 2.2rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: var(--overlay0);
  letter-spacing: 0.06em;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.6s ease;
  z-index: 150;
}

#kbd-hint.hidden { opacity: 0; }

/* ── Pets ─────────────────────────────────────────────────────────────── */
.pet {
  position: fixed;
  z-index: 50;
  pointer-events: none;
  image-rendering: pixelated;
}

@media print {
  .pet { display: none !important; }
}

/* ── Blinking cursor ──────────────────────────────────────────────────── */
/* Parked where an h1's cap height sits, so it reads as the title's caret. */
#cursor {
  position: fixed;
  top: var(--slide-pad-y);
  right: var(--slide-pad-x);
  width: 12px;
  height: calc(clamp(2rem, 4.5vw, 3.4rem) * var(--type-display));
  background: var(--accent);
  box-shadow: 0 0 22px var(--glow);
  z-index: 100;
  pointer-events: none;
  animation: cursor-blink 1.1s step-start infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

@media print {
  #cursor { display: none !important; }
}

/* ── Fullscreen hint ──────────────────────────────────────────────────── */
#fs-hint {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--crust-overlay);
  cursor: pointer;
  transition: opacity 0.4s ease;
}

#fs-hint.hidden { opacity: 0; pointer-events: none; }

#fs-hint__inner {
  font-family: var(--font-mono);
  text-align: center;
  color: var(--subtext1);
  font-size: 0.9rem;
  letter-spacing: 0.06em;
  border: 1px solid var(--surface1);
  border-radius: 8px;
  padding: 1.6rem 2.8rem;
  background: var(--base);
}

#fs-hint__inner kbd {
  display: inline-block;
  background: var(--surface0);
  border: 1px solid var(--surface1);
  border-radius: 5px;
  padding: 0.1em 0.5em;
  font-family: var(--font-mono);
  color: var(--accent);
}

/* ── Scrollbar ────────────────────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--surface1); border-radius: 3px; }

/* ── Print / PDF export ───────────────────────────────────────────────── */
/* One 16:9 page per slide, edge to edge. 13.333in x 7.5in is the standard
   widescreen slide size, so the page box needs no orientation choice. */
@page {
  size: 13.333in 7.5in;
  margin: 0;
}

@media print {
  /* Without this, printing drops every background: the theme, the code block
     surfaces, and the background images all vanish behind white paper. */
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    width: 13.333in !important;
    height: auto !important;
    overflow: visible !important;
    background: var(--crust) !important;
  }

  #presentation {
    position: static !important;
    width: 13.333in !important;
    height: auto !important;
    overflow: visible !important;
  }

  .slide {
    position: relative !important;
    inset: auto !important;
    opacity: 1 !important;
    transform: none !important;
    pointer-events: all !important;
    transition: none !important;
    /* Absolute units, not vw/vh: viewport units in paged media resolve
       against the page box, which is not what the deck was laid out for. */
    width: 13.333in !important;
    height: 7.5in !important;
    page-break-after: always;
    break-after: page;
    break-inside: avoid;
    overflow: hidden !important;
  }

  .slide:last-of-type {
    page-break-after: avoid;
    break-after: avoid;
  }

  .slide__content {
    max-height: calc(7.5in - var(--slide-pad-y) * 2) !important;
  }

  /* The staggered entrance would freeze mid-flight on paper. */
  .slide__content > * { animation: none !important; opacity: 1 !important; transform: none !important; }

  .slide__split {
    height: calc(7.5in - var(--slide-pad-y) * 2) !important;
  }

  .slide__image-panel { max-height: calc(7.5in - var(--slide-pad-y) * 2) !important; }
  .slide__image-panel img { max-height: calc(7.5in - var(--slide-pad-y) * 2 - 1rem) !important; }
  .slide__content img { max-height: 4in !important; }
  .slide__content iframe, .slide__content video { max-height: 4in !important; }

  #hud, .nav-arrow, #overview, #kbd-hint, #cursor, #fs-hint, .pet,
  #board, #laser, #blackout, #help {
    display: none !important;
  }
}`;

/**
 * Presenter tools: the HUD tool strip, the annotation canvas, the laser
 * pointer, the blackout screen, and the controls overlay.
 *
 * Stacking order, from back to front: slides, kbd hint (150), board (180),
 * HUD (200) — the tool strip has to stay clickable while drawing — overview
 * (300), laser (380), blackout (420), help (460), fullscreen hint (500).
 */
const PRESENTER_CSS = `/* ── HUD tool strip ───────────────────────────────────────────────────── */
#hud-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.26rem 1.1rem 0.34rem;
}

#hud-tools {
  display: flex;
  align-items: center;
  gap: 0.28rem;
  min-width: 0;
  flex-wrap: wrap;
}

.hud-btn {
  pointer-events: all;
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.14rem 0.44rem;
  font: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.07em;
  color: var(--overlay0);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.hud-btn:hover { color: var(--text); border-color: var(--surface1); }
.hud-btn.is-on {
  color: var(--accent);
  border-color: var(--accent-line);
  background: var(--accent-soft);
}

.hud-btn kbd {
  font: inherit;
  font-size: 0.58rem;
  color: inherit;
  opacity: 0.7;
  border: 1px solid currentColor;
  border-radius: 3px;
  padding: 0 0.28em;
}

#hud-sep {
  width: 1px;
  height: 12px;
  background: var(--surface1);
  margin: 0 0.2rem;
}

/* ── Pen strip (only while the pen is down) ───────────────────────────── */
#pen-bar {
  display: none;
  align-items: center;
  gap: 0.28rem;
}

#pen-bar.is-on { display: inline-flex; }

#pen-swatches { display: inline-flex; align-items: center; gap: 0.3rem; }

.swatch {
  pointer-events: all;
  width: 13px;
  height: 13px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--surface2);
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.swatch:hover { transform: scale(1.2); }
.swatch.is-on { transform: scale(1.35); border-color: var(--text); }

#pen-width {
  font-size: 0.6rem;
  color: var(--overlay0);
  letter-spacing: 0.06em;
  min-width: 2.2em;
  text-align: center;
}

/* ── Annotation canvas ────────────────────────────────────────────────── */
#board {
  position: fixed;
  inset: 0;
  z-index: 180;
  pointer-events: none;
  touch-action: none;
  background: transparent;
  transition: background 0.18s ease;
}

/* Only the pen makes the canvas swallow clicks, so navigation keeps working
   whenever annotations are merely on display. */
#board.is-drawing { pointer-events: all; cursor: crosshair; }
#board.is-erasing { cursor: cell; }
#board.is-blank   { background: var(--crust); }

/* ── Laser pointer ────────────────────────────────────────────────────── */
#laser {
  position: fixed;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255,255,255,0.95) 0%,
    var(--red) 38%,
    var(--glow) 62%,
    transparent 74%);
  box-shadow: 0 0 20px 8px var(--glow);
  z-index: 380;
  pointer-events: none;
  display: none;
  will-change: transform;
}

#laser.is-on { display: block; }

/* The dot replaces the cursor, so the real one gets out of the way. */
body.laser-on, body.laser-on #board.is-drawing { cursor: none; }

/* ── Blackout ─────────────────────────────────────────────────────────── */
#blackout {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 420;
  display: none;
  cursor: pointer;
}

#blackout.is-on { display: block; }

/* ── Controls overlay ─────────────────────────────────────────────────── */
#help {
  position: fixed;
  inset: 0;
  z-index: 460;
  display: none;
}

#help.is-on { display: block; }

#help__backdrop {
  position: absolute;
  inset: 0;
  background: var(--crust-overlay);
  backdrop-filter: blur(4px);
}

#help__panel {
  font-family: var(--font-mono);
  position: relative;
  width: min(780px, 92vw);
  max-height: 84vh;
  overflow-y: auto;
  margin: 7vh auto 0;
  padding: 1.4rem 1.7rem 1.7rem;
  background: var(--mantle);
  border: 1px solid var(--surface1);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
}

#help__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.1rem;
}

#help__head h2 {
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
}

#help__head p { font-size: 0.68rem; color: var(--overlay1); }

#help__head kbd,
.help-row__keys kbd {
  display: inline-block;
  font: inherit;
  font-size: 0.63rem;
  background: var(--surface0);
  border: 1px solid var(--surface1);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 0.05em 0.4em;
  color: var(--lavender);
  white-space: nowrap;
}

#help__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.2rem 2rem;
}

.help-group__title {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--accent);
  margin-bottom: 0.45rem;
}

.help-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.9rem;
  padding: 0.17rem 0;
  font-size: 0.72rem;
  color: var(--subtext0);
}

.help-row__keys { flex: 0 0 auto; display: flex; gap: 0.22rem; }

#help__close {
  position: absolute;
  top: 0.6rem;
  right: 0.8rem;
  background: transparent;
  border: none;
  color: var(--overlay0);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
}

#help__close:hover { color: var(--text); }

#help__foot {
  margin-top: 1.2rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--surface0);
  font-size: 0.66rem;
  color: var(--overlay1);
  line-height: 1.7;
}`;

/** The two faces a deck may override, each `null` for "leave it to the theme". */
export interface FontChoice {
  head?: string | null;
  body?: string | null;
}

export interface PresentationChoice {
  template?: TemplateName | string | null;
  transition?: TransitionName | string | null;
  /** Standalone pages use CDN assets because the local vendor routes do not travel. */
  standalone?: boolean;
}

export function generateHtml(
  slides: Slide[],
  title: string,
  autoFullscreen = false,
  themeInput: ThemeName = DEFAULT_THEME,
  sizeInput: SizeName = DEFAULT_SIZE,
  fonts: FontChoice = {},
  presentation: PresentationChoice = {}
): string {
  const theme = resolveThemeName(themeInput);
  const size = resolveSizeName(sizeInput);
  const template = resolveTemplateName(presentation.template ?? DEFAULT_TEMPLATE);
  const transition = resolveTransitionName(presentation.transition ?? DEFAULT_TRANSITION);
  const head = findFont(fonts.head);
  const body = findFont(fonts.body);
  const fontAttrs =
    (head ? ` data-head="${head}"` : "") + (body ? ` data-body="${body}"` : "");
  const slideHtml = slides.map((s, i) => renderSlide(s, i)).join("\n");
  const total = slides.length;
  const rich = richContentFeatures(slides);

  // Speaker notes ride along as JSON so the editor's notes panel can show
  // them; they are never rendered into the deck itself.
  const notesJson = JSON.stringify(slides.map((s) => s.notes ?? "")).replace(/</g, "\\u003c");

  const pageTitle = title ? (title.toLowerCase().includes("deckrun") ? title : `${title} · deckrun`) : "deckrun";
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}" data-decor="${decorOf(theme)}" data-size="${size}" data-template="${template}" data-transition="${transition}"${fontAttrs}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escAttr(pageTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsHref([theme], [head, body])}" rel="stylesheet">
  <link rel="stylesheet" href="${hljsHref(theme)}">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  ${richContentHead(rich, presentation.standalone ? "cdn" : "local")}
  <style>
${RESET_CSS}

${themeRootCss(theme)}

${sizeRootCss(size)}

${fontOverrideCss()}

${SLIDE_CSS}

${TEMPLATE_CSS}

${TRANSITION_CSS}

${FRAGMENT_CSS}

${RICH_CONTENT_CSS}

${DECOR_CSS}

${CHROME_CSS}

${PRESENTER_CSS}
  </style>
</head>
<body>

<div id="backdrop" aria-hidden="true"></div>

<div id="presentation">
${slideHtml}
</div>

<div id="hud">
  <div id="progress-bar"><div id="progress-fill"></div></div>
  <div id="hud-row">
    <div id="hud-tools">
      <button class="hud-btn" id="btn-laser" title="Laser pointer (L)">laser <kbd>L</kbd></button>
      <button class="hud-btn" id="btn-pen" title="Draw on the slide (D)">pen <kbd>D</kbd></button>
      <button class="hud-btn" id="btn-blank" title="Blank canvas over the slide (C)">canvas <kbd>C</kbd></button>
      <button class="hud-btn" id="btn-black" title="Black out the screen (B)">black <kbd>B</kbd></button>
      <div id="pen-bar">
        <span id="hud-sep"></span>
        <span id="pen-swatches"></span>
        <button class="hud-btn" id="btn-erase" title="Eraser (E)">erase <kbd>E</kbd></button>
        <button class="hud-btn" id="btn-thin" title="Thinner ([)">&minus;</button>
        <span id="pen-width">4px</span>
        <button class="hud-btn" id="btn-thick" title="Thicker (])">+</button>
        <button class="hud-btn" id="btn-clear" title="Clear this slide (X)">clear <kbd>X</kbd></button>
      </div>
      <button class="hud-btn" id="btn-help" title="Show every control (?)">? controls</button>
    </div>
    <div id="slide-counter"><span id="cur">1</span>&nbsp;/&nbsp;<span id="tot">${total}</span></div>
  </div>
</div>

<canvas id="board"></canvas>
<div id="laser" aria-hidden="true"></div>
<div id="blackout" title="Click or press B to come back"></div>

<div id="help" role="dialog" aria-modal="true" aria-label="Presenter controls">
  <div id="help__backdrop" data-close="help"></div>
  <div id="help__panel">
    <button id="help__close" data-close="help" title="Close (Esc)">&times;</button>
    <div id="help__head">
      <h2>controls</h2>
      <p>press <kbd>?</kbd> any time</p>
    </div>
    <div id="help__grid"></div>
    <div id="help__foot">
      Annotations live per slide and survive navigation, so you can draw on slide 3,
      move on, and come back to find it as you left it. Nothing is saved to disk.
    </div>
  </div>
</div>

<button class="nav-arrow nav-arrow--prev" id="btn-prev" title="Previous (←)">&#8592;</button>
<button class="nav-arrow nav-arrow--next" id="btn-next" title="Next (→)">&#8594;</button>

<div id="cursor"></div>

<div id="overview" class="hidden"></div>

<div id="kbd-hint">← → reveal / navigate &nbsp;·&nbsp; O overview &nbsp;·&nbsp; F fullscreen &nbsp;·&nbsp; L laser &nbsp;·&nbsp; D draw &nbsp;·&nbsp; ? controls</div>

${autoFullscreen ? `<div id="fs-hint">
  <div id="fs-hint__inner">Press any key or click to enter fullscreen</div>
</div>` : ''}

<script id="deck-notes" type="application/json">${notesJson}</script>

<script>
${FRAGMENT_RUNTIME}

${RICH_CONTENT_RUNTIME}
</script>
<script>
(function () {
  'use strict';

  const slides = Array.from(document.querySelectorAll('.slide'));
  const total  = slides.length;
  let cur      = 0;
  let inOverview = false;

  const elCur      = document.getElementById('cur');
  const elFill     = document.getElementById('progress-fill');
  const elBtnPrev  = document.getElementById('btn-prev');
  const elBtnNext  = document.getElementById('btn-next');
  const elOverview = document.getElementById('overview');
  const elHint     = document.getElementById('kbd-hint');
  const elBoard    = document.getElementById('board');
  const elLaser    = document.getElementById('laser');
  const elBlack    = document.getElementById('blackout');
  const elHelp     = document.getElementById('help');
  const elPenBar   = document.getElementById('pen-bar');
  const elPenWidth = document.getElementById('pen-width');

  if (window.deckrunPrepareFragments) {
    window.deckrunPrepareFragments(document.getElementById('presentation'), false);
  }

  const fragmentSteps = slides.map(() => 0);

  function fragmentsAt(index) {
    return Array.from(slides[index].querySelectorAll('.fragment'));
  }

  function applyFragmentStep(index) {
    const fragments = fragmentsAt(index);
    const step = Math.max(0, Math.min(fragmentSteps[index] || 0, fragments.length));
    fragmentSteps[index] = step;
    fragments.forEach(function (fragment, i) {
      const shown = i < step;
      fragment.classList.toggle('is-revealed', shown);
      fragment.setAttribute('aria-hidden', shown ? 'false' : 'true');
    });
  }

  function revealNext() {
    const count = fragmentsAt(cur).length;
    if ((fragmentSteps[cur] || 0) >= count) return false;
    fragmentSteps[cur] = (fragmentSteps[cur] || 0) + 1;
    applyFragmentStep(cur);
    updateHud();
    return true;
  }

  function concealPrevious() {
    if ((fragmentSteps[cur] || 0) <= 0) return false;
    fragmentSteps[cur] -= 1;
    applyFragmentStep(cur);
    updateHud();
    return true;
  }

  // ── Syntax highlighting ──────────────────────────────────────────────
  // Guarded: the highlighter comes off a CDN, and a deck presented offline
  // should still navigate rather than die on a missing global.
  if (window.hljs) {
    document.querySelectorAll('pre code:not(.language-mermaid):not(.lang-mermaid)').forEach(function (block) {
      try { window.hljs.highlightElement(block); } catch (e) {}
    });
  }

  const richReady = window.deckrunRenderRichContent
    ? window.deckrunRenderRichContent(document.getElementById('presentation'))
    : Promise.resolve();

  // ── Slide navigation ─────────────────────────────────────────────────
  function showSlide(next, direction, fragmentMode) {
    const prev = cur;
    if (next < 0 || next >= total) return;

    if (next === prev && !fragmentMode) return;

    const nextFragments = fragmentsAt(next).length;
    fragmentSteps[next] = fragmentMode === 'start' || (fragmentMode !== 'end' && direction === 'forward')
      ? 0
      : nextFragments;
    applyFragmentStep(next);

    if (next === prev) {
      updateHud();
      return;
    }

    const slideOut = slides[prev];
    const slideIn  = slides[next];

    // Set up entering slide position
    const enterClass = direction === 'forward' ? 'enter-from-right' : 'enter-from-left';
    const exitClass  = direction === 'forward' ? 'exit-left'        : 'exit-right';

    slideIn.classList.add(enterClass);
    slideIn.style.transition = 'none';

    // Force reflow so the initial position is painted
    void slideIn.offsetWidth;

    slideIn.style.transition = '';
    slideIn.classList.remove(enterClass);
    slideIn.classList.add('is-active');

    slideOut.classList.remove('is-active');
    slideOut.classList.add(exitClass);

    // Clean up exit class after transition
    var cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      slideOut.classList.remove(exitClass, 'exit-left', 'exit-right');
      slideOut.removeEventListener('transitionend', cleanup);
    }
    slideOut.addEventListener('transitionend', cleanup);
    // The no-motion preset has no transitionend event. The timeout also guards interrupted
    // transitions, so no slide can retain an exit class indefinitely.
    if (document.documentElement.dataset.transition === 'none') cleanup();
    else setTimeout(cleanup, 650);

    cur = next;
    updateHud();
  }

  function updateHud() {
    redrawBoard();
    elCur.textContent = String(cur + 1);
    const pct = total > 1 ? (cur / (total - 1)) * 100 : 100;
    elFill.style.width = pct + '%';
    const step = fragmentSteps[cur] || 0;
    const count = fragmentsAt(cur).length;
    elBtnPrev.style.opacity = cur === 0 && step === 0 ? '0.2' : '1';
    elBtnNext.style.opacity = cur === total - 1 && step >= count ? '0.2' : '1';
    elBtnPrev.style.opacity = cur === 0 ? '0.2' : '1';
    elBtnNext.style.opacity = cur === total - 1 ? '0.2' : '1';
    post({ type: 'state', index: cur, total: total });
  }

  function next() {
    if (!revealNext()) showSlide(cur + 1, 'forward');
  }

  function prev() {
    if (!concealPrevious()) showSlide(cur - 1, 'backward');
  }

  // ── Editor mirror ─────────────────────────────────────────────────────
  // The editor that presented this tab is a peer of it: this tab feeds it,
  // over BroadcastChannel, the slides on screen plus the speaker notes. The
  // session id comes from the URL the editor opened (ps=...), so only a deck
  // an editor actually presented listens; one opened straight from a file
  // skips the machinery entirely.
  const psParam = new URLSearchParams(location.search).get('ps');
  const sid = (psParam && /^[A-Za-z0-9-]{1,64}$/.test(psParam)) ? psParam : null;
  const channel = (sid && typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('deckrun:' + sid)
    : null;

  function post(msg) {
    if (!channel) return;
    msg.id = sid;
    channel.postMessage(msg);
  }

  if (channel) {
    const NOTES = (function readNotes() {
      try {
        return JSON.parse(document.getElementById('deck-notes').textContent);
      } catch (e) {
        return [];
      }
    })();

    channel.onmessage = function (e) {
      const m = e.data || {};
      if (m.id !== sid) return;
      if (m.type === 'ready') {
        post({ type: 'init', notes: NOTES });
        post({ type: 'state', index: cur, total: total });
      } else if (m.type === 'goto') {
        const i = parseInt(m.index, 10);
        if (!isNaN(i) && i >= 0 && i < total && i !== cur) {
          showSlide(i, i > cur ? 'forward' : 'backward');
        }
      }
    };
  }

  // ── Overview mode ────────────────────────────────────────────────────
  function buildOverview() {
    elOverview.innerHTML = '';
    slides.forEach((slide, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'overview-thumb' + (i === cur ? ' is-current' : '');

      const num = document.createElement('span');
      num.className = 'overview-thumb__number';
      num.textContent = String(i + 1);

      // Clone slide content into thumbnail
      const inner = document.createElement('div');
      inner.className = 'overview-thumb__inner';
      inner.style.width  = window.innerWidth  + 'px';
      inner.style.height = window.innerHeight + 'px';
      const clone = slide.cloneNode(true);
      clone.classList.add('is-active');
      clone.style.transition = 'none';
      clone.querySelectorAll('.fragment').forEach(function (fragment) {
        fragment.classList.add('is-revealed');
        fragment.setAttribute('aria-hidden', 'false');
      });
      inner.appendChild(clone);

      thumb.appendChild(num);
      thumb.appendChild(inner);

      thumb.addEventListener('click', () => {
        const direction = i >= cur ? 'forward' : 'backward';
        toggleOverview(false);
        showSlide(i, direction);
      });

      elOverview.appendChild(thumb);
    });
  }

  function toggleOverview(force) {
    inOverview = force !== undefined ? force : !inOverview;
    if (inOverview) {
      buildOverview();
      elOverview.classList.remove('hidden');
    } else {
      elOverview.classList.add('hidden');
    }
  }

  // ── Presenter tools ───────────────────────────────────────────────────
  // One canvas serves both drawing modes: the pen annotates over the live
  // slide, and the blank canvas paints the same board opaque so the slide
  // disappears behind it. Strokes are kept per slide in normalised
  // coordinates, so a resize or a jump into fullscreen keeps them in place.
  const ctx = elBoard.getContext('2d');
  const rootStyle = getComputedStyle(document.documentElement);

  function themeColor(name, fallback) {
    const v = rootStyle.getPropertyValue('--' + name).trim();
    return v || fallback;
  }

  const PEN_COLORS = [
    themeColor('red',    '#f38ba8'),
    themeColor('yellow', '#f9e2af'),
    themeColor('green',  '#a6e3a1'),
    themeColor('blue',   '#89b4fa'),
    themeColor('text',   '#cdd6f4'),
  ];
  const PEN_WIDTHS = [2, 3, 4, 6, 9, 14];
  const ERASER_SCALE = 5;

  const strokes = [];           // strokes[slideIndex] = [{ color, width, erase, pts }]
  let colorIdx = 0;
  let widthIdx = 2;
  let stroke = null;            // the stroke being drawn right now

  let penOn   = false;
  let blankOn = false;
  let eraseOn = false;
  let laserOn = false;
  let blackOn = false;
  let helpOn  = false;

  const tools = {
    laser: document.getElementById('btn-laser'),
    pen:   document.getElementById('btn-pen'),
    blank: document.getElementById('btn-blank'),
    black: document.getElementById('btn-black'),
    erase: document.getElementById('btn-erase'),
  };

  /** Click handler that drops focus, so Space keeps meaning "next slide". */
  function onClick(el, fn) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      el.blur();
      fn(e);
    });
  }

  // ── Canvas sizing and painting ───────────────────────────────────────
  function sizeBoard() {
    const dpr = window.devicePixelRatio || 1;
    elBoard.width  = Math.round(window.innerWidth  * dpr);
    elBoard.height = Math.round(window.innerHeight * dpr);
    elBoard.style.width  = window.innerWidth  + 'px';
    elBoard.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawBoard();
  }

  function strokeStyle(s) {
    ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.erase ? s.width * ERASER_SCALE : s.width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  function paintStroke(s) {
    const w = window.innerWidth, h = window.innerHeight;
    if (!s.pts.length) return;
    strokeStyle(s);
    ctx.beginPath();
    ctx.moveTo(s.pts[0][0] * w, s.pts[0][1] * h);
    if (s.pts.length === 1) {
      // A tap still deserves a dot.
      ctx.lineTo(s.pts[0][0] * w + 0.01, s.pts[0][1] * h);
    } else {
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0] * w, s.pts[i][1] * h);
    }
    ctx.stroke();
  }

  /** Draw only the newest segment — repainting everything on every move is
      wasteful once a slide carries a few dozen strokes. */
  function paintTip(s) {
    const w = window.innerWidth, h = window.innerHeight;
    const n = s.pts.length;
    if (n < 2) { paintStroke(s); return; }
    strokeStyle(s);
    ctx.beginPath();
    ctx.moveTo(s.pts[n - 2][0] * w, s.pts[n - 2][1] * h);
    ctx.lineTo(s.pts[n - 1][0] * w, s.pts[n - 1][1] * h);
    ctx.stroke();
  }

  function redrawBoard() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const list = strokes[cur] || [];
    for (let i = 0; i < list.length; i++) paintStroke(list[i]);
    ctx.globalCompositeOperation = 'source-over';
  }

  function hasInk() { return !!(strokes[cur] && strokes[cur].length); }

  // ── Drawing ──────────────────────────────────────────────────────────
  function pointOf(e) {
    return [e.clientX / window.innerWidth, e.clientY / window.innerHeight];
  }

  elBoard.addEventListener('pointerdown', function (e) {
    if (!penOn) return;
    e.preventDefault();
    try { elBoard.setPointerCapture(e.pointerId); } catch (err) {}
    stroke = {
      color: PEN_COLORS[colorIdx],
      width: PEN_WIDTHS[widthIdx],
      erase: eraseOn,
      pts: [pointOf(e)],
    };
    if (!strokes[cur]) strokes[cur] = [];
    strokes[cur].push(stroke);
    paintStroke(stroke);
  });

  elBoard.addEventListener('pointermove', function (e) {
    if (!stroke) return;
    e.preventDefault();
    stroke.pts.push(pointOf(e));
    paintTip(stroke);
  });

  function endStroke() {
    if (!stroke) return;
    stroke = null;
    ctx.globalCompositeOperation = 'source-over';
    syncTools();
  }

  elBoard.addEventListener('pointerup', endStroke);
  elBoard.addEventListener('pointercancel', endStroke);
  elBoard.addEventListener('pointerleave', endStroke);

  function undoStroke() {
    const list = strokes[cur];
    if (!list || !list.length) return;
    list.pop();
    redrawBoard();
    syncTools();
  }

  function clearSlide() {
    strokes[cur] = [];
    redrawBoard();
    syncTools();
  }

  // ── Tool state ───────────────────────────────────────────────────────
  function setPen(on) {
    penOn = !!on;
    if (!penOn) {
      endStroke();
      // The blank canvas has no meaning without a pen to use on it.
      blankOn = false;
      eraseOn = false;
    }
    syncTools();
  }

  function setBlank(on) {
    blankOn = !!on;
    // Opening the blank canvas arms the pen; closing it leaves the pen alone.
    if (blankOn) penOn = true;
    syncTools();
  }

  function setEraser(on) {
    eraseOn = !!on;
    if (eraseOn) penOn = true;
    syncTools();
  }

  function setLaser(on) {
    laserOn = !!on;
    syncTools();
  }

  function setBlack(on) {
    blackOn = !!on;
    syncTools();
  }

  function setColor(i) {
    colorIdx = Math.max(0, Math.min(PEN_COLORS.length - 1, i));
    eraseOn = false;
    penOn = true;
    syncTools();
  }

  function nudgeWidth(delta) {
    widthIdx = Math.max(0, Math.min(PEN_WIDTHS.length - 1, widthIdx + delta));
    syncTools();
  }

  const swatches = [];
  (function buildSwatches() {
    const host = document.getElementById('pen-swatches');
    PEN_COLORS.forEach(function (color, i) {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.background = color;
      b.title = 'Pen color ' + (i + 1);
      onClick(b, function () { setColor(i); });
      host.appendChild(b);
      swatches.push(b);
    });
  })();

  function syncTools() {
    tools.laser.classList.toggle('is-on', laserOn);
    tools.pen.classList.toggle('is-on', penOn);
    tools.blank.classList.toggle('is-on', blankOn);
    tools.black.classList.toggle('is-on', blackOn);
    tools.erase.classList.toggle('is-on', eraseOn);

    elBoard.classList.toggle('is-drawing', penOn);
    elBoard.classList.toggle('is-erasing', penOn && eraseOn);
    elBoard.classList.toggle('is-blank', blankOn);

    elPenBar.classList.toggle('is-on', penOn);
    elPenWidth.textContent = PEN_WIDTHS[widthIdx] + 'px';
    swatches.forEach(function (b, i) {
      b.classList.toggle('is-on', !eraseOn && i === colorIdx);
    });

    elLaser.classList.toggle('is-on', laserOn);
    document.body.classList.toggle('laser-on', laserOn);
    elBlack.classList.toggle('is-on', blackOn);
    elHelp.classList.toggle('is-on', helpOn);
  }

  // ── Laser pointer ────────────────────────────────────────────────────
  document.addEventListener('pointermove', function (e) {
    if (!laserOn) return;
    elLaser.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px)';
  }, { passive: true });

  // ── Controls overlay ─────────────────────────────────────────────────
  const HELP_GROUPS = [
    { title: 'navigate', rows: [
      { keys: ['→', '↓', 'Space'],        desc: 'Next reveal or slide' },
      { keys: ['←', '↑', 'Backspace'],    desc: 'Previous reveal or slide' },
      { keys: ['Home'],                   desc: 'First slide' },
      { keys: ['End'],                    desc: 'Last slide' },
      { keys: ['O'],                      desc: 'Overview grid' },
      { keys: ['Esc'],                    desc: 'Close what is open' },
    ]},
    { title: 'screen', rows: [
      { keys: ['F'],                      desc: 'Fullscreen' },
      { keys: ['B'],                      desc: 'Black out the screen' },
      { keys: ['?'],                      desc: 'These controls' },
    ]},
    { title: 'point', rows: [
      { keys: ['L'],                      desc: 'Laser pointer' },
    ]},
    { title: 'draw', rows: [
      { keys: ['D'],                      desc: 'Pen, over the slide' },
      { keys: ['C'],                      desc: 'Blank canvas' },
      { keys: ['1', '2', '3', '4', '5'],  desc: 'Pen color' },
      { keys: ['E'],                      desc: 'Eraser' },
      { keys: ['['], desc: 'Thinner' },
      { keys: [']'], desc: 'Thicker' },
      { keys: ['Ctrl', 'Z'],              desc: 'Undo last stroke' },
      { keys: ['X'],                      desc: 'Clear this slide' },
    ]},
  ];

  (function buildHelp() {
    const grid = document.getElementById('help__grid');
    HELP_GROUPS.forEach(function (group) {
      const box = document.createElement('div');
      box.className = 'help-group';

      const title = document.createElement('div');
      title.className = 'help-group__title';
      title.textContent = group.title;
      box.appendChild(title);

      group.rows.forEach(function (row) {
        const line = document.createElement('div');
        line.className = 'help-row';

        const desc = document.createElement('span');
        desc.textContent = row.desc;

        const keys = document.createElement('span');
        keys.className = 'help-row__keys';
        row.keys.forEach(function (k) {
          const kbd = document.createElement('kbd');
          kbd.textContent = k;
          keys.appendChild(kbd);
        });

        line.appendChild(desc);
        line.appendChild(keys);
        box.appendChild(line);
      });

      grid.appendChild(box);
    });
  })();

  function setHelp(on) {
    helpOn = !!on;
    syncTools();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  // ── Tool wiring ──────────────────────────────────────────────────────
  onClick(tools.laser, function () { setLaser(!laserOn); });
  onClick(tools.pen,   function () { setPen(!penOn); });
  onClick(tools.blank, function () { setBlank(!blankOn); });
  onClick(tools.black, function () { setBlack(true); });
  onClick(tools.erase, function () { setEraser(!eraseOn); });
  onClick(document.getElementById('btn-thin'),  function () { nudgeWidth(-1); });
  onClick(document.getElementById('btn-thick'), function () { nudgeWidth(1); });
  onClick(document.getElementById('btn-clear'), function () { clearSlide(); });
  onClick(document.getElementById('btn-help'),  function () { setHelp(!helpOn); });
  onClick(elBlack, function () { setBlack(false); });

  Array.prototype.forEach.call(elHelp.querySelectorAll('[data-close="help"]'), function (el) {
    onClick(el, function () { setHelp(false); });
  });

  window.addEventListener('resize', sizeBoard);

  // ── Keyboard ─────────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    const k = e.key;

    // Undo is the only modifier combo we claim; the rest is the browser's.
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if ((k === 'z' || k === 'Z') && hasInk()) {
        e.preventDefault();
        undoStroke();
      }
      return;
    }

    // Each overlay swallows keys until it is dismissed, outermost first.
    if (helpOn) {
      if (k === 'Escape' || k === '?' || k === 'h' || k === 'H') {
        e.preventDefault();
        setHelp(false);
      }
      return;
    }
    if (k === '?' || k === 'h' || k === 'H') {
      e.preventDefault();
      setHelp(true);
      return;
    }

    if (blackOn) {
      // A stray key should not advance the deck behind a black screen.
      e.preventDefault();
      if (k === 'Escape' || k === 'b' || k === 'B' || k === ' ' || k === 'Enter') setBlack(false);
      return;
    }
    if (k === 'b' || k === 'B') {
      e.preventDefault();
      setBlack(true);
      return;
    }

    if (inOverview) {
      if (k === 'Escape' || k === 'o' || k === 'O') {
        e.preventDefault();
        toggleOverview(false);
      }
      return;
    }

    // Pen sub-controls only bind while the pen is down, so the letters stay
    // free for everything else the rest of the time.
    if (penOn) {
      if (k >= '1' && k <= String(PEN_COLORS.length)) { e.preventDefault(); setColor(parseInt(k, 10) - 1); return; }
      if (k === 'e' || k === 'E') { e.preventDefault(); setEraser(!eraseOn); return; }
      if (k === '[') { e.preventDefault(); nudgeWidth(-1); return; }
      if (k === ']') { e.preventDefault(); nudgeWidth(1); return; }
      if (k === 'x' || k === 'X') { e.preventDefault(); clearSlide(); return; }
    }

    switch (k) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'PageDown':
        e.preventDefault();
        next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'Backspace':
      case 'PageUp':
        e.preventDefault();
        prev();
        break;
      case 'Home':
        e.preventDefault();
        showSlide(0, 'backward', 'start');
        break;
      case 'End':
        e.preventDefault();
        showSlide(total - 1, 'forward', 'end');
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        setLaser(!laserOn);
        break;
      case 'd':
      case 'D':
        e.preventDefault();
        setPen(!penOn);
        break;
      case 'c':
      case 'C':
        e.preventDefault();
        setBlank(!blankOn);
        break;
      case 'o':
      case 'O':
        e.preventDefault();
        toggleOverview();
        break;
      case 'Escape':
        e.preventDefault();
        // Peel one layer at a time: canvas, pen, laser, then the overview.
        if (blankOn) setBlank(false);
        else if (penOn) setPen(false);
        else if (laserOn) setLaser(false);
        else toggleOverview();
        break;
    }
  });

  // ── Mouse/touch ───────────────────────────────────────────────────────
  onClick(elBtnPrev, prev);
  onClick(elBtnNext, next);

  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    // A stroke is not a swipe. Touch events fire alongside the pointer events
    // the canvas draws with, so an unguarded swipe would change slides
    // underneath every horizontal line drawn on a touchscreen.
    if (penOn) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  }, { passive: true });

  // ── Hint auto-hide ────────────────────────────────────────────────────
  setTimeout(() => { elHint.classList.add('hidden'); }, 4000);

  // ── Pets ──────────────────────────────────────────────────────────────
  (function spawnPets() {
    const petUrls = [
      'https://github.com/tonybaloney/vscode-pets/blob/main/media/turtle/orange_with_ball_8fps.gif?raw=true',
      'https://github.com/tonybaloney/vscode-pets/blob/main/media/turtle/green_with_ball_8fps.gif?raw=true',
      'https://github.com/tonybaloney/vscode-pets/blob/main/media/chicken/white_with_ball_8fps.gif?raw=true',
      'https://github.com/tonybaloney/vscode-pets/blob/main/media/crab/red_with_ball_8fps.gif?raw=true',
      'https://github.com/tonybaloney/vscode-pets/blob/main/media/dog/akita_with_ball_8fps.gif?raw=true',
      'https://github.com/tonybaloney/vscode-pets/blob/main/media/dog/brown_with_ball_8fps.gif?raw=true',
      'https://github.com/tonybaloney/vscode-pets/blob/main/media/fox/white_with_ball_8fps.gif?raw=true',
    ];

    const count = 3;
    const minDist = 100;

    // Shuffle and pick N unique pets
    const shuffled = petUrls.slice().sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, count);

    // HUD: 2px progress bar + ~30px counter row. Pets sit just above that.
    const hudHeight = 34;
    const bottomOffset = hudHeight;

    // Pick random x positions along the full width, min 100px apart
    const xPositions = [];
    let attempts = 0;
    while (xPositions.length < count && attempts < 2000) {
      attempts++;
      const x = 20 + Math.random() * (window.innerWidth - 100);
      const tooClose = xPositions.some(px => Math.abs(px - x) < minDist);
      if (!tooClose) xPositions.push(x);
    }

    chosen.forEach(function(url, i) {
      const img = document.createElement('img');
      img.src = url;
      img.className = 'pet';
      img.style.left   = xPositions[i] + 'px';
      img.style.bottom = bottomOffset + 'px';
      img.style.top    = 'auto';
      document.body.appendChild(img);
    });
  })();

  // ── Auto-fullscreen ───────────────────────────────────────────────────
  const fsHint = document.getElementById('fs-hint');
  if (fsHint) {
    function enterFullscreen() {
      fsHint.classList.add('hidden');
      document.documentElement.requestFullscreen().catch(() => {});
    }
    fsHint.addEventListener('click', enterFullscreen, { once: true });
    document.addEventListener('keydown', function fsKey(e) {
      // Let the click handler own the 'f' key if hint is still visible
      document.removeEventListener('keydown', fsKey);
      enterFullscreen();
    }, { once: true });
  }

  // ── Print export ─────────────────────────────────────────────────────
  // Loading the deck with ?print=1 opens the print dialog once fonts and
  // highlighting have settled. The editor's PDF export uses this.
  var wantsPrint = false;
  try { wantsPrint = new URLSearchParams(location.search).has('print'); } catch (e) {}
  if (wantsPrint) {
    var openPrint = function () { setTimeout(function () { window.print(); }, 350); };
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.all([richReady, fontsReady]).then(openPrint, openPrint);
  }

  // ── Init ─────────────────────────────────────────────────────────────
  slides[0].classList.add('is-active');
  sizeBoard();
  syncTools();
  updateHud();
})();
</script>
</body>
</html>`;
}

/** Base layout for the doc-mode wrapper: fills the viewport with the iframe. */
const DOC_CSS = `html, body {
  height: 100%;
  overflow: hidden;
  background: var(--crust);
}

#doc-frame {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  border: none;
  z-index: 1;
  background: var(--crust);
}`;

/**
 * Wraps an arbitrary, already-self-contained HTML document (served at
 * `docUrl`) in an iframe and layers the subset of the presenter tool belt
 * that makes sense with no slide boundaries — laser pointer, pen/annotation
 * canvas, blank canvas, blackout, fullscreen, and the controls overlay — on
 * top of it as fixed-position overlays. There is no HUD progress bar, slide
 * counter, overview grid, or arrow-key navigation, since there are no slides.
 */
export function generateDocHtml(
  docUrl: string,
  title: string,
  autoFullscreen = false,
  themeInput: ThemeName = DEFAULT_THEME
): string {
  const theme = resolveThemeName(themeInput);

  const pageTitle = title ? (title.toLowerCase().includes("deckrun") ? title : `${title} · deckrun`) : "deckrun";
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escAttr(pageTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsHref([theme])}" rel="stylesheet">
  <style>
${RESET_CSS}

${themeRootCss(theme)}

${DOC_CSS}

${CHROME_CSS}

${PRESENTER_CSS}
  </style>
</head>
<body>

<iframe id="doc-frame" src="${escAttr(docUrl)}" title="${escAttr(title)}"></iframe>

<div id="hud">
  <div id="hud-row">
    <div id="hud-tools">
      <button class="hud-btn" id="btn-laser" title="Laser pointer (L)">laser <kbd>L</kbd></button>
      <button class="hud-btn" id="btn-pen" title="Draw on the doc (D)">pen <kbd>D</kbd></button>
      <button class="hud-btn" id="btn-blank" title="Blank canvas over the doc (C)">canvas <kbd>C</kbd></button>
      <button class="hud-btn" id="btn-black" title="Black out the screen (B)">black <kbd>B</kbd></button>
      <div id="pen-bar">
        <span id="hud-sep"></span>
        <span id="pen-swatches"></span>
        <button class="hud-btn" id="btn-erase" title="Eraser (E)">erase <kbd>E</kbd></button>
        <button class="hud-btn" id="btn-thin" title="Thinner ([)">&minus;</button>
        <span id="pen-width">4px</span>
        <button class="hud-btn" id="btn-thick" title="Thicker (])">+</button>
        <button class="hud-btn" id="btn-clear" title="Clear (X)">clear <kbd>X</kbd></button>
      </div>
      <button class="hud-btn" id="btn-help" title="Show every control (?)">? controls</button>
    </div>
  </div>
</div>

<canvas id="board"></canvas>
<div id="laser" aria-hidden="true"></div>
<div id="blackout" title="Click or press B to come back"></div>

<div id="help" role="dialog" aria-modal="true" aria-label="Presenter controls">
  <div id="help__backdrop" data-close="help"></div>
  <div id="help__panel">
    <button id="help__close" data-close="help" title="Close (Esc)">&times;</button>
    <div id="help__head">
      <h2>controls</h2>
      <p>press <kbd>?</kbd> any time</p>
    </div>
    <div id="help__grid"></div>
    <div id="help__foot">
      Annotations are not saved to disk, and reset if the page reloads.
    </div>
  </div>
</div>

${autoFullscreen ? `<div id="fs-hint">
  <div id="fs-hint__inner">Press any key or click to enter fullscreen</div>
</div>` : ''}

<script>
(function () {
  'use strict';

  const elBoard    = document.getElementById('board');
  const elLaser    = document.getElementById('laser');
  const elBlack    = document.getElementById('blackout');
  const elHelp     = document.getElementById('help');
  const elPenBar   = document.getElementById('pen-bar');
  const elPenWidth = document.getElementById('pen-width');
  const elFrame    = document.getElementById('doc-frame');

  // ── Presenter tools ───────────────────────────────────────────────────
  // One flat stroke list — unlike the slide deck, there is only ever one
  // "page" here, so there is nothing to index annotations by.
  const ctx = elBoard.getContext('2d');
  const rootStyle = getComputedStyle(document.documentElement);

  function themeColor(name, fallback) {
    const v = rootStyle.getPropertyValue('--' + name).trim();
    return v || fallback;
  }

  const PEN_COLORS = [
    themeColor('red',    '#f38ba8'),
    themeColor('yellow', '#f9e2af'),
    themeColor('green',  '#a6e3a1'),
    themeColor('blue',   '#89b4fa'),
    themeColor('text',   '#cdd6f4'),
  ];
  const PEN_WIDTHS = [2, 3, 4, 6, 9, 14];
  const ERASER_SCALE = 5;

  let strokes = [];             // flat list: [{ color, width, erase, pts }]
  let colorIdx = 0;
  let widthIdx = 2;
  let stroke = null;            // the stroke being drawn right now

  let penOn   = false;
  let blankOn = false;
  let eraseOn = false;
  let laserOn = false;
  let blackOn = false;
  let helpOn  = false;

  const tools = {
    laser: document.getElementById('btn-laser'),
    pen:   document.getElementById('btn-pen'),
    blank: document.getElementById('btn-blank'),
    black: document.getElementById('btn-black'),
    erase: document.getElementById('btn-erase'),
  };

  /** Click handler that drops focus, so Space does not re-trigger it. */
  function onClick(el, fn) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      el.blur();
      fn(e);
    });
  }

  // ── Canvas sizing and painting ───────────────────────────────────────
  function sizeBoard() {
    const dpr = window.devicePixelRatio || 1;
    elBoard.width  = Math.round(window.innerWidth  * dpr);
    elBoard.height = Math.round(window.innerHeight * dpr);
    elBoard.style.width  = window.innerWidth  + 'px';
    elBoard.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawBoard();
  }

  function strokeStyle(s) {
    ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.erase ? s.width * ERASER_SCALE : s.width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  function paintStroke(s) {
    const w = window.innerWidth, h = window.innerHeight;
    if (!s.pts.length) return;
    strokeStyle(s);
    ctx.beginPath();
    ctx.moveTo(s.pts[0][0] * w, s.pts[0][1] * h);
    if (s.pts.length === 1) {
      // A tap still deserves a dot.
      ctx.lineTo(s.pts[0][0] * w + 0.01, s.pts[0][1] * h);
    } else {
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0] * w, s.pts[i][1] * h);
    }
    ctx.stroke();
  }

  /** Draw only the newest segment — repainting everything on every move is
      wasteful once the board carries a few dozen strokes. */
  function paintTip(s) {
    const w = window.innerWidth, h = window.innerHeight;
    const n = s.pts.length;
    if (n < 2) { paintStroke(s); return; }
    strokeStyle(s);
    ctx.beginPath();
    ctx.moveTo(s.pts[n - 2][0] * w, s.pts[n - 2][1] * h);
    ctx.lineTo(s.pts[n - 1][0] * w, s.pts[n - 1][1] * h);
    ctx.stroke();
  }

  function redrawBoard() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = 0; i < strokes.length; i++) paintStroke(strokes[i]);
    ctx.globalCompositeOperation = 'source-over';
  }

  function hasInk() { return strokes.length > 0; }

  // ── Drawing ──────────────────────────────────────────────────────────
  function pointOf(e) {
    return [e.clientX / window.innerWidth, e.clientY / window.innerHeight];
  }

  elBoard.addEventListener('pointerdown', function (e) {
    if (!penOn) return;
    e.preventDefault();
    try { elBoard.setPointerCapture(e.pointerId); } catch (err) {}
    stroke = {
      color: PEN_COLORS[colorIdx],
      width: PEN_WIDTHS[widthIdx],
      erase: eraseOn,
      pts: [pointOf(e)],
    };
    strokes.push(stroke);
    paintStroke(stroke);
  });

  elBoard.addEventListener('pointermove', function (e) {
    if (!stroke) return;
    e.preventDefault();
    stroke.pts.push(pointOf(e));
    paintTip(stroke);
  });

  function endStroke() {
    if (!stroke) return;
    stroke = null;
    ctx.globalCompositeOperation = 'source-over';
    syncTools();
  }

  elBoard.addEventListener('pointerup', endStroke);
  elBoard.addEventListener('pointercancel', endStroke);
  elBoard.addEventListener('pointerleave', endStroke);

  function undoStroke() {
    if (!strokes.length) return;
    strokes.pop();
    redrawBoard();
    syncTools();
  }

  function clearBoard() {
    strokes = [];
    redrawBoard();
    syncTools();
  }

  // ── Tool state ───────────────────────────────────────────────────────
  function setPen(on) {
    penOn = !!on;
    if (!penOn) {
      endStroke();
      // The blank canvas has no meaning without a pen to use on it.
      blankOn = false;
      eraseOn = false;
    }
    syncTools();
  }

  function setBlank(on) {
    blankOn = !!on;
    // Opening the blank canvas arms the pen; closing it leaves the pen alone.
    if (blankOn) penOn = true;
    syncTools();
  }

  function setEraser(on) {
    eraseOn = !!on;
    if (eraseOn) penOn = true;
    syncTools();
  }

  function setLaser(on) {
    laserOn = !!on;
    syncTools();
  }

  function setBlack(on) {
    blackOn = !!on;
    syncTools();
  }

  function setColor(i) {
    colorIdx = Math.max(0, Math.min(PEN_COLORS.length - 1, i));
    eraseOn = false;
    penOn = true;
    syncTools();
  }

  function nudgeWidth(delta) {
    widthIdx = Math.max(0, Math.min(PEN_WIDTHS.length - 1, widthIdx + delta));
    syncTools();
  }

  const swatches = [];
  (function buildSwatches() {
    const host = document.getElementById('pen-swatches');
    PEN_COLORS.forEach(function (color, i) {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.background = color;
      b.title = 'Pen color ' + (i + 1);
      onClick(b, function () { setColor(i); });
      host.appendChild(b);
      swatches.push(b);
    });
  })();

  function syncTools() {
    tools.laser.classList.toggle('is-on', laserOn);
    tools.pen.classList.toggle('is-on', penOn);
    tools.blank.classList.toggle('is-on', blankOn);
    tools.black.classList.toggle('is-on', blackOn);
    tools.erase.classList.toggle('is-on', eraseOn);

    elBoard.classList.toggle('is-drawing', penOn);
    elBoard.classList.toggle('is-erasing', penOn && eraseOn);
    elBoard.classList.toggle('is-blank', blankOn);

    elPenBar.classList.toggle('is-on', penOn);
    elPenWidth.textContent = PEN_WIDTHS[widthIdx] + 'px';
    swatches.forEach(function (b, i) {
      b.classList.toggle('is-on', !eraseOn && i === colorIdx);
    });

    elLaser.classList.toggle('is-on', laserOn);
    document.body.classList.toggle('laser-on', laserOn);
    elBlack.classList.toggle('is-on', blackOn);
    elHelp.classList.toggle('is-on', helpOn);
  }

  // ── Laser pointer ────────────────────────────────────────────────────
  // Same-origin doc, no border on the iframe: client coordinates line up
  // with the outer viewport, so no translation is needed either way.
  function onPointerMove(e) {
    if (!laserOn) return;
    elLaser.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px)';
  }
  document.addEventListener('pointermove', onPointerMove, { passive: true });

  // ── Controls overlay ─────────────────────────────────────────────────
  const HELP_GROUPS = [
    { title: 'screen', rows: [
      { keys: ['F'],                      desc: 'Fullscreen' },
      { keys: ['B'],                      desc: 'Black out the screen' },
      { keys: ['Esc'],                    desc: 'Close what is open' },
      { keys: ['?'],                      desc: 'These controls' },
    ]},
    { title: 'point', rows: [
      { keys: ['L'],                      desc: 'Laser pointer' },
    ]},
    { title: 'draw', rows: [
      { keys: ['D'],                      desc: 'Pen, over the doc' },
      { keys: ['C'],                      desc: 'Blank canvas' },
      { keys: ['1', '2', '3', '4', '5'],  desc: 'Pen color' },
      { keys: ['E'],                      desc: 'Eraser' },
      { keys: ['['], desc: 'Thinner' },
      { keys: [']'], desc: 'Thicker' },
      { keys: ['Ctrl', 'Z'],              desc: 'Undo last stroke' },
      { keys: ['X'],                      desc: 'Clear' },
    ]},
  ];

  (function buildHelp() {
    const grid = document.getElementById('help__grid');
    HELP_GROUPS.forEach(function (group) {
      const box = document.createElement('div');
      box.className = 'help-group';

      const title = document.createElement('div');
      title.className = 'help-group__title';
      title.textContent = group.title;
      box.appendChild(title);

      group.rows.forEach(function (row) {
        const line = document.createElement('div');
        line.className = 'help-row';

        const desc = document.createElement('span');
        desc.textContent = row.desc;

        const keys = document.createElement('span');
        keys.className = 'help-row__keys';
        row.keys.forEach(function (k) {
          const kbd = document.createElement('kbd');
          kbd.textContent = k;
          keys.appendChild(kbd);
        });

        line.appendChild(desc);
        line.appendChild(keys);
        box.appendChild(line);
      });

      grid.appendChild(box);
    });
  })();

  function setHelp(on) {
    helpOn = !!on;
    syncTools();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  // ── Tool wiring ──────────────────────────────────────────────────────
  onClick(tools.laser, function () { setLaser(!laserOn); });
  onClick(tools.pen,   function () { setPen(!penOn); });
  onClick(tools.blank, function () { setBlank(!blankOn); });
  onClick(tools.black, function () { setBlack(true); });
  onClick(tools.erase, function () { setEraser(!eraseOn); });
  onClick(document.getElementById('btn-thin'),  function () { nudgeWidth(-1); });
  onClick(document.getElementById('btn-thick'), function () { nudgeWidth(1); });
  onClick(document.getElementById('btn-clear'), function () { clearBoard(); });
  onClick(document.getElementById('btn-help'),  function () { setHelp(!helpOn); });
  onClick(elBlack, function () { setBlack(false); });

  Array.prototype.forEach.call(elHelp.querySelectorAll('[data-close="help"]'), function (el) {
    onClick(el, function () { setHelp(false); });
  });

  window.addEventListener('resize', sizeBoard);

  // ── Keyboard ─────────────────────────────────────────────────────────
  function onKeydown(e) {
    const k = e.key;

    // Undo is the only modifier combo we claim; the rest is the browser's.
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if ((k === 'z' || k === 'Z') && hasInk()) {
        e.preventDefault();
        undoStroke();
      }
      return;
    }

    // Each overlay swallows keys until it is dismissed, outermost first.
    if (helpOn) {
      if (k === 'Escape' || k === '?' || k === 'h' || k === 'H') {
        e.preventDefault();
        setHelp(false);
      }
      return;
    }
    if (k === '?' || k === 'h' || k === 'H') {
      e.preventDefault();
      setHelp(true);
      return;
    }

    if (blackOn) {
      // A stray key should not do anything behind a black screen.
      e.preventDefault();
      if (k === 'Escape' || k === 'b' || k === 'B' || k === ' ' || k === 'Enter') setBlack(false);
      return;
    }
    if (k === 'b' || k === 'B') {
      e.preventDefault();
      setBlack(true);
      return;
    }

    // Pen sub-controls only bind while the pen is down, so the letters stay
    // free for everything else the rest of the time.
    if (penOn) {
      if (k >= '1' && k <= String(PEN_COLORS.length)) { e.preventDefault(); setColor(parseInt(k, 10) - 1); return; }
      if (k === 'e' || k === 'E') { e.preventDefault(); setEraser(!eraseOn); return; }
      if (k === '[') { e.preventDefault(); nudgeWidth(-1); return; }
      if (k === ']') { e.preventDefault(); nudgeWidth(1); return; }
      if (k === 'x' || k === 'X') { e.preventDefault(); clearBoard(); return; }
    }

    switch (k) {
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        setLaser(!laserOn);
        break;
      case 'd':
      case 'D':
        e.preventDefault();
        setPen(!penOn);
        break;
      case 'c':
      case 'C':
        e.preventDefault();
        setBlank(!blankOn);
        break;
      case 'Escape':
        e.preventDefault();
        // Peel one layer at a time: canvas, pen, laser.
        if (blankOn) setBlank(false);
        else if (penOn) setPen(false);
        else if (laserOn) setLaser(false);
        break;
    }
  }
  document.addEventListener('keydown', onKeydown);

  // A same-origin, unsandboxed iframe still owns its own keyboard/pointer
  // focus, so the parent's listeners never fire for events that start
  // inside the doc unless they are attached there too.
  function attachToFrame() {
    try {
      if (elFrame.contentDocument && elFrame.contentDocument.documentElement) {
        elFrame.contentDocument.documentElement.dataset.theme = document.documentElement.dataset.theme || '${theme}';
      }
    } catch (err) {}
    try {
      if (elFrame.contentWindow) {
        elFrame.contentWindow.postMessage({ type: 'theme', theme: document.documentElement.dataset.theme || '${theme}' }, '*');
      }
    } catch (err) {}
    try {
      elFrame.contentWindow.addEventListener('keydown', onKeydown);
      elFrame.contentWindow.addEventListener('pointermove', onPointerMove, { passive: true });
    } catch (err) {}
  }
  elFrame.addEventListener('load', attachToFrame);
  attachToFrame();

  // ── Print export ─────────────────────────────────────────────────────
  // Doc-mode PDF/print targets the raw doc URL directly (no chrome, see
  // index.ts /__pdf-doc), so this wrapper page never needs to print itself.

  // ── Init ─────────────────────────────────────────────────────────────
  sizeBoard();
  syncTools();
})();
</script>
</body>
</html>`;
}
