import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Some native OCR adapters (macOS Vision CLI helper, Windows OCR PowerShell
 * helper) need a file path rather than stdin. We write the screenshot to the
 * OS temp directory just long enough for that external process to read it,
 * then delete it immediately — per spec §18, screenshots are never persisted.
 */
export async function withTempImageFile<T>(image: Buffer, fn: (filePath: string) => Promise<T>): Promise<T> {
  const filePath = path.join(os.tmpdir(), `copyclip-${randomUUID()}.png`);
  await fs.writeFile(filePath, image);
  try {
    return await fn(filePath);
  } finally {
    fs.unlink(filePath).catch(() => {
      /* best-effort cleanup; the OS temp dir is periodically purged regardless */
    });
  }
}
