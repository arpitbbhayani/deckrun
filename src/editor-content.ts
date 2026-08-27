/**
 * Content that drives the editor's discovery surfaces: the welcome deck, the
 * snippet registry behind the guide drawer and the command palette, and the
 * ambient tips carousel. Kept as data so every surface renders the same list.
 */

export interface Snippet {
  id: string;
  group: string;
  label: string;
  hint: string;
  /** Shown as the code chip in the guide. Single line, may be abbreviated. */
  syntax: string;
  /** Text inserted at the caret. `{sel}` receives the selection, `{caret}` parks the caret. */
  insert?: string;
  /** Named client action for palette entries that do something other than insert. */
  action?: string;
  /** Human-readable shortcut, shown right-aligned. */
  keys?: string;
  /** Insert on its own block, separated from surrounding text by blank lines. */
  block?: boolean;
}

export const SNIPPET_GROUPS = [
  "Slides",
  "Text",
  "Lists & tables",
  "Code",
  "Images",
  "Embeds",
  "Actions",
] as const;

export const SNIPPETS: Snippet[] = [
  // ── Slides ───────────────────────────────────────────────────────────────
  {
    id: "slide-break",
    group: "Slides",
    label: "New slide",
    hint: "Three dashes on their own line end one slide and start the next.",
    syntax: "---",
    insert: "\n---\n\n## {caret}\n",
    keys: "Cmd D",
  },
  {
    id: "slide-title",
    group: "Slides",
    label: "Title slide",
    hint: "An h1 reads largest and in mauve. Use it for the opener and section breaks.",
    syntax: "# Title\\n\\nSubtitle line",
    insert: "# {caret}\n\nOne line that frames the talk.\n",
    block: true,
  },
  {
    id: "slide-section",
    group: "Slides",
    label: "Section divider",
    hint: "A slide holding nothing but an h1 gives the audience a beat to reset.",
    syntax: "# Part 2",
    insert: "\n---\n\n# {caret}\n",
  },
  {
    id: "slide-notes",
    group: "Slides",
    label: "Speaker notes",
    hint: "Stripped from the slide and the PDF. Shown under the preview while you write.",
    syntax: '<!-- notes: what to say here -->',
    insert: "\n<!-- notes: {caret} -->\n",
  },

  // ── Text ─────────────────────────────────────────────────────────────────
  {
    id: "h2",
    group: "Text",
    label: "Slide title (h2)",
    hint: "Blue, the workhorse heading for a content slide.",
    syntax: "## Slide title",
    insert: "## {caret}",
  },
  {
    id: "h3",
    group: "Text",
    label: "Subheading (h3)",
    hint: "Sky blue, for splitting a slide into two named halves.",
    syntax: "### Subheading",
    insert: "### {caret}",
  },
  {
    id: "bold",
    group: "Text",
    label: "Bold",
    hint: "Renders peach. Reserve it for the one term that has to land.",
    syntax: "**term**",
    insert: "**{sel}**",
    keys: "Cmd B",
  },
  {
    id: "italic",
    group: "Text",
    label: "Italic",
    hint: "Muted grey, right for an aside or a caveat.",
    syntax: "*aside*",
    insert: "*{sel}*",
    keys: "Cmd I",
  },
  {
    id: "inline-code",
    group: "Text",
    label: "Inline code",
    hint: "Green chip. Use it for identifiers, flags, paths, and config keys.",
    syntax: "`fsync()`",
    insert: "`{sel}`",
    keys: "Cmd E",
  },
  {
    id: "quote",
    group: "Text",
    label: "Blockquote",
    hint: "Mauve rule on a tinted background. Good for the insight in one sentence.",
    syntax: "> the log is the source of truth",
    insert: "> {caret}",
    block: true,
  },
  {
    id: "link",
    group: "Text",
    label: "Link",
    hint: "Blue with an underline. Clickable while presenting.",
    syntax: "[label](https://example.com)",
    insert: "[{sel}](https://{caret})",
    keys: "Cmd K",
  },
  {
    id: "kbd",
    group: "Text",
    label: "Keyboard key",
    hint: "Raw HTML renders as a physical key cap. Handy for demo instructions.",
    syntax: "<kbd>Cmd</kbd>",
    insert: "<kbd>{sel}</kbd>",
  },
  {
    id: "mark",
    group: "Text",
    label: "Highlight",
    hint: "Yellow underline on a tinted background, for the number that matters.",
    syntax: "<mark>42ms</mark>",
    insert: "<mark>{sel}</mark>",
  },
  {
    id: "rule",
    group: "Text",
    label: "Horizontal rule",
    hint: "A rule inside a slide. Never use --- for this, it breaks the slide.",
    syntax: "***",
    insert: "\n***\n",
  },

  // ── Lists & tables ───────────────────────────────────────────────────────
  {
    id: "bullets",
    group: "Lists & tables",
    label: "Bullet list",
    hint: "Mauve markers. Seven bullets is about the ceiling for a projected slide.",
    syntax: "- point",
    insert: "- {caret}\n- \n- ",
    block: true,
  },
  {
    id: "numbered",
    group: "Lists & tables",
    label: "Numbered list",
    hint: "Use it when order carries meaning, like the steps of a protocol.",
    syntax: "1. first",
    insert: "1. {caret}\n2. \n3. ",
    block: true,
  },
  {
    id: "nested",
    group: "Lists & tables",
    label: "Nested list",
    hint: "Two spaces per level. One level of nesting is usually enough.",
    syntax: "- parent\\n  - child",
    insert: "- {caret}\n  - \n  - ",
    block: true,
  },
  {
    id: "table",
    group: "Lists & tables",
    label: "Table",
    hint: "Lavender headers, mauve underline, zebra rows. Ideal for benchmarks.",
    syntax: "| col | col |",
    insert:
      "| Config | Throughput | p99 |\n| ------ | ---------- | --- |\n| {caret} |  |  |\n|  |  |  |",
    block: true,
  },

  // ── Code ─────────────────────────────────────────────────────────────────
  {
    id: "code-go",
    group: "Code",
    label: "Code block (Go)",
    hint: "Tag the language and Highlight.js picks the right grammar.",
    syntax: "```go",
    insert: "```go\n{caret}\n```",
    block: true,
  },
  {
    id: "code-ts",
    group: "Code",
    label: "Code block (TypeScript)",
    hint: "Long lines scroll sideways instead of reflowing mid-talk.",
    syntax: "```typescript",
    insert: "```typescript\n{caret}\n```",
    block: true,
  },
  {
    id: "code-sql",
    group: "Code",
    label: "Code block (SQL)",
    hint: "Trim to the clause that makes the point. No boilerplate.",
    syntax: "```sql",
    insert: "```sql\n{caret}\n```",
    block: true,
  },
  {
    id: "code-bash",
    group: "Code",
    label: "Code block (shell)",
    hint: "Use it for the command you want the audience to copy.",
    syntax: "```bash",
    insert: "```bash\n{caret}\n```",
    block: true,
  },
  {
    id: "code-plain",
    group: "Code",
    label: "ASCII diagram",
    hint: "An untagged block keeps spacing exact. Boxes and arrows beat prose.",
    syntax: "```text",
    insert:
      "```text\nClient --> [ LB ] --> [ App ] --> [ DB ]\n{caret}\n```",
    block: true,
  },

  // ── Images ───────────────────────────────────────────────────────────────
  {
    id: "img-inline",
    group: "Images",
    label: "Inline image",
    hint: "Path resolves against the folder you launched in. Centered, capped at 55% of the slide height.",
    syntax: "![alt](diagram.png)",
    insert: "![{sel}](diagram.png)",
  },
  {
    id: "img-right",
    group: "Images",
    label: "Split: image right",
    hint: "Text takes the left half, the image fills the right. The best default for a diagram.",
    syntax: '![alt](diagram.png "right")',
    insert: '![{sel}](diagram.png "right")',
  },
  {
    id: "img-left",
    group: "Images",
    label: "Split: image left",
    hint: "Mirror of the above. Alternate sides across consecutive slides.",
    syntax: '![alt](diagram.png "left")',
    insert: '![{sel}](diagram.png "left")',
  },
  {
    id: "img-bg",
    group: "Images",
    label: "Background image",
    hint: "Covers the whole canvas under the text. Pair it with a low opacity.",
    syntax: '![alt](cover.png "bg opacity:0.25")',
    insert: '![{sel}](cover.png "bg opacity:0.25")',
  },
  {
    id: "img-opacity",
    group: "Images",
    label: "Image opacity",
    hint: "Any value from 0.0 to 1.0, combinable with left, right, or bg.",
    syntax: '"right opacity:0.8"',
    insert: '![{sel}](diagram.png "right opacity:0.8")',
  },

  // ── Embeds ───────────────────────────────────────────────────────────────
  {
    id: "embed-youtube",
    group: "Embeds",
    label: "YouTube video",
    hint: "Raw HTML passes straight through. Sized to 16:9 automatically.",
    syntax: '<iframe src="https://www.youtube.com/embed/ID">',
    insert:
      '<iframe src="https://www.youtube.com/embed/{caret}" title="YouTube" allowfullscreen></iframe>',
    block: true,
  },
  {
    id: "embed-video",
    group: "Embeds",
    label: "Local video",
    hint: "Served from the folder you launched in. MP4 and WebM both work.",
    syntax: "<video src=\"clip.mp4\" controls>",
    insert: '<video src="{caret}clip.mp4" controls muted loop></video>',
    block: true,
  },
  {
    id: "embed-iframe",
    group: "Embeds",
    label: "Any iframe",
    hint: "Dashboards, playgrounds, live docs. Anything that allows framing.",
    syntax: '<iframe src="https://...">',
    insert: '<iframe src="https://{caret}" title="Embed"></iframe>',
    block: true,
  },

  // ── Actions ──────────────────────────────────────────────────────────────
  { id: "act-present",  group: "Actions", label: "Present this deck",        hint: "Opens the real presentation in a new tab.",                 syntax: "", action: "present",  keys: "Cmd Enter" },
  { id: "act-download", group: "Actions", label: "Export as Markdown",       hint: "Downloads a plain .md file. Yours to keep.",                  syntax: "", action: "download", keys: "Cmd S" },
  { id: "act-pdf",      group: "Actions", label: "Export as PDF",            hint: "A real PDF file, one 16:9 page per slide, styling intact.",         syntax: "", action: "pdf",      keys: "Cmd Shift S" },
  { id: "act-html",     group: "Actions", label: "Export as HTML",           hint: "One standalone page holding the whole deck, ready to host or send.", syntax: "", action: "html" },
  { id: "act-open",     group: "Actions", label: "Import a Markdown file",   hint: "Loads a local .md in as a new deck, leaving the others alone.", syntax: "", action: "open" },
  { id: "act-grid",     group: "Actions", label: "Toggle grid preview",      hint: "See every slide at once, click one to jump there.",         syntax: "", action: "grid",     keys: "Cmd G" },
  { id: "act-theme",    group: "Actions", label: "Theme and type size",     hint: "Fourteen palettes with their own fonts and backdrops, at four type sizes. Arrows preview live, brackets resize.", syntax: "", action: "theme",    keys: "Cmd Shift L" },
  { id: "act-guide",    group: "Actions", label: "Open the guide",           hint: "Every layout, style, and embed this editor supports.",      syntax: "", action: "guide",    keys: "Cmd /" },
  { id: "act-decks",    group: "Actions", label: "Switch deck",              hint: "Every deck you have written, kept in this browser.",          syntax: "", action: "decks",     keys: "Cmd O" },
  { id: "act-new",      group: "Actions", label: "New deck",                 hint: "Starts an empty deck and keeps the current one in the library.", syntax: "", action: "new" },
  { id: "act-dupe",     group: "Actions", label: "Duplicate this deck",      hint: "Copies it into the library and switches to the copy.",        syntax: "", action: "duplicate" },
  { id: "act-delete",   group: "Actions", label: "Delete this deck",         hint: "Removes it from this browser. Download it first to keep it.",  syntax: "", action: "delete" },
];

