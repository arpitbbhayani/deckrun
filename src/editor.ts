import { RESET_CSS } from "./generate.js";
import {
  DEFAULT_SIZE,
  DEFAULT_THEME,
  decorOf,
  findFont,
  fontSummaries,
  googleFontsHref,
  resolveSizeName,
  sizeSummaries,
  themeSummaries,
  themeSwitchableCss,
  type SizeName,
  type ThemeName,
} from "./themes.js";
import {
  SNIPPETS,
  SNIPPET_GROUPS,
  TIPS,
  WELCOME_DECK,
} from "./editor-content.js";
import { PREVIEW_WIDTH, PREVIEW_HEIGHT } from "./preview.js";
import {
  DEFAULT_TEMPLATE,
  DEFAULT_TRANSITION,
  resolveTemplateName,
  resolveTransitionName,
  templateSummaries,
  transitionSummaries,
  type TemplateName,
  type TransitionName,
} from "./presentation-options.js";

function bootstrapJson(
  theme: ThemeName,
  size: SizeName,
  fonts: { head: string | null; body: string | null },
  template: TemplateName,
  transition: TransitionName
): string {
  const payload = {
    theme,
    themes: themeSummaries(),
    size,
    sizes: sizeSummaries(),
    fonts,
    faces: fontSummaries(),
    template,
    templates: templateSummaries(),
    transition,
    transitions: transitionSummaries(),
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    groups: SNIPPET_GROUPS,
    snippets: SNIPPETS,
    tips: TIPS,
    welcome: WELCOME_DECK,
  };
  // Keep the JSON inert inside a <script> block.
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

/** The Markdown editor served when `deckrun` is launched without a file. */
export function generateEditorHtml(
  theme: ThemeName = DEFAULT_THEME,
  sizeInput: SizeName = DEFAULT_SIZE,
  fontInput: { head?: string | null; body?: string | null } = {},
  templateInput: TemplateName = DEFAULT_TEMPLATE,
  transitionInput: TransitionName = DEFAULT_TRANSITION
): string {
  const size = resolveSizeName(sizeInput);
  const template = resolveTemplateName(templateInput);
  const transition = resolveTransitionName(transitionInput);
  const fonts = { head: findFont(fontInput.head), body: findFont(fontInput.body) };
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}" data-decor="${decorOf(theme)}" data-size="${size}" data-template="${template}" data-transition="${transition}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>deckrun · editor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsHref()}" rel="stylesheet">
  <style>
${RESET_CSS}

${themeSwitchableCss()}

html, body {
  height: 100%;
  overflow: hidden;
  background: var(--crust);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
::selection { background: var(--selection-bg, var(--surface1)); color: var(--selection-text, inherit); }
::-moz-selection { background: var(--selection-bg, var(--surface1)); color: var(--selection-text, inherit); }

::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--surface1); border-radius: 5px; border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: var(--surface2); background-clip: content-box; }

#app { display: flex; flex-direction: column; height: 100%; }

/* ── Top bar ──────────────────────────────────────────────────────────── */
/* Ten controls live here and there is no room to spare. The bar wraps rather
   than scrolls: a scrollable top bar would clip the dropdowns that hang out of
   it, since overflow-x also clips vertically. */
#topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px 9px;
  min-height: 46px;
  flex: 0 0 auto;
  padding: 7px 12px;
  background: var(--mantle);
  border-bottom: 1px solid var(--surface0);
}

/* The right-hand controls wrap as a block and stay right-aligned, so a narrow
   window never leaves "present" stranded at the far left of a second row. */
#topbar-right {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 7px 9px;
  min-width: 0;
}

/* Before it wraps, shed what is least load-bearing: the keyboard hints, then
   the two buttons whose action the command palette also carries. */
#font-label {
  display: inline-block;
  max-width: 136px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

@media (max-width: 1460px) {
  .btn kbd { display: none; }
}

@media (max-width: 1300px) {
  #font-label { max-width: 76px; }
  #docname { width: 130px; }
}

@media (max-width: 1140px) {
  #btn-new { display: none; }
}

@media (max-width: 1040px) {
  #btn-guide { display: none; }
}

#brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

#brand .caret {
  width: 8px;
  height: 15px;
  background: var(--accent);
  animation: blink 1.1s step-start infinite;
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

#docname {
  width: 190px;
  padding: 5px 8px;
  font: inherit;
  color: var(--subtext1);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
}

#docname:hover { border-color: var(--surface0); }
#docname:focus { outline: none; border-color: var(--accent); color: var(--text); }

/* Both of these sat in the top bar and were the loudest things in it. They
   belong with the other counters, at the bottom. */
#chip-slides { white-space: nowrap; }

#save-state { white-space: nowrap; color: var(--overlay1); }
#save-state:empty { display: none; }
#save-state.ok { color: var(--green); }
#save-state.warn { color: var(--yellow); }
#save-state.err { color: var(--red); }

.spacer { flex: 1 1 auto; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 11px;
  font-size: 12px;
  color: var(--subtext1);
  border: 1px solid var(--surface0);
  border-radius: 7px;
  white-space: nowrap;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.btn:hover { border-color: var(--accent); color: var(--text); background: var(--accent-soft); }
.btn kbd { font: inherit; font-size: 10px; color: var(--overlay0); }

/* The type size, as a segment rather than a menu: four options is few enough
   that hiding them behind a click would cost more than the width it saves. */
#topbar-size { flex: 0 0 auto; height: 30px; align-items: stretch; }
#topbar-size .sz-btn {
  min-width: 0;
  padding: 0 9px;
  border: 0;
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  color: var(--overlay1);
}
#topbar-size .sz-btn:hover { background: var(--accent-soft); color: var(--text); }
#topbar-size .sz-btn.is-on { background: var(--surface0); color: var(--accent); }

/* ── Font menu ────────────────────────────────────────────────────────── */
.menu__pop--font { min-width: 452px; padding: 0; }

#ff-cols { display: flex; }
.ff-col { flex: 1 1 0; min-width: 0; padding: 7px; }
.ff-col + .ff-col { border-left: 1px solid var(--surface0); }

.ff-col__title {
  padding: 4px 8px 7px;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--overlay0);
}

.ff-list { max-height: 58vh; overflow-y: auto; }

.ff-row {
  display: block;
  width: 100%;
  padding: 5px 8px;
  border-radius: 6px;
  border-left: 2px solid transparent;
  text-align: left;
}

.ff-row:hover { background: var(--surface-soft); border-left-color: var(--accent); }
.ff-row.is-on { border-left-color: var(--accent); }
.ff-row.is-on .ff-row__name { color: var(--accent); }

/* Each row is set in the face it offers, which is the only honest preview. */
.ff-row__name {
  display: block;
  font-size: 13.5px;
  line-height: 1.35;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ff-row--auto .ff-row__name { font-family: var(--font-mono); font-size: 12px; color: var(--subtext0); }

.ff-foot {
  padding: 8px 14px;
  border-top: 1px solid var(--surface0);
  font-size: 10px;
  color: var(--overlay0);
}

/* The swatch on the theme button, so the current palette is visible at rest. */
.th-dot {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  flex: 0 0 auto;
  background: var(--gradient);
  transform: rotate(45deg);
}
.btn--icon { padding: 0 9px; }

.btn--primary {
  color: var(--crust);
  font-weight: 600;
  border-color: transparent;
  background: var(--gradient);
}

/* The gradient has to be restated: .btn:hover is a class plus a pseudo-class,
   so its faint tint outranks the plain .btn--primary background and the button
   would drop to near-black text on a barely-there surface. */
.btn--primary:hover {
  background: var(--gradient);
  filter: brightness(1.12);
  border-color: transparent;
  color: var(--crust);
}
.btn--primary kbd { color: var(--crust); opacity: 0.7; }

/* ── Panes ────────────────────────────────────────────────────────────── */
#panes { flex: 1 1 auto; display: flex; min-height: 0; }

#pane-edit {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 240px;
  background: var(--mantle);
}

#divider { flex: 0 0 7px; position: relative; cursor: col-resize; background: var(--crust); }
#divider::after {
  content: '';
  position: absolute;
  inset: 0 3px;
  background: var(--surface0);
  transition: background 0.15s ease;
}
#divider:hover::after, #divider.is-dragging::after { background: var(--accent); }

#pane-prev {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 260px;
  background: var(--crust);
}

/* ── Editor surface ───────────────────────────────────────────────────── */
#edit-wrap { position: relative; flex: 1 1 auto; min-height: 0; }

#hl, #src, #measure {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 18px 20px;
  font-family: var(--font-mono);
  font-size: 13.5px;
  font-weight: 400;
  font-style: normal;
  line-height: 1.75;
  letter-spacing: 0;
  word-spacing: 0;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  tab-size: 2;
  border: 0;
  box-sizing: border-box;
  background: transparent;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

#hl::-webkit-scrollbar, #src::-webkit-scrollbar {
  display: none;
}

#hl { z-index: 1; overflow: hidden; pointer-events: none; color: var(--subtext0); }
#measure { z-index: 0; visibility: hidden; overflow: hidden; }

#src {
  z-index: 2;
  overflow-y: auto;
  overflow-x: hidden;
  color: transparent;
  caret-color: var(--accent);
  resize: none;
  outline: none;
}

#src::selection { background: var(--selection-bg, var(--surface2)); color: transparent; }
#src::-moz-selection { background: var(--selection-bg, var(--surface2)); color: transparent; }

/* Markdown tokens — color only to guarantee pixel-identical alignment */
.t-h1 { color: var(--accent); }
.t-h2 { color: var(--accent-2); }
.t-h3 { color: var(--accent-3); }
.t-h4 { color: var(--teal); }
.t-strong { color: var(--peach); }
.t-em { color: var(--subtext1); }
.t-code { color: var(--green); }
.t-fence { color: var(--overlay1); }
.t-codeline { color: var(--subtext1); }
.t-quote { color: var(--subtext0); }
.t-marker { color: var(--accent); }
.t-link { color: var(--blue); }
.t-url { color: var(--overlay0); }
.t-img { color: var(--sapphire); }
.t-dir { color: var(--yellow); }
.t-note { color: var(--overlay0); }
.t-html { color: var(--pink); }
.t-table { color: var(--lavender); }
.t-sep { color: var(--accent); }

/* ── Drop target ──────────────────────────────────────────────────────── */
#pane-edit.is-dropping::after {
  content: 'drop a Markdown or HTML file to open it';
  position: absolute;
  inset: 10px;
  z-index: 9;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--accent);
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  letter-spacing: 0.05em;
  pointer-events: none;
}

/* ── Preview ──────────────────────────────────────────────────────────── */
#prev-head {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  flex: 0 0 34px;
  padding: 0 12px;
  border-bottom: 1px solid var(--surface0);
  font-size: 11px;
  color: var(--overlay1);
}

#overflow-badge {
  display: none;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border: 1px solid var(--yellow);
  border-radius: 999px;
  color: var(--yellow);
  background: var(--surface-soft);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

#overflow-badge.is-on { display: inline-flex; }

/* ── Dropdown menu ────────────────────────────────────────────────────── */
.menu { position: relative; display: inline-flex; }
.menu__chev { font-size: 9px; color: var(--overlay0); }
.menu.is-open > .btn { border-color: var(--accent); color: var(--text); background: var(--accent-soft); }

.menu__pop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 45;
  min-width: 316px;
  padding: 5px;
  display: none;
  flex-direction: column;
  background: var(--mantle);
  border: 1px solid var(--surface1);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
}

.menu.is-open .menu__pop { display: flex; }

.menu__pop button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 7px;
  border-left: 2px solid transparent;
  text-align: left;
}

.menu__pop button:hover, .menu__pop button.is-sel {
  background: var(--surface-soft);
  border-left-color: var(--accent);
}

/* A fixed name column keeps the three rows on one grid. */
.menu__name { flex: 0 0 74px; font-size: 12.5px; color: var(--text); }
.menu__hint { flex: 1 1 auto; font-size: 11px; color: var(--overlay1); white-space: nowrap; }
.menu__pop kbd {
  flex: 0 0 auto;
  margin-left: auto;
  font: inherit;
  font-size: 10px;
  color: var(--overlay0);
  white-space: nowrap;
}

.menu__pop--template { min-width: 390px; padding: 7px; }
.menu-section + .menu-section { margin-top: 6px; padding-top: 7px; border-top: 1px solid var(--surface0); }
.menu-section__title {
  padding: 2px 10px 5px;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--overlay0);
}
.menu__pop--template button.is-on {
  background: var(--accent-soft);
  border-left-color: var(--accent);
}
.menu__pop--template button.is-on .menu__name { color: var(--accent); }

.seg { display: flex; border: 1px solid var(--surface0); border-radius: 7px; overflow: hidden; }
.seg button { font-size: 11px; padding: 3px 10px; color: var(--overlay1); }
.seg button.is-on { background: var(--surface0); color: var(--text); }

.step { font-size: 13px; color: var(--overlay1); padding: 0 5px; }
.step:hover { color: var(--text); }
.step[disabled] { opacity: 0.3; cursor: default; }

#stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: hidden;
}

#frame-box { position: relative; }

#frame {
  position: absolute;
  top: 0;
  left: 0;
  width: ${PREVIEW_WIDTH}px;
  height: ${PREVIEW_HEIGHT}px;
  border: 0;
  transform-origin: top left;
  background: var(--base);
}

#frame-box.is-single {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--surface0);
  box-shadow: var(--shadow-lg);
}

#notes {
  flex: 0 0 auto;
  max-height: 24%;
  overflow: auto;
  padding: 9px 12px 11px;
  border-top: 1px solid var(--surface0);
  background: var(--mantle);
  display: none;
}

#notes.is-on { display: block; }
#notes__label {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--overlay0);
  margin-bottom: 4px;
}
#notes__text { font-size: 12.5px; line-height: 1.65; color: var(--subtext0); white-space: pre-wrap; }

/* ── Status bar ───────────────────────────────────────────────────────── */
#statusbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 28px;
  flex: 0 0 28px;
  padding: 0 12px;
  background: var(--mantle);
  border-top: 1px solid var(--surface0);
  font-size: 11px;
  color: var(--overlay0);
}

#statusbar > span { flex: 0 0 auto; }
#tipbar { flex: 1 1 auto !important; display: flex; align-items: center; gap: 8px; min-width: 0; }
#tipbar .tag {
  flex: 0 0 auto;
  color: var(--accent);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 9px;
}
#tip-text { color: var(--subtext0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#tipbar button { color: var(--overlay0); padding: 0 3px; }
#tipbar button:hover { color: var(--text); }

#follow-chip {
  flex: 0 0 auto;
  border: 1px solid var(--surface0);
  border-radius: 5px;
  padding: 1px 7px;
  color: var(--accent2);
  cursor: pointer;
  user-select: none;
}
#follow-chip:hover { border-color: var(--accent2); }
#follow-chip b { font-weight: 600; }
#follow-chip.hidden { display: none; }

