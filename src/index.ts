#!/usr/bin/env node
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { createRequire } from "module";
import { resolve, dirname, basename, extname } from "path";
import { Command } from "commander";
import open from "open";
import { parseSlides, type Slide } from "./parser.js";
import { generateHtml, renderSlide } from "./generate.js";
import {
  DEFAULT_SIZE,
  DEFAULT_THEME,
  findFont,
  findSize,
  findTheme,
  fontListing,
  fontName,
  resolveSizeName,
  resolveThemeName,
  THEMES,
  themeListing,
  sizeListing,
  type SizeName,
  type ThemeName,
} from "./themes.js";
import { generateEditorHtml } from "./editor.js";
import { generatePreviewHtml } from "./preview.js";
import { findBrowser, renderPdfSerial, PdfError } from "./pdf.js";

const c = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  magenta:"\x1b[35m",
};

function packageVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    return require("../package.json").version as string;
  } catch {
    return "0.0.0";
  }
}

const MIME: Record<string, string> = {
  ".html":  "text/html; charset=utf-8",
  ".css":   "text/css",
  ".js":    "application/javascript",
  ".mjs":   "application/javascript",
  ".json":  "application/json",
  ".md":    "text/markdown; charset=utf-8",
  ".txt":   "text/plain; charset=utf-8",
  ".png":   "image/png",
  ".jpg":   "image/jpeg",
  ".jpeg":  "image/jpeg",
  ".gif":   "image/gif",
  ".svg":   "image/svg+xml",
  ".webp":  "image/webp",
  ".ico":   "image/x-icon",
  ".avif":  "image/avif",
  ".mp4":   "video/mp4",
  ".webm":  "video/webm",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
  ".ttf":   "font/ttf",
};

function getMime(filepath: string): string {
  return MIME[extname(filepath).toLowerCase()] ?? "application/octet-stream";
}

async function findFreePort(preferred: number): Promise<number> {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.listen(preferred, () => {
      const addr = server.address() as { port: number };
      server.close(() => resolvePort(addr.port));
    });
    server.on("error", () => {
      // Preferred port is taken, take whatever the OS offers.
      const fallback = createServer();
      fallback.listen(0, () => {
        const addr = fallback.address() as { port: number };
        fallback.close(() => resolvePort(addr.port));
      });
    });
  });
}

/** First heading of the deck, with inline markup stripped. */
function deckTitle(slides: Slide[], fallback: string): string {
  const heading = slides[0]?.html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  const text = heading ? heading[1].replace(/<[^>]+>/g, "").trim() : "";
  return text || fallback;
}

/** A deck name reduced to something safe for a Content-Disposition header. */
function safeFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\.(md|markdown)$/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "deck";
}

const MAX_BODY = 32 * 1024 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let overflowed = false;
    req.on("data", (chunk: Buffer) => {
      if (overflowed) return;
      size += chunk.length;
      if (size > MAX_BODY) {
        // Reject now but keep the socket open long enough to answer with 413.
        overflowed = true;
        chunks.length = 0;
        rejectBody(new Error("request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!overflowed) resolveBody(Buffer.concat(chunks).toString("utf-8"));
    });
    req.on("error", rejectBody);
  });
}

function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

