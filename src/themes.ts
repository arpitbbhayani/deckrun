/**
 * The theme registry.
 *
 * ── Adding a theme ────────────────────────────────────────────────────────
 * Append one entry to `SPECS` below and it appears everywhere: the CLI's
 * `--theme` flag, the editor's theme menu, the live preview, the HTML export,
 * and the PDF. Nothing else needs touching.
 *
 * A spec is four things:
 *
 *   neutrals  An 11-step ramp from the page's outermost background (`crust`)
 *             to its strongest foreground (`text`). Light themes run the same
 *             direction: crust is still the backdrop, text is still the ink.
 *   accents   Eleven hues, named after the Catppuccin slots so palettes port
 *             across easily. They are the deck's paint box: `mark`, list
 *             markers, table headers, and the five pen colors all pull from
 *             here.
 *   roles     Which three of those colors lead. `accent` carries h1, the
 *             caret, focus rings, and every piece of chrome; `accent2` carries
 *             h2 and links; `accent3` carries h3. Point them at any neutral or
 *             accent key — that is how Nord leads with frost blue while
 *             Gruvbox leads with amber.
 *   type      A display face for headings, a body face for prose, a mono face
 *             for code, plus the weight and tracking that face wants. Faces
 *             come from `FONTS`; add an entry there to use a new one.
 *
 * `decor` picks the animated geometry that sits behind every slide. The
 * available names live in `DECORS` at the bottom of this file — each is a set
 * of CSS custom properties, so a new pattern is a new entry there and a
 * matching name here.
 *
 * Everything else — tints, overlays, shadows, glows, the decor's own colors —
 * is derived from the four inputs, so a new theme cannot fall out of step with
 * itself.
 *
 * The type scale lives at the bottom of this file. It is deliberately separate
 * from the themes: every theme can be set at any of the four sizes, so the two
 * choices compose instead of multiplying into fifty-six presets.
 */

// ── Color plumbing ────────────────────────────────────────────────────────

/** `#rrggbb` → `r, g, b`, ready to drop into an `rgba()`. */
function channels(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16
  );
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function alpha(hex: string, a: number): string {
  return `rgba(${channels(hex)}, ${a})`;
}

// ── Fonts ─────────────────────────────────────────────────────────────────

/**
 * A face, as Google Fonts wants it and as CSS wants it. `param` is the
 * `family=` query segment; the weights listed there are the only ones that
 * load, so a theme asking for weight 800 needs 800 in the param. `kind` only
 * groups the face in the editor's font menu.
 *
 * The human name is not stored: it is the family out of `param`, so the two
 * cannot disagree.
 */
interface FontFace {
  param: string;
  stack: string;
  kind: "sans" | "serif" | "mono";
}

/** "Space+Grotesk:wght@400;700" → "Space Grotesk". */
export function fontName(key: string): string {
  return FONTS[key].param.split(":")[0].replace(/\+/g, " ");
}

const SANS = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const FONTS: Record<string, FontFace> = {
  inter:         { param: "Inter:wght@300;400;500;600;700;800",                      stack: `'Inter', ${SANS}`, kind: "sans" },
  spaceGrotesk:  { param: "Space+Grotesk:wght@400;500;600;700",                      stack: `'Space Grotesk', ${SANS}`, kind: "sans" },
  sora:          { param: "Sora:wght@300;400;500;600;700;800",                       stack: `'Sora', ${SANS}`, kind: "sans" },
  manrope:       { param: "Manrope:wght@400;500;600;700;800",                        stack: `'Manrope', ${SANS}`, kind: "sans" },
  figtree:       { param: "Figtree:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400",    stack: `'Figtree', ${SANS}`, kind: "sans" },
  outfit:        { param: "Outfit:wght@300;400;500;600;700;800",                      stack: `'Outfit', ${SANS}`, kind: "sans" },
  archivo:       { param: "Archivo:wght@400;500;600;700;800;900",                     stack: `'Archivo', ${SANS}`, kind: "sans" },
  syne:          { param: "Syne:wght@400;500;600;700;800",                            stack: `'Syne', ${SANS}`, kind: "sans" },
  bricolage:     { param: "Bricolage+Grotesque:wght@400;500;600;700;800",              stack: `'Bricolage Grotesque', ${SANS}`, kind: "sans" },
  workSans:      { param: "Work+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400",         stack: `'Work Sans', ${SANS}`, kind: "sans" },
  plexSans:      { param: "IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400", stack: `'IBM Plex Sans', ${SANS}`, kind: "sans" },
  fraunces:      { param: "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400", stack: `'Fraunces', ${SERIF}`, kind: "serif" },
  playfair:      { param: "Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,500",  stack: `'Playfair Display', ${SERIF}`, kind: "serif" },
  newsreader:    { param: "Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400", stack: `'Newsreader', ${SERIF}`, kind: "serif" },
  lora:          { param: "Lora:ital,wght@0,400;0,500;0,600;0,700;1,400",              stack: `'Lora', ${SERIF}`, kind: "serif" },
  plexMono:      { param: "IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400", stack: `'IBM Plex Mono', ${MONO}`, kind: "mono" },
  jetbrains:     { param: "JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400",    stack: `'JetBrains Mono', ${MONO}`, kind: "mono" },
  firaCode:      { param: "Fira+Code:wght@400;500;600;700",                            stack: `'Fira Code', ${MONO}`, kind: "mono" },
  spaceMono:     { param: "Space+Mono:ital,wght@0,400;0,700;1,400",                    stack: `'Space Mono', ${MONO}`, kind: "mono" },
  sourceCodePro: { param: "Source+Code+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400",    stack: `'Source Code Pro', ${MONO}`, kind: "mono" },
};

/**
 * One stylesheet request covering every face the given themes need. Google
 * serves the @font-face rules for all of them but the browser only downloads
 * the files actually painted, so asking for the whole registry — which the
 * editor and its preview must do, since the theme changes at runtime — costs
 * one small CSS file.
 */