/* ── Command palette ──────────────────────────────────────────────────── */
#palette, #guide, #library { position: fixed; inset: 0; z-index: 40; display: none; }
#palette.is-on, #guide.is-on, #library.is-on { display: block; }
.backdrop { position: absolute; inset: 0; background: var(--scrim); backdrop-filter: blur(3px); }

#pal-box, #lib-box {
  position: relative;
  width: min(690px, 92vw);
  margin: 9vh auto 0;
  background: var(--mantle);
  border: 1px solid var(--surface1);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

#pal-input, #lib-head {
  width: 100%;
  padding: 15px 18px;
  font: inherit;
  font-size: 14px;
  color: var(--text);
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--surface0);
  outline: none;
}

#pal-input::placeholder { color: var(--overlay0); }
#pal-list, #lib-list { max-height: 54vh; overflow-y: auto; padding: 6px; }

#lib-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text);
}
#lib-head span { flex: 1 1 auto; }
#lib-head button {
  font-size: 11px;
  color: var(--subtext0);
  border: 1px solid var(--surface1);
  border-radius: 6px;
  padding: 4px 9px;
}
#lib-head button:hover { border-color: var(--accent); color: var(--text); background: var(--accent-soft); }

.lib-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  border-left: 2px solid transparent;
  cursor: pointer;
}

.lib-row.is-sel { background: var(--surface-soft); border-left-color: var(--accent); }
.lib-row.is-current .lib-row__name { color: var(--accent-2); }
.lib-row__main { flex: 1 1 auto; min-width: 0; }
.lib-row__name {
  color: var(--text);
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lib-row__meta { color: var(--overlay1); font-size: 11px; margin-top: 2px; }
.lib-row__acts { flex: 0 0 auto; display: flex; gap: 5px; opacity: 0; transition: opacity 0.12s ease; }
.lib-row:hover .lib-row__acts, .lib-row.is-sel .lib-row__acts { opacity: 1; }
.lib-row__acts button {
  font-size: 10px;
  color: var(--overlay1);
  border: 1px solid var(--surface1);
  border-radius: 5px;
  padding: 3px 7px;
}
.lib-row__acts button:hover { border-color: var(--accent); color: var(--text); }
.lib-row__acts button.danger:hover { border-color: var(--red); color: var(--red); }

.pal-group {
  padding: 11px 12px 5px;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--overlay0);
}

.pal-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 2px solid transparent;
  cursor: pointer;
}

.pal-row.is-sel { background: var(--surface-soft); border-left-color: var(--accent); }
.pal-row__main { flex: 1 1 auto; min-width: 0; }
.pal-row__label { color: var(--text); font-size: 12.5px; }
.pal-row__hint { color: var(--overlay1); font-size: 11px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pal-row__syntax {
  flex: 0 0 auto;
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--green);
  background: var(--surface-soft);
  border-radius: 5px;
  padding: 3px 7px;
}
.pal-row__keys { flex: 0 0 auto; font-size: 10px; color: var(--overlay0); }
#pal-foot {
  display: flex;
  gap: 14px;
  padding: 8px 14px;
  border-top: 1px solid var(--surface0);
  font-size: 10px;
  color: var(--overlay0);
}

/* ── Guide drawer ─────────────────────────────────────────────────────── */
#guide-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(540px, 94vw);
  display: flex;
  flex-direction: column;
  background: var(--mantle);
  border-left: 1px solid var(--surface1);
  box-shadow: -22px 0 70px var(--scrim);
}

#guide-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--surface0);
}
#guide-head h2 { font-size: 14px; font-weight: 600; color: var(--text); }
#guide-head p { font-size: 11px; color: var(--overlay1); margin-top: 3px; }
#guide-body { flex: 1 1 auto; overflow-y: auto; padding: 14px 16px 30px; }

.gsec { margin-bottom: 22px; }
.gsec > h3 {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 9px;
}

.gcard {
  border: 1px solid var(--surface0);
  border-radius: 10px;
  padding: 11px 12px;
  margin-bottom: 8px;
  background: var(--base);
  transition: border-color 0.15s ease;
}
.gcard:hover { border-color: var(--surface2); }
.gcard__top { display: flex; align-items: baseline; gap: 10px; }
.gcard__label { flex: 1 1 auto; color: var(--text); font-size: 12.5px; }
.gcard__keys { font-size: 10px; color: var(--overlay0); }
.gcard__hint { font-size: 11.5px; color: var(--overlay1); line-height: 1.6; margin-top: 4px; }
.gcard__syntax {
  margin-top: 8px;
  font-size: 11px;
  color: var(--green);
  background: var(--crust);
  border: 1px solid var(--surface0);
  border-radius: 6px;
  padding: 7px 9px;
  overflow-x: auto;
  white-space: pre;
}
.gcard__ins {
  margin-top: 8px;
  font-size: 11px;
  color: var(--subtext0);
  border: 1px solid var(--surface1);
  border-radius: 6px;
  padding: 4px 9px;
}
.gcard__ins:hover { border-color: var(--accent); color: var(--text); background: var(--accent-soft); }

/* ── Theme picker ─────────────────────────────────────────────────────── */
#themes { position: fixed; inset: 0; z-index: 44; display: none; }
#themes.is-on { display: block; }

#th-box {
  position: relative;
  width: min(1120px, 95vw);
  margin: 5vh auto 0;
  background: var(--mantle);
  border: 1px solid var(--surface1);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

#th-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--surface0);
  font-size: 13px;
  color: var(--text);
}

#th-head .th-head__sub { flex: 1 1 auto; font-size: 11px; color: var(--overlay1); }
#th-head .th-head__sub kbd {
  font: inherit;
  font-size: 10px;
  color: var(--subtext0);
  border: 1px solid var(--surface1);
  border-radius: 3px;
  padding: 0 3px;
}

/* ── Type size ────────────────────────────────────────────────────────── */
#th-size {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px;
  border-bottom: 1px solid var(--surface0);
  background: var(--surface-soft);
}

#th-size__label {
  flex: 0 0 auto;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--overlay0);
}

#th-size__blurb {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 11px;
  color: var(--overlay1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#th-size__seg { flex: 0 0 auto; display: flex; gap: 5px; }

#th-size__keys { flex: 0 0 auto; display: flex; gap: 3px; }
#th-size__keys kbd {
  font: inherit;
  font-size: 10px;
  color: var(--overlay0);
  border: 1px solid var(--surface1);
  border-radius: 3px;
  padding: 0 3px;
}

.sz-btn {
  min-width: 40px;
  padding: 5px 9px;
  border: 1px solid var(--surface1);
  border-radius: 7px;
  font-size: 11px;
  color: var(--subtext0);
  text-align: center;
  transition: border-color 0.14s ease, color 0.14s ease, background 0.14s ease;
}

.sz-btn:hover { border-color: var(--accent); color: var(--text); background: var(--accent-soft); }

.sz-btn.is-on {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}

/* Each button is set at the ratio it stands for, so the row is its own key. */
.sz-btn__glyph { font-family: var(--font-display); letter-spacing: -0.02em; }
#th-head button {
  font-size: 11px;
  color: var(--subtext0);
  border: 1px solid var(--surface1);
  border-radius: 6px;
  padding: 4px 9px;
}
#th-head button:hover { border-color: var(--accent); color: var(--text); background: var(--accent-soft); }

#th-list { max-height: 76vh; overflow-y: auto; padding: 14px 16px 18px; }

.th-group {
  padding: 4px 2px 8px;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--overlay0);
}

.th-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(212px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.th-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--surface1);
  border-radius: 12px;
  background: var(--base);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.14s ease, transform 0.14s ease, box-shadow 0.14s ease;
}

.th-card:hover, .th-card.is-sel {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.th-card.is-current { box-shadow: inset 0 0 0 1px var(--accent); }

/* The thumbnail is a real slide in miniature: the theme's own background,
   its own accent, its own faces. Nothing about it is a stand-in. */
.th-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  padding: 13px 14px;
  overflow: hidden;
  border-bottom: 1px solid var(--surface0);
}

.th-thumb__glow {
  position: absolute;
  width: 150%;
  height: 150%;
  right: -55%;
  top: -60%;
  border-radius: 50%;
  pointer-events: none;
}

.th-thumb__title {
  position: relative;
  font-size: 15px;
  line-height: 1.1;
  margin-bottom: 6px;
}

.th-thumb__rule { position: relative; width: 34px; height: 2px; border-radius: 2px; margin-bottom: 9px; }
.th-thumb__line { position: relative; height: 3px; border-radius: 2px; margin-bottom: 5px; }
.th-thumb__code {
  position: relative;
  margin-top: 8px;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 8px;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
}

.th-meta { padding: 9px 12px 11px; }
.th-meta__top { display: flex; align-items: baseline; gap: 7px; }
.th-meta__name { flex: 1 1 auto; font-size: 12.5px; color: var(--text); }
.th-meta__mood {
  flex: 0 0 auto;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--overlay0);
}
.th-meta__blurb {
  font-size: 10.5px;
  line-height: 1.55;
  color: var(--overlay1);
  margin-top: 4px;
}

/* ── Toasts ───────────────────────────────────────────────────────────── */
#toasts {
  position: fixed;
  right: 16px;
  bottom: 42px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 380px;
  padding: 9px 12px;
  font-size: 12px;
  color: var(--subtext1);
  background: var(--base);
  border: 1px solid var(--surface1);
  border-left: 2px solid var(--teal);
  border-radius: 9px;
  box-shadow: var(--shadow-md);
  pointer-events: all;
  animation: rise 0.18s ease;
}

.toast--warn { border-left-color: var(--yellow); }
.toast--err { border-left-color: var(--red); }
.toast button {
  font-size: 11px;
  color: var(--subtext0);
  border: 1px solid var(--surface1);
  border-radius: 6px;
  padding: 3px 8px;
}
.toast button:hover { border-color: var(--accent); color: var(--text); }

@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* ── HTML doc source / preview ───────────────────────────────────────────
   These live inside the same #pane-edit / #pane-prev panes the Markdown
   editor uses, so the divider drag-resize keeps working for free — only the
   inner content swaps, via [data-doc-kind]. */
#src-html {
  display: none;
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 18px 20px;
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--text);
  caret-color: var(--accent);
  background: transparent;
  border: 0;
  outline: none;
  resize: none;
  white-space: pre;
  overflow: auto;
  tab-size: 2;
}

#frame-html {
  display: none;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  border: 0;
  background: #fff;
}

[data-doc-kind="html"] #edit-wrap,
[data-doc-kind="html"] #nudge,
[data-doc-kind="html"] #prev-head,
[data-doc-kind="html"] #stage,
[data-doc-kind="html"] #notes {
  display: none !important;
}

[data-doc-kind="html"] #src-html,
[data-doc-kind="html"] #frame-html {
  display: block;
}

[data-doc-kind="html"] #btn-guide,
[data-doc-kind="html"] #btn-palette,
[data-doc-kind="html"] #template-wrap {
  display: none !important;
}

/* ── Start screen ─────────────────────────────────────────────────────── */
#screen-start { position: fixed; inset: 0; z-index: 55; display: none; }
#screen-start.is-on { display: block; }

#start-box {
  position: relative;
  width: min(680px, 92vw);
  margin: 12vh auto 0;
  padding: 26px 28px 22px;
  background: var(--mantle);
  border: 1px solid var(--surface1);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
}

#start-head { margin-bottom: 18px; }
#start-head #brand { font-size: 15px; }
#start-head p { margin-top: 8px; font-size: 12.5px; color: var(--overlay1); }

#start-cards { display: flex; flex-direction: column; gap: 10px; }

.start-card {
  display: block;
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  background: var(--base);
  border: 1px solid var(--surface0);
  border-radius: 10px;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.start-card:hover { border-color: var(--accent); background: var(--accent-soft); }
.start-card.is-disabled { opacity: 0.45; pointer-events: none; }

.start-card__title { display: block; font-size: 13px; font-weight: 600; color: var(--text); }
.start-card__desc { display: block; margin-top: 4px; font-size: 11.5px; color: var(--overlay1); }

.start-card__acts { display: flex; gap: 8px; margin-top: 10px; }
.start-card__acts button {
  padding: 5px 10px;
  font-size: 11.5px;
  color: var(--subtext1);
  border: 1px solid var(--surface1);
  border-radius: 6px;
  flex: none;
}
.start-card__acts button:hover { border-color: var(--accent); color: var(--text); }

.start-options {
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid var(--surface0);
}
.start-options__row { display: flex; align-items: center; gap: 8px; margin-top: 7px; }
.start-options__label {
  flex: 0 0 72px;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--overlay0);
}
.start-options__choices { display: flex; flex-wrap: wrap; gap: 5px; }
.start-choice {
  padding: 4px 8px;
  font-size: 10.5px;
  color: var(--subtext0);
  border: 1px solid var(--surface1);
  border-radius: 6px;
}
.start-choice:hover { color: var(--text); border-color: var(--accent); }
.start-choice.is-on { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }

.start-card__url { display: flex; gap: 6px; flex: 1 1 auto; min-width: 0; }
.start-card__url input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 5px 8px;
  font-size: 11.5px;
  font-family: inherit;
  color: var(--text);
  background: var(--mantle);
  border: 1px solid var(--surface1);
  border-radius: 6px;
}
.start-card__url input:focus { border-color: var(--accent); outline: none; }
.start-card__url button { flex: none; }

/* ── Narrow screens ───────────────────────────────────────────────────── */
@media (max-width: 900px) {
  #panes { flex-direction: column; }
  #pane-edit { flex: 1 1 50%; width: auto !important; min-height: 0; }
  #pane-prev { flex: 1 1 50%; min-height: 0; }
  #divider { display: none; }
}
  </style>
