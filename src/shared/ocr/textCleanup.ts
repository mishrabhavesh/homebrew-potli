/**
 * Non-AI, deterministic cleanup of raw OCR output.
 *
 * Design goal (per product spec): be conservative. We normalize obvious
 * whitespace artifacts without rewriting words, punctuation, or casing.
 * The raw OCR text is always kept alongside the cleaned text so nothing is
 * ever permanently lost (see OcrResult.rawText / HistoryItem.rawText).
 */

export interface CleanupOptions {
  preserveLineBreaks: boolean;
  normalizeWhitespace: boolean;
}

export const DEFAULT_CLEANUP_OPTIONS: CleanupOptions = {
  preserveLineBreaks: true,
  normalizeWhitespace: true
};

// Matches URLs (http/https/www.) so cleanup never breaks them across a collapse.
const URL_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"')\]]+)/gi;
// Matches emails so surrounding whitespace normalization never touches the local@domain token.
const EMAIL_PATTERN = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;

// A non-whitespace sentinel character (U+2063, INVISIBLE SEPARATOR) used to
// stand in for protected tokens. Because it isn't a space/tab itself, any
// real whitespace surrounding the original token is left exactly where it
// was — only the token *content* is swapped out and back in.
const SENTINEL = "⁣";

/**
 * Protects tokens (URLs, emails) from being mangled by whitespace collapsing by
 * temporarily swapping them for placeholders, then restoring them at the end.
 */
function withProtectedTokens(text: string, fn: (input: string) => string): string {
  const tokens: string[] = [];
  const placeholder = (i: number) => `${SENTINEL}${i}${SENTINEL}`;

  let working = text.replace(URL_PATTERN, (match) => {
    tokens.push(match);
    return placeholder(tokens.length - 1);
  });
  working = working.replace(EMAIL_PATTERN, (match) => {
    tokens.push(match);
    return placeholder(tokens.length - 1);
  });

  let result = fn(working);

  tokens.forEach((token, i) => {
    result = result.split(placeholder(i)).join(token);
  });

  return result;
}

/** Collapses runs of horizontal whitespace (spaces/tabs) to a single space, per line, and trims edges. */
function normalizeHorizontalWhitespace(line: string): string {
  return line.replace(/[ \t]+/g, " ").trim();
}

/**
 * Common OCR whitespace artifacts:
 * - stray spaces before punctuation ("word ." -> "word.")
 * - missing space after sentence punctuation followed directly by a capital letter is left alone
 *   (too risky to guess — we do not want to alter meaning)
 * - repeated blank lines collapsed to at most one
 */
function fixPunctuationSpacing(text: string): string {
  return text
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/([([{])[ \t]+/g, "$1")
    .replace(/[ \t]+([)\]}])/g, "$1");
}

export function cleanOcrText(rawText: string, options: CleanupOptions = DEFAULT_CLEANUP_OPTIONS): string {
  if (!rawText) return "";

  return withProtectedTokens(rawText, (input) => {
    // Normalize line endings first.
    let text = input.replace(/\r\n?/g, "\n");

    if (options.normalizeWhitespace) {
      text = text
        .split("\n")
        .map((line) => normalizeHorizontalWhitespace(line))
        .join("\n");
      text = fixPunctuationSpacing(text);
    }

    if (options.preserveLineBreaks) {
      // Collapse 3+ consecutive blank lines to a single blank line, but keep
      // intentional paragraph breaks (one blank line) intact.
      text = text.replace(/\n{3,}/g, "\n\n");
    } else {
      // Join soft-wrapped lines into paragraphs: a single newline becomes a space,
      // but a blank line (paragraph break) is preserved as one newline.
      text = text
        .split(/\n{2,}/)
        .map((para) => para.replace(/\n/g, " ").replace(/[ \t]+/g, " ").trim())
        .join("\n\n");
    }

    // Trim leading/trailing blank lines without touching interior structure.
    text = text.replace(/^\n+/, "").replace(/\n+$/, "").replace(/[ \t]+$/gm, "");

    return text;
  });
}

/** Convenience: extract URLs found in a text block, useful for "preserve URLs" UI affordances/tests. */
export function extractUrls(text: string): string[] {
  return Array.from(text.matchAll(URL_PATTERN)).map((m) => m[0]);
}

export function extractEmails(text: string): string[] {
  return Array.from(text.matchAll(EMAIL_PATTERN)).map((m) => m[0]);
}
