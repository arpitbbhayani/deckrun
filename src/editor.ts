import { RESET_CSS, themeSwitchableCss, type ThemeName } from "./generate.js";
import {
  SNIPPETS,
  SNIPPET_GROUPS,
  TIPS,
  WELCOME_DECK,
} from "./editor-content.js";
import { PREVIEW_WIDTH, PREVIEW_HEIGHT } from "./preview.js";

function bootstrapJson(theme: ThemeName): string {
  const payload = {
    theme,
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

/** The Markdown editor served when `present-md` is launched without a file. */
export function generateEditorHtml(theme: ThemeName = "dark"): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>present-md editor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&display=swap" rel="stylesheet">
  <style>
${RESET_CSS}

${themeSwitchableCss()}

html, body {
  height: 100%;
  overflow: hidden;
  background: var(--crust);
  color: var(--text);
  font-family: 'IBM Plex Mono', 'Cascadia Code', 'Fira Code', monospace;
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
::selection { background: var(--surface1); }

::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--surface1); border-radius: 5px; border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: var(--surface2); background-clip: content-box; }

#app { display: flex; flex-direction: column; height: 100%; }

/* ── Top bar ──────────────────────────────────────────────────────────── */
#topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 46px;
  flex: 0 0 46px;
  padding: 0 12px;
  background: var(--mantle);
  border-bottom: 1px solid var(--surface0);
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
  background: var(--mauve);
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
#docname:focus { outline: none; border-color: var(--mauve); color: var(--text); }

.chip {
  font-size: 11px;
  color: var(--overlay1);
  border: 1px solid var(--surface0);
  border-radius: 999px;
  padding: 3px 9px;
  white-space: nowrap;
}

#save-state { font-size: 11px; color: var(--overlay0); white-space: nowrap; }
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

.btn:hover { border-color: var(--mauve); color: var(--text); background: var(--mauve-alpha); }
.btn kbd { font: inherit; font-size: 10px; color: var(--overlay0); }
.btn--icon { padding: 0 9px; }

.btn--primary {
  color: var(--crust);
  font-weight: 600;
  border-color: transparent;
  background: linear-gradient(135deg, var(--mauve), var(--blue));
}

/* The gradient has to be restated: .btn:hover is a class plus a pseudo-class,
   so its faint tint outranks the plain .btn--primary background and the button
   would drop to near-black text on a barely-there surface. */
.btn--primary:hover {
  background: linear-gradient(135deg, var(--mauve), var(--blue));
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
#divider:hover::after, #divider.is-dragging::after { background: var(--mauve); }

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
  padding: 18px 20px 45vh 20px;
  font-family: 'IBM Plex Mono', 'Cascadia Code', 'Fira Code', monospace;
  font-size: 13.5px;
  font-weight: 400;
  line-height: 1.75;
  letter-spacing: 0;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  tab-size: 2;
  border: 0;
  background: transparent;
}

#hl { z-index: 1; overflow: hidden; pointer-events: none; color: var(--subtext0); counter-reset: sld 1; }
#measure { z-index: 0; visibility: hidden; overflow: hidden; }

#src {
  z-index: 2;
  overflow-y: auto;
  overflow-x: hidden;
  color: transparent;
  caret-color: var(--mauve);
  resize: none;
  outline: none;
}

#src::selection { background: var(--surface1); color: transparent; }

/* Markdown tokens */
.t-h1 { color: var(--mauve); font-weight: 700; }
.t-h2 { color: var(--blue); font-weight: 600; }
.t-h3 { color: var(--sky); font-weight: 500; }
.t-h4 { color: var(--teal); }
.t-strong { color: var(--peach); font-weight: 600; }
.t-em { color: var(--subtext1); font-style: italic; }
.t-code { color: var(--green); }
.t-fence { color: var(--overlay1); }
.t-codeline { color: var(--subtext1); }
.t-quote { color: var(--subtext0); font-style: italic; }
.t-marker { color: var(--mauve); }
.t-link { color: var(--blue); }
.t-url { color: var(--overlay0); }
.t-img { color: var(--sapphire); }
.t-dir { color: var(--yellow); font-weight: 600; }
.t-note { color: var(--overlay0); font-style: italic; }
.t-html { color: var(--pink); }
.t-table { color: var(--lavender); }