function sendJson(res: ServerResponse, payload: unknown): void {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

interface DeckMode {
  kind: "deck";
  html: string;
}

interface EditorMode {
  kind: "editor";
  theme: ThemeName;
  size: SizeName;
  fonts: { head: string | null; body: string | null };
  fullscreen: boolean;
  /** Filled in once the port is known, so PDF rendering can reach the deck. */
  origin?: string;
}

type Mode = DeckMode | EditorMode;

/** Decks built from editor content, addressable so a new tab can load them. */
const decks = new Map<number, string>();
let deckSeq = 0;

/**
 * Stores a built deck and returns the path that serves it.
 *
 * The path stays at the root on purpose: a deck served from a subpath would
 * resolve `![](diagram.png)` against that subpath instead of the directory
 * being served, and every local image would 404.
 */
function stashDeck(html: string): string {
  const id = ++deckSeq;
  decks.set(id, html);
  // Keep only the handful of most recent builds.
  for (const key of decks.keys()) {
    if (decks.size <= 8) break;
    decks.delete(key);
  }
  return `/?deck=${id}`;
}

/** A built deck, addressed by `?deck=<id>` so its base URL stays the root. */
function serveStashedDeck(id: string, res: ServerResponse): void {
  const html = decks.get(parseInt(id, 10));
  if (!html) {
    res.writeHead(410, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("This build has expired. Press present again in the editor.");
    return;
  }
  sendHtml(res, html);
}

async function handleEditorRoute(
  mode: EditorMode,
  pathname: string,
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  if (pathname === "/__preview" && req.method === "GET") {
    sendHtml(res, generatePreviewHtml(mode.theme, mode.size, mode.fonts));
    return true;
  }

  if (pathname === "/__parse" && req.method === "POST") {
    const markdown = await readBody(req);
    const slides = parseSlides(markdown);
    sendJson(res, {
      slides: slides.map((slide, i) => renderSlide(slide, i)),
      notes: slides.map((slide) => slide.notes ?? ""),
      title: deckTitle(slides, ""),
    });
    return true;
  }

  if (pathname === "/__present" && req.method === "POST") {
    const body = JSON.parse(await readBody(req)) as {
      markdown?: string;
      theme?: string;
      size?: string;
      head?: string | null;
      body?: string | null;
      title?: string;
      print?: boolean;
    };
    const slides = parseSlides(body.markdown ?? "");
    if (slides.length === 0) {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "no slides" }));
      return true;
    }
    const theme = resolveThemeName(body.theme);
    const size = resolveSizeName(body.size);
    const title = deckTitle(slides, body.title?.trim() || "present-md");
    // A deck built for printing must not open behind a fullscreen prompt.
    const forPrint = body.print === true;
    const path = stashDeck(
      generateHtml(slides, title, forPrint ? false : mode.fullscreen, theme, size, {
        head: body.head,
        body: body.body,
      })
    );
    sendJson(res, { path: forPrint ? `${path}&print=1` : path });
    return true;
  }

  if (pathname === "/__pdf" && req.method === "POST") {
    const body = JSON.parse(await readBody(req)) as {
      markdown?: string;
      theme?: string;
      size?: string;
      head?: string | null;
      body?: string | null;
      title?: string;
    };
    const slides = parseSlides(body.markdown ?? "");
    if (slides.length === 0) {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "no slides" }));
      return true;
    }

    const browser = await findBrowser();
    if (!browser) {
      // The caller falls back to the print dialog, which prints correctly too.
      res.writeHead(501, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "no browser",
          detail:
            "No Chrome, Chromium, Edge, or Brave found. Set PRESENT_MD_BROWSER to one to export PDFs directly.",
        })
      );
      return true;
    }

    const theme = resolveThemeName(body.theme);
    const size = resolveSizeName(body.size);
    const title = deckTitle(slides, body.title?.trim() || "present-md");
    const path = stashDeck(
      generateHtml(slides, title, false, theme, size, { head: body.head, body: body.body })
    );

    try {
      const pdf = await renderPdfSerial(`${mode.origin}${path}`, browser);
      const filename = safeFilename(body.title?.trim() || title) + ".pdf";
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Length": pdf.length,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      });
      res.end(pdf);
    } catch (err) {
      const detail = err instanceof PdfError ? err.message : "rendering failed";
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "render failed", detail }));
    }
    return true;
  }

  return false;
}