</head>
<body>
<div id="app">
  <header id="topbar">
    <span id="brand">deckrun<span class="caret"></span></span>
    <input id="docname" value="deck" spellcheck="false" title="Deck name, also the download filename">
    <button class="btn" id="btn-decks" title="Switch between the decks in this browser">decks <span id="deck-count">1</span> <kbd>Cmd O</kbd></button>
    <span class="spacer"></span>
    <span id="topbar-right">
    <button class="btn" id="btn-guide" title="Everything you can put on a slide">guide <kbd>Cmd /</kbd></button>
    <button class="btn" id="btn-palette" title="Insert anything">insert <kbd>Cmd K</kbd></button>
    <button class="btn" id="btn-new" title="Start a new Markdown deck or HTML doc">new</button>
    <span class="menu">
      <button class="btn" id="btn-export" aria-haspopup="true" aria-expanded="false">export <span class="menu__chev">&#9662;</span></button>
      <div class="menu__pop" id="export-menu">
        <button data-export="md">
          <span class="menu__name">Markdown</span>
          <span class="menu__hint">a plain .md file</span>
          <kbd>Cmd S</kbd>
        </button>
        <button data-export="pdf">
          <span class="menu__name">PDF</span>
          <span class="menu__hint">16:9 pages, styling intact</span>
          <kbd>Cmd Shift S</kbd>
        </button>
        <button data-export="html">
          <span class="menu__name">HTML</span>
          <span class="menu__hint">one self-contained page</span>
          <kbd></kbd>
        </button>
      </div>
    </span>
    <span class="menu" id="template-wrap">
      <button class="btn" id="btn-template" aria-haspopup="true" aria-expanded="false" title="Composition template and slide transition">
        <span id="template-label">template</span> <span class="menu__chev">&#9662;</span>
      </button>
      <div class="menu__pop menu__pop--template" id="template-menu">
        <div class="menu-section">
          <div class="menu-section__title">template</div>
          <div id="template-list"></div>
        </div>
        <div class="menu-section">
          <div class="menu-section__title">transition</div>
          <div id="transition-list"></div>
        </div>
      </div>
    </span>
    <button class="btn" id="btn-theme" title="Pick a theme">
      <span class="th-dot" id="theme-dot"></span>
      <span id="theme-label">theme</span>
      <kbd>Cmd Shift L</kbd>
    </button>
    <span class="menu">
      <button class="btn" id="btn-font" aria-haspopup="true" aria-expanded="false" title="Heading and body faces">
        <span id="font-label">font</span> <span class="menu__chev">&#9662;</span>
      </button>
      <div class="menu__pop menu__pop--font" id="font-menu">
        <div id="ff-cols">
          <div class="ff-col">
            <div class="ff-col__title">heading &amp; title</div>
            <div class="ff-list" id="ff-head"></div>
          </div>
          <div class="ff-col">
            <div class="ff-col__title">body</div>
            <div class="ff-list" id="ff-body"></div>
          </div>
        </div>
        <div class="ff-foot">Code keeps the theme's monospace face.</div>
      </div>
    </span>
    <span class="seg" id="topbar-size" title="Type size"></span>
    <button class="btn btn--primary" id="btn-present" title="Open the real deck in a new tab">present <kbd>Cmd Enter</kbd></button>
    </span>
  </header>

  <main id="panes">
    <section id="pane-edit">
      <div id="edit-wrap">
        <pre id="hl" aria-hidden="true"></pre>
        <pre id="measure" aria-hidden="true"></pre>
        <textarea id="src" spellcheck="false" autocomplete="off" autocapitalize="off" wrap="soft" aria-label="Markdown source"></textarea>
      </div>
      <textarea id="src-html" spellcheck="false" autocomplete="off" autocapitalize="off" wrap="off" aria-label="HTML source"></textarea>
    </section>

    <div id="divider" title="Drag to resize, double-click to reset"></div>

    <section id="pane-prev">
      <div id="prev-head">
        <button class="step" id="btn-prev" title="Previous slide">&#8592;</button>
        <span id="prev-count">slide 0 / 0</span>
        <button class="step" id="btn-next" title="Next slide">&#8594;</button>
        <span id="overflow-badge" title="This slide is clipped. Shorten it or split it with three dashes.">overflow</span>
        <span class="spacer"></span>
        <span id="prev-scale"></span>
        <div class="seg">
          <button id="seg-single" class="is-on">single</button>
          <button id="seg-grid">grid</button>
        </div>
      </div>
      <div id="stage">
        <div id="frame-box" class="is-single">
          <iframe id="frame" src="/__preview" title="Slide preview"></iframe>
        </div>
      </div>
      <div id="notes">
        <div id="notes__label">speaker notes</div>
        <div id="notes__text"></div>
      </div>
      <iframe id="frame-html" title="HTML doc preview"></iframe>
    </section>
  </main>

  <footer id="statusbar">
    <span id="pos">Ln 1, Col 1</span>
    <span id="words">0 words</span>
    <span id="chip-slides">0 slides</span>
    <span id="save-state"></span>
    <span id="follow-chip" class="hidden" title="The editor is mirroring the presented deck. Click to stop following.">following deck &middot; <b id="follow-slide">1</b></span>
    <span id="tipbar">
      <span class="tag">tip</span>
      <span id="tip-text"></span>
      <button id="tip-prev" title="Previous tip">&#8249;</button>
      <button id="tip-next" title="Next tip">&#8250;</button>
    </span>
    <span>local only, nothing is uploaded</span>
  </footer>
</div>

<div id="palette">
  <div class="backdrop" data-close="palette"></div>
  <div id="pal-box">
    <input id="pal-input" placeholder="Insert a style, layout, embed, or action" spellcheck="false" autocomplete="off">
    <div id="pal-list"></div>
    <div id="pal-foot">
      <span>&#8593;&#8595; move</span><span>enter inserts</span><span>esc closes</span>
    </div>
  </div>
</div>

<div id="guide">
  <div class="backdrop" data-close="guide"></div>
  <div id="guide-panel">
    <div id="guide-head">
      <div style="flex:1 1 auto">
        <h2>Everything you can put on a slide</h2>
        <p>Click insert on any card to drop it at your caret.</p>
      </div>
      <button class="nudge-btn nudge-btn--x" data-close="guide" title="Close">&times;</button>
    </div>
    <div id="guide-body"></div>
  </div>
</div>

<div id="library">
  <div class="backdrop" data-close="library"></div>
  <div id="lib-box">
    <div id="lib-head">
      <span>Decks in this browser</span>
      <button id="lib-new">new deck</button>
      <button data-close="library">close</button>
    </div>
    <div id="lib-list"></div>
    <div id="pal-foot">
      <span>&#8593;&#8595; move</span><span>enter opens</span><span>esc closes</span>
    </div>
  </div>
</div>

<div id="themes">
  <div class="backdrop" data-close="themes"></div>
  <div id="th-box">
    <div id="th-head">
      <span>Themes</span>
      <span class="th-head__sub">Arrow keys preview a theme live &nbsp;·&nbsp; enter keeps it &nbsp;·&nbsp; esc puts it back</span>
      <button data-close="themes">close</button>
    </div>
    <div id="th-size">
      <span id="th-size__label">type size</span>
      <span id="th-size__seg"></span>
      <span id="th-size__keys"><kbd>[</kbd><kbd>]</kbd></span>
      <span id="th-size__blurb">Applies to every theme, and sticks right away.</span>
    </div>
    <div id="th-list"></div>
  </div>
</div>

<div id="screen-start">
  <div class="backdrop"></div>
  <div id="start-box">
    <div id="start-head">
      <span id="brand">deckrun<span class="caret"></span></span>
      <p>What are you making?</p>
    </div>
    <div id="start-cards">
      <div class="start-card" id="start-md-card">
        <span class="start-card__title">Markdown deck</span>
        <span class="start-card__desc">Slides written in Markdown, presented one at a time.</span>
        <span class="start-card__acts">
          <button id="start-md-blank">start blank</button>
          <button id="start-md-upload">upload .md</button>
        </span>
        <div class="start-options">
          <div class="start-options__row">
            <span class="start-options__label">template</span>
            <span class="start-options__choices" id="start-template-list"></span>
          </div>
          <div class="start-options__row">
            <span class="start-options__label">transition</span>
            <span class="start-options__choices" id="start-transition-list"></span>
          </div>
        </div>
      </div>
      <div class="start-card" id="start-html-card">
        <span class="start-card__title">HTML document</span>
        <span class="start-card__desc">One self-contained page, presented with the laser, pen, and canvas &mdash; no slide boundaries.</span>
        <span class="start-card__acts">
          <button id="start-html-upload">upload .html</button>
          <span class="start-card__url">
            <input type="url" id="start-html-url" placeholder="https://a-public-page.html" inputmode="url" autocomplete="off" spellcheck="false">
            <button id="start-html-url-go">load URL</button>
          </span>
        </span>
      </div>
      <button class="start-card" id="start-lib">
        <span class="start-card__title">Open from library</span>
        <span class="start-card__desc" id="start-lib-desc">Decks and docs already in this browser.</span>
      </button>
    </div>
  </div>
</div>

<div id="toasts"></div>
<input type="file" id="file-any" accept=".md,.markdown,text/markdown,text/plain,.html,.htm,text/html" hidden>

