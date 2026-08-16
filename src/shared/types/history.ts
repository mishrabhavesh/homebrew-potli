/**
 * A history entry is one of two kinds — "text" or "image" — and comes from one
 * of two origins: an explicit CopyClip capture ("Extract Text" / "Copy as
 * Image"), or CopyClip's passive clipboard watcher noticing a plain Cmd+C /
 * Cmd+X somewhere else on the system. Both origins share one chronological,
 * mixed timeline so History is a single place to look, but the UI marks which
 * is which so it's never confusing where an entry came from.
 */
export type HistoryItemKind = "text" | "image";

export type HistoryItemOrigin = "capture" | "clipboard";

export interface HistoryItemBase {
  id: string;
  kind: HistoryItemKind;
  origin: HistoryItemOrigin;
  /** ISO 8601 timestamp */
  createdAt: string;
}

export interface TextHistoryItem extends HistoryItemBase {
  kind: "text";
  /** Full cleaned text. For a capture this is post-OCR-cleanup; for a plain
   * clipboard copy it's exactly what was on the clipboard. */
  text: string;
  /** Original, unmodified text (recoverable per spec even after cleanup) */
  rawText: string;
  /** Which OCR engine produced this result — "clipboard" for a plain copy (no OCR involved). */
  engine: string;
  /** Best-effort OCR language used — empty string for a plain clipboard copy. */
  language: string;
  /** Width/height of the captured region — only meaningful (and only set) for
   * an "Extract Text" capture; a plain clipboard copy has no on-screen region. */
  region?: { width: number; height: number };
}

export interface ImageHistoryItem extends HistoryItemBase {
  kind: "image";
  /** Pixel dimensions of the image — always known, for both captures and clipboard copies. */
  region: { width: number; height: number };
  /**
   * Absolute path to the saved PNG on disk (under the app's local userData
   * directory — never uploaded, never leaves the device). Renderers never
   * read this path directly; they fetch the pixel data through the
   * `history:get-image` IPC call, which returns a base64 data URL, so the
   * renderer is never handed a raw filesystem path.
   */
  imagePath: string;
}

export type HistoryItem = TextHistoryItem | ImageHistoryItem;

export interface HistoryState {
  items: HistoryItem[];
}
