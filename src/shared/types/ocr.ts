export interface OcrOptions {
  /** Primary recognition language, ISO 639-2/3 style code understood by the active engine */
  language?: string;
  /** Additional languages to recognize simultaneously, where the engine supports it */
  additionalLanguages?: string[];
}

export interface OcrResult {
  /** Cleaned, display-ready text */
  text: string;
  /** Untouched engine output, preserved so cleanup is always reversible */
  rawText: string;
  /** Recognition confidence 0-100 if the engine reports one, otherwise undefined */
  confidence?: number;
  engine: string;
  durationMs: number;
}

/**
 * Platform-agnostic OCR engine contract. Every adapter (macOS Vision, Windows OCR,
 * Tesseract fallback, and any future cloud/local engine) implements this same shape
 * so the rest of the app never depends on engine-specific behavior.
 */
export interface OcrEngine {
  readonly id: string;
  readonly label: string;
  /** Whether this engine can run in the current environment (binaries present, OS matches, etc). */
  isAvailable(): Promise<boolean>;
  /** Run recognition against a raw image buffer (PNG). */
  recognize(image: Buffer, options?: OcrOptions): Promise<OcrResult>;
  /** Release any long-lived resources (worker processes, etc). Optional. */
  dispose?(): Promise<void>;
}

/** "text" runs OCR and copies the recognized text; "image" just copies the raw screenshot. */
export type CaptureMode = "text" | "image";

export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  /** id of the display this region was selected on */
  displayId: number;
  mode: CaptureMode;
}