async function serve(mode: Mode, baseDir: string, port: number): Promise<string> {
  const server = createServer(async (req, res) => {
    try {
      const rawUrl = req.url ?? "/";
      const [rawPath, rawQuery = ""] = rawUrl.split("?");
      const pathname = decodeURIComponent(rawPath);
      const query = new URLSearchParams(rawQuery);

      if (pathname === "/" || pathname === "/index.html") {
        const wantsDeck = mode.kind === "editor" && query.get("deck");
        if (wantsDeck) serveStashedDeck(wantsDeck, res);
        else sendHtml(
          res,
          mode.kind === "deck"
            ? mode.html
            : generateEditorHtml(mode.theme, mode.size, mode.fonts)
        );
        return;
      }

      if (mode.kind === "editor" && (await handleEditorRoute(mode, pathname, req, res))) {
        return;
      }

      // Everything else comes off disk, relative to the working directory.
      const filePath = resolve(baseDir, pathname.replace(/^\/+/, ""));
      if (filePath !== baseDir && !filePath.startsWith(baseDir + "/")) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": getMime(filePath) });
      res.end(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "error";
      if (message === "request body too large") {
        res.writeHead(413, { "Content-Type": "text/plain", Connection: "close" });
        res.end(`Deck is larger than ${Math.round(MAX_BODY / 1024 / 1024)} MB.`);
        req.destroy();
        return;
      }
      if (!res.headersSent) res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  });

  await new Promise<void>((ready) => server.listen(port, "127.0.0.1", ready));
  return `http://127.0.0.1:${port}`;
}

// ── CLI ───────────────────────────────────────────────────────────────────
const program = new Command();

program
  .name("present-md")
  .description(
    "Present a Markdown file in the browser. Run without a file to write one in the built-in editor."
  )
  .version(packageVersion(), "-v, --version", "Print the version number")
  .argument("[file]", "Markdown file to present. Omit it to open the editor.")
  .option("-p, --port <number>", "Port to serve on", "7890")
  .option("--no-open", "Do not automatically open the browser")
  .option("--fullscreen", "Auto-enter fullscreen on first interaction")
  .option("--theme <name>", "Color theme, by id (see --list-themes)", DEFAULT_THEME)
  .option("--size <name>", "Type size: s, m, l, or xl", DEFAULT_SIZE)
  .option("--head-font <name>", "Override the theme's heading face (see --list-fonts)")
  .option("--body-font <name>", "Override the theme's body face (see --list-fonts)")
  .option("--list-themes", "Print every theme and exit")
  .option("--list-sizes", "Print every type size and exit")
  .option("--list-fonts", "Print every font face and exit")
  .action(
    async (
      file: string | undefined,
      opts: {
        port: string;
        open: boolean;
        fullscreen?: boolean;
        theme: string;
        size: string;
        headFont?: string;
        bodyFont?: string;
        listThemes?: boolean;
        listSizes?: boolean;
        listFonts?: boolean;
      }
    ) => {
      if (opts.listThemes) {
        for (const line of themeListing()) console.log(line);
        process.exit(0);
      }
      if (opts.listSizes) {
        for (const line of sizeListing()) console.log(line);
        process.exit(0);
      }
      if (opts.listFonts) {
        for (const line of fontListing()) console.log(line);
        process.exit(0);
      }

      const named = findTheme(opts.theme);
      if (!named) {
        console.error(
          `present-md: unknown theme '${opts.theme}'. Run --list-themes to see them all.`
        );
        process.exit(1);
      }
      const sized = findSize(opts.size);
      if (!sized) {
        console.error(
          `present-md: unknown size '${opts.size}'. Run --list-sizes to see them all.`
        );
        process.exit(1);
      }
      // Both face flags are optional; unset means the theme keeps its own.
      const fonts: { head: string | null; body: string | null } = { head: null, body: null };
      for (const [flag, slot] of [
        ["--head-font", "head"],
        ["--body-font", "body"],
      ] as const) {
        const raw = slot === "head" ? opts.headFont : opts.bodyFont;
        if (raw === undefined) continue;
        const face = findFont(raw);
        if (!face) {
          console.error(
            `present-md: unknown font '${raw}' for ${flag}. Run --list-fonts to see them all.`
          );
          process.exit(1);
        }
        fonts[slot] = face;
      }

      const theme: ThemeName = named;
      const size: SizeName = sized;
      const fullscreen = !!opts.fullscreen;

      let mode: Mode;
      let baseDir: string;

      if (file) {
        const absPath = resolve(process.cwd(), file);
        baseDir = dirname(absPath);

        let markdown: string;
        try {
          markdown = readFileSync(absPath, "utf-8");
        } catch {
          console.error(`present-md: cannot read file '${file}'`);
          process.exit(1);
        }

        const slides = parseSlides(markdown);
        if (slides.length === 0) {
          console.error("present-md: no slides found in the file.");
          process.exit(1);
        }

        const title = deckTitle(slides, basename(absPath, extname(absPath)));
        mode = {
          kind: "deck",
          html: generateHtml(slides, title, fullscreen, theme, size, fonts),
        };

        const faces = [
          fonts.head ? `head ${fontName(fonts.head)}` : "",
          fonts.body ? `body ${fontName(fonts.body)}` : "",
        ].filter(Boolean).join(" · ");
        console.log(
          `${c.dim}${slides.length} slide${slides.length !== 1 ? "s" : ""} from ${basename(absPath)} · ${THEMES[theme].label} · type ${size}${faces ? " · " + faces : ""}${c.reset}`
        );
      } else {
        baseDir = process.cwd();
        mode = { kind: "editor", theme, size, fonts, fullscreen };
      }

      const port = await findFreePort(parseInt(opts.port, 10));
      if (mode.kind === "editor") mode.origin = `http://127.0.0.1:${port}`;
      const url = await serve(mode, baseDir, port);
      const label = mode.kind === "editor" ? "editor" : "present";

      console.log(
        `${c.bold}${c.magenta}${label}${c.reset} ${c.dim}→${c.reset} ${c.cyan}${c.bold}${url}${c.reset}  ${c.dim}(Ctrl+C to stop)${c.reset}`
      );

      if (mode.kind === "editor") {
        console.log(
          `${c.dim}write on the left, live deck on the right. autosaves to your browser.${c.reset}`
        );
        console.log(
          `${c.dim}Cmd/Ctrl+K inserts anything · Cmd/Ctrl+Shift+L switches theme · Cmd/Ctrl+Enter presents${c.reset}`
        );
      }

      if (opts.open !== false) await open(url);

      // Keep the process alive until interrupted.
      await new Promise<void>(() => {});
    }
  );

program.parse(process.argv);
