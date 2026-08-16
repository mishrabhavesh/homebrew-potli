/**
 * Application settings shape. Persisted locally via electron-store (main process)
 * and mirrored into the renderer through the settings IPC channel + zustand store.
 *
 * Keep this file dependency-free (no Electron/Node imports) so it can be safely
 * imported from renderer, main, and preload code alike.
 */

export type ThemePreference = "system" | "light" | "dark";

export type ClipboardBehavior = "copy" | "copy-and-paste";

/** OCR engine identifiers. The active engine is chosen automatically per-platform,
 * but is represented explicitly so Settings > OCR can display/override it later. */
export type OcrEngineId = "mac-vision" | "windows-ocr" | "tesseract";

/** The two independent capture shortcuts. "extractText" runs OCR; "copyImage"
 * just copies the raw screenshot — no OCR, no history text entry. */
export type ShortcutId = "extractText" | "copyImage";

export interface AppSettings {
  /** Electron accelerator string for "Extract Text", e.g. "CommandOrControl+Shift+T" */
  shortcut: string;
  /** Electron accelerator string for "Copy as Image", e.g. "CommandOrControl+Shift+I" */
  imageShortcut: string;
  theme: ThemePreference;
  ocrLanguage: string;
  additionalLanguages: string[];
  preserveLineBreaks: boolean;
  normalizeWhitespace: boolean;
  /** "copy" | "copy-and-paste" persisted as autoPaste for backward-compat with spec */
  autoPaste: boolean;
  startAtLogin: boolean;
  /** Whether onboarding has been completed */
  onboardingComplete: boolean;
  /** Whether both global shortcuts are temporarily paused via the tray menu */
  shortcutPaused: boolean;
  /** Preferred OCR engine; "auto" lets the platform default decide */
  preferredOcrEngine: OcrEngineId | "auto";
  /** Play a subtle sound on successful capture */
  soundEnabled: boolean;
  /** Whether CopyClip watches the system clipboard for any copy/cut — not just
   * its own captures — and adds it to History automatically. Content flagged
   * "concealed"/"transient" by password managers (1Password, Bitwarden, etc.)
   * is always skipped regardless of this setting. */
  clipboardWatcherEnabled: boolean;
  /** Remembered main window bounds */
  windowBounds?: { x: number; y: number; width: number; height: number };
}

export const DEFAULT_SETTINGS: AppSettings = {
  shortcut: "CommandOrControl+Shift+T",
  imageShortcut: "CommandOrControl+Shift+I",
  theme: "system",
  ocrLanguage: "eng",
  additionalLanguages: [],
  preserveLineBreaks: true,
  normalizeWhitespace: true,
  autoPaste: false,
  startAtLogin: false,
  onboardingComplete: false,
  shortcutPaused: false,
  preferredOcrEngine: "auto",
  soundEnabled: true,
  clipboardWatcherEnabled: true
};

/** Languages supported by the bundled Tesseract fallback (subset; extendable). */
export const SUPPORTED_LANGUAGES: { code: string; label: string }[] = [
  { code: "eng", label: "English" },
  { code: "spa", label: "Spanish" },
  { code: "fra", label: "French" },
  { code: "deu", label: "German" },
  { code: "por", label: "Portuguese" },
  { code: "ita", label: "Italian" },
  { code: "nld", label: "Dutch" },
  { code: "hin", label: "Hindi" },
  { code: "jpn", label: "Japanese" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
  { code: "rus", label: "Russian" },
  { code: "ara", label: "Arabic" }
];