.t-sep { position: relative; color: var(--mauve); counter-increment: sld; }
.t-sep::after {
  content: 'slide ' counter(sld);
  position: absolute;
  left: calc(100% + 14px);
  top: 0;
  white-space: nowrap;
  color: var(--overlay0);
  font-size: 11px;
}

/* ── Drop target ──────────────────────────────────────────────────────── */
#pane-edit.is-dropping::after {
  content: 'drop a Markdown file to open it';
  position: absolute;
  inset: 10px;
  z-index: 9;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--mauve);
  border-radius: 12px;
  background: var(--mauve-alpha);
  color: var(--mauve);
  letter-spacing: 0.05em;
  pointer-events: none;
}

/* ── Contextual nudge ─────────────────────────────────────────────────── */
#nudge {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  z-index: 7;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 13px;
  background: var(--base);
  border: 1px solid var(--surface1);
  border-left: 2px solid var(--mauve);
  border-radius: 9px;
  box-shadow: 0 12px 34px rgba(0,0,0,0.35);
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
  transition: opacity 0.22s ease, transform 0.22s ease;
}

#nudge.is-on { opacity: 1; transform: translateY(0); pointer-events: all; }
#nudge__body { flex: 1 1 auto; }
#nudge__label {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mauve);
  margin-bottom: 4px;
}
#nudge__text { font-size: 12.5px; color: var(--subtext1); line-height: 1.6; }
#nudge__text code {
  font: inherit;
  color: var(--green);
  background: var(--surface0-alpha);
  border-radius: 4px;
  padding: 0.05em 0.3em;
}
#nudge__acts { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.nudge-btn {
  font-size: 11px;
  color: var(--subtext0);
  border: 1px solid var(--surface1);
  border-radius: 6px;
  padding: 4px 8px;
}
.nudge-btn:hover { border-color: var(--mauve); color: var(--text); }
.nudge-btn--x { padding: 4px 7px; color: var(--overlay0); }

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

/* ── Dropdown menu ────────────────────────────────────────────────────── */
.menu { position: relative; display: inline-flex; }
.menu__chev { font-size: 9px; color: var(--overlay0); }
.menu.is-open > .btn { border-color: var(--mauve); color: var(--text); background: var(--mauve-alpha); }

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
  box-shadow: 0 18px 46px rgba(0,0,0,0.45);
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
  background: var(--surface0-alpha);
  border-left-color: var(--mauve);
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
  box-shadow: 0 20px 60px rgba(0,0,0,0.45);
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

#tipbar { flex: 1 1 auto; display: flex; align-items: center; gap: 8px; min-width: 0; }
#tipbar .tag {
  flex: 0 0 auto;
  color: var(--mauve);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 9px;
}
#tip-text { color: var(--subtext0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#tipbar button { color: var(--overlay0); padding: 0 3px; }
#tipbar button:hover { color: var(--text); }

/* ── Command palette ──────────────────────────────────────────────────── */
#palette, #guide, #library { position: fixed; inset: 0; z-index: 40; display: none; }
#palette.is-on, #guide.is-on, #library.is-on { display: block; }
.backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(2px); }

#pal-box, #lib-box {
  position: relative;
  width: min(690px, 92vw);
  margin: 9vh auto 0;
  background: var(--mantle);
  border: 1px solid var(--surface1);
  border-radius: 14px;
  box-shadow: 0 30px 90px rgba(0,0,0,0.55);
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
#lib-head button:hover { border-color: var(--mauve); color: var(--text); background: var(--mauve-alpha); }

.lib-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  border-left: 2px solid transparent;
  cursor: pointer;
}

.lib-row.is-sel { background: var(--surface0-alpha); border-left-color: var(--mauve); }
.lib-row.is-current .lib-row__name { color: var(--blue); }
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
.lib-row__acts button:hover { border-color: var(--mauve); color: var(--text); }
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

