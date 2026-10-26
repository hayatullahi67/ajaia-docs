import { describe, expect, it } from "vitest";
import { fileToDocument, ImportError, MAX_UPLOAD_BYTES } from "../src/lib/import";
import { MAX_CONTENT_CHARS } from "../src/lib/validation";

describe("file import", () => {
  it("turns a markdown file into formatted HTML with a title from the filename", () => {
    const md = "# Plan\n\nSome **bold** text\n\n- one\n- two\n";
    const { title, content } = fileToDocument("Q4 plan.md", md.length, md);
    expect(title).toBe("Q4 plan");
    expect(content).toContain("<h1>Plan</h1>");
    expect(content).toContain("<strong>bold</strong>");
    expect(content).toContain("<li>one</li>");
  });

  it("turns plain text paragraphs into <p> tags and escapes HTML", () => {
    const txt = "Hello <b>world</b>\n\nSecond paragraph";
    const { content } = fileToDocument("notes.txt", txt.length, txt);
    expect(content).toBe("<p>Hello &lt;b&gt;world&lt;/b&gt;</p><p>Second paragraph</p>");
  });

  it("does not let raw HTML in markdown through", () => {
    const md = "Hi\n\n<script>alert(1)</script>\n";
    const { content } = fileToDocument("x.md", md.length, md);
    expect(content).not.toContain("<script>");
  });

  it("rejects unsupported, empty and oversized files", () => {
    expect(() => fileToDocument("a.pdf", 10, "x")).toThrow(ImportError);
    expect(() => fileToDocument("a.txt", 3, "   ")).toThrow(/empty/);
    expect(() => fileToDocument("a.txt", MAX_UPLOAD_BYTES + 1, "x")).toThrow(/too large/);
  });

  it("rejects a file whose converted HTML would exceed the editor's save limit", () => {
    // Under 1 MB on disk, but escaping "<" to "&lt;" pushes the HTML past the limit.
    const txt = "<".repeat(MAX_CONTENT_CHARS / 2);
    expect(txt.length).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(() => fileToDocument("big.txt", txt.length, txt)).toThrow(/too large to edit/);
  });
});
