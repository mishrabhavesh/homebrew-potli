import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "../logger";
import { encryptBuffer, decryptBuffer } from "../security/secureStorage";

/**
 * Local-only storage for "Copy as Image" history entries. Per spec §18 the
 * app never uploads screenshots — these PNGs live only under the app's own
 * userData directory on this device, are never sent anywhere, and are
 * deleted the moment their history entry is deleted or history is cleared.
 *
 * The bytes written to disk are encrypted at rest (see secureStorage.ts) —
 * anyone with filesystem access to this machine sees opaque ciphertext, not
 * a viewable screenshot.
 *
 * Renderers never receive a raw filesystem path to these files; they fetch
 * pixel data through the `history:get-image` IPC call (see
 * registerIpcHandlers.ts), which reads the file here and returns a base64
 * data URL — keeping the same "no direct filesystem access from the
 * renderer" posture as the rest of the app.
 */

function imagesDir(): string {
  return path.join(app.getPath("userData"), "history-images");
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(imagesDir(), { recursive: true });
}

export async function saveHistoryImage(id: string, png: Buffer): Promise<string> {
  await ensureDir();
  const filePath = path.join(imagesDir(), `${id}.png`);
  await fs.writeFile(filePath, encryptBuffer(png));
  return filePath;
}

export async function deleteHistoryImage(imagePath: string): Promise<void> {
  try {
    await fs.unlink(imagePath);
  } catch (error) {
    logger.warn(`Could not delete history image at ${imagePath}`, { error: String(error) });
  }
}

/** Raw PNG bytes for an image history entry — used when re-copying it straight to the clipboard. */
export async function readHistoryImageBuffer(imagePath: string): Promise<Buffer> {
  const stored = await fs.readFile(imagePath);
  return decryptBuffer(stored);
}

export async function readHistoryImageAsDataUrl(imagePath: string): Promise<string> {
  const buffer = await readHistoryImageBuffer(imagePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
