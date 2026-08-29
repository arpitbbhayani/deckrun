import { marked } from "marked";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Capture TeX before the regular Markdown tokenizer sees it. This keeps
 * operators such as `*` and `_` inside a formula instead of turning them into
 * emphasis. The browser can then render these deliberately marked nodes with
 * KaTeX after fonts and layout styles are available.
 */
marked.use({
  extensions: [
    {
      name: "deckrunBlockMath",
      level: "block",
      tokenizer(src) {
        const dollars = /^\$\$[ \t]*\n?([\s\S]+?)\n?[ \t]*\$\$(?:[ \t]*(?:\n|$))/.exec(src);
        const brackets = /^\\\[[ \t]*\n?([\s\S]+?)\n?[ \t]*\\\](?:[ \t]*(?:\n|$))/.exec(src);
        const match = dollars ?? brackets;
        if (!match) return;
        return {
          type: "deckrunBlockMath",
          raw: match[0],
          text: match[1].trim(),
          display: true,
        };
      },
      renderer(token) {
        return `<div class="math-source" data-display="true">${escapeHtml(String(token.text))}</div>\n`;
      },
    },
    {
      name: "deckrunInlineMath",
      level: "inline",
      start(src) {
        const dollar = src.indexOf("$");
        const paren = src.indexOf("\\(");
        if (dollar < 0) return paren < 0 ? undefined : paren;
        if (paren < 0) return dollar;
        return Math.min(dollar, paren);
      },
      tokenizer(src) {
        // A closing dollar followed by a digit is treated as currency rather
        // than math, so ordinary prose like "$5 and $10" stays untouched.
        const dollars = /^\$(?!\s|\$)((?:\\.|[^\\$\n])*?[^\\$\s])\$(?!\$|\d)/.exec(src);
        const parens = /^\\\(((?:\\.|[^\\\n])*?)\\\)/.exec(src);
        const match = dollars ?? parens;
        if (!match) return;
        return {
          type: "deckrunInlineMath",
          raw: match[0],
          text: match[1],
          display: false,
        };
      },
      renderer(token) {
        return `<span class="math-source" data-display="false">${escapeHtml(String(token.text))}</span>`;
      },
    },
    {
      name: "deckrunRevealMarker",
      level: "inline",
      start(src) {
        const at = src.indexOf("{reveal}");
        return at < 0 ? undefined : at;
      },
      tokenizer(src) {
        const match = /^\{reveal\}/.exec(src);
        if (!match) return;
        return { type: "deckrunRevealMarker", raw: match[0] };
      },
      renderer() {
        return '<span class="deckrun-fragment-marker" aria-hidden="true"></span>';
      },
    },
  ],
});

export interface PositionedImage {
  src: string;
  alt: string;
  opacity: number;
}

export interface Slide {
  html: string;
  bgImage?: PositionedImage;
  rightImage?: PositionedImage;
  leftImage?: PositionedImage;
  notes?: string;
}

type ImagePosition = "inline" | "right" | "left" | "bg";

function parseImageDirective(title: string | undefined | null): {
  position: ImagePosition;
  opacity: number;
} {
  if (!title) return { position: "inline", opacity: 1 };

  const t = title.trim().toLowerCase();
  let position: ImagePosition = "inline";

  if (t.includes("right")) position = "right";
  else if (t.includes("left")) position = "left";
  else if (t.includes("bg")) position = "bg";

  const opacityMatch = t.match(/opacity[=:]?\s*([0-9]*\.?[0-9]+)/);
  const opacity = opacityMatch
    ? Math.min(1, Math.max(0, parseFloat(opacityMatch[1])))
    : 1;

  return { position, opacity };
}

export function parseSlides(markdown: string): Slide[] {
  // Normalize line endings
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split on slide separator: "---" on its own line (with optional surrounding blank lines)
  const rawSlides = normalized.split(/\n[ \t]*---[ \t]*\n/);

  return rawSlides
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
    .map((raw) => {
      const slide: Slide = { html: "" };

      // Extract speaker notes (<!-- notes: ... --> at end)
      const notesMatch = raw.match(/<!--\s*notes?:\s*([\s\S]*?)\s*-->/i);
      if (notesMatch) {
        slide.notes = notesMatch[1].trim();
      }
      let processedMd = raw.replace(/<!--\s*notes?:\s*[\s\S]*?\s*-->/gi, "");

      // Find positioned images via title attribute: ![alt](src "right opacity:0.7")
      const imgRegex =
        /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g;
      const toRemove: string[] = [];
      let match: RegExpExecArray | null;

      // Reset lastIndex before use since we're reusing the regex
      imgRegex.lastIndex = 0;

      while ((match = imgRegex.exec(raw)) !== null) {
        const [full, alt, src, titleAttr] = match;
        const { position, opacity } = parseImageDirective(titleAttr);

        if (position === "bg") {
          slide.bgImage = { src, alt, opacity };
          toRemove.push(full);
        } else if (position === "right") {
          slide.rightImage = { src, alt, opacity };
          toRemove.push(full);
        } else if (position === "left") {
          slide.leftImage = { src, alt, opacity };
          toRemove.push(full);
        }
      }

      for (const item of toRemove) {
        // Replace only first occurrence (the matched image)
        processedMd = processedMd.replace(item, "");
      }

      // Render remaining markdown to HTML
      slide.html = marked.parse(processedMd.trim()) as string;

      return slide;
    });
}