.pal-row.is-sel { background: var(--surface0-alpha); border-left-color: var(--mauve); }
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
  background: var(--surface0-alpha);
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
  box-shadow: -22px 0 70px rgba(0,0,0,0.45);
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
  color: var(--mauve);
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
.gcard__ins:hover { border-color: var(--mauve); color: var(--text); background: var(--mauve-alpha); }

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
  box-shadow: 0 12px 34px rgba(0,0,0,0.4);
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
.toast button:hover { border-color: var(--mauve); color: var(--text); }

@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* ── Narrow screens ───────────────────────────────────────────────────── */
@media (max-width: 900px) {
  #panes { flex-direction: column; }
  #pane-edit { flex: 1 1 50%; width: auto !important; min-height: 0; }
  #pane-prev { flex: 1 1 50%; min-height: 0; }
  #divider { display: none; }
  #topbar { overflow-x: auto; }
}
  </style>
</head>
<body>
<div id="app">
  <header id="topbar">
    <span id="brand">present-md<span class="caret"></span></span>
    <input id="docname" value="deck" spellcheck="false" title="Deck name, also the download filename">
    <button class="btn" id="btn-decks" title="Switch between the decks in this browser">decks <span id="deck-count">1</span> <kbd>Cmd O</kbd></button>
    <span class="chip" id="chip-slides">0 slides</span>
    <span id="save-state">loading</span>
    <span class="spacer"></span>
    <button class="btn" id="btn-guide" title="Everything you can put on a slide">guide <kbd>Cmd /</kbd></button>
    <button class="btn" id="btn-palette" title="Insert anything">insert <kbd>Cmd K</kbd></button>
    <button class="btn" id="btn-open" title="Load a local .md file in as a new deck">import</button>
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
    <button class="btn btn--icon" id="btn-theme" title="Toggle light / dark">theme</button>
    <button class="btn btn--primary" id="btn-present" title="Open the real deck in a new tab">present <kbd>Cmd Enter</kbd></button>
  </header>

  <main id="panes">
    <section id="pane-edit">
      <div id="edit-wrap">
        <pre id="hl" aria-hidden="true"></pre>
        <pre id="measure" aria-hidden="true"></pre>
        <textarea id="src" spellcheck="false" autocomplete="off" autocapitalize="off" wrap="soft" aria-label="Markdown source"></textarea>
      </div>
      <div id="nudge">
        <div id="nudge__body">
          <div id="nudge__label">try this</div>
          <div id="nudge__text"></div>
        </div>
        <div id="nudge__acts">
          <button class="nudge-btn" id="nudge-do">insert</button>
          <button class="nudge-btn nudge-btn--x" id="nudge-x" title="Dismiss">&times;</button>
        </div>
      </div>
    </section>

    <div id="divider" title="Drag to resize, double-click to reset"></div>

    <section id="pane-prev">
      <div id="prev-head">
        <button class="step" id="btn-prev" title="Previous slide">&#8592;</button>
        <span id="prev-count">slide 0 / 0</span>
        <button class="step" id="btn-next" title="Next slide">&#8594;</button>
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
    </section>
  </main>

  <footer id="statusbar">
    <span id="pos">Ln 1, Col 1</span>
    <span id="words">0 words</span>
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

<div id="toasts"></div>
<input type="file" id="file-md" accept=".md,.markdown,text/markdown,text/plain" hidden>

