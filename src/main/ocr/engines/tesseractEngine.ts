import { createWorker, Worker } from "tesseract.js";
import { OcrEngine, OcrOptions, OcrResult } from "../../../shared/types/ocr";
import { logger } from "../../logger";

/**
 * Cross-platform, fully local fallback engine. This is the default (and only
 * dependency-free) engine on Linux, and the safety net on macOS/Windows when
 * the native OCR adapter is unavailable (e.g. Xcode command line tools not
 * installed, or an old Windows build without the OCR WinRT API).
 *
 * Tesseract.js runs entirely in-process via WASM — no network access, no
 * external binaries required.
 */
export class TesseractEngine implements OcrEngine {
  readonly id = "tesseract";
  readonly label = "Tesseract (local)";

  private worker: Worker | null = null;
  private currentLanguage: string | null = null;
  private initPromise: Promise<Worker> | null = null;

  async isAvailable(): Promise<boolean> {
    // Always available — pure WASM, bundled with the app.
    return true;
  }

  private async getWorker(language: string): Promise<Worker> {
    if (this.worker && this.currentLanguage === language) {
      return this.worker;
    }
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    if (!this.initPromise) {
      this.initPromise = createWorker(language, undefined, {
        logger: () => {
          /* intentionally silent: never log OCR progress that could include page text */
        }
      });
    }
    this.worker = await this.initPromise;
    this.initPromise = null;
    this.currentLanguage = language;
    return this.worker;
  }

  async recognize(image: Buffer, options?: OcrOptions): Promise<OcrResult> {
    const start = Date.now();
    const language = buildLanguageString(options);

    try {
      const worker = await this.getWorker(language);
      const { data } = await worker.recognize(image);
      const rawText = data.text ?? "";
      return {
        text: rawText,
        rawText,
        confidence: typeof data.confidence === "number" ? data.confidence : undefined,
        engine: this.id,
        durationMs: Date.now() - start
      };
    } catch (error) {
      logger.error("Tesseract recognition failed", error);
      throw new Error("Local OCR failed to process the selected area.");
    }
  }

  async dispose(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.currentLanguage = null;
    }
  }
}

function buildLanguageString(options?: OcrOptions): string {
  const langs = [options?.language ?? "eng", ...(options?.additionalLanguages ?? [])];
  return Array.from(new Set(langs)).join("+");
}