export function googleFontsHref(
  themes: ThemeName[] = THEME_IDS.slice(),
  extra: Array<string | null | undefined> = []
): string {
  const wanted = new Set<string>();
  wanted.add("jetbrains");
  for (const input of themes) {
    const t = THEMES[resolveThemeName(input)];
    wanted.add(t.type.display);
    wanted.add(t.type.body);
    wanted.add(t.type.mono);
  }
  // A deck set in a face its theme does not use still has to fetch it.
  for (const key of extra) if (key && FONTS[key]) wanted.add(key);
  const families = [...wanted]
    .map((key) => FONTS[key].param)
    .sort()
    .map((param) => `family=${param}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// ── Theme shape ───────────────────────────────────────────────────────────

export type Mood = "dark" | "light";

interface Neutrals {
  crust: string; mantle: string; base: string;
  surface0: string; surface1: string; surface2: string;
  overlay0: string; overlay1: string;
  subtext0: string; subtext1: string; text: string;
}

interface Accents {
  lavender: string; blue: string; sapphire: string; sky: string;
  teal: string; green: string; yellow: string; peach: string;
  red: string; mauve: string; pink: string;
}

type ColorKey = keyof Neutrals | keyof Accents;

interface Roles {
  accent: ColorKey;
  accent2: ColorKey;
  accent3: ColorKey;
}

interface TypeSpec {
  /** Key into `FONTS` for headings. */
  display: keyof typeof FONTS | string;
  /** Key into `FONTS` for prose. */
  body: keyof typeof FONTS | string;
  /** Key into `FONTS` for code, `kbd`, and the deck's own chrome. */
  mono: keyof typeof FONTS | string;
  /** Heading weight. Must be one of the weights `FONTS[display].param` loads. */
  weight?: number;
  /** Heading letter-spacing. Big display faces usually want a negative value. */
  tracking?: string;
  /** Body letter-spacing, for faces that read better slightly opened up. */
  bodyTracking?: string;
  /** `uppercase` turns h1 into a banner. Leave off for sentence case. */
  case?: "none" | "uppercase";
}

interface ThemeSpec {
  label: string;
  mood: Mood;
  blurb: string;
  neutrals: Neutrals;
  accents: Accents;
  roles: Roles;
  type: TypeSpec;
  decor: DecorName;
  /** Highlight.js stylesheet that pairs with the palette. */
  hljs: string;
}

export interface Theme extends ThemeSpec {
  id: string;
}

// ── The themes ────────────────────────────────────────────────────────────

const HL = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/";

const SPECS: Record<string, ThemeSpec> = {
  // ── Dark ───────────────────────────────────────────────────────────────
  midnight: {
    label: "midnight",
    mood: "dark",
    blurb: "Catppuccin Mocha. Violet on deep indigo, drifting orbs.",
    neutrals: {
      crust: "#11111b", mantle: "#181825", base: "#1e1e2e",
      surface0: "#313244", surface1: "#45475a", surface2: "#585b70",
      overlay0: "#6c7086", overlay1: "#7f849c",
      subtext0: "#a6adc8", subtext1: "#bac2de", text: "#cdd6f4",
    },
    accents: {
      lavender: "#b4befe", blue: "#89b4fa", sapphire: "#74c7ec", sky: "#89dceb",
      teal: "#94e2d5", green: "#a6e3a1", yellow: "#f9e2af", peach: "#fab387",
      red: "#f38ba8", mauve: "#cba6f7", pink: "#f5c2e7",
    },
    roles: { accent: "mauve", accent2: "blue", accent3: "sky" },
    type: { display: "spaceGrotesk", body: "inter", mono: "plexMono", weight: 700, tracking: "-0.025em" },
    decor: "orbs",
    hljs: `${HL}tokyo-night-dark.min.css`,
  },

  tokyo: {
    label: "tokyo night",
    mood: "dark",
    blurb: "Neon cyan over a wireframe grid, lifted from a rainy skyline.",
    neutrals: {
      crust: "#16161e", mantle: "#1a1b26", base: "#1f2335",
      surface0: "#292e42", surface1: "#3b4261", surface2: "#545c7e",
      overlay0: "#626c96", overlay1: "#7c86ab",
      subtext0: "#a5b0d6", subtext1: "#b7c0e0", text: "#c8d3f5",
    },
    accents: {
      lavender: "#a9b1ff", blue: "#7aa2f7", sapphire: "#2ac3de", sky: "#7dcfff",
      teal: "#73daca", green: "#9ece6a", yellow: "#e0af68", peach: "#ff9e64",
      red: "#f7768e", mauve: "#bb9af7", pink: "#ff7eb6",
    },
    roles: { accent: "sapphire", accent2: "mauve", accent3: "teal" },
    type: { display: "sora", body: "inter", mono: "jetbrains", weight: 700, tracking: "-0.03em" },
    decor: "grid",
    hljs: `${HL}tokyo-night-dark.min.css`,
  },

  nord: {
    label: "nord",
    mood: "dark",
    blurb: "Arctic frost blue on polar slate, with slow contour waves.",
    neutrals: {
      crust: "#232831", mantle: "#2e3440", base: "#353c4a",
      surface0: "#3b4252", surface1: "#434c5e", surface2: "#4c566a",
      overlay0: "#707d92", overlay1: "#8e9aae",
      subtext0: "#c3ccda", subtext1: "#d8dee9", text: "#eceff4",
    },
    accents: {
      lavender: "#c9a9c8", blue: "#81a1c1", sapphire: "#88c0d0", sky: "#a3d4e0",
      teal: "#8fbcbb", green: "#a3be8c", yellow: "#ebcb8b", peach: "#d08770",
      red: "#bf616a", mauve: "#b48ead", pink: "#d3a3c6",
    },
    roles: { accent: "sapphire", accent2: "blue", accent3: "teal" },
    type: { display: "jetbrains", body: "jetbrains", mono: "jetbrains", weight: 700, tracking: "-0.025em" },
    decor: "waves",
    hljs: `${HL}nord.min.css`,
  },

  dracula: {
    label: "dracula",
    mood: "dark",
    blurb: "Purple and hot pink over charcoal, lit by a gradient mesh.",
    neutrals: {
      crust: "#1a1b23", mantle: "#21222c", base: "#282a36",
      surface0: "#343746", surface1: "#44475a", surface2: "#565a70",
      overlay0: "#6272a4", overlay1: "#7b85b6",
      subtext0: "#c8cbe0", subtext1: "#e2e4f0", text: "#f8f8f2",
    },
    accents: {
      lavender: "#d6bcff", blue: "#79b8ff", sapphire: "#8be9fd", sky: "#a4f0fd",
      teal: "#66e0c8", green: "#50fa7b", yellow: "#f1fa8c", peach: "#ffb86c",
      red: "#ff5555", mauve: "#bd93f9", pink: "#ff79c6",
    },
    roles: { accent: "mauve", accent2: "pink", accent3: "sapphire" },
    type: { display: "syne", body: "figtree", mono: "firaCode", weight: 800, tracking: "-0.02em" },
    decor: "mesh",
    hljs: `${HL}base16/dracula.min.css`,
  },

  gruvbox: {
    label: "gruvbox",
    mood: "dark",
    blurb: "Warm amber and moss on retro brown, hatched like graph paper.",
    neutrals: {
      crust: "#1b1e1f", mantle: "#232728", base: "#282828",
      surface0: "#32302f", surface1: "#3c3836", surface2: "#504945",
      overlay0: "#7c6f64", overlay1: "#928374",
      subtext0: "#bdae93", subtext1: "#d5c4a1", text: "#ebdbb2",
    },
    accents: {
      lavender: "#d3b8c8", blue: "#83a598", sapphire: "#7daea3", sky: "#8ec07c",
      teal: "#89b482", green: "#b8bb26", yellow: "#fabd2f", peach: "#fe8019",
      red: "#fb4934", mauve: "#d3869b", pink: "#e2a3b4",
    },
    roles: { accent: "yellow", accent2: "peach", accent3: "green" },
    type: { display: "bricolage", body: "workSans", mono: "plexMono", weight: 700, tracking: "-0.02em" },
    decor: "topo",
    hljs: `${HL}base16/gruvbox-dark-medium.min.css`,
  },

  rosepine: {
    label: "rosé pine",
    mood: "dark",
    blurb: "Muted iris and gold on plum, under a slow aurora.",
    neutrals: {
      crust: "#14121f", mantle: "#191724", base: "#1f1d2e",
      surface0: "#26233a", surface1: "#403d52", surface2: "#524f67",
      overlay0: "#6e6a86", overlay1: "#817c9c",
      subtext0: "#b6b2d0", subtext1: "#cdc9e6", text: "#e0def4",
    },
    accents: {
      lavender: "#d5c4ee", blue: "#6a9fb5", sapphire: "#6ba8bf", sky: "#9ccfd8",
      teal: "#86cfc4", green: "#9ccfa8", yellow: "#f6c177", peach: "#f0a882",
      red: "#eb6f92", mauve: "#c4a7e7", pink: "#ebbcba",
    },
    roles: { accent: "mauve", accent2: "sky", accent3: "yellow" },
    type: { display: "fraunces", body: "newsreader", mono: "plexMono", weight: 600, tracking: "-0.02em", bodyTracking: "0.004em" },
    decor: "aurora",
    hljs: `${HL}base16/ros-pine.min.css`,
  },

  neon: {
    label: "neon",
    mood: "dark",
    blurb: "Electric cyan and magenta on true black, raked by light beams.",
    neutrals: {
      crust: "#050509", mantle: "#0a0a12", base: "#0e0e1a",
      surface0: "#16162a", surface1: "#22223c", surface2: "#2e2e50",
      overlay0: "#4f4f78", overlay1: "#6a6a96",
      subtext0: "#a8a8cc", subtext1: "#c8c8e4", text: "#f0f0ff",
    },
    accents: {
      lavender: "#b39dff", blue: "#4d9fff", sapphire: "#22d3ee", sky: "#38e8ff",
      teal: "#2dd4bf", green: "#4ade80", yellow: "#fde047", peach: "#fb923c",
      red: "#fb5c7d", mauve: "#d946ef", pink: "#ff5cc8",
    },
    roles: { accent: "sapphire", accent2: "pink", accent3: "sky" },
    type: { display: "spaceGrotesk", body: "spaceGrotesk", mono: "spaceMono", weight: 700, tracking: "0.04em", case: "uppercase" },
    decor: "beams",
    hljs: `${HL}night-owl.min.css`,
  },

  forest: {
    label: "forest",
    mood: "dark",
    blurb: "Everforest sage on deep pine, rippling in concentric rings.",
    neutrals: {
      crust: "#232a2e", mantle: "#2d353b", base: "#343f44",
      surface0: "#3d484d", surface1: "#475258", surface2: "#4f585e",
      overlay0: "#7a8478", overlay1: "#9da9a0",
      subtext0: "#c2c9bd", subtext1: "#d3c6aa", text: "#e5dfd2",
    },
    accents: {
      lavender: "#d8b9c8", blue: "#7fbbb3", sapphire: "#6fb5ac", sky: "#9ed3c8",
      teal: "#83c092", green: "#a7c080", yellow: "#dbbc7f", peach: "#e69875",
      red: "#e67e80", mauve: "#d699b6", pink: "#e3aec3",
    },
    roles: { accent: "green", accent2: "sapphire", accent3: "yellow" },
    type: { display: "outfit", body: "figtree", mono: "jetbrains", weight: 600, tracking: "-0.025em" },
    decor: "rings",
    hljs: `${HL}atom-one-dark.min.css`,
  },

  kanagawa: {
    label: "kanagawa",
    mood: "dark",
    blurb: "Kanagawa. Sumi ink and sakura pink, calm drifting orbs.",
    neutrals: {
      crust: "#16161d", mantle: "#1a1a22", base: "#1f1f28",
      surface0: "#2a2a37", surface1: "#363646", surface2: "#454557",
      overlay0: "#727169", overlay1: "#8a897d",
      subtext0: "#b5af95", subtext1: "#c8c093", text: "#dcd7ba",
    },
    accents: {
      lavender: "#b39ac1", blue: "#7e9cd8", sapphire: "#61a6b4", sky: "#a3d4d5",
      teal: "#6a9589", green: "#98bb6c", yellow: "#c0a36e", peach: "#ffa066",
      red: "#c34043", mauve: "#957fb8", pink: "#d27e99",
    },
    roles: { accent: "blue", accent2: "pink", accent3: "teal" },
    type: { display: "sora", body: "inter", mono: "jetbrains", weight: 600, tracking: "-0.02em" },
    decor: "orbs",
    hljs: `${HL}github-dark-dimmed.min.css`,
  },

  shadcn: {
    label: "shadcn",
    mood: "dark",
    blurb: "Zinc graphite with a violet accent, on a sharp blueprint grid.",
    neutrals: {
      crust: "#09090b", mantle: "#0c0c0f", base: "#0f0f12",
      surface0: "#18181b", surface1: "#27272a", surface2: "#3f3f46",
      overlay0: "#52525b", overlay1: "#71717a",
      subtext0: "#a1a1aa", subtext1: "#d4d4d8", text: "#fafafa",
    },
    accents: {
      lavender: "#a78bfa", blue: "#60a5fa", sapphire: "#38bdf8", sky: "#7dd3fc",
      teal: "#2dd4bf", green: "#4ade80", yellow: "#facc15", peach: "#fb923c",
      red: "#f87171", mauve: "#8b5cf6", pink: "#f472b6",
    },
    roles: { accent: "mauve", accent2: "blue", accent3: "teal" },
    type: { display: "inter", body: "inter", mono: "jetbrains", weight: 700, tracking: "-0.02em" },
    decor: "grid",
    hljs: `${HL}github-dark.min.css`,
  },

  // ── Light ──────────────────────────────────────────────────────────────
  daylight: {
    label: "daylight",
    mood: "light",
    blurb: "Catppuccin Latte, contrast-tuned for a projector. Dot matrix.",
    neutrals: {
      crust: "#ebebeb", mantle: "#f5f5f5", base: "#fafaf8",
      surface0: "#ccd0da", surface1: "#9ca0b0", surface2: "#8c8fa1",
      overlay0: "#6c6f85", overlay1: "#5c5f77",
      subtext0: "#4c4f69", subtext1: "#3a3c52", text: "#1e2030",
    },
    accents: {
      lavender: "#7287fd", blue: "#1e66f5", sapphire: "#209fb5", sky: "#04a5e5",
      teal: "#179299", green: "#40a02b", yellow: "#df8e1d", peach: "#fe640b",
      red: "#d20f39", mauve: "#8839ef", pink: "#ea76cb",
    },
    roles: { accent: "mauve", accent2: "blue", accent3: "teal" },
    type: { display: "spaceGrotesk", body: "inter", mono: "plexMono", weight: 700, tracking: "-0.025em" },
    decor: "dots",
    hljs: `${HL}atom-one-light.min.css`,
  },

  paper: {
    label: "paper",
    mood: "light",
    blurb: "Crimson serif on warm cream. Editorial, print-first, very legible.",
    neutrals: {
      crust: "#efe8dc", mantle: "#f7f2e9", base: "#fdfbf5",
      surface0: "#e4dccc", surface1: "#cec4b0", surface2: "#b0a48d",
      overlay0: "#8b8069", overlay1: "#6e6553",
      subtext0: "#4d4535", subtext1: "#38311f", text: "#211c11",
    },
    accents: {
      lavender: "#6f5ba8", blue: "#2d5fa8", sapphire: "#1f7f96", sky: "#10788f",
      teal: "#1c7a6b", green: "#3f7a2e", yellow: "#9a6c12", peach: "#b35311",
      red: "#a81f2c", mauve: "#7a3f9c", pink: "#a83f77",
    },
    roles: { accent: "red", accent2: "sapphire", accent3: "yellow" },
    type: { display: "fraunces", body: "newsreader", mono: "plexMono", weight: 700, tracking: "-0.02em", bodyTracking: "0.003em" },
    decor: "rings",
    hljs: `${HL}atom-one-light.min.css`,
  },

  solarized: {
    label: "solarized",
    mood: "light",
    blurb: "The classic low-glare cream, paired with Lora for long prose.",
    neutrals: {
      crust: "#eee8d5", mantle: "#f5efdc", base: "#fdf6e3",
      surface0: "#e3ddc8", surface1: "#c9c3ad", surface2: "#a8a48e",
      overlay0: "#839496", overlay1: "#657b83",
      subtext0: "#586e75", subtext1: "#3f5b62", text: "#073642",
    },
    accents: {
      lavender: "#8a8fd0", blue: "#268bd2", sapphire: "#1f8fa8", sky: "#2aa198",
      teal: "#21958c", green: "#859900", yellow: "#b58900", peach: "#cb4b16",
      red: "#dc322f", mauve: "#6c71c4", pink: "#d33682",
    },
    roles: { accent: "blue", accent2: "mauve", accent3: "teal" },
    type: { display: "outfit", body: "lora", mono: "sourceCodePro", weight: 600, tracking: "-0.02em" },
    decor: "topo",
    hljs: `${HL}base16/solarized-light.min.css`,
  },

  rosequartz: {
    label: "rose quartz",
    mood: "light",
    blurb: "Rosé Pine Dawn. Blush and iris on linen, with soft orbs.",
    neutrals: {
      crust: "#f2e9e1", mantle: "#faf4ed", base: "#fffaf3",
      surface0: "#ece0d8", surface1: "#d8ccc6", surface2: "#bdb0ae",
      overlay0: "#9893a5", overlay1: "#7d7791",
      subtext0: "#625b7d", subtext1: "#55506e", text: "#423d5c",
    },
    accents: {
      lavender: "#a68fc0", blue: "#286983", sapphire: "#2f7d92", sky: "#56949f",
      teal: "#4a9188", green: "#5a8f52", yellow: "#ea9d34", peach: "#d7827e",
      red: "#b4637a", mauve: "#907aa9", pink: "#c4759a",
    },
    roles: { accent: "red", accent2: "mauve", accent3: "sky" },
    type: { display: "playfair", body: "figtree", mono: "plexMono", weight: 700, tracking: "-0.02em" },
    decor: "orbs",
    hljs: `${HL}base16/ros-pine-dawn.min.css`,
  },

  swiss: {
    label: "swiss",
    mood: "light",
    blurb: "Black on white, one red. Heavy grotesk, tight tracking, hard grid.",
    neutrals: {
      crust: "#f0f0f0", mantle: "#f8f8f8", base: "#ffffff",
      surface0: "#dcdcdc", surface1: "#bebebe", surface2: "#9a9a9a",
      overlay0: "#767676", overlay1: "#5a5a5a",
      subtext0: "#3a3a3a", subtext1: "#222222", text: "#0a0a0a",
    },
    accents: {
      lavender: "#4b4b8f", blue: "#1a4fd6", sapphire: "#0a6e8a", sky: "#0e7490",
      teal: "#0f766e", green: "#15803d", yellow: "#a16207", peach: "#c2410c",
      red: "#e01b24", mauve: "#5b21b6", pink: "#be185d",
    },
    roles: { accent: "red", accent2: "text", accent3: "overlay1" },
    type: { display: "archivo", body: "inter", mono: "plexMono", weight: 900, tracking: "-0.045em" },
    decor: "grid",
    hljs: `${HL}github.min.css`,
  },

  arctic: {
    label: "arctic",
    mood: "light",
    blurb: "Nord inverted. Frost blue on cool paper, with contour waves.",
    neutrals: {
      crust: "#e3e8ef", mantle: "#eceff4", base: "#f7f9fc",
      surface0: "#dbe1ea", surface1: "#c2cad6", surface2: "#a3adbd",
      overlay0: "#7b8797", overlay1: "#5f6b7c",
      subtext0: "#445060", subtext1: "#364150", text: "#2e3440",
    },
    accents: {
      lavender: "#9c6f96", blue: "#4a7ba7", sapphire: "#2f7d94", sky: "#3d8fa8",
      teal: "#3b8b8a", green: "#5d8a45", yellow: "#b08834", peach: "#c06a4a",
      red: "#b0505a", mauve: "#96628f", pink: "#a86a94",
    },
    roles: { accent: "sapphire", accent2: "blue", accent3: "teal" },
    type: { display: "manrope", body: "plexSans", mono: "jetbrains", weight: 800, tracking: "-0.035em" },
    decor: "waves",
    hljs: `${HL}atom-one-light.min.css`,
  },
};

/**
 * Ordered for the theme menu: dark first, then light, each roughly from
 * calmest to loudest.
 */
export const THEME_IDS = [
  "midnight", "tokyo", "nord", "dracula", "gruvbox", "rosepine", "forest", "kanagawa", "neon", "shadcn",
  "daylight", "arctic", "solarized", "paper", "rosequartz", "swiss",
] as const;

export type ThemeName = string;

export const THEMES: Record<string, Theme> = Object.fromEntries(
  THEME_IDS.map((id) => [id, { id, ...SPECS[id] }])
);

/** `dark` and `light` predate the registry and still name the two originals. */
const ALIASES: Record<string, string> = {
  dark: "nord",
  light: "daylight",
  mocha: "midnight",
  latte: "daylight",
  "tokyo-night": "tokyo",
  "rose-pine": "rosepine",
  "rose-quartz": "rosequartz",
  "shadcn/ui": "shadcn",
};

export const DEFAULT_THEME = "nord";

/** A theme id from untrusted input, or `null` if it names nothing. */
export function findTheme(input: string | undefined | null): string | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (THEMES[key]) return key;
  return ALIASES[key] ?? null;
}

/** A theme id from untrusted input, falling back to the default. */
export function resolveThemeName(input: string | undefined | null): ThemeName {
  return findTheme(input) ?? DEFAULT_THEME;
}

export interface ThemeSummary {
  id: string;
  label: string;
  mood: Mood;
  blurb: string;
  decor: DecorName;
  /** Enough of the palette for the editor to paint a live thumbnail. */
  colors: {
    crust: string; mantle: string; base: string; surface0: string;
    overlay1: string; subtext1: string; text: string;
    accent: string; accent2: string; accent3: string;
  };
  /** Real font stacks, so each card is set in the face it is offering. */
  fonts: { display: string; body: string; mono: string };
}

/** What the editor's theme picker and the CLI's `--theme` help text list. */
export function themeSummaries(): ThemeSummary[] {
  return THEME_IDS.map((id) => {
    const t = THEMES[id];
    const n = t.neutrals;
    return {
      id,
      label: t.label,
      mood: t.mood,
      blurb: t.blurb,
      decor: t.decor,
      colors: {
        crust: n.crust, mantle: n.mantle, base: n.base, surface0: n.surface0,
        overlay1: n.overlay1, subtext1: n.subtext1, text: n.text,
        accent: role(t, "accent"),
        accent2: role(t, "accent2"),
        accent3: role(t, "accent3"),
      },
      fonts: {
        display: FONTS[t.type.display].stack,
        body: FONTS[t.type.body].stack,
        mono: FONTS[t.type.mono].stack,
      },
    };
  });
}

/** One line per theme, for `deckrun --list-themes`. */
export function themeListing(): string[] {
  const pad = Math.max(...THEME_IDS.map((id) => id.length));
  return THEME_IDS.map((id) => {
    const t = THEMES[id];
    return `${id.padEnd(pad)}  ${t.mood === "dark" ? "dark " : "light"}  ${t.blurb}`;
  });
}

function palette(t: Theme): Record<string, string> {
  return { ...t.neutrals, ...t.accents };
}

function role(t: Theme, which: keyof Roles): string {
  return palette(t)[t.roles[which]];
}

// ── CSS emission ──────────────────────────────────────────────────────────

/**
 * Every custom property a theme owns. The palette slots come out verbatim;
 * everything below them is derived, so the tints, shadows, and decor colors
 * of a new theme land in the right register without being hand-picked.
 */
function themeVars(t: Theme): string {
  const n = t.neutrals;
  const a = t.accents;
  const dark = t.mood === "dark";
  const accent = role(t, "accent");
  const accent2 = role(t, "accent2");
  const accent3 = role(t, "accent3");

  // Light themes need a tinted shadow rather than black, or every panel edge
  // turns to soot; dark themes need real black to read as depth at all.
  const sh = dark ? "0, 0, 0" : channels(n.text);
  const s = (y: number, blur: number, op: number) =>
    `0 ${y}px ${blur}px rgba(${sh}, ${dark ? op : op * 0.42})`;

  const lines: Array<[string, string]> = [
    ["crust", n.crust], ["mantle", n.mantle], ["base", n.base],
    ["surface0", n.surface0], ["surface1", n.surface1], ["surface2", n.surface2],
    ["overlay0", n.overlay0], ["overlay1", n.overlay1],
    ["subtext0", n.subtext0], ["subtext1", n.subtext1], ["text", n.text],

    // All eleven ship whether or not the stylesheet names each one: they are
    // the paint box a deck reaches into, and the deck reads several of them
    // back out at runtime for the pen's color swatches.
    ["lavender", a.lavender], ["blue", a.blue], ["sapphire", a.sapphire],
    ["sky", a.sky], ["teal", a.teal], ["green", a.green], ["yellow", a.yellow],
    ["peach", a.peach], ["red", a.red], ["mauve", a.mauve], ["pink", a.pink],

    // The three leading colors, and the tints every surface borrows from them.
    ["accent", accent],
    ["accent-2", accent2],
    ["accent-3", accent3],
    ["accent-soft", alpha(accent, dark ? 0.1 : 0.09)],
    ["accent-line", alpha(accent, dark ? 0.42 : 0.34)],
    ["glow", alpha(accent, dark ? 0.34 : 0.22)],
    ["gradient", `linear-gradient(115deg, ${accent}, ${accent2} 58%, ${accent3})`],
    ["accent-fade", `linear-gradient(90deg, ${accent}, ${alpha(accent, 0.45)} 62%, transparent)`],

    ["surface-soft", alpha(n.surface0, dark ? 0.34 : 0.42)],
    ["crust-overlay", alpha(n.crust, dark ? 0.84 : 0.88)],
    ["scrim", dark ? "rgba(0, 0, 0, 0.5)" : alpha(n.text, 0.26)],
    ["hairline", alpha(n.text, dark ? 0.09 : 0.11)],

    ["shadow-md", s(8, 28, 0.42)],
    ["shadow-lg", s(24, 68, 0.52)],
    ["code-shadow", s(6, 26, 0.4)],

    ["font-display", FONTS[t.type.display].stack],
    ["font-body", FONTS[t.type.body].stack],
    ["font-mono", FONTS[t.type.mono].stack],
    ["display-weight", String(t.type.weight ?? 700)],
    ["display-tracking", t.type.tracking ?? "-0.02em"],
    ["display-case", t.type.case ?? "none"],
    ["body-tracking", t.type.bodyTracking ?? "0"],

    // Decor colors. Light themes take darker lines and gentler glows, since a
    // pale wash on paper reads as a smudge rather than as light.
    ["decor-line", alpha(n.text, dark ? 0.05 : 0.07)],
    ["decor-dot", alpha(n.text, dark ? 0.085 : 0.1)],
    ["decor-glow-1", alpha(accent, dark ? 0.2 : 0.15)],
    ["decor-glow-2", alpha(accent2, dark ? 0.16 : 0.12)],
    ["decor-glow-3", alpha(accent3, dark ? 0.13 : 0.1)],
  ];

  const pad = Math.max(...lines.map(([k]) => k.length));
  return lines
    .map(([k, v]) => `  --${k}:${" ".repeat(pad - k.length + 1)}${v};`)
    .join("\n");
}

/** The palette for one baked-in theme, for a deck that never switches. */
export function themeRootCss(theme: ThemeName): string {
  return `:root {\n${themeVars(THEMES[resolveThemeName(theme)])}\n}`;
}

/** Every palette, switchable at runtime via `[data-theme]` on the root. */
export function themeSwitchableCss(): string {
  const blocks = THEME_IDS.map((id) => {
    const selector = id === DEFAULT_THEME
      ? `:root, :root[data-theme="${id}"]`
      : `:root[data-theme="${id}"]`;
    return `${selector} {\n${themeVars(THEMES[id])}\n}`;
  });
  return blocks.join("\n\n");
}

/** Stylesheet URL for the Highlight.js theme that pairs with a palette. */
export function hljsHref(theme: ThemeName): string {
  return THEMES[resolveThemeName(theme)].hljs;
}

/** `{ midnight: "https://…", … }`, for the preview's runtime theme swap. */
export function hljsMapJson(): string {
  return JSON.stringify(
    Object.fromEntries(THEME_IDS.map((id) => [id, THEMES[id].hljs]))
  );
}

/** `{ midnight: "orbs", … }`, so a theme swap swaps its backdrop with it. */
export function decorMapJson(): string {
  return JSON.stringify(
    Object.fromEntries(THEME_IDS.map((id) => [id, THEMES[id].decor]))
  );
}

export function decorOf(theme: ThemeName): DecorName {
  return THEMES[resolveThemeName(theme)].decor;
}

// ── Decor ─────────────────────────────────────────────────────────────────

/**
 * Each pattern is nothing but custom properties, read by the two rules in
 * `DECOR_CSS` that paint the backdrop. So a new pattern is a new entry here
 * plus its name in `DecorName` — no new selectors, and it works on screen and
 * in the PDF alike.
 *
 *   --dc-layers / -size / -pos / -repeat   the texture, as background layers
 *   --dc-mask                              vignette, applied to the container
 *   --dc-inset                             overscan, so motion never shows an edge
 *   --dc-anim + --dc-dx/-dy                the drift; dx/dy must equal exactly
 *                                          one tile of the pattern, or the loop
 *                                          visibly jumps
 *   --dc-glow*                             a second layer of pure light
 */
const DECORS: Record<string, string> = {
  none: `
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent);
  --dc-glow-size: 74vmax 74vmax, 58vmax 58vmax;
  --dc-glow-pos: 92% -20%, -14% 112%;
  --dc-glow-anim: dc-breathe 34s ease-in-out infinite;`,

  grid: `
  --dc-layers:
    linear-gradient(to right, var(--decor-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--decor-line) 1px, transparent 1px);
  --dc-size: 72px 72px;
  --dc-mask: radial-gradient(ellipse 88% 76% at 50% 40%, #000 24%, transparent 82%);
  --dc-anim: dc-pan 150s linear infinite;
  --dc-dx: 72px;
  --dc-dy: 72px;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent);
  --dc-glow-size: 70vmax 70vmax, 56vmax 56vmax;
  --dc-glow-pos: 90% -22%, -12% 110%;
  --dc-glow-anim: dc-breathe 30s ease-in-out infinite;`,

  dots: `
  --dc-layers: radial-gradient(var(--decor-dot) 1.4px, transparent 1.6px);
  --dc-size: 30px 30px;
  --dc-mask: radial-gradient(ellipse 92% 80% at 50% 42%, #000 20%, transparent 84%);
  --dc-anim: dc-pan 160s linear infinite;
  --dc-dx: 30px;
  --dc-dy: 30px;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-3), transparent);
  --dc-glow-size: 64vmax 64vmax, 50vmax 50vmax;
  --dc-glow-pos: -14% -18%, 106% 96%;
  --dc-glow-anim: dc-breathe 36s ease-in-out infinite;`,

  topo: `
  --dc-layers: repeating-linear-gradient(52deg,
    var(--decor-line) 0 1px,
    transparent 1px 22px);
  --dc-mask: radial-gradient(ellipse 92% 84% at 46% 44%, #000 18%, transparent 86%);
  --dc-anim: dc-pan 90s linear infinite;
  --dc-dx: 17.34px;
  --dc-dy: -13.54px;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent);
  --dc-glow-size: 72vmax 72vmax, 52vmax 52vmax;
  --dc-glow-pos: 96% 8%, -10% 104%;
  --dc-glow-anim: dc-breathe 32s ease-in-out infinite;`,

  beams: `
  --dc-layers: repeating-linear-gradient(105deg,
    transparent 0 44px,
    var(--decor-glow-1) 44px 118px,
    transparent 118px 166px,
    var(--decor-glow-2) 166px 214px,
    transparent 214px 300px);
  --dc-mask: linear-gradient(to bottom, transparent, #000 22%, #000 70%, transparent);
  --dc-inset: -30%;
  --dc-anim: dc-pan 44s linear infinite;
  --dc-dx: 289.8px;
  --dc-dy: 77.6px;
  --dc-glow: radial-gradient(closest-side, var(--decor-glow-3), transparent);
  --dc-glow-size: 80vmax 80vmax;
  --dc-glow-pos: 50% 118%;
  --dc-glow-anim: dc-breathe 26s ease-in-out infinite;`,

  rings: `
  --dc-layers: repeating-radial-gradient(circle at 50% 50%,
    transparent 0 78px,
    var(--decor-line) 78px 79px,
    transparent 79px 158px);
  --dc-size: 100% 100%;
  --dc-repeat: no-repeat;
  --dc-mask: radial-gradient(circle at 50% 46%, #000 12%, transparent 74%);
  --dc-inset: -45%;
  --dc-anim: dc-zoom 52s ease-in-out infinite;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent);
  --dc-glow-size: 62vmax 62vmax, 48vmax 48vmax;
  --dc-glow-pos: 8% 4%, 96% 92%;
  --dc-glow-anim: dc-breathe 38s ease-in-out infinite;`,

  waves: `
  --dc-layers:
    radial-gradient(130% 62% at 50% 128%, transparent 57.6%, var(--decor-line) 58%, transparent 58.4%),
    radial-gradient(130% 66% at 46% 140%, transparent 57.6%, var(--decor-line) 58%, transparent 58.4%),
    radial-gradient(140% 72% at 54% 154%, transparent 57.6%, var(--decor-line) 58%, transparent 58.4%),
    radial-gradient(150% 80% at 50% 172%, transparent 57.6%, var(--decor-line) 58%, transparent 58.4%);
  --dc-size: 100% 100%;
  --dc-repeat: no-repeat;
  --dc-inset: -14%;
  --dc-anim: dc-sway 40s ease-in-out infinite;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-3), transparent);
  --dc-glow-size: 76vmax 60vmax, 54vmax 54vmax;
  --dc-glow-pos: 50% 116%, 88% -16%;
  --dc-glow-anim: dc-breathe 30s ease-in-out infinite;`,

  orbs: `
  --dc-layers:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent),
    radial-gradient(closest-side, var(--decor-glow-3), transparent);
  --dc-size: 64vmax 64vmax, 50vmax 50vmax, 42vmax 42vmax;
  --dc-pos: 10% 6%, 86% 28%, 60% 98%;
  --dc-repeat: no-repeat;
  --dc-inset: -22%;
  --dc-anim: dc-float 56s ease-in-out infinite;`,

  mesh: `
  --dc-layers:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent),
    radial-gradient(closest-side, var(--decor-glow-3), transparent),
    radial-gradient(var(--decor-dot) 1px, transparent 1.4px);
  --dc-size: 58vmax 58vmax, 54vmax 54vmax, 46vmax 46vmax, 26px 26px;
  --dc-pos: -8% -14%, 98% 16%, 44% 106%, 0 0;
  --dc-repeat: no-repeat, no-repeat, no-repeat, repeat;
  --dc-inset: -20%;
  --dc-anim: dc-float 62s ease-in-out infinite;`,

  aurora: `
  --dc-layers:
    radial-gradient(ellipse 72% 34% at 20% 20%, var(--decor-glow-1), transparent 68%),
    radial-gradient(ellipse 62% 30% at 78% 34%, var(--decor-glow-2), transparent 68%),
    radial-gradient(ellipse 94% 28% at 50% 84%, var(--decor-glow-3), transparent 70%);
  --dc-size: 100% 100%;
  --dc-repeat: no-repeat;
  --dc-inset: -18%;
  --dc-anim: dc-aurora 58s ease-in-out infinite;`,
};

export type DecorName = keyof typeof DECORS | string;

/**
 * The backdrop: one fixed layer behind every slide on screen, and the same
 * geometry re-attached to each page when the deck is printed, since a fixed
 * element does not repeat across a paged medium.
 */
export const DECOR_CSS = `/* ── Backdrop geometry ────────────────────────────────────────────────── */
${Object.entries(DECORS)
  .map(([name, vars]) => `:root[data-decor="${name}"] {${vars}\n}`)
  .join("\n\n")}

#backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: var(--dc-mask, none);
          mask-image: var(--dc-mask, none);
}

#backdrop::before,
#backdrop::after {
  content: '';
  position: absolute;
  inset: var(--dc-inset, -12%);
  background-repeat: var(--dc-repeat, repeat);
  will-change: transform;
}

#backdrop::before {
  background-image: var(--dc-layers, none);
  background-size: var(--dc-size, auto);
  background-position: var(--dc-pos, 0 0);
  animation: var(--dc-anim, none);
}

#backdrop::after {
  background-image: var(--dc-glow, none);
  background-size: var(--dc-glow-size, auto);
  background-position: var(--dc-glow-pos, 0 0);
  background-repeat: no-repeat;
  animation: var(--dc-glow-anim, none);
}

/* One tile of travel per cycle, so the pattern lands back on itself. */
@keyframes dc-pan {
  to { transform: translate3d(var(--dc-dx, 0px), var(--dc-dy, 0px), 0); }
}

@keyframes dc-float {
  0%, 100% { transform: translate3d(-1.5%, -1%, 0) scale(1); }
  34%      { transform: translate3d(2%, 1.5%, 0)   scale(1.06); }
  67%      { transform: translate3d(-1%, 2%, 0)    scale(0.97); }
}

@keyframes dc-sway {
  0%, 100% { transform: translate3d(-2.5%, 0, 0) scale(1); }
  50%      { transform: translate3d(2.5%, 1.5%, 0) scale(1.04); }
}

