#!/usr/bin/env node
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { createRequire } from "module";
import { resolve, dirname, basename, extname, join, isAbsolute, relative } from "path";
import { Command } from "commander";
import open from "open";
import { parseSlides, type Slide } from "./parser.js";
import { generateHtml, generateDocHtml, injectDocBridge, renderSlide } from "./generate.js";
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
import {
  DEFAULT_TEMPLATE,
  DEFAULT_TRANSITION,
  findTemplate,
  findTransition,
  resolveTemplateName,
  resolveTransitionName,
  templateListing,
  transitionListing,
  type TemplateName,
  type TransitionName,
} from "./presentation-options.js";
import { lintMarkdown, type LintIssue } from "./lint.js";
import {
  AiError,
  generateAiPresentation,
  listAiModels,
  validateAiConnection,
  type AiGenerateInput,
} from "./ai.js";
import { AiSessionStore } from "./ai-session.js";

const moduleRequire = createRequire(import.meta.url);
const aiSessions = new AiSessionStore();
const aiInflight = new Map<string, AbortController>();

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
    return moduleRequire("../package.json").version as string;
  } catch {
    return "0.0.0";
  }
}

const MIME: Record<string, string> = {
  ".html":  "text/html; charset=utf-8",
  ".htm":   "text/html; charset=utf-8",
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

/** Files that should never become readable merely because Deckrun launched nearby. */
function isSensitiveLocalPath(pathname: string): boolean {
  // Both separators matter here: path.resolve treats backslashes as path
  // boundaries on Windows even though they arrived in a URL segment.
  const segments = pathname.split(/[\\/]+/).filter(Boolean);
  return segments.some((segment) => {
    const name = segment.toLowerCase();
    return (
      name.startsWith(".") ||
      name === "credentials" ||
      name === "credentials.json" ||
      name === "id_rsa" ||
      name === "id_ed25519" ||
      /\.(?:pem|key|p12|pfx)$/.test(name)
    );
  });
}

/** Block persistent workers in every mode and top-level local HTML in the editor. */
function isBlockedLocalDiskRequest(
  pathname: string,
  req: IncomingMessage,
  editorMode: boolean
): boolean {
  const extension = extname(pathname).toLowerCase();
  const destination = req.headers["sec-fetch-dest"];
  if (
    editorMode &&
    (extension === ".html" || extension === ".htm") &&
    destination === "document"
  ) {
    return true;
  }
  return (extension === ".js" || extension === ".mjs") && destination === "serviceworker";
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

/** An HTML doc's own `<title>`, with inline markup stripped. */
function docTitle(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const text = match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
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
    "X-Content-Type-Options": "nosniff",
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

function sendJsonStatus(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function trustedAiRequest(mode: EditorMode, req: IncomingMessage): boolean {
  const marker = req.headers["x-deckrun-ai"];
  const origin = req.headers.origin;
  const fetchSite = req.headers["sec-fetch-site"];
  const contentType = req.headers["content-type"] ?? "";
  return (
    marker === "1" &&
    !!mode.origin &&
    origin === mode.origin &&
    (fetchSite === undefined || fetchSite === "same-origin") &&
    typeof contentType === "string" &&
    contentType.toLowerCase().startsWith("application/json")
  );
}

function sendAiFailure(res: ServerResponse, error: unknown): void {
  if (res.headersSent || res.writableEnded || res.destroyed) return;
  if (error instanceof AiError) {
    sendJsonStatus(res, error.status, error.toJSON());
    return;
  }
  sendJsonStatus(res, 500, {
    error: "ai_failed",
    detail: "The AI request failed before it completed.",
  });
}

function clientAbortSignal(
  req: IncomingMessage,
  res: ServerResponse
): { controller: AbortController; signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const close = () => {
    if (!res.writableEnded) controller.abort();
  };
  req.once("aborted", abort);
  res.once("close", close);
  return {
    controller,
    signal: controller.signal,
    dispose: () => {
      req.off("aborted", abort);
      res.off("close", close);
    },
  };
}

interface DeckMode {
  kind: "deck";
  html: string;
  remoteDoc?: string;
  title?: string;
  origin?: string;
}

interface EditorMode {
  kind: "editor";
  theme: ThemeName;
  size: SizeName;
  fonts: { head: string | null; body: string | null };
  template: TemplateName;
  transition: TransitionName;
  fullscreen: boolean;
  /** Filled in once the port is known, so PDF rendering can reach the deck. */
  origin?: string;
}

type Mode = DeckMode | EditorMode;

/** Resolve bundled math/diagram assets installed with the npm package. */
function vendorAsset(pathname: string): string | null {
  const name = pathname.replace(/^\/__vendor\/?/, "");

  if (name === "katex.min.css" || name === "katex.min.js" || name.startsWith("fonts/")) {
    const katexDist = dirname(moduleRequire.resolve("katex"));
    const target = resolve(katexDist, name);
    const fromRoot = relative(katexDist, target);
    return !isAbsolute(fromRoot) && !fromRoot.startsWith("..") ? target : null;
  }

  if (name === "mermaid.min.js") {
    const mermaidDist = dirname(moduleRequire.resolve("mermaid"));
    return join(mermaidDist, "mermaid.min.js");
  }

  return null;
}

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
    sendHtml(
      res,
      generatePreviewHtml(mode.theme, mode.size, mode.fonts, mode.template, mode.transition)
    );
    return true;
  }

  if (pathname.startsWith("/__ai/")) {
    if (req.method !== "POST") {
      sendJsonStatus(res, 405, { error: "method_not_allowed", detail: "Use POST for AI requests." });
      return true;
    }
    if (!trustedAiRequest(mode, req)) {
      sendJsonStatus(res, 403, {
        error: "forbidden",
        detail: "This AI request did not come from the local Deckrun editor.",
      });
      return true;
    }

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(await readBody(req)) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("invalid body");
      }
      body = parsed as Record<string, unknown>;
    } catch {
      sendJsonStatus(res, 400, { error: "invalid_json", detail: "Send a valid JSON request." });
      return true;
    }

    if (pathname === "/__ai/connect") {
      const client = clientAbortSignal(req, res);
      try {
        const connection = validateAiConnection(body.provider, body.apiKey);
        const manual = body.manualModel === true;
        // Normal connections verify the credential by listing models first.
        // Restricted keys can explicitly skip that permission and be verified
        // by their first generation request instead.
        const models = manual
          ? []
          : await listAiModels(connection.provider, connection.apiKey, {
              signal: client.signal,
            });
        if (client.signal.aborted) return true;
        const sessionId = aiSessions.create(connection.provider, connection.apiKey);
        sendJson(res, { sessionId, provider: connection.provider, models, manual });
      } catch (error) {
        sendAiFailure(res, error);
      } finally {
        client.dispose();
      }
      return true;
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (pathname === "/__ai/disconnect") {
      if (sessionId) {
        aiInflight.get(sessionId)?.abort();
        aiSessions.delete(sessionId);
        aiInflight.delete(sessionId);
      }
      sendJson(res, { ok: true });
      return true;
    }

    const session = aiSessions.get(sessionId);
    if (!session) {
      sendJsonStatus(res, 401, {
        error: "ai_session_expired",
        detail: "The API-key session expired. Connect the provider again.",
      });
      return true;
    }

    if (pathname === "/__ai/models") {
      const client = clientAbortSignal(req, res);
      try {
        const models = await listAiModels(session.provider, session.apiKey, {
          signal: client.signal,
        });
        if (!client.signal.aborted) sendJson(res, { provider: session.provider, models });
      } catch (error) {
        if (error instanceof AiError && error.code === "ai_auth_failed") {
          aiSessions.delete(sessionId);
        }
        sendAiFailure(res, error);
      } finally {
        client.dispose();
      }
      return true;
    }

    if (pathname === "/__ai/generate") {
      if (aiInflight.has(sessionId)) {
        sendJsonStatus(res, 409, {
          error: "ai_busy",
          detail: "A generation is already running for this key session.",
        });
        return true;
      }

      const client = clientAbortSignal(req, res);
      aiInflight.set(sessionId, client.controller);
      try {
        const input = {
          provider: session.provider,
          model: body.model,
          task: body.task,
          prompt: body.prompt,
          audience: body.audience,
          slideCount: body.slideCount,
          currentMarkdown: body.currentMarkdown,
        } as AiGenerateInput;
        const result = await generateAiPresentation(input, session.apiKey, {
          signal: client.signal,
        });
        if (!client.signal.aborted) sendJson(res, result);
      } catch (error) {
        if (error instanceof AiError && error.code === "ai_auth_failed") {
          aiSessions.delete(sessionId);
        }
        sendAiFailure(res, error);
      } finally {
        if (aiInflight.get(sessionId) === client.controller) aiInflight.delete(sessionId);
        client.dispose();
      }
      return true;
    }

    sendJsonStatus(res, 404, { error: "not_found", detail: "Unknown AI route." });
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
      template?: string;
      transition?: string;
      standalone?: boolean;
    };
    const slides = parseSlides(body.markdown ?? "");
    if (slides.length === 0) {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "no slides" }));
      return true;
    }
    const theme = resolveThemeName(body.theme);
    const size = resolveSizeName(body.size);
    const template = resolveTemplateName(body.template);
    const transition = resolveTransitionName(body.transition);
    const title = deckTitle(slides, body.title?.trim() || "deckrun");
    // A deck built for printing must not open behind a fullscreen prompt.
    const forPrint = body.print === true;
    const path = stashDeck(
      generateHtml(slides, title, forPrint ? false : mode.fullscreen, theme, size, {
        head: body.head,
        body: body.body,
      }, { template, transition, standalone: body.standalone === true })
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
      template?: string;
      transition?: string;
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
            "No Chrome, Chromium, Edge, or Brave found. Set DECKRUN_BROWSER to one to export PDFs directly.",
        })
      );
      return true;
    }

    const theme = resolveThemeName(body.theme);
    const size = resolveSizeName(body.size);
    const template = resolveTemplateName(body.template);
    const transition = resolveTransitionName(body.transition);
    const title = deckTitle(slides, body.title?.trim() || "deckrun");
    const path = stashDeck(
      generateHtml(
        slides,
        title,
        false,
        theme,
        size,
        { head: body.head, body: body.body },
        { template, transition }
      )
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

  if (pathname === "/__fetch-doc" && req.method === "POST") {
    const body = JSON.parse(await readBody(req)) as { url?: string };
    const raw = (body.url ?? "").trim();

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid url" }));
      return true;
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "url must be http or https" }));
      return true;
    }

    let upstream: Response;
    try {
      // Fetched server-side, not from the browser, so a page with no
      // Access-Control-Allow-Origin still loads fine.
      upstream = await fetch(target, {
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "deckrun" },
      });
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "fetch failed",
          detail: err instanceof Error ? err.message : "network error",
        })
      );
      return true;
    }

    if (!upstream.ok) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "fetch failed", detail: `upstream responded ${upstream.status}` })
      );
      return true;
    }

    const rawContent = await upstream.text();
    if (rawContent.length > MAX_BODY) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "too large",
          detail: `page is larger than ${Math.round(MAX_BODY / 1024 / 1024)} MB`,
        })
      );
      return true;
    }
    if (!rawContent.trim()) {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "empty document" }));
      return true;
    }

    const contentType = (upstream.headers.get("content-type") ?? "").toLowerCase();
    const pathname = target.pathname.toLowerCase();

    let isHtml = false;
    if (pathname.endsWith(".html") || pathname.endsWith(".htm")) {
      isHtml = true;
    } else if (pathname.endsWith(".md") || pathname.endsWith(".markdown")) {
      isHtml = false;
    } else if (
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml")
    ) {
      isHtml = true;
    } else if (
      contentType.includes("text/markdown") ||
      contentType.includes("text/x-markdown") ||
      contentType.includes("text/plain")
    ) {
      isHtml = false;
    } else if (/<!doctype\s+html/i.test(rawContent) || /<html[\s>]/i.test(rawContent)) {
      isHtml = true;
    }

    const defaultName = target.pathname.split("/").filter(Boolean).pop() || target.hostname;
    let title: string;
    if (isHtml) {
      title = docTitle(rawContent, defaultName);
    } else {
      const slides = parseSlides(rawContent);
      title = deckTitle(slides, defaultName);
    }

    sendJson(res, {
      kind: isHtml ? "html" : "markdown",
      content: rawContent,
      html: isHtml ? rawContent : undefined,
      markdown: !isHtml ? rawContent : undefined,
      title,
    });
    return true;
  }

  if (pathname === "/__present-doc" && req.method === "POST") {
    const body = JSON.parse(await readBody(req)) as {
      html?: string;
      theme?: string;
      title?: string;
      print?: boolean;
    };
    const raw = body.html ?? "";
    if (!raw.trim()) {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "empty document" }));
      return true;
    }
    const theme = resolveThemeName(body.theme);
    const title = docTitle(raw, body.title?.trim() || "deckrun");
    const forPrint = body.print === true;
    const docPath = stashDeck(injectDocBridge(raw));
    const wrapperPath = stashDeck(
      generateDocHtml(docPath, title, forPrint ? false : mode.fullscreen, theme)
    );
    sendJson(res, { path: forPrint ? `${wrapperPath}&print=1` : wrapperPath, docPath });
    return true;
  }

  if (pathname === "/__pdf-doc" && req.method === "POST") {
    const body = JSON.parse(await readBody(req)) as {
      html?: string;
      title?: string;
    };
    const raw = body.html ?? "";
    if (!raw.trim()) {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "empty document" }));
      return true;
    }

    const browser = await findBrowser();
    if (!browser) {
      res.writeHead(501, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "no browser",
          detail:
            "No Chrome, Chromium, Edge, or Brave found. Set DECKRUN_BROWSER to one to export PDFs directly.",
        })
      );
      return true;
    }

    const title = docTitle(raw, body.title?.trim() || "deckrun");
    // Print the raw doc directly, with no chrome wrapper: its own @page /
    // print CSS (or Chrome's defaults) governs pagination, and there is no
    // presenter chrome to strip since there is none in the printed page.
    const docPath = stashDeck(raw);

    try {
      const pdf = await renderPdfSerial(`${mode.origin}${docPath}`, browser);
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
            : generateEditorHtml(
                mode.theme,
                mode.size,
                mode.fonts,
                mode.template,
                mode.transition
              )
        );
        return;
      }

      if (mode.kind === "deck" && mode.remoteDoc && pathname === "/__remote-doc") {
        sendHtml(res, mode.remoteDoc);
        return;
      }

      if (pathname.startsWith("/__vendor/")) {
        const asset = vendorAsset(pathname);
        if (!asset) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }
        const data = await readFile(asset);
        res.writeHead(200, {
          "Content-Type": getMime(asset),
          "Cache-Control": "public, max-age=31536000, immutable",
          // Preview frames intentionally have an opaque sandbox origin. These
          // immutable public assets need CORS so KaTeX font files still load.
          "Access-Control-Allow-Origin": "*",
        });
        res.end(data);
        return;
      }

      if (mode.kind === "deck" && pathname === "/__pdf") {
        const browser = await findBrowser();
        if (!browser) {
          res.writeHead(501, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "no browser",
              detail:
                "No Chrome, Chromium, Edge, or Brave found. Set DECKRUN_BROWSER to one to export PDFs directly.",
            })
          );
          return;
        }

        try {
          const pdf = await renderPdfSerial(`${mode.origin}/`, browser);
          const filename = safeFilename(mode.title || "deck") + ".pdf";
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
        return;
      }

      if (mode.kind === "editor" && (await handleEditorRoute(mode, pathname, req, res))) {
        return;
      }

      // Everything else comes off disk, relative to the working directory.
      if (
        isSensitiveLocalPath(pathname) ||
        isBlockedLocalDiskRequest(pathname, req, mode.kind === "editor")
      ) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }
      const filePath = resolve(baseDir, pathname.replace(/^\/+/, ""));
      const fromBase = relative(baseDir, filePath);
      if (isAbsolute(fromBase) || fromBase.startsWith("..")) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      const data = await readFile(filePath);
      res.writeHead(200, {
        "Content-Type": getMime(filePath),
        "X-Content-Type-Options": "nosniff",
        ...(mode.kind === "editor" && extname(filePath).toLowerCase() === ".svg"
          ? { "Content-Security-Policy": "sandbox; script-src 'none'; object-src 'none'" }
          : {}),
        ...(/\.(?:m?js)$/i.test(filePath)
          ? { "Service-Worker-Allowed": "/__deckrun_no_root_service_worker__/" }
          : {}),
      });
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
  .name("deckrun")
  .description(
    "Present a Markdown file, HTML file, or public URL in the browser. Run without a file or URL to write in the built-in editor."
  )
  .version(packageVersion(), "-v, --version", "Print the version number")
  .argument("[file]", "Markdown file, HTML file, or public URL to present. Omit it to open the editor.")
  .option("-p, --port <number>", "Port to serve on", "7890")
  .option("--no-open", "Do not automatically open the browser")
  .option("--fullscreen", "Auto-enter fullscreen on first interaction")
  .option("--theme <name>", "Color theme, by id (see --list-themes)", DEFAULT_THEME)
  .option("--size <name>", "Type size: s, m, l, or xl", DEFAULT_SIZE)
  .option("--head-font <name>", "Override the theme's heading face (see --list-fonts)")
  .option("--body-font <name>", "Override the theme's body face (see --list-fonts)")
  .option("--template <name>", "Composition template (see --list-templates)", DEFAULT_TEMPLATE)
  .option("--transition <name>", "Slide transition (see --list-transitions)", DEFAULT_TRANSITION)
  .option("--list-themes", "Print every theme and exit")
  .option("--list-sizes", "Print every type size and exit")
  .option("--list-fonts", "Print every font face and exit")
  .option("--list-templates", "Print every composition template and exit")
  .option("--list-transitions", "Print every slide transition and exit")
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
        template: string;
        transition: string;
        listThemes?: boolean;
        listSizes?: boolean;
        listFonts?: boolean;
        listTemplates?: boolean;
        listTransitions?: boolean;
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
      if (opts.listTemplates) {
        for (const line of templateListing()) console.log(line);
        process.exit(0);
      }
      if (opts.listTransitions) {
        for (const line of transitionListing()) console.log(line);
        process.exit(0);
      }

      const named = findTheme(opts.theme);
      if (!named) {
        console.error(
          `deckrun: unknown theme '${opts.theme}'. Run --list-themes to see them all.`
        );
        process.exit(1);
      }
      const sized = findSize(opts.size);
      if (!sized) {
        console.error(
          `deckrun: unknown size '${opts.size}'. Run --list-sizes to see them all.`
        );
        process.exit(1);
      }
      const templated = findTemplate(opts.template);
      if (!templated) {
        console.error(
          `deckrun: unknown template '${opts.template}'. Run --list-templates to see them all.`
        );
        process.exit(1);
      }
      const transitioned = findTransition(opts.transition);
      if (!transitioned) {
        console.error(
          `deckrun: unknown transition '${opts.transition}'. Run --list-transitions to see them all.`
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
            `deckrun: unknown font '${raw}' for ${flag}. Run --list-fonts to see them all.`
          );
          process.exit(1);
        }
        fonts[slot] = face;
      }

      const theme: ThemeName = named;
      const size: SizeName = sized;
      const template: TemplateName = templated;
      const transition: TransitionName = transitioned;
      const fullscreen = !!opts.fullscreen;

      let mode: Mode;
      let baseDir: string;

      if (file) {
        if (/^https?:\/\//i.test(file)) {
          let target: URL;
          try {
            target = new URL(file);
          } catch {
            console.error(`deckrun: invalid URL '${file}'`);
            process.exit(1);
          }

          let upstream: Response;
          try {
            upstream = await fetch(target, {
              redirect: "follow",
              signal: AbortSignal.timeout(15_000),
              headers: { "User-Agent": "deckrun" },
            });
          } catch (err) {
            console.error(
              `deckrun: cannot fetch '${file}': ${err instanceof Error ? err.message : "network error"}`
            );
            process.exit(1);
          }

          if (!upstream.ok) {
            console.error(`deckrun: fetch failed for '${file}' (HTTP ${upstream.status})`);
            process.exit(1);
          }

          const rawContent = await upstream.text();
          if (!rawContent.trim()) {
            console.error(`deckrun: empty document fetched from '${file}'`);
            process.exit(1);
          }

          const contentType = (upstream.headers.get("content-type") ?? "").toLowerCase();
          const pathname = target.pathname.toLowerCase();

          let isHtml = false;
          if (pathname.endsWith(".html") || pathname.endsWith(".htm")) {
            isHtml = true;
          } else if (pathname.endsWith(".md") || pathname.endsWith(".markdown")) {
            isHtml = false;
          } else if (
            contentType.includes("text/html") ||
            contentType.includes("application/xhtml+xml")
          ) {
            isHtml = true;
          } else if (
            contentType.includes("text/markdown") ||
            contentType.includes("text/x-markdown") ||
            contentType.includes("text/plain")
          ) {
            isHtml = false;
          } else if (/<!doctype\s+html/i.test(rawContent) || /<html[\s>]/i.test(rawContent)) {
            isHtml = true;
          }

          baseDir = process.cwd();
          const defaultName = target.pathname.split("/").filter(Boolean).pop() || target.hostname;

          if (isHtml) {
            if (
              opts.size !== DEFAULT_SIZE || opts.headFont || opts.bodyFont ||
              opts.template !== DEFAULT_TEMPLATE || opts.transition !== DEFAULT_TRANSITION
            ) {
              console.error(
                `${c.dim}deckrun: --size, font, template, and transition options only apply to Markdown decks; ignored for an HTML doc.${c.reset}`
              );
            }

            const title = docTitle(rawContent, defaultName);
            let docHtml = rawContent;
            if (!/<base\s/i.test(docHtml)) {
              if (/<head[^>]*>/i.test(docHtml)) {
                docHtml = docHtml.replace(/<head[^>]*>/i, (m) => `${m}\n  <base href="${target.href}">`);
              } else {
                docHtml = `<base href="${target.href}">\n` + docHtml;
              }
            }

            mode = {
              kind: "deck",
              html: generateDocHtml("/__remote-doc", title, fullscreen, theme),
              remoteDoc: injectDocBridge(docHtml),
            };

            console.log(`${c.dim}presenting ${file} · ${THEMES[theme].label}${c.reset}`);
          } else {
            const slides = parseSlides(rawContent);
            if (slides.length === 0) {
              console.error("deckrun: no slides found in the fetched content.");
              process.exit(1);
            }

            const title = deckTitle(slides, defaultName);
            mode = {
              kind: "deck",
              html: generateHtml(slides, title, fullscreen, theme, size, fonts, { template, transition }),
            };

            const faces = [
              fonts.head ? `head ${fontName(fonts.head)}` : "",
              fonts.body ? `body ${fontName(fonts.body)}` : "",
            ].filter(Boolean).join(" · ");
            console.log(
              `${c.dim}${slides.length} slide${slides.length !== 1 ? "s" : ""} from ${file} · ${THEMES[theme].label} · ${template} · ${transition} · type ${size}${faces ? " · " + faces : ""}${c.reset}`
            );
          }
        } else {
          const absPath = resolve(process.cwd(), file);
          baseDir = dirname(absPath);
          const ext = extname(absPath).toLowerCase();

          if (ext === ".html" || ext === ".htm") {
            let rawHtml: string;
            try {
              rawHtml = readFileSync(absPath, "utf-8");
            } catch {
              console.error(`deckrun: cannot read file '${file}'`);
              process.exit(1);
            }

            if (
              opts.size !== DEFAULT_SIZE || opts.headFont || opts.bodyFont ||
              opts.template !== DEFAULT_TEMPLATE || opts.transition !== DEFAULT_TRANSITION
            ) {
              console.error(
                `${c.dim}deckrun: --size, font, template, and transition options only apply to Markdown decks; ignored for an HTML doc.${c.reset}`
              );
            }

            const title = docTitle(rawHtml, basename(absPath, extname(absPath)));
            mode = {
              kind: "deck",
              html: generateDocHtml("/__remote-doc", title, fullscreen, theme),
              remoteDoc: injectDocBridge(rawHtml),
            };

            console.log(`${c.dim}presenting ${basename(absPath)} · ${THEMES[theme].label}${c.reset}`);
          } else {
            let markdown: string;
            try {
              markdown = readFileSync(absPath, "utf-8");
            } catch {
              console.error(`deckrun: cannot read file '${file}'`);
              process.exit(1);
            }

            const slides = parseSlides(markdown);
            if (slides.length === 0) {
              console.error("deckrun: no slides found in the file.");
              process.exit(1);
            }

            const title = deckTitle(slides, basename(absPath, extname(absPath)));
            mode = {
              kind: "deck",
              title,
              html: generateHtml(slides, title, fullscreen, theme, size, fonts, { template, transition }),
            };

            const faces = [
              fonts.head ? `head ${fontName(fonts.head)}` : "",
              fonts.body ? `body ${fontName(fonts.body)}` : "",
            ].filter(Boolean).join(" · ");
            console.log(
              `${c.dim}${slides.length} slide${slides.length !== 1 ? "s" : ""} from ${basename(absPath)} · ${THEMES[theme].label} · ${template} · ${transition} · type ${size}${faces ? " · " + faces : ""}${c.reset}`
            );
          }
        }
      } else {
        baseDir = process.cwd();
        mode = { kind: "editor", theme, size, fonts, template, transition, fullscreen };
      }

      const port = await findFreePort(parseInt(opts.port, 10));
      mode.origin = `http://127.0.0.1:${port}`;
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
          `${c.dim}Cmd/Ctrl+K inserts anything · template/theme controls recompose live · Cmd/Ctrl+Enter presents${c.reset}`
        );
      }

      if (opts.open !== false) await open(url);

      // Keep the process alive until interrupted.
      await new Promise<void>(() => {});
    }
  );