<script type="application/json" id="bootstrap">${bootstrapJson(theme)}</script>
<script>
(function () {
  'use strict';

  var D = JSON.parse(document.getElementById('bootstrap').textContent);
  var MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var CMD = MAC ? 'Cmd' : 'Ctrl';

  var K = {
    index:   'presentmd.decks.v1',
    deck:    'presentmd.deck.',
    current: 'presentmd.current.v1',
    theme:   'presentmd.theme.v1',
    split:   'presentmd.split.v1',
    mode:    'presentmd.mode.v1',
    nudge:   'presentmd.nudges.v1',
    // Superseded by the deck library, read once to migrate.
    oldDoc:  'presentmd.doc.v1',
    oldName: 'presentmd.name.v1'
  };

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
  function createDeck(name, markdown) {
    var id = newDeckId();
    if (!lsSet(K.deck + id, markdown)) return null;
    var list = loadIndex();
    list.unshift({ id: id, name: name || 'untitled', slides: 0, chars: markdown.length, at: Date.now() });
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

  /** One deck's metadata is refreshed from the editor on every save. */
  function touchCurrent() {
    var list = loadIndex();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === state.deckId) {
        list[i].name = $('docname').value.trim() || 'untitled';
        list[i].slides = state.slides.length;
        list[i].chars = src.value.length;
        list[i].at = Date.now();
        break;
      }
    }
    return saveIndex(list);
  }

  function updateDeckCount() {
    $('deck-count').textContent = String(loadIndex().length);
  }

  // ── Elements ───────────────────────────────────────────────────────────
  var $ = function (id) { return document.getElementById(id); };
  var src = $('src'), hl = $('hl'), measure = $('measure');
  var frame = $('frame'), frameBox = $('frame-box'), stage = $('stage');
  var paneEdit = $('pane-edit'), panePrev = $('pane-prev'), divider = $('divider');
  var elChipSlides = $('chip-slides'), elSave = $('save-state'), elPos = $('pos'), elWords = $('words');
  var elCount = $('prev-count'), elScale = $('prev-scale');
  var elNotes = $('notes'), elNotesText = $('notes__text');
  var elNudge = $('nudge'), elNudgeText = $('nudge__text'), elNudgeDo = $('nudge-do'), elNudgeX = $('nudge-x');
  var palette = $('palette'), palInput = $('pal-input'), palList = $('pal-list');
  var guide = $('guide'), guideBody = $('guide-body');

  // ── State ──────────────────────────────────────────────────────────────
  var state = {
    deckId: null,
    slides: [],
    notes: [],
    index: 0,
    mode: lsGet(K.mode, 'single') === 'grid' ? 'grid' : 'single',
    theme: lsGet(K.theme, D.theme) === 'light' ? 'light' : 'dark',
    frameReady: false,
    pending: null,
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
      if (/^\\s*&lt;!--/.test(esc(line)) || /^\\s*<!--/.test(line)) {
        out.push('<span class="t-note">' + esc(line) + '</span>');
        continue;
      }

      var head = line.match(/^(#{1,6})\\s/);
      if (head) {
        var lvl = Math.min(head[1].length, 4);
        out.push('<span class="t-h' + lvl + '">' + inlineTokens(line) + '</span>');
        continue;
      }
      if (/^\\s*&gt;/.test(esc(line))) {
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
  function post(msg) {
    if (!state.frameReady) { state.pending = msg; return; }
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
    renderCounts();
  }

  function updateCaretUi() {
    var before = src.value.slice(0, src.selectionStart);
    var lines = before.split('\\n');
    elPos.textContent = 'Ln ' + lines.length + ', Col ' + (lines[lines.length - 1].length + 1);
    var i = caretSlide();
    if (i !== state.index) {
      state.index = i;
      post({ type: 'index', index: i });
      renderCounts();
    }
  }

  // ── Parse round-trip: the server owns the Markdown, so what you see here
  //    is byte-for-byte what present-md file.md renders. ───────────────
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

  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function saveNow() {
    var ok = lsSet(K.deck + state.deckId, src.value) && touchCurrent();
    if (ok) {
      elSave.className = 'ok';
      elSave.textContent = 'saved ' + stamp();
    } else {
      elSave.className = 'err';
      elSave.textContent = 'not saved: storage full';
      toast('This browser is out of room. Download this deck, or delete one you no longer need.', 'err', 'download', download);
    }
  }

  function scheduleSave() {
    elSave.className = 'warn';
    elSave.textContent = 'saving';
    if (saveTimer) clearTimeout(saveTimer);
    // Writing a megabyte of Markdown costs real time. Back off on big decks.
    saveTimer = setTimeout(saveNow, src.value.length > 1024 * 1024 ? 1500 : 500);
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
          ? 'Numbers land harder in a table than in bullets. Zebra rows and a mauve header come for free.'
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

  function evalNudges() {
    if (Date.now() - state.bootAt < 5000) return;
    var ctx = docContext();
    for (var i = 0; i < NUDGE_RULES.length; i++) {
      var rule = NUDGE_RULES[i];
      if (state.dismissed[rule.id]) continue;
      var message = rule.test(ctx);
      if (!message) continue;
      showNudge(rule, message);
      return;
    }
    hideNudge();
  }

  function showNudge(rule, message) {
    if (state.activeNudge && state.activeNudge.rule.id === rule.id &&
        state.activeNudge.message === message) return;
    if (state.activeNudge && Date.now() - state.nudgeShownAt < 2500) return;
    state.activeNudge = { rule: rule, message: message };
    state.nudgeShownAt = Date.now();
    elNudgeText.innerHTML = message;
    elNudgeDo.textContent = rule.action === 'download' ? 'download' : 'insert';
    elNudge.classList.add('is-on');
  }

  function hideNudge() {
    state.activeNudge = null;
    elNudge.classList.remove('is-on');
  }

  elNudgeDo.addEventListener('click', function () {
    var active = state.activeNudge;
    if (!active) return;
    if (active.rule.action) runAction(active.rule.action);
    else if (bySnippetId[active.rule.snippet]) insertSnippet(bySnippetId[active.rule.snippet]);
    hideNudge();
  });

  elNudgeX.addEventListener('click', function () {
    var active = state.activeNudge;
    if (active) {
      state.dismissed[active.rule.id] = true;
      // A tip stays dismissed for good; a real problem may nag again next session.
      if (!active.rule.sticky) {
        var keep = Object.keys(state.dismissed).filter(function (id) {
          return !NUDGE_RULES.some(function (r) { return r.id === id && r.sticky; });
        });
        lsSet(K.nudge, JSON.stringify(keep));
      }
    }
    hideNudge();
  });

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

  function closeOverlays() {
    palette.classList.remove('is-on');
    guide.classList.remove('is-on');
    $('library').classList.remove('is-on');
    src.focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (el) {
    el.addEventListener('click', closeOverlays);
  });

  // ── Actions ────────────────────────────────────────────────────────────
  function slugify(s) {
    return (s || 'deck').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'deck';
  }

  function download() {
    var name = slugify($('docname').value);
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

  /** Downloads the built deck as one standalone page. */
  function exportHtml() {
    if (!state.slides.length) { toast('Nothing to export yet.', 'warn'); return; }
    buildDeck(false)
      .then(function (data) { return fetch(data.path); })
      .then(function (r) {
        if (!r.ok) throw new Error('server said ' + r.status);
        return r.text();
      })
      .then(function (html) {
        var name = slugify($('docname').value).replace(/\\.(md|markdown)$/, '') + '.html';
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
    if (!state.slides.length) { toast('Nothing to export yet.', 'warn'); return; }
    if (pdfInFlight) { toast('Already building a PDF.'); return; }
    pdfInFlight = true;
    elSave.className = 'warn';
    elSave.textContent = 'building the PDF';

    fetch('/__pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: src.value, theme: state.theme, title: $('docname').value })
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
        var name = slugify($('docname').value).replace(/\\.(md|markdown)$/, '') + '.pdf';
        saveBlob(name, blob);
        toast('Downloaded ' + name + ', one 16:9 page per slide.');
      })
      .catch(function (err) { toast('Could not export the PDF: ' + err.message, 'err'); })
      .then(function () {
        pdfInFlight = false;
        elSave.className = '';
        elSave.textContent = 'ready';
        scheduleSave();
      });
  }

  /** No local browser to drive: hand the deck to the print dialog instead. */
  function printFallback(detail) {
    var tab = window.open('about:blank', '_blank');
    buildDeck(true)
      .then(function (data) {
        var url = location.origin + data.path;
        if (!tab) {
          toast('Allow pop-ups, or press Cmd P on the deck, to save a PDF.', 'warn', 'open here', function () { location.href = url; });
          return;
        }
        tab.location.replace(url);
        toast((detail || 'No local browser to render with.') + ' Using the print dialog instead, which is already set to landscape.', 'warn');
      })
      .catch(function (err) {
        if (tab) tab.close();
        toast('Could not build the deck: ' + err.message, 'err');
      });
  }

  function buildDeck(forPrint) {
    return fetch('/__present', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: src.value,
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
    if (!state.slides.length) { toast('Nothing to present yet.', 'warn'); return; }
    var tab = window.open('about:blank', '_blank');
    buildDeck(false)
      .then(function (data) {
        var url = location.origin + data.path;
        if (tab) tab.location.replace(url);
        else toast('Allow pop-ups to present in a new tab.', 'warn', 'present here', function () { location.href = url; });
      })
      .catch(function (err) {
        if (tab) tab.close();
        toast('Could not build the deck: ' + err.message, 'err');
      });
  }

  function setTheme(next) {
    state.theme = next;
    document.documentElement.dataset.theme = next;
    lsSet(K.theme, next);
    post({ type: 'theme', theme: next });
  }

  function setMode(next) {
    state.mode = next;
    lsSet(K.mode, next);
    $('seg-single').classList.toggle('is-on', next === 'single');
    $('seg-grid').classList.toggle('is-on', next === 'grid');
    layout();
    pushFrame();
  }

  /** Load a deck into the editor, saving whatever is open first. */
  function openDeck(id, announce) {
    if (!findDeck(id)) { toast('That deck is gone.', 'warn'); return; }
    if (id !== state.deckId) saveNow();
    state.deckId = id;
    lsSet(K.current, id);
    var meta = findDeck(id);
    src.value = readDeck(id);
    $('docname').value = meta.name;
    src.setSelectionRange(0, 0);
    src.scrollTop = 0;
    state.index = 0;
    state.overflow = {};
    paint();
    syncScroll();
    updateCaretUi();
    refresh();
    elSave.className = '';
    elSave.textContent = 'opened ' + meta.name;
    updateDeckCount();
    if (announce) toast('Opened ' + meta.name);
    src.focus();
  }

  function noRoom() {
    toast('This browser has no room for another deck. Delete one, or download this one first.', 'err');
  }

  function newDeck() {
    saveNow();
    var id = createDeck(uniqueName('untitled'), '');
    if (!id) { noRoom(); return; }
    openDeck(id);
    toast('New deck. Press ' + CMD + ' K to see what you can add.');
  }

  function duplicateDeck() {
    saveNow();
    var meta = findDeck(state.deckId);
    var id = createDeck(uniqueName((meta ? meta.name : 'deck') + ' copy'), src.value);
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
        var fresh = createDeck('deck', '');
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
      var slides = deck.id === state.deckId ? state.slides.length : deck.slides;
      meta.textContent = (slides || 0) + (slides === 1 ? ' slide' : ' slides') +
        '  \u00b7  ' + Math.max(1, Math.round((deck.chars || 0) / 1024)) + ' KB' +
        '  \u00b7  ' + timeAgo(deck.at || Date.now());
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
        var id = createDeck(uniqueName(deck.name + ' copy'), readDeck(deck.id));
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
  }

  $('lib-new').addEventListener('click', function () { closeOverlays(); newDeck(); });

  $('btn-decks').addEventListener('click', openLibrary);

  function runAction(name) {
    if (name === 'present') present();
    else if (name === 'download') download();
    else if (name === 'pdf') exportPdf();
    else if (name === 'html') exportHtml();
    else if (name === 'open') $('file-md').click();
    else if (name === 'grid') setMode(state.mode === 'grid' ? 'single' : 'grid');
    else if (name === 'theme') setTheme(state.theme === 'dark' ? 'light' : 'dark');
    else if (name === 'guide') { guide.classList.add('is-on'); }
    else if (name === 'decks') openLibrary();
    else if (name === 'new') newDeck();
    else if (name === 'duplicate') duplicateDeck();
    else if (name === 'delete') deleteDeck(state.deckId);
  }

  // ── Wiring ─────────────────────────────────────────────────────────────
  var parseTimer = null;

  function onInput() {
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
      return;
    }
    // Continue the list you are in.
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      var upto = src.value.slice(0, src.selectionStart);
      var line = upto.slice(upto.lastIndexOf('\\n') + 1);
      var m = line.match(/^(\\s*)([-*+]|(\\d+)[.)])(\\s+)(.*)$/);
      if (m && src.selectionStart === src.selectionEnd) {
        e.preventDefault();
        if (!m[5]) {
          // Empty item: end the list instead of nesting further.
          var start = src.selectionStart - line.length;
          src.setSelectionRange(start, src.selectionStart);
          typeText('\\n');
        } else {
          var marker = m[3] ? (parseInt(m[3], 10) + 1) + m[2].slice(String(m[3]).length) : m[2];
          typeText('\\n' + m[1] + marker + m[4]);
        }
        onInput();
      }
    }
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
      else toast('Skipped ' + f.name + '. Drop a Markdown file to open it.', 'warn');
    }
  });

  /** An opened file lands as a new deck, so nothing in the library is lost. */
  function loadMarkdownFile(file) {
    var fr = new FileReader();
    fr.onload = function () {
      saveNow();
      var markdown = String(fr.result).replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
      var name = uniqueName(file.name.replace(/\\.(md|markdown|txt)$/i, '') || 'untitled');
      var id = createDeck(name, markdown);
      if (!id) { noRoom(); return; }
      openDeck(id);
      toast('Loaded ' + file.name + ' as a new deck');
    };
    fr.onerror = function () { toast('Could not read ' + file.name, 'err'); };
    fr.readAsText(file);
  }

  $('file-md').addEventListener('change', function (e) {
    if (e.target.files[0]) loadMarkdownFile(e.target.files[0]);
    e.target.value = '';
  });

  $('docname').addEventListener('input', scheduleSave);

  $('btn-guide').addEventListener('click', function () { runAction('guide'); });
  $('btn-palette').addEventListener('click', openPalette);
  $('btn-open').addEventListener('click', function () { runAction('open'); });
  // ── Export menu ────────────────────────────────────────────────────────
  var exportMenu = $('btn-export').parentNode;

  function closeMenu() {
    exportMenu.classList.remove('is-open');
    $('btn-export').setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    var open = !exportMenu.classList.contains('is-open');
    exportMenu.classList.toggle('is-open', open);
    $('btn-export').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var first = $('export-menu').querySelector('button');
      if (first) first.focus();
    }
  }

  $('btn-export').addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(); });

  $('export-menu').addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('button[data-export]') : null;
    if (!btn) return;
    closeMenu();
    runExport(btn.dataset.export);
  });

  $('export-menu').addEventListener('keydown', function (e) {
    var items = Array.prototype.slice.call($('export-menu').querySelectorAll('button'));
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

  document.addEventListener('click', function (e) {
    if (exportMenu.classList.contains('is-open') && !exportMenu.contains(e.target)) closeMenu();
  });

  function runExport(kind) {
    if (kind === 'md') download();
    else if (kind === 'pdf') exportPdf();
    else if (kind === 'html') exportHtml();
  }
  $('btn-theme').addEventListener('click', function () { runAction('theme'); });
  $('btn-present').addEventListener('click', present);
  $('btn-prev').addEventListener('click', function () { setIndex(state.index - 1, true); });
  $('btn-next').addEventListener('click', function () { setIndex(state.index + 1, true); });
  $('seg-single').addEventListener('click', function () { setMode('single'); });
  $('seg-grid').addEventListener('click', function () { setMode('grid'); });

  // ── Global keys ────────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    var mod = e.metaKey || e.ctrlKey;

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
      if (exportMenu.classList.contains('is-open')) { e.preventDefault(); closeMenu(); src.focus(); return; }
      if (palette.classList.contains('is-on') || guide.classList.contains('is-on') ||
          $('library').classList.contains('is-on')) {
        e.preventDefault();
        closeOverlays();
      }
      return;
    }
    if (!mod) return;

    var key = e.key.toLowerCase();

    if (key === 'k' && !e.shiftKey) { e.preventDefault(); openPalette(); }
    else if (key === 'o') { e.preventDefault(); openLibrary(); }
    else if (key === '/') { e.preventDefault(); runAction('guide'); }
    else if (key === 's' && e.shiftKey) { e.preventDefault(); exportPdf(); }
    else if (key === 's') { e.preventDefault(); saveNow(); download(); }
    else if (key === 'enter') { e.preventDefault(); present(); }
    else if (key === 'd') { e.preventDefault(); insertSnippet(bySnippetId['slide-break']); }
    else if (key === 'b') { e.preventDefault(); insertSnippet(bySnippetId.bold); }
    else if (key === 'i') { e.preventDefault(); insertSnippet(bySnippetId.italic); }
    else if (key === 'e') { e.preventDefault(); insertSnippet(bySnippetId['inline-code']); }
    else if (key === 'g') { e.preventDefault(); runAction('grid'); }
    else if (key === 'l' && e.shiftKey) { e.preventDefault(); runAction('theme'); }
  });

  // Alt + up/down hops between slides.
  document.addEventListener('keydown', function (e) {
    if (!e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(state.index + 1, true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(state.index - 1, true); }
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
      state.frameReady = true;
      post({ type: 'theme', theme: state.theme });
      pushFrame();
      if (state.pending) { var p = state.pending; state.pending = null; post(p); }
    } else if (m.type === 'goto') {
      setMode('single');
      setIndex(m.index, true);
    } else if (m.type === 'overflow') {
      var had = !!state.overflow[m.index];
      state.overflow[m.index] = m.overflow;
      if (had !== m.overflow) evalNudges();
    }
  });

  // ── Boot ───────────────────────────────────────────────────────────────
  state.bootAt = Date.now();

  // Carry over a deck saved before the library existed.
  var legacy = lsGet(K.oldDoc, null);
  if (legacy !== null && !loadIndex().length) {
    createDeck(lsGet(K.oldName, 'deck'), legacy);
    lsDel(K.oldDoc);
    lsDel(K.oldName);
  }

  var index = loadIndex();
  var firstRun = index.length === 0;
  var storageBlocked = false;
  if (firstRun) {
    state.deckId = createDeck('welcome', D.welcome);
    if (!state.deckId) {
      // Private windows and locked-down browsers refuse localStorage entirely.
      state.deckId = newDeckId();
      storageBlocked = true;
    }
  } else {
    var wanted = lsGet(K.current, null);
    state.deckId = findDeck(wanted) ? wanted : index[0].id;
  }

  lsSet(K.current, state.deckId);
  var openMeta = findDeck(state.deckId);
  src.value = storageBlocked ? D.welcome : readDeck(state.deckId);
  $('docname').value = openMeta ? openMeta.name : 'deck';
  updateDeckCount();
  // Assigning value parks the caret at the end in some browsers, which would
  // open the deck on its last slide. Start at the top instead.
  src.setSelectionRange(0, 0);
  src.scrollTop = 0;

  document.documentElement.dataset.theme = state.theme;
  $('seg-single').classList.toggle('is-on', state.mode === 'single');
  $('seg-grid').classList.toggle('is-on', state.mode === 'grid');

  Array.prototype.forEach.call(document.querySelectorAll('.btn kbd, .menu__pop kbd'), function (el) {
    el.textContent = el.textContent.replace('Cmd', CMD);
  });

  buildGuide();
  startTips();
  applySplit();
  paint();
  updateCaretUi();
  refresh();

  if (storageBlocked) {
    elSave.className = 'err';
    elSave.textContent = 'this browser blocks local storage';
    setTimeout(function () {
      toast('This browser will not let the editor save anything. Download your deck to keep it.', 'err', 'download', download);
    }, 700);
  } else if (firstRun) {
    elSave.textContent = 'welcome deck loaded';
    setTimeout(function () {
      toast('This deck is yours to overwrite. Press ' + CMD + ' K to see every layout and style.', null, 'open the guide', function () { runAction('guide'); });
    }, 900);
  } else {
    elSave.className = '';
    elSave.textContent = index.length > 1
      ? 'restored, ' + index.length + ' decks in this browser'
      : 'restored from this browser';
  }

  src.focus();
  src.setSelectionRange(0, 0);
  src.scrollTop = 0;
  syncScroll();
  updateCaretUi();
})();
</script>
</body>
</html>`;
}