/** Ambient one-liners cycled in the status bar. */
export const TIPS: string[] = [
  'Add "right" to an image title and the slide splits: text left, image right.',
  "Images load by path from the folder you launched in, so keep the deck next to its diagrams.",
  "Cmd K opens the command palette. Every style, layout, and embed is in there.",
  "Your caret drives the preview. Move it into a slide and the preview follows.",
  "Every deck you write is kept in this browser. Cmd O switches between them.",
  "Cmd G lays out every slide as a grid. Click one to jump the caret there.",
  'A background image reads best around "bg opacity:0.25".',
  "Speaker notes live in <!-- notes: ... --> and never reach the slide or the PDF.",
  "Tag the language on a code fence and Highlight.js does the rest.",
  "Everything autosaves to this browser. Nothing is uploaded anywhere.",
  "Drop a .md file onto the editor to load it as a new deck.",
  "Paste a YouTube embed as raw HTML. It is sized to 16:9 for you.",
  "Use *** for a rule inside a slide. --- would start a new one.",
  "<kbd>Cmd</kbd> renders as a key cap, <mark>42ms</mark> as a highlight.",
  "Cmd Enter presents the deck in a new tab, exactly as your audience sees it.",
  "Alt Up and Alt Down hop the caret between slides.",
  "Export as PDF from the top bar: a real file, 16:9 pages, no print dialog to wrestle.",
  "Seven bullets is about the ceiling before a slide stops reading from the back row.",
  "Drag the divider to resize. Double-click it to snap back to an even split.",
  "While presenting, press ? for every control the deck has.",
  "L turns on a laser pointer while presenting. D gives you a pen to draw with.",
  "C drops a blank canvas over the slide, for the diagram you did not plan.",
  "B blacks out the screen mid-talk. Press it again to come back.",
];