program
  .command("lint")
  .description("Check Markdown decks for common authoring and rendering problems")
  .argument("<files...>", "Markdown files to check; use - to read standard input")
  .option("--format <format>", "Output format: stylish or json", "stylish")
  .option("--max-warnings <number>", "Warnings allowed before the command fails", "0")
  .action(
    (files: string[], opts: { format: string; maxWarnings: string }) => {
      if (opts.format !== "stylish" && opts.format !== "json") {
        console.error("deckrun lint: --format must be 'stylish' or 'json'.");
        process.exitCode = 2;
        return;
      }

      const maxWarnings = Number.parseInt(opts.maxWarnings, 10);
      if (!Number.isInteger(maxWarnings) || maxWarnings < -1) {
        console.error("deckrun lint: --max-warnings must be -1 or a non-negative integer.");
        process.exitCode = 2;
        return;
      }

      const reports: Array<{
        file: string;
        issues: LintIssue[];
        slides: number;
        errors: number;
        warnings: number;
      }> = [];

      for (const file of files) {
        let markdown: string;
        try {
          markdown = file === "-" ? readFileSync(0, "utf-8") : readFileSync(resolve(process.cwd(), file), "utf-8");
        } catch {
          reports.push({
            file,
            slides: 0,
            errors: 1,
            warnings: 0,
            issues: [{
              rule: "file-read",
              severity: "error",
              message: "The file could not be read.",
              line: 1,
              column: 1,
            }],
          });
          continue;
        }

        const result = lintMarkdown(markdown);
        reports.push({ file, ...result });
      }

      const errors = reports.reduce((sum, report) => sum + report.errors, 0);
      const warnings = reports.reduce((sum, report) => sum + report.warnings, 0);
      const issueCount = errors + warnings;

      if (opts.format === "json") {
        console.log(JSON.stringify({ files: reports, errors, warnings }, null, 2));
      } else {
        for (const report of reports) {
          if (!report.issues.length) continue;
          console.log(`\n${report.file}`);
          for (const item of report.issues) {
            const position = `${item.line}:${item.column}`.padEnd(9);
            const severity = item.severity.padEnd(7);
            const slide = item.slide ? `slide ${item.slide} · ` : "";
            console.log(`  ${position} ${severity} ${slide}${item.message}  ${item.rule}`);
          }
        }

        if (issueCount === 0) {
          const slides = reports.reduce((sum, report) => sum + report.slides, 0);
          console.log(`✓ ${files.length} file${files.length === 1 ? "" : "s"}, ${slides} slide${slides === 1 ? "" : "s"}, no problems`);
        } else {
          console.log(
            `\n✖ ${issueCount} problem${issueCount === 1 ? "" : "s"} (${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"})`
          );
        }
      }

      if (errors > 0 || (maxWarnings !== -1 && warnings > maxWarnings)) {
        process.exitCode = 1;
      }
    }
  );

program.parse(process.argv);
