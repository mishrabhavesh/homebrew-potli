import { describe, it, expect } from "vitest";
import { cleanOcrText, extractUrls, extractEmails } from "../src/shared/ocr/textCleanup";

describe("cleanOcrText", () => {
  it("collapses repeated horizontal whitespace", () => {
    const raw = "Hello    world,   this   is   OCR";
    expect(cleanOcrText(raw)).toBe("Hello world, this is OCR");
  });

  it("preserves line breaks when preserveLineBreaks is true", () => {
    const raw = "Line one\nLine two\nLine three";
    expect(cleanOcrText(raw, { preserveLineBreaks: true, normalizeWhitespace: true })).toBe(
      "Line one\nLine two\nLine three"
    );
  });

  it("joins soft-wrapped lines into paragraphs when preserveLineBreaks is false", () => {
    const raw = "This is a long\nsentence that wrapped\nacross lines.\n\nNew paragraph here.";
    const result = cleanOcrText(raw, { preserveLineBreaks: false, normalizeWhitespace: true });
    expect(result).toBe("This is a long sentence that wrapped across lines.\n\nNew paragraph here.");
  });

  it("collapses 3+ blank lines down to a single blank line", () => {
    const raw = "Para one\n\n\n\n\nPara two";
    const result = cleanOcrText(raw, { preserveLineBreaks: true, normalizeWhitespace: true });
    expect(result).toBe("Para one\n\nPara two");
  });

  it("removes stray space before punctuation", () => {
    const raw = "Hello world , how are you ?";
    expect(cleanOcrText(raw)).toBe("Hello world, how are you?");
  });

  it("never mangles URLs even with surrounding whitespace collapsing", () => {
    const raw = "Visit    https://example.com/path?query=1&x=2   for more info";
    const result = cleanOcrText(raw);
    expect(result).toContain("https://example.com/path?query=1&x=2");
  });

  it("never mangles email addresses", () => {
    const raw = "Contact    us at   support@example.com   anytime";
    const result = cleanOcrText(raw);
    expect(result).toContain("support@example.com");
  });

  it("preserves numbers and punctuation untouched", () => {
    const raw = "Invoice #INV-10283\n₹4,850.00";
    const result = cleanOcrText(raw);
    expect(result).toContain("INV-10283");
    expect(result).toContain("₹4,850.00");
  });

  it("keeps the raw text fully recoverable (cleanup never discards content, only whitespace)", () => {
    const raw = "word1   word2\t\tword3";
    const cleaned = cleanOcrText(raw);
    const words = cleaned.split(/\s+/);
    expect(words).toEqual(["word1", "word2", "word3"]);
  });

  it("returns an empty string for empty input", () => {
    expect(cleanOcrText("")).toBe("");
  });

  it("trims leading and trailing blank lines", () => {
    const raw = "\n\n  Hello world  \n\n";
    expect(cleanOcrText(raw)).toBe("Hello world");
  });
});

describe("extractUrls / extractEmails", () => {
  it("extracts all URLs from a block of text", () => {
    const text = "See https://a.com and www.b.com for details.";
    expect(extractUrls(text)).toEqual(["https://a.com", "www.b.com"]);
  });

  it("extracts all emails from a block of text", () => {
    const text = "Reach out to a@b.com or c.d@e-f.org";
    expect(extractEmails(text)).toEqual(["a@b.com", "c.d@e-f.org"]);
  });
});