/** Deck loaded on a first visit. Doubles as the feature tour. */
export const WELCOME_DECK = `# present-md

### Write slides in Markdown, present in the browser

Everything on the left is a plain \`.md\` file. The right side is the real deck.

<!-- notes: Notes live here. They never reach the slide or the PDF, but you can see them while you write. -->

---

## Type on the left, watch the right

- The preview follows your caret, so it always shows the slide you are editing
- Press <kbd>Cmd</kbd> <kbd>K</kbd> for every style, layout, and embed
- Press <kbd>Cmd</kbd> <kbd>G</kbd> to see the whole deck as a grid
- Press <kbd>Cmd</kbd> <kbd>Enter</kbd> to present for real

Three dashes on their own line start a new slide.

---

## Code gets highlighted

Tag the language and the grammar comes for free:

\`\`\`go
func (w *WAL) Append(e Entry) error {
    if _, err := w.file.Write(e.Encode()); err != nil {
        return fmt.Errorf("append: %w", err)
    }
    return w.file.Sync()
}
\`\`\`

> the log is the source of truth, the data file is a materialized view of it

---

## Tables, lists, and accents

| Configuration  | Throughput | p99 latency     |
| -------------- | ---------- | --------------- |
| Single node    | 12,400/s   | <mark>18.2ms</mark> |
| 3-node cluster | 35,100/s   | 6.4ms           |

- **Bold** lands peach, *italic* recedes, \`inline code\` gets a green chip
- Nesting works too
  - two spaces per level

---

## Images split the slide

An image path resolves against the folder you launched in. Add a directive to the title and it changes the layout:

\`\`\`markdown
![Diagram](diagram.png "right")
![Diagram](diagram.png "left opacity:0.8")
![Cover](cover.png "bg opacity:0.25")
\`\`\`

<!-- notes: Launch present-md in the folder holding your diagrams and the paths just work. -->

---

# Your turn

- Start typing over this deck, or press Cmd O and make a new one
- <kbd>Cmd</kbd> <kbd>S</kbd> downloads the Markdown
- <kbd>Cmd</kbd> <kbd>/</kbd> opens the full guide
`;