<script type="application/json" id="bootstrap">${bootstrapJson(theme, size, fonts, template, transition)}</script>
<script>
(function () {
  'use strict';

  var D = JSON.parse(document.getElementById('bootstrap').textContent);
  var MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var CMD = MAC ? 'Cmd' : 'Ctrl';

  var K = {
    index:   'deckrun.decks.v1',
    deck:    'deckrun.deck.',
    current: 'deckrun.current.v1',
    theme:   'deckrun.theme.v1',
    size:    'deckrun.size.v1',
    head:    'deckrun.font.head.v1',
    body:    'deckrun.font.body.v1',
    template:'deckrun.template.v1',
    transition:'deckrun.transition.v1',
    split:   'deckrun.split.v1',
    mode:    'deckrun.mode.v1',
    nudge:   'deckrun.nudges.v1',
    // Superseded by the deck library, read once to migrate.
    oldDoc:  'presentmd.doc.v1',
    oldName: 'presentmd.name.v1'
  };

  // present-md was renamed to deckrun — the whole storage namespace moves
  // with it, so this copies it over once rather than orphaning every deck
  // already saved under the old prefix.
  var OLD_NS = {
    index: 'presentmd.decks.v1', deck: 'presentmd.deck.', current: 'presentmd.current.v1',
    theme: 'presentmd.theme.v1', size: 'presentmd.size.v1', head: 'presentmd.font.head.v1',
    body: 'presentmd.font.body.v1', split: 'presentmd.split.v1', mode: 'presentmd.mode.v1',
    nudge: 'presentmd.nudges.v1'
  };
  (function migrateNamespace() {
    if (lsGet(K.index, null) !== null) return;
    var oldIndexRaw = lsGet(OLD_NS.index, null);
    if (oldIndexRaw === null) return;
    lsSet(K.index, oldIndexRaw);
    lsDel(OLD_NS.index);
    try {
      var oldIndex = JSON.parse(oldIndexRaw);
      if (Object.prototype.toString.call(oldIndex) === '[object Array]') {
        oldIndex.forEach(function (entry) {
          if (!entry || !entry.id) return;
          var content = lsGet(OLD_NS.deck + entry.id, null);
          if (content !== null) {
            lsSet(K.deck + entry.id, content);
            lsDel(OLD_NS.deck + entry.id);
          }
        });
      }
    } catch (e) {}
    ['current', 'theme', 'size', 'head', 'body', 'split', 'mode', 'nudge'].forEach(function (slot) {
      var v = lsGet(OLD_NS[slot], null);
      if (v !== null) { lsSet(K[slot], v); lsDel(OLD_NS[slot]); }
    });
  })();

  function lsGet(k, fallback) {
    try { var v = localStorage.getItem(k); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }

  function lsSet(k, v) {
    try { localStorage.setItem(k, v); return true; }
    catch (e) { return false; }
  }

  function lsDel(k) {
    try { localStorage.removeItem(k); } catch (e) {}
  }

  // ── Deck library ───────────────────────────────────────────────────────
  // The index holds metadata only, so listing decks never reads their text.
  // Each deck's Markdown lives under its own key.

  function loadIndex() {
    try {
      var list = JSON.parse(lsGet(K.index, '[]'));
      return Object.prototype.toString.call(list) === '[object Array]' ? list : [];
    } catch (e) { return []; }
  }

  function saveIndex(list) {
    return lsSet(K.index, JSON.stringify(list));
  }

  function newDeckId() {
    return 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function readDeck(id) { return lsGet(K.deck + id, ''); }

  function findDeck(id) {
    var list = loadIndex();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /** Returns the new deck's id, or null if this browser refused to store it. */
  function createDeck(name, content, kind, template, transition) {
    var id = newDeckId();
    if (!lsSet(K.deck + id, content)) return null;
    var list = loadIndex();
    list.unshift({
      id: id,
      name: name || 'untitled',
      kind: kind || 'markdown',
      slides: 0,
      chars: content.length,
      template: template || (typeof state !== 'undefined' && state.template ? state.template : D.template),
      transition: transition || (typeof state !== 'undefined' && state.transition ? state.transition : D.transition),
      at: Date.now()
    });
    if (!saveIndex(list)) { lsDel(K.deck + id); return null; }
    return id;
  }

  function uniqueName(base) {
    var list = loadIndex();
    var taken = {};
    list.forEach(function (d) { taken[d.name] = true; });
    if (!taken[base]) return base;
    for (var n = 2; n < 500; n++) if (!taken[base + ' ' + n]) return base + ' ' + n;
    return base;
  }

  function timeAgo(ts) {
    var mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    return days + 'd ago';
  }

  function updateDocTitle() {
    if ($('screen-start') && $('screen-start').classList.contains('is-on')) {
      document.title = 'deckrun \u00b7 start';
      return;
    }
    if ($('library') && $('library').classList.contains('is-on')) {
      document.title = 'deckrun \u00b7 library';
      return;
    }
    var name = ($('docname').value || '').trim();
    document.title = name ? name + ' \u00b7 deckrun' : 'deckrun \u00b7 editor';
  }

  /** One deck's metadata is refreshed from the editor on every save. */
  function touchCurrent() {
    var list = loadIndex();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === state.deckId) {
        list[i].name = $('docname').value.trim() || 'untitled';
        list[i].kind = state.kind;
        list[i].template = state.template;
        list[i].transition = state.transition;
        if (state.kind === 'html') {
          list[i].slides = 0;
          list[i].chars = srcHtml.value.length;
        } else {
          list[i].slides = state.slides.length;
          list[i].chars = src.value.length;
        }
        list[i].at = Date.now();
        break;
      }
    }
    updateDocTitle();
    return saveIndex(list);
  }

  function updateDeckCount() {
    $('deck-count').textContent = String(loadIndex().length);
  }

  /** The open document's own text, whichever kind it is. */
  function curValue() { return state.kind === 'html' ? srcHtml.value : src.value; }

  /** Relabels the export menu, since "Markdown" makes no sense for a doc. */
  function paintExportMenu() {
    var mdName = document.querySelector('#export-menu [data-export="md"] .menu__name');
    var mdHint = document.querySelector('#export-menu [data-export="md"] .menu__hint');
    var htmlName = document.querySelector('#export-menu [data-export="html"] .menu__name');
    var htmlHint = document.querySelector('#export-menu [data-export="html"] .menu__hint');
    if (state.kind === 'html') {
      mdName.textContent = 'Source';
      mdHint.textContent = 'the raw .html file';
      htmlName.textContent = 'Presenter Page';
      htmlHint.textContent = 'standalone, with the tool belt built in';
    } else {
      mdName.textContent = 'Markdown';
      mdHint.textContent = 'a plain .md file';
      htmlName.textContent = 'HTML';
      htmlHint.textContent = 'one self-contained page';
    }
  }

  /** Switches which document kind the chrome is dressed for. */
  function setDocKind(kind) {
    state.kind = kind === 'html' ? 'html' : 'markdown';
    document.documentElement.dataset.docKind = state.kind;
    paintExportMenu();
  }

  // ── Themes ─────────────────────────────────────────────────────────────
  var THEMES = D.themes;
  var THEME_BY_ID = {};
  THEMES.forEach(function (t) { THEME_BY_ID[t.id] = t; });

  /** A theme id we can actually apply, whatever localStorage happens to hold. */
  function pickTheme(id) {
    return THEME_BY_ID[id] ? id : (THEME_BY_ID[D.theme] ? D.theme : THEMES[0].id);
  }

  var SIZES = D.sizes;
  var SIZE_BY_ID = {};
  SIZES.forEach(function (z) { SIZE_BY_ID[z.id] = z; });

  function pickSize(id) {
    return SIZE_BY_ID[id] ? id : (SIZE_BY_ID[D.size] ? D.size : 'm');
  }

  var TEMPLATES = D.templates;
  var TEMPLATE_BY_ID = {};
  TEMPLATES.forEach(function (item) { TEMPLATE_BY_ID[item.id] = item; });

  function pickTemplate(id) {
    return TEMPLATE_BY_ID[id] ? id : (TEMPLATE_BY_ID[D.template] ? D.template : 'classic');
  }

  var TRANSITIONS = D.transitions;
  var TRANSITION_BY_ID = {};
  TRANSITIONS.forEach(function (item) { TRANSITION_BY_ID[item.id] = item; });

  function pickTransition(id) {
    return TRANSITION_BY_ID[id] ? id : (TRANSITION_BY_ID[D.transition] ? D.transition : 'slide');
  }

  var FACES = D.faces;
  var FACE_BY_ID = {};
  FACES.forEach(function (f) { FACE_BY_ID[f.id] = f; });

  /** null means "whatever the theme says", which is not a face id. */
  function pickFont(id) {
    return FACE_BY_ID[id] ? id : null;
  }

  // ── Elements ───────────────────────────────────────────────────────────
  var $ = function (id) { return document.getElementById(id); };
  var src = $('src'), hl = $('hl'), measure = $('measure');
  var frame = $('frame'), frameBox = $('frame-box'), stage = $('stage');
  var paneEdit = $('pane-edit'), panePrev = $('pane-prev'), divider = $('divider');
  var elChipSlides = $('chip-slides'), elSave = $('save-state'), elPos = $('pos'), elWords = $('words');
  var elCount = $('prev-count'), elScale = $('prev-scale');
  var elNotes = $('notes'), elNotesText = $('notes__text');
  var palette = $('palette'), palInput = $('pal-input'), palList = $('pal-list');
  var guide = $('guide'), guideBody = $('guide-body');
  var srcHtml = $('src-html'), frameHtml = $('frame-html');

  // ── State ──────────────────────────────────────────────────────────────
  var state = {
    deckId: null,
    kind: 'markdown',
    slides: [],
    notes: [],
    index: 0,
    mode: lsGet(K.mode, 'single') === 'grid' ? 'grid' : 'single',
    theme: pickTheme(lsGet(K.theme, D.theme)),
    size: pickSize(lsGet(K.size, D.size)),
    head: pickFont(lsGet(K.head, D.fonts.head)),
    body: pickFont(lsGet(K.body, D.fonts.body)),
    template: pickTemplate(lsGet(K.template, D.template)),
    transition: pickTransition(lsGet(K.transition, D.transition)),
    frameReady: false,
    overflow: {},
    dismissed: {},
    activeNudge: null,
    nudgeShownAt: 0,
    seq: 0,
    inflight: null,
    tip: Math.floor(Math.random() * D.tips.length)
  };

  try {
    var saved = JSON.parse(lsGet(K.nudge, '[]'));
    if (saved && saved.length) saved.forEach(function (id) { state.dismissed[id] = true; });
  } catch (e) {}

  // ── Following the presented deck ───────────────────────────────────────
  // Presenting hands the deck tab this editor's session id (ps=... in the
  // URL), and the editor listens on that same channel: the preview and the
  // notes panel mirror the deck's current slide, so the editor window is the
  // presenter's screen and the deck tab is the projector. No second window
  // is involved.
  var FOLLOW_KEY = 'deckrun.presenter.session';
  var followSid = null;
  try { followSid = sessionStorage.getItem(FOLLOW_KEY); } catch (e) {}
  if (!followSid) {
    followSid = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    try { sessionStorage.setItem(FOLLOW_KEY, followSid); } catch (e) {}
  }
  var followChan = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('deckrun:' + followSid)
    : null;

  var following = false;   // the editor is mirroring the deck right now
  var expectingDeck = false; // a present just went out: follow the deck that answers
  var deckNotes = [];      // the deck's own notes, authoritative while following
  var followChipEl = $('follow-chip');
  var followSlideEl = $('follow-slide');

  /** The editor drives the deck as well as the preview: wherever the
      presenter lands in the editor, the deck goes there too. The deck echoes
      its state back over the same channel, which is what keeps both in step. */
  function announceIndex(i) {
    if (followChan) followChan.postMessage({ id: followSid, type: 'goto', index: i });
  }

  function followDeck(i) {
    var n = state.slides.length;
    if (!n) return;
    i = Math.max(0, Math.min(n - 1, i));
    var changed = i !== state.index;
    state.index = i;
    state.notes = deckNotes;
    followSlideEl.textContent = String(i + 1);
    if (changed) pushFrame();
    renderCounts();
  }

  if (followChan) {
    followChan.onmessage = function (e) {
      var m = e.data || {};
      if (m.id !== followSid) return;
      if (m.type === 'init') {
        deckNotes = m.notes || [];
        if (expectingDeck) {
          expectingDeck = false;
          following = true;
        }
        followChipEl.classList.toggle('hidden', !following);
      } else if (m.type === 'state') {
        if (following) followDeck(m.index);
      }
    };
    setInterval(function () {
      followChan.postMessage({ id: followSid, type: 'ready' });
    }, 2000);
  }

  followChipEl.addEventListener('click', function () {
    following = false;
    followChipEl.classList.add('hidden');
  });

  // ── Toasts ─────────────────────────────────────────────────────────────
  function toast(message, kind, actionLabel, action) {
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    var text = document.createElement('span');
    text.style.flex = '1 1 auto';
    text.textContent = message;
    el.appendChild(text);
    if (actionLabel) {
      var btn = document.createElement('button');
      btn.textContent = actionLabel;
      btn.addEventListener('click', function () { action(); el.remove(); });
      el.appendChild(btn);
    }
    $('toasts').appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s ease';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 320);
    }, actionLabel ? 8000 : 4200);
  }

  // ── Markdown highlighting for the editor surface ───────────────────────
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var HOLD = '\\u0000';

  function inlineTokens(line) {
    var held = [];
    function hold(html) { held.push(html); return HOLD + (held.length - 1) + HOLD; }

    var out = esc(line);

    // Images first: the title attribute carries the layout directive.
    out = out.replace(/!\\[([^\\]\\n]*)\\]\\(([^\\s)]*)(\\s+"[^"\\n]*")?\\)/g, function (m, alt, url, title) {
      var html = '<span class="t-img">![' + alt + ']</span><span class="t-url">(' + url;
      if (title) html += '</span><span class="t-dir">' + title + '</span><span class="t-url">';
      return hold(html + ')</span>');
    });

    // Links.
    out = out.replace(/\\[([^\\]\\n]*)\\]\\(([^\\s)]*)(\\s+"[^"\\n]*")?\\)/g, function (m, label, url, title) {
      return hold('<span class="t-link">[' + label + ']</span><span class="t-url">(' + url +
        (title ? '</span><span class="t-dir">' + title + '</span><span class="t-url">' : '') + ')</span>');
    });

    // Inline code.
    out = out.replace(/\`[^\`\\n]+\`/g, function (m) { return hold('<span class="t-code">' + m + '</span>'); });

    // Raw HTML tags.
    out = out.replace(/&lt;\\/?[a-zA-Z][^&]{0,200}?&gt;/g, function (m) {
      return hold('<span class="t-html">' + m + '</span>');
    });

    out = out.replace(/\\*\\*[^*\\n]+\\*\\*/g, function (m) { return '<span class="t-strong">' + m + '</span>'; });
    out = out.replace(/(^|[^*\\w])(\\*[^*\\n]+\\*)/g, function (m, pre, body) {
      return pre + '<span class="t-em">' + body + '</span>';
    });
    out = out.replace(/(^|[^_\\w])(_[^_\\n]+_)/g, function (m, pre, body) {
      return pre + '<span class="t-em">' + body + '</span>';
    });

    return out.replace(new RegExp(HOLD + '(\\\\d+)' + HOLD, 'g'), function (m, i) { return held[+i]; });
  }

  function highlightMarkdown(text) {
    var lines = text.split('\\n');
    var out = [];
    var inFence = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // A pasted data URI is one enormous line. Colour it in a single pass so
      // typing stays responsive.
      if (line.length > 4000) {
        out.push('<span class="t-url">' + esc(line) + '</span>');
        continue;
      }

      if (/^\\s*\`\`\`/.test(line)) {
        out.push('<span class="t-fence">' + esc(line) + '</span>');
        inFence = !inFence;
        continue;
      }
      if (inFence) { out.push('<span class="t-codeline">' + esc(line) + '</span>'); continue; }
      if (/^[ \\t]*---[ \\t]*$/.test(line)) {
        out.push('<span class="t-sep">' + esc(line) + '</span>');
        continue;
      }
      if (/^\\s*<!--/.test(line)) {
        out.push('<span class="t-note">' + esc(line) + '</span>');
        continue;
      }

      var head = line.match(/^(#{1,6})\\s/);
      if (head) {
        var lvl = Math.min(head[1].length, 4);
        out.push('<span class="t-h' + lvl + '">' + inlineTokens(line) + '</span>');
        continue;
      }
      if (/^\\s*>/.test(line)) {
        out.push('<span class="t-quote">' + inlineTokens(line) + '</span>');
        continue;
      }
      if (/^\\s*\\|.*\\|\\s*$/.test(line)) {
        out.push('<span class="t-table">' + inlineTokens(line) + '</span>');
        continue;
      }
      var marker = line.match(/^(\\s*)([-*+]|\\d+[.)])(\\s+)/);
      if (marker) {
        out.push(marker[1] + '<span class="t-marker">' + esc(marker[2]) + '</span>' + marker[3] +
          inlineTokens(line.slice(marker[0].length)));
        continue;
      }
      out.push(inlineTokens(line));
    }

    return out.join('\\n') + '\\n';
  }

  function paint() { hl.innerHTML = highlightMarkdown(src.value); }

  function syncScroll() { hl.scrollTop = src.scrollTop; hl.scrollLeft = src.scrollLeft; }

  // ── Slide map, mirroring the server-side split ─────────────────────────
  var SEP = /\\r?\\n[ \\t]*---[ \\t]*\\r?\\n/g;

  function slideMap() {
    var text = src.value, spans = [], last = 0, m;
    SEP.lastIndex = 0;
    while ((m = SEP.exec(text)) !== null) {
      spans.push([last, m.index]);
      last = m.index + m[0].length;
      SEP.lastIndex = last;
    }
    spans.push([last, text.length]);
    return spans.filter(function (s) { return text.slice(s[0], s[1]).trim().length > 0; });
  }

  function caretSlide() {
    var pos = src.selectionStart, spans = slideMap();
    for (var i = 0; i < spans.length; i++) {
      if (pos <= spans[i][1]) return i;
    }
    return Math.max(0, spans.length - 1);
  }

  function offsetTop(pos) {
    measure.textContent = src.value.slice(0, pos);
    var marker = document.createElement('span');
    marker.textContent = '\\u200b';
    measure.appendChild(marker);
    return marker.offsetTop;
  }

  function scrollCaretIntoView() {
    var top = offsetTop(src.selectionStart);
    var view = src.clientHeight;
    if (top < src.scrollTop + 40 || top > src.scrollTop + view - 80) {
      src.scrollTop = Math.max(0, top - view / 3);
      syncScroll();
    }
  }

  // ── Preview plumbing ───────────────────────────────────────────────────
  /** Dropped rather than queued until the frame is up: see the ready handler. */
  function post(msg) {
    if (!state.frameReady) return;
    frame.contentWindow.postMessage(msg, '*');
  }

  function pushFrame() {
    post({ type: 'render', slides: state.slides, index: state.index, mode: state.mode });
  }

  function layout() {
    var padding = 32;
    var w = Math.max(120, stage.clientWidth - padding);
    var h = Math.max(90, stage.clientHeight - padding);
    var scale;
    if (state.mode === 'single') {
      scale = Math.min(w / D.width, h / D.height);
      frame.style.height = D.height + 'px';
      frameBox.classList.add('is-single');
      frameBox.style.width = Math.round(D.width * scale) + 'px';
      frameBox.style.height = Math.round(D.height * scale) + 'px';
    } else {
      scale = w / D.width;
      var virtualH = Math.round(h / scale);
      frame.style.height = virtualH + 'px';
      frameBox.classList.remove('is-single');
      frameBox.style.width = Math.round(w) + 'px';
      frameBox.style.height = Math.round(h) + 'px';
    }
    frame.style.transform = 'scale(' + scale + ')';
    elScale.textContent = Math.round(scale * 100) + '%';
  }

  function renderCounts() {
    var n = state.slides.length;
    elChipSlides.textContent = n + (n === 1 ? ' slide' : ' slides');
    elCount.textContent = 'slide ' + (n ? state.index + 1 : 0) + ' / ' + n;
    $('btn-prev').disabled = state.index <= 0;
    $('btn-next').disabled = state.index >= n - 1;
    $('overflow-badge').classList.toggle(
      'is-on',
      state.mode === 'single' && !!state.overflow[state.index]
    );

    var note = state.notes[state.index];
    if (note) { elNotesText.textContent = note; elNotes.classList.add('is-on'); }
    else { elNotes.classList.remove('is-on'); }

    var words = src.value.trim() ? src.value.trim().split(/\\s+/).length : 0;
    elWords.textContent = words + (words === 1 ? ' word' : ' words');
  }

  function setIndex(i, moveCaret) {
    var n = state.slides.length;
    if (!n) return;
    i = Math.max(0, Math.min(n - 1, i));
    if (i === state.index && !moveCaret) return;
    state.index = i;
    if (moveCaret) {
      var spans = slideMap();
      if (spans[i]) {
        var target = spans[i][0];
        while (/\\s/.test(src.value.charAt(target)) && target < spans[i][1]) target++;
        src.focus();
        src.setSelectionRange(target, target);
        scrollCaretIntoView();
        updateCaretUi();
      }
    }
    post({ type: 'index', index: state.index });
    announceIndex(state.index);
    renderCounts();
  }

  function updateCaretUi() {
    var before = src.value.slice(0, src.selectionStart);
    var lines = before.split('\\n');
    elPos.textContent = 'Ln ' + lines.length + ', Col ' + (lines[lines.length - 1].length + 1);
  }

  // ── Parse round-trip: the server owns the Markdown, so what you see here
  //    is byte-for-byte what deckrun file.md renders. ───────────────
  function refresh() {
    var mine = ++state.seq;
    if (state.inflight) state.inflight.abort();
    state.inflight = new AbortController();

    fetch('/__parse', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: src.value,
      signal: state.inflight.signal
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (mine !== state.seq) return;
        state.slides = data.slides || [];
        state.notes = data.notes || [];
        if (state.index >= state.slides.length) state.index = Math.max(0, state.slides.length - 1);
        pushFrame();
        renderCounts();
        evalNudges();
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        toast('Preview failed: ' + err.message + '. Is the server still running?', 'err');
      });
  }

  // ── Autosave ───────────────────────────────────────────────────────────
  var saveTimer = null;

  function saveNow() {
    var ok = state.deckId && lsSet(K.deck + state.deckId, curValue()) && touchCurrent();
    if (ok) {
      elSave.className = '';
      elSave.textContent = '';
    } else if (state.deckId) {
      elSave.className = 'err';
      elSave.textContent = 'not saved: storage full';
      toast('This browser is out of room. Download this deck, or delete one you no longer need.', 'err', 'download', download);
    }
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    // Writing a megabyte of content costs real time. Back off on big docs.
    saveTimer = setTimeout(saveNow, curValue().length > 1024 * 1024 ? 1500 : 500);
  }

  // ── Text insertion, undo-safe ──────────────────────────────────────────
  function typeText(text) {
    src.focus();
    var inserted = false;
    try { inserted = document.execCommand('insertText', false, text); } catch (e) {}
    if (!inserted) {
      var s = src.selectionStart, e2 = src.selectionEnd;
      src.setRangeText(text, s, e2, 'end');
    }
  }

  var MARK = '\\u0001';

  function insertSnippet(sn) {
    if (!sn.insert) return;
    var s = src.selectionStart, e = src.selectionEnd;
    var sel = src.value.slice(s, e);

    var text = sn.insert.split('{caret}').join(MARK);
    if (text.indexOf(MARK) === -1 && !sel) text = text.split('{sel}').join(MARK);
    text = text.split('{sel}').join(sel);

    var prefix = '', suffix = '';
    if (sn.block) {
      var before = src.value.slice(0, s);
      if (before && !/\\n[ \\t]*$/.test(before)) prefix = '\\n\\n';
      else if (before && !/\\n[ \\t]*\\n[ \\t]*$/.test(before)) prefix = '\\n';
      var after = src.value.slice(e);
      if (after && !/^[ \\t]*\\n/.test(after)) suffix = '\\n';
    }

    var caretAt = text.indexOf(MARK);
    text = text.split(MARK).join('');
    var full = prefix + text + suffix;

    typeText(full);
    var pos = s + prefix.length + (caretAt === -1 ? text.length : caretAt);
    src.setSelectionRange(pos, pos);
    onInput();
    scrollCaretIntoView();
  }

  // ── Nudges: rules evaluated against the live document ──────────────────
  var NUDGE_RULES = [
    {
      id: 'overflow',
      sticky: true,
      test: function (ctx) {
        var i = state.index;
        return state.overflow[i] ? 'Slide ' + (i + 1) + ' overflows and is being clipped. Trim it, or split it with <code>---</code>.' : null;
      },
      snippet: 'slide-break'
    },
    {
      id: 'no-split',
      test: function (ctx) {
        return ctx.count === 1 && ctx.text.length > 420
          ? 'This is one long slide. Three dashes on their own line start the next one.'
          : null;
      },
      snippet: 'slide-break'
    },
    {
      id: 'untagged-fence',
      test: function (ctx) {
        return ctx.untaggedFence
          ? 'That code block has no language tag. Write <code>&#96;&#96;&#96;go</code> and it gets highlighted.'
          : null;
      },
      snippet: 'code-go'
    },
    {
      id: 'img-plain',
      test: function (ctx) {
        return ctx.plainImage
          ? 'Your image is inline. Add <code>"right"</code> after the URL and the slide splits: text left, image right.'
          : null;
      },
      snippet: 'img-right'
    },
    {
      id: 'no-notes',
      test: function (ctx) {
        return ctx.count >= 3 && !ctx.hasNotes
          ? 'Speaker notes live in <code>&#60;!-- notes: ... --&#62;</code>. They show under the preview and never reach the deck.'
          : null;
      },
      snippet: 'slide-notes'
    },
    {
      id: 'no-image',
      test: function (ctx) {
        return ctx.count >= 4 && !ctx.hasImage
          ? 'All text so far. An image path resolves against the folder you launched in: <code>![alt](diagram.png "right")</code>.'
          : null;
      },
      snippet: 'img-right'
    },
    {
      id: 'no-table',
      test: function (ctx) {
        return ctx.count >= 5 && !ctx.hasTable
          ? 'Numbers land harder in a table than in bullets. Zebra rows and an accented header come for free.'
          : null;
      },
      snippet: 'table'
    },
    {
      id: 'no-embed',
      test: function (ctx) {
        return ctx.count >= 6 && !ctx.hasEmbed
          ? 'Raw HTML works, so a YouTube or dashboard <code>&#60;iframe&#62;</code> can live on a slide, sized to 16:9.'
          : null;
      },
      snippet: 'embed-youtube'
    },
    {
      id: 'dense',
      test: function (ctx) {
        return ctx.denseSlide !== -1
          ? 'Slide ' + (ctx.denseSlide + 1) + ' is dense. Around seven bullets is the ceiling from the back row.'
          : null;
      },
      snippet: 'slide-break'
    },
    {
      id: 'huge',
      sticky: true,
      test: function (ctx) {
        return ctx.text.length > 3.5 * 1024 * 1024
          ? 'This deck is over 3.5 MB, near what a browser will autosave. Download a copy.'
          : null;
      },
      action: 'download'
    }
  ];

  function docContext() {
    var text = src.value;
    var lines = text.split('\\n');
    var untagged = false, inFence = false;
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^\\s*\`\`\`(.*)$/);
      if (!m) continue;
      if (!inFence && !m[1].trim()) untagged = true;
      inFence = !inFence;
    }

    var dense = -1;
    var spans = slideMap();
    for (var j = 0; j < spans.length; j++) {
      var body = text.slice(spans[j][0], spans[j][1]);
      if (body.indexOf('\`\`\`') !== -1) continue;
      var bullets = body.split('\\n').filter(function (l) { return /^\\s*([-*+]|\\d+[.)])\\s/.test(l); });
      if (bullets.length > 9) { dense = j; break; }
    }

    return {
      text: text,
      count: state.slides.length,
      untaggedFence: untagged,
      plainImage: /!\\[[^\\]]*\\]\\([^\\s)]+\\)(?!\\s*\\{)/.test(text) && !/!\\[[^\\]]*\\]\\([^\\s)]+\\s+"[^"]*"\\)/.test(text),
      hasNotes: /<!--\\s*notes?:/i.test(text),
      hasImage: /!\\[[^\\]]*\\]\\(/.test(text),
      hasTable: /^\\s*\\|.*\\|\\s*$/m.test(text),
      hasEmbed: /<(iframe|video)\\b/i.test(text),
      denseSlide: dense
    };
  }

  var bySnippetId = {};
  D.snippets.forEach(function (s) { bySnippetId[s.id] = s; });

  function evalNudges() {}
  function hideNudge() {}

  // ── Tips carousel ──────────────────────────────────────────────────────
  var tipTimer = null;

  function showTip(step) {
    state.tip = (state.tip + step + D.tips.length) % D.tips.length;
    $('tip-text').textContent = D.tips[state.tip];
  }

  function startTips() {
    showTip(0);
    if (tipTimer) clearInterval(tipTimer);
    tipTimer = setInterval(function () { showTip(1); }, 13000);
  }

  $('tip-prev').addEventListener('click', function () { showTip(-1); startTips(); });
  $('tip-next').addEventListener('click', function () { showTip(1); startTips(); });
  $('tipbar').addEventListener('mouseenter', function () { if (tipTimer) clearInterval(tipTimer); });
  $('tipbar').addEventListener('mouseleave', startTips);

  // ── Command palette ────────────────────────────────────────────────────
  var palRows = [], palSel = 0;

  function palFilter() {
    var q = palInput.value.trim().toLowerCase();
    var terms = q ? q.split(/\\s+/) : [];
    return D.snippets.filter(function (s) {
      if (!terms.length) return true;
      var hay = (s.label + ' ' + s.group + ' ' + s.hint + ' ' + s.syntax).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
  }

  function renderPalette() {
    var items = palFilter();
    palRows = items;
    if (palSel >= items.length) palSel = Math.max(0, items.length - 1);
    palList.innerHTML = '';

    if (!items.length) {
      var none = document.createElement('div');
      none.className = 'pal-group';
      none.textContent = 'nothing matches';
      palList.appendChild(none);
      return;
    }

    var group = null;
    items.forEach(function (item, i) {
      if (item.group !== group) {
        group = item.group;
        var head = document.createElement('div');
        head.className = 'pal-group';
        head.textContent = group;
        palList.appendChild(head);
      }
      var row = document.createElement('div');
      row.className = 'pal-row' + (i === palSel ? ' is-sel' : '');
      row.dataset.i = String(i);

      var main = document.createElement('div');
      main.className = 'pal-row__main';
      var label = document.createElement('div');
      label.className = 'pal-row__label';
      label.textContent = item.label;
      var hint = document.createElement('div');
      hint.className = 'pal-row__hint';
      hint.textContent = item.hint;
      main.appendChild(label);
      main.appendChild(hint);
      row.appendChild(main);

      if (item.syntax) {
        var syn = document.createElement('code');
        syn.className = 'pal-row__syntax';
        syn.textContent = item.syntax.split('\\\\n').join(' ');
        row.appendChild(syn);
      }
      if (item.keys) {
        var keys = document.createElement('span');
        keys.className = 'pal-row__keys';
        keys.textContent = item.keys.replace('Cmd', CMD);
        row.appendChild(keys);
      }

      row.addEventListener('mousemove', function () {
        if (palSel === i) return;
        palSel = i;
        var sel = palList.querySelector('.pal-row.is-sel');
        if (sel) sel.classList.remove('is-sel');
        row.classList.add('is-sel');
      });
      row.addEventListener('click', function () { palRun(i); });
      palList.appendChild(row);
    });
  }

  function palRun(i) {
    var item = palRows[i];
    if (!item) return;
    closeOverlays();
    if (item.action) runAction(item.action);
    else insertSnippet(item);
  }

  function palMove(step) {
    if (!palRows.length) return;
    palSel = (palSel + step + palRows.length) % palRows.length;
    renderPalette();
    var sel = palList.querySelector('.pal-row.is-sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function openPalette() {
    palette.classList.add('is-on');
    palInput.value = '';
    palSel = 0;
    renderPalette();
    palInput.focus();
  }

  palInput.addEventListener('input', function () { palSel = 0; renderPalette(); });
  palInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); palRun(palSel); }
    else if (e.key === 'Escape') { e.preventDefault(); closeOverlays(); }
  });

  // ── Guide drawer ───────────────────────────────────────────────────────
  function buildGuide() {
    guideBody.innerHTML = '';
    D.groups.forEach(function (group) {
      var items = D.snippets.filter(function (s) { return s.group === group; });
      if (!items.length) return;

      var sec = document.createElement('section');
      sec.className = 'gsec';
      var head = document.createElement('h3');
      head.textContent = group;
      sec.appendChild(head);

      items.forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'gcard';

        var top = document.createElement('div');
        top.className = 'gcard__top';
        var label = document.createElement('span');
        label.className = 'gcard__label';
        label.textContent = item.label;
        top.appendChild(label);
        if (item.keys) {
          var keys = document.createElement('span');
          keys.className = 'gcard__keys';
          keys.textContent = item.keys.replace('Cmd', CMD);
          top.appendChild(keys);
        }
        card.appendChild(top);

        var hint = document.createElement('div');
        hint.className = 'gcard__hint';
        hint.textContent = item.hint;
        card.appendChild(hint);

        if (item.syntax) {
          var syn = document.createElement('pre');
          syn.className = 'gcard__syntax';
          syn.textContent = item.syntax.split('\\\\n').join('\\n');
          card.appendChild(syn);
        }

        var btn = document.createElement('button');
        btn.className = 'gcard__ins';
        btn.textContent = item.action ? 'run' : 'insert at caret';
        btn.addEventListener('click', function () {
          closeOverlays();
          if (item.action) runAction(item.action);
          else insertSnippet(item);
        });
        card.appendChild(btn);

        sec.appendChild(card);
      });

      guideBody.appendChild(sec);
    });
  }

  function closeOverlays(keepFocus) {
    // A dropdown outranks the picker in the stacking order, so it has to go
    // down too or it floats over the modal that just opened.
    closeMenu();
    palette.classList.remove('is-on');
    guide.classList.remove('is-on');
    $('library').classList.remove('is-on');
    if ($('themes').classList.contains('is-on')) closeThemes(true);
    updateDocTitle();
    if (!keepFocus) src.focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (el) {
    el.addEventListener('click', function () { closeOverlays(); });
  });

  // ── Actions ────────────────────────────────────────────────────────────
  function slugify(s) {
    return (s || 'deck').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'deck';
  }

  function download() {
    var name = slugify($('docname').value);
    if (state.kind === 'html') {
      if (!/\\.html?$/.test(name)) name += '.html';
      saveBlob(name, new Blob([srcHtml.value], { type: 'text/html;charset=utf-8' }));
      toast('Downloaded ' + name);
      return;
    }
    if (!/\\.(md|markdown)$/.test(name)) name += '.md';
    saveBlob(name, new Blob([src.value], { type: 'text/markdown;charset=utf-8' }));
    toast('Downloaded ' + name);
  }

  function saveBlob(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function isEmpty() {
    return state.kind === 'html' ? !srcHtml.value.trim() : !state.slides.length;
  }

  /** Downloads the built deck or doc as one standalone page. */
  function exportHtml() {
    if (isEmpty()) { toast('Nothing to export yet.', 'warn'); return; }
    var builder = state.kind === 'html' ? buildHtmlDoc : buildDeck;
    builder(false, true)
      .then(function (data) { return fetch(data.path); })
      .then(function (r) {
        if (!r.ok) throw new Error('server said ' + r.status);
        return r.text();
      })
      .then(function (html) {
        var name = slugify($('docname').value).replace(/\\.(md|markdown|html?)$/, '') + '.html';
        saveBlob(name, new Blob([html], { type: 'text/html;charset=utf-8' }));
        toast('Downloaded ' + name + '. Fonts and highlighting load from a CDN, so it needs a connection.');
      })
      .catch(function (err) { toast('Could not export HTML: ' + err.message, 'err'); });
  }

  /**
   * Exports a real PDF file. The server drives a headless browser, so nobody
   * has to find the landscape and background-graphics settings in a dialog.
   * Falls back to the dialog only when the machine has no browser to drive.
   */
  var pdfInFlight = false;

  function exportPdf() {
    if (isEmpty()) { toast('Nothing to export yet.', 'warn'); return; }
    if (pdfInFlight) { toast('Already building a PDF.'); return; }
    pdfInFlight = true;
    elSave.className = 'warn';
    elSave.textContent = 'building the PDF';

    var pdfUrl = state.kind === 'html' ? '/__pdf-doc' : '/__pdf';
    var pdfBody = state.kind === 'html'
      ? { html: srcHtml.value, title: $('docname').value }
      : {
          markdown: src.value,
          theme: state.theme,
          size: state.size,
          head: state.head,
          body: state.body,
          template: state.template,
          transition: state.transition,
          title: $('docname').value
        };

    fetch(pdfUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pdfBody)
    })
      .then(function (r) {
        if (r.status === 501) {
          return r.json().then(function (info) {
            printFallback(info && info.detail);
            return null;
          });
        }
        if (!r.ok) {
          return r.json().then(
            function (info) { throw new Error((info && info.detail) || 'server said ' + r.status); },
            function () { throw new Error('server said ' + r.status); }
          );
        }
        return r.blob();
      })
      .then(function (blob) {
        if (!blob) return;
        var name = slugify($('docname').value).replace(/\\.(md|markdown|html?)$/, '') + '.pdf';
        saveBlob(name, blob);
        toast('Downloaded ' + name + (state.kind === 'html' ? '.' : ', one 16:9 page per slide.'));
      })
      .catch(function (err) { toast('Could not export the PDF: ' + err.message, 'err'); })
      .then(function () {
        pdfInFlight = false;
        elSave.className = '';
        elSave.textContent = '';
        scheduleSave();
      });
  }

  /** No local browser to drive: hand the deck or doc to the print dialog instead. */
  function printFallback(detail) {
    var tab = window.open('about:blank', '_blank');
    var builder = state.kind === 'html' ? buildHtmlDoc : buildDeck;
    builder(true)
      .then(function (data) {
        var url = location.origin + data.path;
        if (!tab) {
          toast('Allow pop-ups, or press Cmd P, to save a PDF.', 'warn', 'open here', function () { location.href = url; });
          return;
        }
        tab.location.replace(url);
        toast((detail || 'No local browser to render with.') + ' Using the print dialog instead, which is already set to landscape.', 'warn');
      })
      .catch(function (err) {
        if (tab) tab.close();
        toast('Could not build the page: ' + err.message, 'err');
      });
  }

  function buildDeck(forPrint, standalone) {
    return fetch('/__present', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: src.value,
        theme: state.theme,
        size: state.size,
        head: state.head,
        body: state.body,
        template: state.template,
        transition: state.transition,
        title: $('docname').value,
        print: !!forPrint,
        standalone: !!standalone
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('server said ' + r.status);
      return r.json();
    });
  }

  function buildHtmlDoc(forPrint) {
    return fetch('/__present-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: srcHtml.value,
        theme: state.theme,
        title: $('docname').value,
        print: !!forPrint
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('server said ' + r.status);
      return r.json();
    });
  }

  function present() {
    if (isEmpty()) { toast('Nothing to present yet.', 'warn'); return; }
    expectingDeck = true;
    var builder = state.kind === 'html' ? buildHtmlDoc : buildDeck;
    var tab = window.open('about:blank', '_blank');
    builder(false)
      .then(function (data) {
        var url = location.origin + data.path +
          (data.path.indexOf('?') >= 0 ? '&' : '?') + 'ps=' + followSid;
        if (tab) tab.location.replace(url);
        else toast('Allow pop-ups to present in a new tab.', 'warn', 'present here', function () { location.href = url; });
      })
      .catch(function (err) {
        if (tab) tab.close();
        toast('Could not build the page: ' + err.message, 'err');
      });
  }

  /**
   * Applies a theme everywhere at once: the editor chrome, the preview iframe,
   * and the decor attribute the backdrop patterns key off. A remember of false
   * means the picker is only previewing, so arrowing past a theme never
   * overwrites the one the user actually chose.
   */
  function setTheme(next, remember) {
    var id = pickTheme(next);
    state.theme = id;
    document.documentElement.dataset.theme = id;
    document.documentElement.dataset.decor = THEME_BY_ID[id].decor;
    if (remember !== false) lsSet(K.theme, id);
    pushLook();
  }

  /**
   * Type size is orthogonal to the theme: every theme can be set at any of the
   * four, so the two choices compose instead of multiplying into presets.
   */
  function setSize(next, remember) {
    var id = pickSize(next);
    state.size = id;
    if (remember !== false) lsSet(K.size, id);
    pushLook();
    paintSizeSeg();
  }

  function setTemplate(next, remember) {
    var id = pickTemplate(next);
    state.template = id;
    document.documentElement.dataset.template = id;
    if (remember !== false) {
      lsSet(K.template, id);
      scheduleSave();
    }
    pushLook();
    paintTemplateMenu();
  }

  function setTransition(next, remember) {
    var id = pickTransition(next);
    state.transition = id;
    document.documentElement.dataset.transition = id;
    if (remember !== false) {
      lsSet(K.transition, id);
      scheduleSave();
    }
    pushLook();
    paintTemplateMenu();
  }

  /**
   * Heading and body faces are chosen separately, and either can be handed
   * back to the theme by picking nothing. Passing null is what clears it.
   */
  function setFont(slot, id, remember) {
    if (slot !== 'head' && slot !== 'body') return;
    var next = pickFont(id);
    state[slot] = next;
    if (remember !== false) {
      // '' rather than a missing key, so a cleared override survives a reload
      // instead of falling back to whatever the CLI started with.
      lsSet(slot === 'head' ? K.head : K.body, next || '');
    }
    pushLook();
    paintFontMenu();
  }

  function syncHtmlFrameTheme() {
    if (!frameHtml) return;
    try {
      var root = frameHtml.contentDocument && frameHtml.contentDocument.documentElement;
      if (root) {
        root.dataset.theme = state.theme;
        root.dataset.decor = decorOf(state.theme);
        root.dataset.size = state.size;
        root.dataset.template = state.template;
        root.dataset.transition = state.transition;
        if (state.head) root.dataset.head = state.head; else delete root.dataset.head;
        if (state.body) root.dataset.body = state.body; else delete root.dataset.body;
      }
    } catch (e) {}
    try {
      if (frameHtml.contentWindow) {
        frameHtml.contentWindow.postMessage({
          type: 'theme',
          theme: state.theme,
          size: state.size,
          head: state.head,
          body: state.body,
          template: state.template,
          transition: state.transition
        }, '*');
      }
    } catch (e) {}
  }

  /** One message for all four, since the preview applies them to one root. */
  function pushLook() {
    post({
      type: 'theme',
      theme: state.theme,
      size: state.size,
      head: state.head,
      body: state.body,
      template: state.template,
      transition: state.transition
    });
    syncHtmlFrameTheme();
    paintThemeButton();
    paintTemplateMenu();
  }

  function faceLabel(id) {
    return id && FACE_BY_ID[id] ? FACE_BY_ID[id].name : 'theme';
  }

  function buildFontMenu() {
    [['head', 'ff-head'], ['body', 'ff-body']].forEach(function (pair) {
      var slot = pair[0];
      var host = $(pair[1]);
      host.innerHTML = '';

      host.appendChild(fontRow(slot, null, 'theme default', null));

      var lastKind = null;
      FACES.forEach(function (f) {
        if (f.kind !== lastKind) {
          lastKind = f.kind;
          var head = document.createElement('div');
          head.className = 'ff-col__title';
          head.textContent = f.kind;
          host.appendChild(head);
        }
        host.appendChild(fontRow(slot, f.id, f.name, f));
      });
    });
    paintFontMenu();
  }

  function fontRow(slot, id, label, face) {
    var b = document.createElement('button');
    b.className = 'ff-row' + (id ? '' : ' ff-row--auto');
    b.dataset.slot = slot;
    if (id) b.dataset.font = id;

    var name = document.createElement('span');
    name.className = 'ff-row__name';
    name.textContent = label;
    if (face) name.style.fontFamily = face.stack;
    b.appendChild(name);

    return b;
  }

  function paintFontMenu() {
    Array.prototype.forEach.call($('font-menu').querySelectorAll('.ff-row'), function (b) {
      var slot = b.dataset.slot;
      b.classList.toggle('is-on', (b.dataset.font || null) === state[slot]);
    });
    var custom = state.head || state.body;
    $('font-label').textContent = custom
      ? faceLabel(state.head) + ' / ' + faceLabel(state.body)
      : 'font';
    $('btn-font').title = 'Heading ' + faceLabel(state.head) +
      ' · body ' + faceLabel(state.body);
  }

  function paintThemeButton() {
    var t = THEME_BY_ID[state.theme];
    $('theme-label').textContent = t ? t.label : 'theme';
    $('btn-theme').title = t ? t.label + ' — ' + t.blurb : 'Pick a theme';
  }

  function optionRow(kind, item) {
    var b = document.createElement('button');
    b.dataset[kind] = item.id;
    var name = document.createElement('span');
    name.className = 'menu__name';
    name.textContent = item.label;
    var hint = document.createElement('span');
    hint.className = 'menu__hint';
    hint.textContent = item.blurb;
    b.appendChild(name);
    b.appendChild(hint);
    return b;
  }

  function buildTemplateMenu() {
    var templateHost = $('template-list');
    var transitionHost = $('transition-list');
    templateHost.innerHTML = '';
    transitionHost.innerHTML = '';
    TEMPLATES.forEach(function (item) { templateHost.appendChild(optionRow('template', item)); });
    TRANSITIONS.forEach(function (item) { transitionHost.appendChild(optionRow('transition', item)); });
    paintTemplateMenu();
  }

  function paintTemplateMenu() {
    var menu = $('template-menu');
    if (!menu) return;
    Array.prototype.forEach.call(menu.querySelectorAll('[data-template]'), function (b) {
      b.classList.toggle('is-on', b.dataset.template === state.template);
    });
    Array.prototype.forEach.call(menu.querySelectorAll('[data-transition]'), function (b) {
      b.classList.toggle('is-on', b.dataset.transition === state.transition);
    });
    var current = TEMPLATE_BY_ID[state.template];
    $('template-label').textContent = current ? current.label : 'template';
    $('btn-template').title = (current ? current.blurb : 'Composition template') +
      ' · transition ' + state.transition;
  }

  // ── Theme picker ───────────────────────────────────────────────────────
  function buildSizeSeg(hostId, showBlurb) {
    var host = $(hostId);
    host.innerHTML = '';
    SIZES.forEach(function (z) {
      var b = document.createElement('button');
      b.className = 'sz-btn';
      b.dataset.size = z.id;
      b.title = z.label + ' — ' + z.blurb;

      var glyph = document.createElement('span');
      glyph.className = 'sz-btn__glyph';
      glyph.textContent = z.id.toUpperCase();
      // Set at the ratio it stands for, so the row doubles as its own legend.
      glyph.style.fontSize = (10.5 * z.display).toFixed(2) + 'px';
      b.appendChild(glyph);

      b.addEventListener('click', function () { setSize(z.id, true); });
      if (showBlurb) {
        b.addEventListener('mouseenter', function () { showSizeBlurb(z.id); });
        b.addEventListener('mouseleave', function () { showSizeBlurb(state.size); });
      }
      host.appendChild(b);
    });
  }

  function showSizeBlurb(id) {
    var z = SIZE_BY_ID[id];
    $('th-size__blurb').textContent = z ? z.blurb : '';
  }

  function paintSizeSeg() {
    Array.prototype.forEach.call(document.querySelectorAll('.sz-btn'), function (b) {
      b.classList.toggle('is-on', b.dataset.size === state.size);
    });
    showSizeBlurb(state.size);
  }

  /** Steps the size by one, clamped rather than wrapped. */
  function nudgeSize(delta) {
    var at = 0;
    for (var i = 0; i < SIZES.length; i++) if (SIZES[i].id === state.size) at = i;
    var next = Math.max(0, Math.min(SIZES.length - 1, at + delta));
    if (SIZES[next].id !== state.size) setSize(SIZES[next].id, true);
  }

  var themeCards = [];
  var themeSel = 0;
  var themeCommitted = null;

  /** A slide in miniature, painted with the theme's own palette and faces. */
  function themeThumb(t) {
    var c = t.colors;
    var wrap = document.createElement('div');
    wrap.className = 'th-thumb';
    wrap.style.background = c.crust;

    var glow = document.createElement('div');
    glow.className = 'th-thumb__glow';
    glow.style.background = 'radial-gradient(circle, ' + c.accent + '2e 0%, transparent 68%)';
    wrap.appendChild(glow);

    var title = document.createElement('div');
    title.className = 'th-thumb__title';
    title.textContent = 'Aa';
    title.style.fontFamily = t.fonts.display;
    title.style.fontWeight = '700';
    title.style.color = c.accent;
    wrap.appendChild(title);

    var rule = document.createElement('div');
    rule.className = 'th-thumb__rule';
    rule.style.background = 'linear-gradient(90deg, ' + c.accent + ', ' + c.accent2 + ')';
    wrap.appendChild(rule);

    [88, 70, 52].forEach(function (pct, i) {
      var line = document.createElement('div');
      line.className = 'th-thumb__line';
      line.style.width = pct + '%';
      line.style.background = i === 0 ? c.subtext1 : c.overlay1;
      line.style.opacity = i === 0 ? '0.85' : '0.5';
      wrap.appendChild(line);
    });

    var code = document.createElement('div');
    code.className = 'th-thumb__code';
    code.textContent = 'const deck = md';
    code.style.fontFamily = t.fonts.mono;
    code.style.background = c.mantle;
    code.style.color = c.accent3;
    code.style.border = '1px solid ' + c.surface0;
    wrap.appendChild(code);

    return wrap;
  }

  function themeCard(t) {
    var card = document.createElement('button');
    card.className = 'th-card' + (t.id === state.theme ? ' is-current' : '');
    card.dataset.theme = t.id;
    card.appendChild(themeThumb(t));

    var meta = document.createElement('div');
    meta.className = 'th-meta';

    var top = document.createElement('div');
    top.className = 'th-meta__top';
    var name = document.createElement('span');
    name.className = 'th-meta__name';
    name.textContent = t.label;
    var mood = document.createElement('span');
    mood.className = 'th-meta__mood';
    mood.textContent = t.mood;
    top.appendChild(name);
    top.appendChild(mood);

    var blurb = document.createElement('div');
    blurb.className = 'th-meta__blurb';
    blurb.textContent = t.blurb;

    meta.appendChild(top);
    meta.appendChild(blurb);
    card.appendChild(meta);
    return card;
  }

  function buildThemePicker() {
    var host = $('th-list');
    host.innerHTML = '';
    themeCards = [];

    [['dark', 'dark'], ['light', 'light']].forEach(function (pair) {
      var list = THEMES.filter(function (t) { return t.mood === pair[0]; });
      if (!list.length) return;

      var label = document.createElement('div');
      label.className = 'th-group';
      label.textContent = pair[1];
      host.appendChild(label);

      var grid = document.createElement('div');
      grid.className = 'th-grid';
      list.forEach(function (t) {
        var card = themeCard(t);
        // Hovering previews too, so the mouse gets the same instant feedback
        // as the arrow keys.
        card.addEventListener('mouseenter', function () { selectTheme(themeCards.indexOf(card)); });
        card.addEventListener('click', function () { selectTheme(themeCards.indexOf(card)); commitTheme(); });
        grid.appendChild(card);
        themeCards.push(card);
      });
      host.appendChild(grid);
    });
  }

  function selectTheme(i) {
    if (i < 0 || i >= themeCards.length) return;
    themeSel = i;
    themeCards.forEach(function (c, n) { c.classList.toggle('is-sel', n === i); });
    setTheme(themeCards[i].dataset.theme, false);
  }

  function openThemes() {
    closeOverlays(true);
    themeCommitted = state.theme;
    buildSizeSeg('th-size__seg', true);
    paintSizeSeg();
    buildThemePicker();
    var at = 0;
    themeCards.forEach(function (c, n) { if (c.dataset.theme === state.theme) at = n; });
    $('themes').classList.add('is-on');
    selectTheme(at);
    themeCards[themeSel].scrollIntoView({ block: 'nearest' });
    src.blur();
  }

  function commitTheme() {
    themeCommitted = state.theme;
    lsSet(K.theme, state.theme);
    closeThemes();
    var t = THEME_BY_ID[state.theme];
    toast('Theme set to ' + (t ? t.label : state.theme) + '.');
  }

  /** Leaving without choosing puts back whatever was on when the picker opened. */
  function closeThemes(restore) {
    if (restore && themeCommitted && themeCommitted !== state.theme) {
      setTheme(themeCommitted, true);
    }
    $('themes').classList.remove('is-on');
    themeCards.forEach(function (c) { c.classList.remove('is-sel'); });
  }

  function themesOpen() { return $('themes').classList.contains('is-on'); }

  function setMode(next) {
    state.mode = next;
    lsSet(K.mode, next);
    $('seg-single').classList.toggle('is-on', next === 'single');
    $('seg-grid').classList.toggle('is-on', next === 'grid');
    layout();
    pushFrame();
  }

  /** The status-bar counters' HTML-doc analog: chars and caret position. */
  function renderHtmlCounts() {
    elChipSlides.textContent = srcHtml.value.length + ' chars';
    var before = srcHtml.value.slice(0, srcHtml.selectionStart || 0);
    var lines = before.split('\\n');
    elPos.textContent = 'Ln ' + lines.length + ', Col ' + (lines[lines.length - 1].length + 1);
    elWords.textContent = '';
  }

  /** Load a deck or doc into the editor, saving whatever is open first. */
  function openDeck(id, announce) {
    var meta = findDeck(id);
    if (!meta) { toast('That deck is gone.', 'warn'); return; }
    if (state.deckId && id !== state.deckId) saveNow();
    state.deckId = id;
    lsSet(K.current, id);
    setDocKind(meta.kind || 'markdown');
    setTemplate(meta.template || state.template, true);
    setTransition(meta.transition || state.transition, true);
    $('docname').value = meta.name;
    updateDocTitle();
    updateDeckCount();
    elSave.className = '';
    elSave.textContent = '';

    if (state.kind === 'html') {
      srcHtml.value = readDeck(id);
      frameHtml.srcdoc = srcHtml.value;
      renderHtmlCounts();
      if (announce) toast('Opened ' + meta.name);
      srcHtml.focus();
      return;
    }

    src.value = readDeck(id);
    src.setSelectionRange(0, 0);
    src.scrollTop = 0;
    state.index = 0;
    state.overflow = {};
    paint();
    syncScroll();
    updateCaretUi();
    refresh();
    if (announce) toast('Opened ' + meta.name);
    src.focus();
  }

  function noRoom() {
    toast('This browser has no room for another deck. Delete one, or download this one first.', 'err');
  }

  function newDeck() {
    saveNow();
    var id = createDeck(uniqueName('untitled'), '', 'markdown');
    if (!id) { noRoom(); return; }
    openDeck(id);
    toast('New deck. Press ' + CMD + ' K to see what you can add.');
  }

  function duplicateDeck() {
    saveNow();
    var meta = findDeck(state.deckId);
    var id = createDeck(uniqueName((meta ? meta.name : 'deck') + ' copy'), curValue(), state.kind);
    if (!id) { noRoom(); return; }
    openDeck(id);
    toast('Duplicated');
  }

  function deleteDeck(id) {
    var meta = findDeck(id);
    if (!meta) return;
    if (!confirm('Delete "' + meta.name + '"? This cannot be undone, and it is only in this browser.')) return;

    var list = loadIndex().filter(function (d) { return d.id !== id; });
    saveIndex(list);
    lsDel(K.deck + id);

    if (id === state.deckId) {
      if (list.length) {
        openDeck(list[0].id);
      } else {
        var fresh = createDeck('deck', '', 'markdown');
        if (fresh) openDeck(fresh);
      }
    }
    updateDeckCount();
    renderLibrary();
    toast('Deleted ' + meta.name);
  }

  // ── Library panel ──────────────────────────────────────────────────────
  var libRows = [], libSel = 0;

  /** Most recently touched first, the useful order for a switcher. */
  function libraryList() {
    return loadIndex().slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
  }

  function renderLibrary() {
    var list = libraryList();
    libRows = list;
    if (libSel >= list.length) libSel = Math.max(0, list.length - 1);
    var host = $('lib-list');
    host.innerHTML = '';

    list.forEach(function (deck, i) {
      var row = document.createElement('div');
      row.className = 'lib-row' + (i === libSel ? ' is-sel' : '') +
        (deck.id === state.deckId ? ' is-current' : '');

      var main = document.createElement('div');
      main.className = 'lib-row__main';
      var name = document.createElement('div');
      name.className = 'lib-row__name';
      name.textContent = deck.name + (deck.id === state.deckId ? '  (open)' : '');
      var meta = document.createElement('div');
      meta.className = 'lib-row__meta';
      var kind = deck.kind || 'markdown';
      if (kind === 'html') {
        var chars = deck.id === state.deckId ? srcHtml.value.length : deck.chars;
        meta.textContent = 'html' +
          '  \u00b7  ' + Math.max(1, Math.round((chars || 0) / 1024)) + ' KB' +
          '  \u00b7  ' + timeAgo(deck.at || Date.now());
      } else {
        var slides = deck.id === state.deckId ? state.slides.length : deck.slides;
        meta.textContent = (slides || 0) + (slides === 1 ? ' slide' : ' slides') +
          '  \u00b7  ' + Math.max(1, Math.round((deck.chars || 0) / 1024)) + ' KB' +
          '  \u00b7  ' + timeAgo(deck.at || Date.now());
      }
      main.appendChild(name);
      main.appendChild(meta);
      row.appendChild(main);

      var acts = document.createElement('div');
      acts.className = 'lib-row__acts';

      var dupe = document.createElement('button');
      dupe.textContent = 'duplicate';
      dupe.addEventListener('click', function (e) {
        e.stopPropagation();
        if (deck.id === state.deckId) { duplicateDeck(); renderLibrary(); return; }
        var id = createDeck(
          uniqueName(deck.name + ' copy'),
          readDeck(deck.id),
          deck.kind || 'markdown',
          deck.template || state.template,
          deck.transition || state.transition
        );
        if (!id) { noRoom(); return; }
        updateDeckCount();
        renderLibrary();
        toast('Duplicated ' + deck.name);
      });
      acts.appendChild(dupe);

      var del = document.createElement('button');
      del.className = 'danger';
      del.textContent = 'delete';
      del.addEventListener('click', function (e) { e.stopPropagation(); deleteDeck(deck.id); });
      acts.appendChild(del);

      row.appendChild(acts);
      row.addEventListener('mousemove', function () {
        if (libSel === i) return;
        libSel = i;
        var sel = host.querySelector('.lib-row.is-sel');
        if (sel) sel.classList.remove('is-sel');
        row.classList.add('is-sel');
      });
      row.addEventListener('click', function () { closeOverlays(); openDeck(deck.id, true); });
      host.appendChild(row);
    });
  }

  function openLibrary() {
    var list = libraryList();
    libSel = 0;
    for (var i = 0; i < list.length; i++) if (list[i].id === state.deckId) libSel = i;
    renderLibrary();
    $('library').classList.add('is-on');
    updateDocTitle();
  }

  $('lib-new').addEventListener('click', function () { closeOverlays(); showStartScreen(); });

  $('btn-decks').addEventListener('click', openLibrary);

  // ── Start screen ─────────────────────────────────────────────────────
  // Shown on a true first run, and whenever "new" is chosen explicitly from
  // the library — never on an ordinary launch that has a deck to resume.
  var startTemplate = state.template;
  var startTransition = state.transition;

  function paintStartOptions() {
    Array.prototype.forEach.call($('start-template-list').querySelectorAll('[data-template]'), function (b) {
      b.classList.toggle('is-on', b.dataset.template === startTemplate);
    });
    Array.prototype.forEach.call($('start-transition-list').querySelectorAll('[data-transition]'), function (b) {
      b.classList.toggle('is-on', b.dataset.transition === startTransition);
    });
  }

  function buildStartOptions() {
    var templateHost = $('start-template-list');
    var transitionHost = $('start-transition-list');
    templateHost.innerHTML = '';
    transitionHost.innerHTML = '';
    TEMPLATES.forEach(function (item) {
      var b = document.createElement('button');
      b.className = 'start-choice';
      b.dataset.template = item.id;
      b.textContent = item.label;
      b.title = item.blurb;
      b.addEventListener('click', function () { startTemplate = item.id; paintStartOptions(); });
      templateHost.appendChild(b);
    });
    TRANSITIONS.forEach(function (item) {
      var b = document.createElement('button');
      b.className = 'start-choice';
      b.dataset.transition = item.id;
      b.textContent = item.label;
      b.title = item.blurb;
      b.addEventListener('click', function () { startTransition = item.id; paintStartOptions(); });
      transitionHost.appendChild(b);
    });
    paintStartOptions();
  }

  function showStartScreen() {
    startTemplate = state.template;
    startTransition = state.transition;
    paintStartOptions();
    $('start-lib').classList.toggle('is-disabled', !loadIndex().length);
    $('screen-start').classList.add('is-on');
    updateDocTitle();
  }

  function hideStartScreenSilently() {
    $('screen-start').classList.remove('is-on');
    updateDocTitle();
  }

  /** Escape/backdrop close. With nothing open yet, that would be a dead end,
      so the one specified fallback is a blank Markdown deck. */
  function hideStartScreen(fallbackIfEmpty) {
    hideStartScreenSilently();
    if (fallbackIfEmpty && !state.deckId) startNewMarkdown();
  }

  function startNewMarkdown() {
    setTemplate(startTemplate, true);
    setTransition(startTransition, true);
    var id = createDeck(uniqueName('untitled'), D.welcome, 'markdown', startTemplate, startTransition);
    hideStartScreenSilently();
    if (!id) {
      // Storage refuses even a first write: use the deck unsaved rather than
      // leaving the editor with nothing open.
      state.deckId = newDeckId();
      setDocKind('markdown');
      src.value = D.welcome;
      $('docname').value = 'deck';
      src.setSelectionRange(0, 0);
      src.scrollTop = 0;
      paint();
      syncScroll();
      updateCaretUi();
      refresh();
      updateDeckCount();
      elSave.className = 'err';
      elSave.textContent = 'this browser blocks local storage';
      setTimeout(function () {
        toast('This browser will not let the editor save anything. Download your deck to keep it.', 'err', 'download', download);
      }, 700);
      src.focus();
      return;
    }
    openDeck(id);
    setTimeout(function () {
      toast('This deck is yours to overwrite. Press ' + CMD + ' K to see every layout and style.', null, 'open the guide', function () { runAction('guide'); });
    }, 900);
  }

  function startOpenLibrary() {
    if (!loadIndex().length) return;
    hideStartScreenSilently();
    openLibrary();
  }

  /** Fetches a public URL server-side (sidesteps CORS) and opens it as a new Markdown deck or HTML doc. */
  function loadHtmlUrl() {
    var input = $('start-html-url');
    var raw = input.value.trim();
    if (!raw) { input.focus(); return; }
    var url;
    try { url = new URL(raw); } catch (err) { toast('Not a valid URL.', 'err'); return; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      toast('URL must be http or https.', 'err');
      return;
    }
    var btn = $('start-html-url-go');
    btn.disabled = true;
    fetch('/__fetch-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.toString() }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.detail || body.error || 'could not load that URL');
          return body;
        });
      })
      .then(function (body) {
        saveNow();
        var name = uniqueName(body.title || url.hostname);
        var kind = body.kind || (body.markdown ? 'markdown' : 'html');
        var content = kind === 'markdown' ? (body.markdown || body.content || '') : (body.html || body.content || '');
        var id = createDeck(
          name,
          content,
          kind,
          kind === 'markdown' ? startTemplate : state.template,
          kind === 'markdown' ? startTransition : state.transition
        );
        if (!id) { noRoom(); return; }
        input.value = '';
        hideStartScreenSilently();
        openDeck(id);
        toast('Loaded ' + (kind === 'markdown' ? 'Markdown deck' : 'HTML doc') + ' from ' + url.hostname);
      })
      .catch(function (err) { toast('Could not load URL: ' + err.message, 'err'); })
      .then(function () { btn.disabled = false; });
  }

  $('start-md-blank').addEventListener('click', startNewMarkdown);
  $('start-md-upload').addEventListener('click', function () { $('file-any').click(); });
  $('start-html-upload').addEventListener('click', function () { $('file-any').click(); });
  $('start-html-url-go').addEventListener('click', loadHtmlUrl);
  $('start-html-url').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); loadHtmlUrl(); }
  });
  $('start-lib').addEventListener('click', startOpenLibrary);
  $('screen-start').querySelector('.backdrop').addEventListener('click', function () { hideStartScreen(true); });

  function runAction(name) {
    if (name === 'present') present();
    else if (name === 'download') download();
    else if (name === 'pdf') exportPdf();
    else if (name === 'html') exportHtml();
    else if (name === 'open') $('file-any').click();
    else if (name === 'grid') setMode(state.mode === 'grid' ? 'single' : 'grid');
    else if (name === 'theme') openThemes();
    else if (name === 'guide') { guide.classList.add('is-on'); }
    else if (name === 'palette') openPalette();
    else if (name === 'decks') openLibrary();
    else if (name === 'new') newDeck();
    else if (name === 'duplicate') duplicateDeck();
    else if (name === 'delete') deleteDeck(state.deckId);
  }

  // ── Wiring ─────────────────────────────────────────────────────────────
  var parseTimer = null;

  function onInput() {
    // Typing takes the editor back from the deck.
    if (following) { following = false; followChipEl.classList.add('hidden'); }
    paint();
    syncScroll();
    updateCaretUi();
    scheduleSave();
    if (parseTimer) clearTimeout(parseTimer);
    parseTimer = setTimeout(refresh, 140);
  }

  src.addEventListener('input', onInput);
  src.addEventListener('scroll', syncScroll);
  src.addEventListener('click', updateCaretUi);
  src.addEventListener('keyup', function (e) {
    if (e.key.indexOf('Arrow') === 0 || e.key === 'Home' || e.key === 'End' ||
        e.key === 'PageUp' || e.key === 'PageDown') updateCaretUi();
  });

  src.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      typeText('  ');
      onInput();
    }
  });

  // ── HTML doc source ──────────────────────────────────────────────────
  var htmlPreviewTimer = null;

  function onHtmlInput() {
    scheduleSave();
    renderHtmlCounts();
    if (htmlPreviewTimer) clearTimeout(htmlPreviewTimer);
    htmlPreviewTimer = setTimeout(function () { frameHtml.srcdoc = srcHtml.value; }, 140);
  }

  srcHtml.addEventListener('input', onHtmlInput);
  frameHtml.addEventListener('load', syncHtmlFrameTheme);
  srcHtml.addEventListener('click', renderHtmlCounts);
  srcHtml.addEventListener('keyup', function (e) {
    if (e.key.indexOf('Arrow') === 0 || e.key === 'Home' || e.key === 'End' ||
        e.key === 'PageUp' || e.key === 'PageDown') renderHtmlCounts();
  });
  srcHtml.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    srcHtml.focus();
    var inserted = false;
    try { inserted = document.execCommand('insertText', false, '  '); } catch (err) {}
    if (!inserted) {
      var s = srcHtml.selectionStart, e2 = srcHtml.selectionEnd;
      srcHtml.setRangeText('  ', s, e2, 'end');
    }
    onHtmlInput();
  });

  // Drag and drop a .md file onto the editor to open it.
  ['dragenter', 'dragover'].forEach(function (type) {
    paneEdit.addEventListener(type, function (e) {
      if (!e.dataTransfer) return;
      e.preventDefault();
      paneEdit.classList.add('is-dropping');
    });
  });

  ['dragleave', 'dragend'].forEach(function (type) {
    paneEdit.addEventListener(type, function (e) {
      if (e.target === paneEdit || type === 'dragend') paneEdit.classList.remove('is-dropping');
    });
  });

  paneEdit.addEventListener('drop', function (e) {
    e.preventDefault();
    paneEdit.classList.remove('is-dropping');
    var files = e.dataTransfer ? e.dataTransfer.files : null;
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (/\\.(md|markdown|txt)$/i.test(f.name)) loadMarkdownFile(f);
      else if (/\\.html?$/i.test(f.name)) loadHtmlFile(f);
      else toast('Skipped ' + f.name + '. Drop a Markdown or HTML file to open it.', 'warn');
    }
  });

  /** An opened file lands as a new deck, so nothing in the library is lost. */
  function loadMarkdownFile(file, chosenTemplate, chosenTransition) {
    var fr = new FileReader();
    fr.onload = function () {
      saveNow();
      var markdown = String(fr.result).replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
      var name = uniqueName(file.name.replace(/\\.(md|markdown|txt)$/i, '') || 'untitled');
      var id = createDeck(
        name,
        markdown,
        'markdown',
        chosenTemplate || state.template,
        chosenTransition || state.transition
      );
      if (!id) { noRoom(); return; }
      hideStartScreenSilently();
      openDeck(id);
      toast('Loaded ' + file.name + ' as a new deck');
    };
    fr.onerror = function () { toast('Could not read ' + file.name, 'err'); };
    fr.readAsText(file);
  }

  /** An uploaded HTML doc lands as a new library entry, same as a .md file. */
  function loadHtmlFile(file) {
    var fr = new FileReader();
    fr.onload = function () {
      saveNow();
      var html = String(fr.result);
      var name = uniqueName(file.name.replace(/\\.html?$/i, '') || 'untitled');
      var id = createDeck(name, html, 'html');
      if (!id) { noRoom(); return; }
      hideStartScreenSilently();
      openDeck(id);
      toast('Loaded ' + file.name + ' as a new HTML doc');
    };
    fr.onerror = function () { toast('Could not read ' + file.name, 'err'); };
    fr.readAsText(file);
  }

  $('file-any').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (f) {
      var fromStart = $('screen-start').classList.contains('is-on');
      if (/\\.(md|markdown|txt)$/i.test(f.name)) {
        loadMarkdownFile(
          f,
          fromStart ? startTemplate : state.template,
          fromStart ? startTransition : state.transition
        );
      }
      else if (/\\.html?$/i.test(f.name)) loadHtmlFile(f);
      else toast('Unrecognized file type.', 'warn');
    }
    e.target.value = '';
  });

  $('docname').addEventListener('input', function () {
    updateDocTitle();
    scheduleSave();
  });

  $('btn-guide').addEventListener('click', function () { runAction('guide'); });
  $('btn-palette').addEventListener('click', openPalette);
  $('btn-new').addEventListener('click', function () { closeOverlays(); showStartScreen(); });
  // ── Dropdown menus ─────────────────────────────────────────────────────
  // Both the export and font popovers behave the same way, so one open menu is
  // tracked here rather than each growing its own copy of this.
  var openMenu = null;

  function menuIsOpen() { return !!openMenu; }

  function closeMenu() {
    if (!openMenu) return;
    openMenu.classList.remove('is-open');
    var btn = openMenu.querySelector('.btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    openMenu = null;
  }

  function toggleMenu(el) {
    var wasOpen = openMenu === el;
    closeMenu();
    if (wasOpen) return;
    openMenu = el;
    el.classList.add('is-open');
    var btn = el.querySelector('.btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    var first = el.querySelector('.menu__pop button');
    if (first) first.focus();
  }

  /** Wires one dropdown: its trigger, its arrow keys, and its own Escape. */
  function bindMenu(triggerId, popId, onPick, pickSelector) {
    var wrap = $(triggerId).parentNode;
    var pop = $(popId);

    $(triggerId).addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu(wrap);
    });

    pop.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest(pickSelector) : null;
      if (!btn) return;
      onPick(btn);
    });

    pop.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(pop.querySelectorAll('button'));
      var at = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var next = (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next].focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        src.focus();
      }
    });

    return wrap;
  }

  bindMenu('btn-export', 'export-menu', function (btn) {
    closeMenu();
    runExport(btn.dataset.export);
  }, 'button[data-export]');

  // The font menu stays open across picks: choosing a heading face and then a
  // body face is one decision, and closing between them would fight the user.
  bindMenu('btn-font', 'font-menu', function (btn) {
    setFont(btn.dataset.slot, btn.dataset.font || null, true);
  }, 'button[data-slot]');

  // Template and transition compose, so the menu remains open while either
  // choice is changed and the existing Markdown reflows immediately.
  bindMenu('btn-template', 'template-menu', function (btn) {
    if (btn.dataset.template) setTemplate(btn.dataset.template, true);
    if (btn.dataset.transition) setTransition(btn.dataset.transition, true);
  }, 'button[data-template], button[data-transition]');

  document.addEventListener('click', function (e) {
    if (openMenu && !openMenu.contains(e.target)) closeMenu();
  });

  function runExport(kind) {
    if (kind === 'md') download();
    else if (kind === 'pdf') exportPdf();
    else if (kind === 'html') exportHtml();
  }
  $('btn-theme').addEventListener('click', function () { runAction('theme'); });

  // The picker owns the arrow keys while it is up, and Enter keeps the preview.
  document.addEventListener('keydown', function (e) {
    if (!themesOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    var cols = 0;
    if (themeCards.length) {
      var grid = themeCards[themeSel].parentNode;
      cols = Math.max(1, Math.round(grid.clientWidth / themeCards[themeSel].offsetWidth));
    }
    var step = 0;
    if (e.key === 'ArrowRight') step = 1;
    else if (e.key === 'ArrowLeft') step = -1;
    else if (e.key === 'ArrowDown') step = cols;
    else if (e.key === 'ArrowUp') step = -cols;
    else if (e.key === 'Enter') { e.preventDefault(); commitTheme(); return; }
    else if (e.key === 'Escape') { e.preventDefault(); closeOverlays(); return; }
    else if (e.key === '[' || e.key === '-') { e.preventDefault(); nudgeSize(-1); return; }
    else if (e.key === ']' || e.key === '+' || e.key === '=') { e.preventDefault(); nudgeSize(1); return; }
    else return;
    e.preventDefault();
    var next = (themeSel + step + themeCards.length) % themeCards.length;
    selectTheme(next);
    themeCards[next].scrollIntoView({ block: 'nearest' });
  }, true);
  $('btn-present').addEventListener('click', present);
  $('btn-prev').addEventListener('click', function () { setIndex(state.index - 1, false); });
  $('btn-next').addEventListener('click', function () { setIndex(state.index + 1, false); });
  $('seg-single').addEventListener('click', function () { setMode('single'); });
  $('seg-grid').addEventListener('click', function () { setMode('grid'); });

  $('pane-prev').addEventListener('mousedown', function () {
    if (document.activeElement && isEditingText()) {
      document.activeElement.blur();
    }
  });

  // ── Global keys ────────────────────────────────────────────────────────
  function isEditingText() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    return tag === 'textarea' || tag === 'input' || el.isContentEditable;
  }

  document.addEventListener('keydown', function (e) {
    var mod = e.metaKey || e.ctrlKey;

    if (themesOpen()) return;

    if ($('screen-start').classList.contains('is-on')) {
      if (e.key === 'Escape') { e.preventDefault(); hideStartScreen(true); }
      return;
    }

    if ($('library').classList.contains('is-on') && !mod) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (libRows.length) {
          libSel = (libSel + (e.key === 'ArrowDown' ? 1 : -1) + libRows.length) % libRows.length;
          renderLibrary();
          var sel = $('lib-list').querySelector('.lib-row.is-sel');
          if (sel) sel.scrollIntoView({ block: 'nearest' });
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (libRows[libSel]) { closeOverlays(); openDeck(libRows[libSel].id, true); }
        return;
      }
    }

    if (e.key === 'Escape') {
      if (menuIsOpen()) { e.preventDefault(); closeMenu(); src.focus(); return; }
      if (palette.classList.contains('is-on') || guide.classList.contains('is-on') ||
          $('library').classList.contains('is-on')) {
        e.preventDefault();
        closeOverlays();
      }
      return;
    }

    if (mod) {
      var key = e.key.toLowerCase();
      var md = state.kind === 'markdown';

      if (key === 'k' && !e.shiftKey && md) { e.preventDefault(); openPalette(); }
      else if (key === 'o') { e.preventDefault(); openLibrary(); }
      else if (key === '/' && md) { e.preventDefault(); runAction('guide'); }
      else if (key === 'p' || (key === 's' && e.shiftKey)) { e.preventDefault(); exportPdf(); }
      else if (key === 's') { e.preventDefault(); saveNow(); download(); }
      else if (key === 'enter') { e.preventDefault(); present(); }
      else if (key === 'd' && md) { e.preventDefault(); insertSnippet(bySnippetId['slide-break']); }
      else if (key === 'b' && md) { e.preventDefault(); insertSnippet(bySnippetId.bold); }
      else if (key === 'i' && md) { e.preventDefault(); insertSnippet(bySnippetId.italic); }
      else if (key === 'e' && md) { e.preventDefault(); insertSnippet(bySnippetId['inline-code']); }
      else if (key === 'g' && md) { e.preventDefault(); runAction('grid'); }
      else if (key === 'l' && e.shiftKey) { e.preventDefault(); runAction('theme'); }
      return;
    }

    if (palette.classList.contains('is-on') || guide.classList.contains('is-on') ||
        $('library').classList.contains('is-on') || menuIsOpen()) {
      return;
    }

    // Alt + arrows/page keys hops between slides (works anywhere, including inside the editor).
    if (e.altKey) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setIndex(state.index + 1, false);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setIndex(state.index - 1, false);
      }
      return;
    }

    // Direct arrow keys / page keys when not typing into a text field.
    if (!isEditingText()) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setIndex(state.index + 1, false);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        setIndex(state.index - 1, false);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIndex(0, false);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIndex(state.slides.length - 1, false);
      }
    }
  });

  // ── Split pane ─────────────────────────────────────────────────────────
  var splitPct = parseFloat(lsGet(K.split, '48'));
  if (!(splitPct > 15 && splitPct < 85)) splitPct = 48;

  function applySplit() {
    paneEdit.style.flex = '0 0 ' + splitPct + '%';
    layout();
  }

  divider.addEventListener('mousedown', function (e) {
    e.preventDefault();
    divider.classList.add('is-dragging');
    document.body.style.cursor = 'col-resize';

    function move(ev) {
      var box = $('panes').getBoundingClientRect();
      var pct = ((ev.clientX - box.left) / box.width) * 100;
      splitPct = Math.max(18, Math.min(82, pct));
      applySplit();
    }

    function up() {
      divider.classList.remove('is-dragging');
      document.body.style.cursor = '';
      lsSet(K.split, String(Math.round(splitPct)));
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  divider.addEventListener('dblclick', function () {
    splitPct = 48;
    lsSet(K.split, '48');
    applySplit();
  });

  window.addEventListener('resize', layout);

  // ── Frame messages ─────────────────────────────────────────────────────
  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.type === 'ready') {
      // pushLook and pushFrame between them send the whole of the current
      // state, so a message dropped while the frame was loading is already
      // superseded by the time it is up.
      state.frameReady = true;
      pushLook();
      pushFrame();
    } else if (m.type === 'goto') {
      setMode('single');
      setIndex(m.index, true);
    } else if (m.type === 'nav') {
      setIndex(state.index + m.delta, false);
    } else if (m.type === 'index-select') {
      setIndex(m.index, false);
    } else if (m.type === 'action') {
      runAction(m.action);
    } else if (m.type === 'overflow') {
      var had = !!state.overflow[m.index];
      state.overflow[m.index] = m.overflow;
      renderCounts();
      if (had !== m.overflow) evalNudges();
    }
  });

  // ── Boot ───────────────────────────────────────────────────────────────
  state.bootAt = Date.now();

  // Carry over a deck saved before the library existed.
  var legacy = lsGet(K.oldDoc, null);
  if (legacy !== null && !loadIndex().length) {
    createDeck(lsGet(K.oldName, 'deck'), legacy, 'markdown');
    lsDel(K.oldDoc);
    lsDel(K.oldName);
  }

  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.decor = THEME_BY_ID[state.theme].decor;
  document.documentElement.dataset.template = state.template;
  document.documentElement.dataset.transition = state.transition;
  buildSizeSeg('topbar-size', false);
  buildFontMenu();
  buildTemplateMenu();
  buildStartOptions();
  paintSizeSeg();
  paintThemeButton();
  $('seg-single').classList.toggle('is-on', state.mode === 'single');
  $('seg-grid').classList.toggle('is-on', state.mode === 'grid');

  Array.prototype.forEach.call(document.querySelectorAll('.btn kbd, .menu__pop kbd'), function (el) {
    el.textContent = el.textContent.replace('Cmd', CMD);
  });

  buildGuide();
  startTips();
  applySplit();
  paintExportMenu();
  updateDeckCount();

  // A deck to resume opens with zero clicks, exactly as before. Only a true
  // first run — nothing in the library at all — shows the start screen.
  var index = loadIndex();
  if (index.length === 0) {
    showStartScreen();
  } else {
    var wanted = lsGet(K.current, null);
    openDeck(findDeck(wanted) ? wanted : index[0].id);
  }
})();
</script>
</body>
</html>`;
}