@keyframes dc-zoom {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.1); }
}

@keyframes dc-aurora {
  0%, 100% { transform: translate3d(0, 0, 0) skewY(0deg); }
  50%      { transform: translate3d(3%, -2%, 0) skewY(-1.6deg); }
}

@keyframes dc-breathe {
  0%, 100% { opacity: 0.75; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.07); }
}

/* A drifting backdrop is exactly the kind of motion this setting turns off. */
@media (prefers-reduced-motion: reduce) {
  #backdrop::before,
  #backdrop::after { animation: none !important; }
}

@media print {
  /* Fixed elements do not repeat across pages, so the backdrop is rebuilt on
     each slide instead — same custom properties, no second definition. */
  #backdrop { display: none !important; }

  .slide::before,
  .slide::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    animation: none !important;
    -webkit-mask-image: var(--dc-mask, none);
            mask-image: var(--dc-mask, none);
  }

  .slide::before {
    background-image: var(--dc-layers, none);
    background-size: var(--dc-size, auto);
    background-position: var(--dc-pos, 0 0);
    background-repeat: var(--dc-repeat, repeat);
  }

  .slide::after {
    background-image: var(--dc-glow, none);
    background-size: var(--dc-glow-size, auto);
    background-position: var(--dc-glow-pos, 0 0);
    background-repeat: no-repeat;
  }
}`;

// ── Type scale ────────────────────────────────────────────────────────────

/**
 * How large the slides are set, independently of which theme is on.
 *
 * The scale is not one multiplier applied to everything. Headings and prose
 * pull in different directions as a deck grows: at `xl` the point is to get the
 * *reading* text to the back row, and headings are already legible, so prose
 * grows further than they do. At `s` the reverse — prose tightens more than the
 * headings, which are carrying the structure of the talk.
 *
 * `m` is exactly 1 across the board, so it is the sizing the stylesheet states
 * literally and the other three are honest multiples of it.
 */
export type SizeName = "s" | "m" | "l" | "xl";

interface SizeSpec {
  label: string;
  blurb: string;
  /** Multiplier for h1 through h4. */
  display: number;
  /** Multiplier for prose: paragraphs, lists, blockquotes. */
  body: number;
  /** Multiplier for code, tables, and key caps. */
  code: number;
  /** Leading, tightened as the type grows so lines stay in one block. */
  lead: number;
  /** Slide padding, given back to the content as the type grows. */
  padY: string;
  padX: string;
}

const SIZE_SPECS: Record<SizeName, SizeSpec> = {
  s: {
    label: "small",
    blurb: "More on a slide. For dense reference decks and close screens.",
    display: 0.86, body: 0.88, code: 0.92, lead: 1.03,
    padY: "4rem", padX: "6.4rem",
  },
  m: {
    label: "medium",
    blurb: "The default. Reads from the middle of a normal room.",
    display: 1, body: 1, code: 1, lead: 1,
    padY: "4.4rem", padX: "6rem",
  },
  l: {
    label: "large",
    blurb: "For a wide room, or a talk driven by a handful of lines a slide.",
    display: 1.12, body: 1.18, code: 1.12, lead: 0.97,
    padY: "4rem", padX: "5rem",
  },
  xl: {
    label: "x-large",
    blurb: "Readable from the back row. Expect three or four lines a slide.",
    display: 1.24, body: 1.38, code: 1.24, lead: 0.94,
    padY: "3.4rem", padX: "4.2rem",
  },
};

/** Ordered smallest to largest, which is the order the picker shows them in. */
export const SIZE_IDS: SizeName[] = ["s", "m", "l", "xl"];

export const DEFAULT_SIZE: SizeName = "m";

/** Long spellings, so `--size large` works as well as `--size l`. */
const SIZE_ALIASES: Record<string, SizeName> = {
  small: "s",
  medium: "m",
  m: "m",
  large: "l",
  xlarge: "xl",
  "x-large": "xl",
  "extra-large": "xl",
  huge: "xl",
};

/** A size id from untrusted input, or `null` if it names nothing. */
export function findSize(input: string | undefined | null): SizeName | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (key in SIZE_SPECS) return key as SizeName;
  return SIZE_ALIASES[key] ?? null;
}

/** A size id from untrusted input, falling back to the default. */
export function resolveSizeName(input: string | undefined | null): SizeName {
  return findSize(input) ?? DEFAULT_SIZE;
}

/** What the editor's size control and the CLI's help text list. */
export function sizeSummaries(): Array<{
  id: SizeName; label: string; blurb: string; display: number;
}> {
  return SIZE_IDS.map((id) => ({
    id,
    label: SIZE_SPECS[id].label,
    blurb: SIZE_SPECS[id].blurb,
    // The picker sets each button at its own ratio, so the row is its own key.
    display: SIZE_SPECS[id].display,
  }));
}

/** One line per size, for `deckrun --list-sizes`. */
export function sizeListing(): string[] {
  const pad = Math.max(...SIZE_IDS.map((id) => id.length));
  return SIZE_IDS.map((id) => {
    const z = SIZE_SPECS[id];
    return `${id.padEnd(pad)}  ${z.label.padEnd(7)}  ${z.blurb}`;
  });
}

function sizeVars(z: SizeSpec): string {
  const lines: Array<[string, string]> = [
    ["type-display", String(z.display)],
    ["type-body", String(z.body)],
    ["type-code", String(z.code)],
    ["type-lead", String(z.lead)],
    ["slide-pad-y", z.padY],
    ["slide-pad-x", z.padX],
  ];
  const pad = Math.max(...lines.map(([k]) => k.length));
  return lines
    .map(([k, v]) => `  --${k}:${" ".repeat(pad - k.length + 1)}${v};`)
    .join("\n");
}

/** The scale for one baked-in size, for a deck that never switches. */
export function sizeRootCss(size: SizeName): string {
  return `:root {\n${sizeVars(SIZE_SPECS[resolveSizeName(size)])}\n}`;
}

/** Every scale, switchable at runtime via `[data-size]` on the root. */
export function sizeSwitchableCss(): string {
  return SIZE_IDS.map((id) => {
    const selector = id === DEFAULT_SIZE
      ? `:root, :root[data-size="${id}"]`
      : `:root[data-size="${id}"]`;
    return `${selector} {\n${sizeVars(SIZE_SPECS[id])}\n}`;
  }).join("\n\n");
}

// ── Font overrides ────────────────────────────────────────────────────────

/**
 * A theme names a display face and a body face. Either can be replaced without
 * leaving the theme, and the two are chosen separately, so a serif heading over
 * a sans body — or the reverse — is a setting rather than a fork.
 *
 * The monospace face stays the theme's: code wants the face the palette's
 * highlighting was picked against.
 *
 * Overrides are attributes rather than a second palette. `[data-head]` and
 * `[data-body]` carry the same specificity as `[data-theme]`, and the blocks
 * below are emitted after it, so source order decides and the override wins.
 * No attribute means the theme's own face, which is why there is no "default"
 * entry to keep in step with anything.
 */
export const FONT_IDS: string[] = Object.keys(FONTS);

/** A font key from untrusted input, or `null` for "leave it to the theme". */
export function findFont(input: string | undefined | null): string | null {
  if (!input) return null;
  const key = String(input).trim();
  if (FONTS[key]) return key;
  // Also accept the human name: "space grotesk", "IBM Plex Mono".
  const wanted = key.toLowerCase().replace(/[\s_-]+/g, "");
  for (const id of FONT_IDS) {
    if (id.toLowerCase() === wanted) return id;
    if (fontName(id).toLowerCase().replace(/\s+/g, "") === wanted) return id;
  }
  return null;
}

export interface FontSummary {
  id: string;
  name: string;
  kind: FontFace["kind"];
  stack: string;
}

/** What the editor's font menu lists, in catalog order. */
export function fontSummaries(): FontSummary[] {
  return FONT_IDS.map((id) => ({
    id,
    name: fontName(id),
    kind: FONTS[id].kind,
    stack: FONTS[id].stack,
  }));
}

/** One line per face, for `deckrun --list-fonts`. */
export function fontListing(): string[] {
  const pad = Math.max(...FONT_IDS.map((id) => id.length));
  return FONT_IDS.map(
    (id) => `${id.padEnd(pad)}  ${FONTS[id].kind.padEnd(5)}  ${fontName(id)}`
  );
}

/**
 * Every face, in both slots. Emitted once and shared by the deck, the editor,
 * and the preview, so a runtime change is an attribute swap rather than a
 * restyle.
 */
export function fontOverrideCss(): string {
  const blocks: string[] = [];
  for (const id of FONT_IDS) {
    blocks.push(`:root[data-head="${id}"] { --font-display: ${FONTS[id].stack}; }`);
  }
  for (const id of FONT_IDS) {
    blocks.push(`:root[data-body="${id}"] { --font-body: ${FONTS[id].stack}; }`);
  }
  return `/* ── Font overrides ───────────────────────────────────────────────────── */\n${blocks.join("\n")}`;
}
