/**
 * Heuristic for "this copied text is probably terminal/log/code output, not
 * something the user meant to save" — used by the clipboard watcher to skip
 * auto-capturing that kind of clutter. Deliberately conservative: it only
 * flags text it's fairly confident about (multi-line output that's mostly
 * technical-looking lines, or a single very long line with almost no word
 * spacing that isn't a URL). Normal sentences, short snippets, and links are
 * always left alone — a missed skip is far cheaper than a wrongly dropped
 * copy the user actually wanted.
 */

const TECHNICAL_LINE_PATTERNS: RegExp[] = [
  /^\s*(at |\s{4}at )\S/, // stack trace frames ("    at Object.<anonymous> ...")
  /^\s*\$\s/, // shell prompt echoed in output
  /^\s*(npm|npx|git|node|yarn|pnpm|python3?|pip3?|curl|wget|docker|kubectl|brew)\s/i,
  /^\[[A-Za-z0-9_-]+\]/, // "[ELECTRON] ...", "[DEBUG] ..."
  /\b(DeprecationWarning|UnhandledPromiseRejection|Traceback|Segmentation fault|TypeError|ReferenceError|SyntaxError)\b/,
  /^--?[A-Za-z][\w-]*(=|\s|$)/, // CLI flags, e.g. "--outfile dist/main/preload.js"
  /^\s*(import|export|const|let|var|function|class|def |return |if\s*\(|for\s*\()\b/, // code-shaped lines
  /^[A-Za-z]:\\|^\/[\w.-]+(\/[\w.-]+){2,}/ // filesystem paths (Windows or *nix, several segments deep)
];

function isTechnicalLine(line: string): boolean {
  return TECHNICAL_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

export function looksLikeTechnicalNoise(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);

  // A multi-line block where most lines read as log/code output.
  if (lines.length >= 3) {
    const technicalCount = lines.filter(isTechnicalLine).length;
    if (technicalCount / lines.length >= 0.5) return true;
  }

  // A single very long "line" (or two) with almost no spaces — a path, hash,
  // minified output, base64 blob, etc. — rather than an actual sentence.
  // URLs are explicitly exempted since those are exactly what people want captured.
  if (lines.length <= 2 && trimmed.length > 160) {
    const isUrl = /^https?:\/\/\S+$/i.test(trimmed);
    if (!isUrl) {
      const spaceRatio = (trimmed.match(/ /g)?.length ?? 0) / trimmed.length;
      if (spaceRatio < 0.04) return true;
    }
  }

  return false;
}
