/**
 * Minimal logger. IMPORTANT (spec §18 Security): never pass OCR text, clipboard
 * contents, or screenshot data to these functions. Log shapes/lengths/booleans,
 * not content.
 */

const PREFIX = "[CopyClip]";

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(PREFIX, message, meta ?? "");
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(PREFIX, message, meta ?? "");
  },
  error(message: string, error?: unknown): void {
    console.error(PREFIX, message, error instanceof Error ? error.message : error ?? "");
  }
};
