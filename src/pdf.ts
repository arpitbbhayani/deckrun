import { spawn } from "child_process";
import { access, mkdtemp, readFile, rm, stat } from "fs/promises";
import { constants } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * PDF export without the print dialog.
 *
 * The deck already prints correctly, but only if the person exporting picks
 * landscape and turns on background graphics. Driving a headless browser
 * ourselves removes that step: same renderer, same stylesheet, no choices.
 *
 * Nothing is installed for this. It uses a Chromium-family browser that is
 * already on the machine, and the caller falls back to the print dialog when
 * there is not one.
 */

const CANDIDATES: Record<string, string[]> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Arc.app/Contents/MacOS/Arc",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    "/usr/bin/brave-browser",
    "/snap/bin/chromium",
    "/opt/google/chrome/chrome",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
  ],
};

/** Env overrides, checked before the well-known locations. */
const ENV_KEYS = [
  "PRESENT_MD_BROWSER",
  "CHROME_PATH",
  "PUPPETEER_EXECUTABLE_PATH",
];

let cached: string | null | undefined;

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Path to a usable browser, or null when the machine has none we recognise. */
export async function findBrowser(): Promise<string | null> {
  if (cached !== undefined) return cached;

  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value && (await isExecutable(value))) {
      cached = value;
      return cached;
    }
  }

  for (const path of CANDIDATES[process.platform] ?? []) {
    if (await isExecutable(path)) {
      cached = path;
      return cached;
    }
  }

  cached = null;
  return cached;
}

export class PdfError extends Error {}

const RENDER_TIMEOUT_MS = 45_000;
const POLL_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

function killTree(child: ReturnType<typeof spawn>): void {
  try {
    // Chrome leaves helper processes behind, so kill the whole group where the
    // platform has them.
    if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {
    // Already gone.
  }
}

/**
 * Waits for the PDF itself rather than for the browser to exit.
 *
 * Chrome writes the file in about a second and then lingers, running update
 * checks and other background work, so waiting on process exit would stall for
 * as long as the timeout allows. A size that stops changing means the write is
 * finished.
 */
async function waitForPdf(
  out: string,
  hasExited: () => boolean,
  spawnError: () => Error | null
): Promise<Buffer> {
  const deadline = Date.now() + RENDER_TIMEOUT_MS;
  let lastSize = -1;

  while (Date.now() < deadline) {
    const failure = spawnError();
    if (failure) throw failure;

    let size = -1;
    try {
      size = (await stat(out)).size;
    } catch {
      // Not written yet.
    }

    if (size > 0 && size === lastSize) return readFile(out);
    lastSize = size;

    if (hasExited() && size <= 0) {
      // One last look, in case the write landed as the process was leaving.
      try {
        if ((await stat(out)).size > 0) return readFile(out);
      } catch {
        // Nothing there.
      }
      throw new PdfError("the browser exited without producing a PDF");
    }

    await sleep(POLL_MS);
  }

  throw new PdfError("the browser took too long to render the deck");
}

/**
 * Renders a served deck to PDF bytes.
 *
 * `--virtual-time-budget` matters: without it the browser prints before the
 * webfont and the syntax highlighter have arrived, and the PDF comes out in a
 * fallback font with plain code blocks.
 */
export async function renderPdf(url: string, browser: string): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "present-md-pdf-"));
  const out = join(dir, "deck.pdf");

  const args = [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "--disable-default-apps",
    "--disable-component-update",
    "--no-service-autorun",
    "--mute-audio",
    // Never touch the browser profile the person is actually using.
    `--user-data-dir=${join(dir, "profile")}`,
    "--virtual-time-budget=5000",
    // Header/footer flag names differ across versions; unknown switches are ignored.
    "--no-pdf-header-footer",
    "--print-to-pdf-no-header",
    `--print-to-pdf=${out}`,
    url,
  ];

  let exited = false;
  let failure: Error | null = null;

  const child = spawn(browser, args, {
    stdio: "ignore",
    detached: process.platform !== "win32",
  });

  child.on("exit", () => { exited = true; });
  child.on("error", (err) => {
    failure = new PdfError(`could not run ${browser}: ${err.message}`);
    exited = true;
  });

  try {
    return await waitForPdf(out, () => exited, () => failure);
  } finally {
    killTree(child);
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** One render at a time, so a stuck or repeated request cannot spawn a fleet. */
let queue: Promise<unknown> = Promise.resolve();

export function renderPdfSerial(url: string, browser: string): Promise<Buffer> {
  const run = queue.then(
    () => renderPdf(url, browser),
    () => renderPdf(url, browser)
  );
  queue = run.catch(() => {});
  return run;
}
