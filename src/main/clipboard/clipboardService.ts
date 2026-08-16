import { clipboard, nativeImage } from "electron";
import { logger } from "../logger";
import { noteProgrammaticWrite } from "./clipboardWatcher";

/**
 * Thin wrapper over Electron's clipboard module. Kept as its own module so
 * call sites don't reach into `electron` directly, and so we have one place
 * to add safety behavior later (e.g. clearing sensitive clipboard entries).
 *
 * Every write also tells clipboardWatcher what was just written, so the
 * passive clipboard watcher doesn't turn Potli's own capture/re-copy
 * writes into a second, redundant "clipboard" history entry.
 *
 * Per spec §18: never log clipboard contents.
 */
export const clipboardService = {
  writeText(text: string): void {
    try {
      clipboard.writeText(text);
      noteProgrammaticWrite("text", text);
    } catch (error) {
      logger.error("Failed to write to clipboard", error);
      throw new Error("Could not copy text to the clipboard.");
    }
  },

  readText(): string {
    return clipboard.readText();
  },

  /** Writes raw PNG bytes to the clipboard as an image ("Copy as Image" flow). */
  writeImagePng(png: Buffer): void {
    try {
      const image = nativeImage.createFromBuffer(png);
      if (image.isEmpty()) {
        throw new Error("Decoded image was empty.");
      }
      clipboard.writeImage(image);
      noteProgrammaticWrite("image", png);
    } catch (error) {
      logger.error("Failed to write image to clipboard", error);
      throw new Error("Could not copy the image to the clipboard.");
    }
  }
};
