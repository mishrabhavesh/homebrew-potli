import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { OcrEngine, OcrOptions, OcrResult } from "../../../shared/types/ocr";
import { withTempImageFile } from "../tempImageFile";
import { logger } from "../../logger";
import { bundledResourcesPath } from "../../paths";

const execFileAsync = promisify(execFile);

function scriptPath(): string {
  return path.join(bundledResourcesPath(), "mac", "VisionOCR.swift");
}

/**
 * macOS-native adapter using Apple's Vision framework (VNRecognizeTextRequest)
 * via a small bundled Swift script run through the `swift` interpreter that
 * ships with Xcode Command Line Tools. This keeps recognition fully on-device
 * and avoids bundling a separate native Node addon/binary per architecture.
 *
 * If the Swift toolchain isn't installed, isAvailable() returns false and the
 * OcrService transparently falls back to the Tesseract engine — the user
 * never sees a hard failure over this.
 */
export class MacVisionEngine implements OcrEngine {
  readonly id = "mac-vision";
  readonly label = "Apple Vision (macOS)";

  async isAvailable(): Promise<boolean> {
    if (process.platform !== "darwin") return false;
    try {
      await execFileAsync("xcrun", ["--find", "swift"]);
      return true;
    } catch {
      return false;
    }
  }

  async recognize(image: Buffer, options?: OcrOptions): Promise<OcrResult> {
    const start = Date.now();
    const languages = toBcp47(options);

    const rawText = await withTempImageFile(image, async (filePath) => {
      const { stdout } = await execFileAsync(
        "swift",
        [scriptPath(), filePath, languages.join(",")],
        { maxBuffer: 16 * 1024 * 1024, timeout: 30_000 }
      );
      const parsed = parseHelperOutput(stdout);
      if ("error" in parsed) {
        throw new Error(parsed.error);
      }
      return parsed.text;
    });

    return {
      text: rawText,
      rawText,
      engine: this.id,
      durationMs: Date.now() - start
    };
  }
}

function toBcp47(options?: OcrOptions): string[] {
  // Vision expects BCP-47 tags (e.g. "en-US"); our settings store ISO 639
  // codes shared with Tesseract, so we map the common ones and otherwise pass
  // through — Vision will fall back to its own default if a tag is unknown.
  const map: Record<string, string> = {
    eng: "en-US",
    spa: "es-ES",
    fra: "fr-FR",
    deu: "de-DE",
    por: "pt-BR",
    ita: "it-IT",
    nld: "nl-NL",
    jpn: "ja-JP",
    chi_sim: "zh-Hans",
    rus: "ru-RU",
    ara: "ar-SA",
    hin: "hi-IN"
  };
  const langs = [options?.language ?? "eng", ...(options?.additionalLanguages ?? [])];
  return langs.map((l) => map[l] ?? l);
}

function parseHelperOutput(stdout: string): { text: string } | { error: string } {
  const lastLine = stdout.trim().split("\n").filter(Boolean).pop();
  if (!lastLine) {
    return { error: "The macOS OCR helper returned no output." };
  }
  try {
    const parsed = JSON.parse(lastLine) as { text?: string; error?: string };
    if (parsed.error) return { error: parsed.error };
    return { text: parsed.text ?? "" };
  } catch (error) {
    logger.error("Failed to parse macOS Vision OCR helper output", error);
    return { error: "The macOS OCR helper returned an unexpected response." };
  }
}
