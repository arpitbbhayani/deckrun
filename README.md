# present-md

Write slides in Markdown, run locally, and present in the browser.

![Slide showing a code-heavy presentation with syntax highlighting](https://github.com/user-attachments/assets/07b0659c-f82c-44b2-8ecd-815dfd081c49)

## Installation

Install the package globally using npm:

```bash
npm install -g present-md
```

You can also run it directly without installation using `npx`:

```bash
npx present-md slides.md
```

## Usage

```bash
# Serve on default port 7890 and open the browser
present-md slides.md

# Serve on a custom port
present-md slides.md -p 3000

# Start server without opening a browser tab
present-md slides.md --no-open

# Prompt to enter fullscreen on first interaction
present-md slides.md --fullscreen

# Use light theme (Catppuccin Latte)
present-md slides.md --theme light
```
### CLI options

| Option                | Default | Description                                          |
| --------------------- | ------- | ---------------------------------------------------- |
| `-p, --port <number>` | `7890`  | Port to serve the presentation on                    |
| `--no-open`           | `false` | Start the HTTP server without opening the browser    |
| `--fullscreen`        | `false` | Prompt to enter fullscreen on first user interaction |
| `--theme <name>`      | `dark`  | Color theme (`dark` or `light`)                      |
| `-v, --version`       |         | Display version number                               |
| `-h, --help`          |         | Display help for command                             |

## Slide authoring

Separate slides using `---` on its own line:

```markdown
# First slide

Introduction text goes here.

---

## Second slide

Content for the next slide.

---

# Conclusion
```

The presentation extracts the first heading from the slide deck and sets it as the HTML page title. If no heading exists, it falls back to the Markdown filename.

### Formatting

Write slide content using standard Markdown syntax, including headings, lists, tables, blockquotes, horizontal rules, and inline code:

```markdown
## System Architecture

> Any fool can write code that a computer can understand. Good programmers write code that humans can understand. - Martin Fowler

- Ingestion pipeline with backpressure controls
- Memory-mapped buffer storage
  - Zero-copy ring buffer
  - Page-aligned disk persistence

| Service     | Port | Protocol |
| ----------- | ---- | -------- |
| api-gateway | 8080 | HTTP/2   |
| worker-pool | 9090 | gRPC     |
```

### Code blocks

Fenced code blocks include automatic syntax highlighting via Highlight.js:

````markdown
```typescript
interface Slide {
  html: string;
  bgImage?: PositionedImage;
  rightImage?: PositionedImage;
  leftImage?: PositionedImage;
  notes?: string;
}

function parseSlides(markdown: string): Slide[] {
  return markdown
    .split(/\n---\n/)
    .filter(Boolean)
    .map(raw => processSlide(raw));
}
```
````

### Speaker notes

Add speaker notes using HTML comments containing a `notes:` directive:

```markdown
## Deployment Strategy

Rolling deployment with zero downtime.

<!-- notes: Review database migration rollout steps before advancing. -->
```

### Image layout and directives

Control image placement and opacity by specifying directives in the image title attribute:

```markdown
![Architecture Diagram](diagram.png "right")
![Benchmark Graph](benchmark.png "left")
![Background Graphic](backdrop.png "bg")
![Telemetry Dashboard](dashboard.png "right opacity:0.8")
![Inline Figure](figure.png)
```

| Directive   | Description                                                                       |
| ----------- | --------------------------------------------------------------------------------- |
| `right`     | Split layout: content sits on the left, image fills the right panel               |
| `left`      | Split layout: image fills the left panel, content sits on the right               |
| `bg`        | Background layout: image covers the full slide canvas beneath the text content    |
| `opacity:N` | Image opacity between `0.0` and `1.0` (combinable with `left`, `right`, or `bg`)  |

Inline images without directives render centered within standard document flow.

## Themes

The presentation provides two built-in themes using the Catppuccin color palette:

- `dark` (default): Catppuccin Mocha palette with Tokyo Night Dark code syntax highlighting
- `light`: Catppuccin Latte palette with Atom One Light code syntax highlighting

Select the theme with the `--theme` flag:

```bash
present-md slides.md --theme light
```

## Navigation and controls

Navigate presentations using keyboard shortcuts, on-screen buttons, or touchscreen gestures.

### Keyboard shortcuts

| Key                       | Action                                     |
| ------------------------- | ------------------------------------------ |
| `Right`, `Down`, `Space`  | Advance to the next slide                  |
| `Left`, `Up`, `Backspace` | Return to the previous slide               |
| `Home`                    | Jump to the first slide                    |
| `End`                     | Jump to the last slide                     |
| `O`, `Escape`             | Toggle the overview grid                   |
| `F`                       | Toggle fullscreen mode                     |

### Mouse and touch controls

- Click the navigation arrow buttons on either side of the screen
- Swipe left or right on touchscreen devices to advance or return
- Click any thumbnail in overview mode to jump directly to that slide

### Overview mode

Press `O` or `Escape` to toggle a grid overview displaying live rendered thumbnails of every slide in the deck. Selecting a thumbnail transitions to that slide.

### Fullscreen mode

Pass `--fullscreen` to display a launch overlay that requests fullscreen on the first keypress or click. You can also toggle fullscreen at any time during presentation with the `F` key.

## Visual elements

- Terminal aesthetics: Monospace typography throughout using IBM Plex Mono, complemented by a blinking cursor in the top right
- Animated slide transitions: Direction-aware sliding animations when navigating forwards or backwards
- HUD overlay: Bottom progress bar with a gradient fill and active slide counter
- Pixel pets: Three animated pets randomly selected from VS Code Pets appear along the bottom interface
- Temporary key hint: A keyboard navigation reminder that displays on load and fades after 4 seconds

## PDF export

Export presentations to PDF using the print dialog in any modern browser (`Ctrl+P` or `Cmd+P`):

- Dedicated `@media print` styles format each slide as a standalone landscape page
- UI elements (HUD, navigation arrows, cursor, pixel pets, keyboard hints) are automatically hidden
- Background colors and styling are preserved when background graphics are enabled in print settings

## Local asset server

`present-md` starts a local HTTP server that serves files relative to the directory of the Markdown file. This ensures local images, diagrams, fonts, and media load reliably without browser CORS restrictions. If the specified port is unavailable, the server automatically finds an open port.

## Complete slide template

Below is a complete multi-slide Markdown deck illustrating common layout combinations, syntax highlighting, image directives, and speaker notes:

````markdown
# Scaling Distributed Systems

Building resilient, event-driven architectures in production.

![Cover Background](assets/cover.png "bg opacity:0.25")

<!-- notes: Introduce the talk and set context on modern distributed scale. -->

---

## Architectural Overview

- Microservices communicate over gRPC for low-latency RPCs
- Events stream through Apache Kafka for durable message logs
- Read replicas scale consumer queries horizontally

![Architecture Diagram](assets/architecture.png "right opacity:0.95")

<!-- notes: Walk through the request path from gateway to storage engine. -->

---

## Consumer Worker Implementation

```go
func (w *Worker) ProcessEvent(ctx context.Context, msg *kafka.Message) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    if err := w.store.Save(ctx, msg.Value); err != nil {
        return fmt.Errorf("failed to persist event: %w", err)
    }
    return nil
}
```

<!-- notes: Emphasize context timeout handling on message persistence. -->

---

## Performance Benchmark

| Configuration | Throughput (req/s) | p99 Latency (ms) |
| ------------- | ------------------ | ---------------- |
| Single node   | 12,400             | 18.2             |
| 3-node cluster| 35,100             | 6.4              |
| 5-node cluster| 58,900             | 4.1              |

---

# Summary

- Favor asynchronous message passing for decoupled services
- Apply database timeouts at the connection and role layer
- Use structured event logs for auditing state mutations
````

## Examples

Sample slide decks are available in the `examples/` directory:

- `examples/example-1.md` - Feature walkthrough covering syntax, split layouts, opacity, and shortcuts
- `examples/example-2.md` - Complete technical presentation on databases and agentic AI

Run any example directly from the repository:

```bash
# Run the feature showcase deck
present-md examples/example-1.md

# Run the technical presentation in light theme on port 3000
present-md examples/example-2.md -p 3000 --theme light

# Run fullscreen without opening a browser
present-md examples/example-1.md --fullscreen --no-open
```
