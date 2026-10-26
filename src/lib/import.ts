import { marked } from "marked";
import { MAX_CONTENT_CHARS } from "./validation";

export const MAX_UPLOAD_BYTES = 1024 * 1024; // 1 MB
export const SUPPORTED_EXTENSIONS = [".txt", ".md"] as const;

export class ImportError extends Error {}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/** Plain text: each blank-line separated block becomes a paragraph. */
export function textToHtml(text: string): string {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => `<p>${escapeHtml(b).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Markdown: converted with marked. Raw HTML in the file is escaped, so a
 * pasted <script> shows up as text instead of running. */
export function markdownToHtml(md: string): string {
  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => escapeHtml(text);
  return marked.parse(md, { renderer, async: false, gfm: true }) as string;
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return (base || "Imported document").slice(0, 200);
}

export function fileToDocument(filename: string, size: number, text: string) {
  const ext = getExtension(filename);
  if (!SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
    throw new ImportError("Only .txt and .md files are supported.");
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new ImportError("File is too large. The limit is 1 MB.");
  }
  if (!text.trim()) {
    throw new ImportError("The file is empty.");
  }
  const content = ext === ".md" ? markdownToHtml(text) : textToHtml(text);
  // HTML is larger than the source text. Without this check a big file would
  // import fine and then every autosave would fail the content size limit.
  if (content.length > MAX_CONTENT_CHARS) {
    throw new ImportError("File is too large to edit. Try a smaller file.");
  }
  return { title: titleFromFilename(filename), content };
}
