import { OcrEngine, OcrOptions, OcrResult } from "../../shared/types/ocr";
import { cleanOcrText } from "../../shared/ocr/textCleanup";
import { TesseractEngine } from "./engines/tesseractEngine";
import { MacVisionEngine } from "./engines/macVisionEngine";
import { WindowsOcrEngine } from "./engines/windowsOcrEngine";
import { OcrEngineId } from "../../shared/types/settings";
import { logger } from "../logger";

/**
 * Selects and runs the best available OCR engine for the current platform,
 * with the Tesseract fallback always available as a safety net. This is the
 * only module the rest of the app talks to for OCR — callers never touch a
 * concrete OcrEngine implementation directly (spec §3: "Do not tightly
 * couple the rest of the application to a specific OCR engine").
 */
class OcrService {
  private readonly tesseract = new TesseractEngine();
  private readonly macVision = new MacVisionEngine();
  private readonly windowsOcr = new WindowsOcrEngine();
  private cachedPreferredEngine: OcrEngine | null = null;

  private get platformEngine(): OcrEngine | null {
    if (process.platform === "darwin") return this.macVision;
    if (process.platform === "win32") return this.windowsOcr;
    return null; // Linux has no first-party native adapter yet — Tesseract is the primary engine.
  }

  async listAvailableEngines(): Promise<OcrEngine[]> {
    const candidates = [this.platformEngine, this.tesseract].filter((e): e is OcrEngine => e !== null);
    const results = await Promise.all(candidates.map(async (e) => ((await e.isAvailable()) ? e : null)));
    return results.filter((e): e is OcrEngine => e !== null);
  }

  private async resolveEngine(preferred: OcrEngineId | "auto"): Promise<OcrEngine> {
    if (preferred !== "auto") {
      const explicit = [this.macVision, this.windowsOcr, this.tesseract].find((e) => e.id === preferred);
      if (explicit && (await explicit.isAvailable())) return explicit;
      logger.warn(`Preferred OCR engine "${preferred}" unavailable, falling back to auto-detect.`);
    }

    const platform = this.platformEngine;
    if (platform && (await platform.isAvailable())) {
      return platform;
    }
    return this.tesseract;
  }

  async recognize(
    image: Buffer,
    options: OcrOptions,
    cleanup: { preserveLineBreaks: boolean; normalizeWhitespace: boolean },
    preferredEngine: OcrEngineId | "auto" = "auto"
  ): Promise<OcrResult> {
    const engine = await this.resolveEngine(preferredEngine);
    logger.info("Running OCR", { engine: engine.id });

    let result: OcrResult;
    try {
      result = await engine.recognize(image, options);
    } catch (error) {
      if (engine.id !== this.tesseract.id) {
        logger.warn(`${engine.id} failed, retrying with Tesseract fallback.`);
        result = await this.tesseract.recognize(image, options);
      } else {
        throw error;
      }
    }

    const cleanedText = cleanOcrText(result.rawText, cleanup);
    return { ...result, text: cleanedText };
  }

  async dispose(): Promise<void> {
    await this.tesseract.dispose?.();
  }
}

export const ocrService = new OcrService();
