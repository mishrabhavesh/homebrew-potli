import { z } from "zod";

/**
 * Runtime validation for every payload that crosses the IPC boundary.
 * Even though contextIsolation + a narrow preload surface already stop the
 * renderer from calling arbitrary main-process code, we still validate shapes
 * here defensively — a compromised renderer must not be able to smuggle
 * unexpected data (long strings, prototype pollution payloads, wrong types)
 * into main-process handlers.
 */

export const themeSchema = z.enum(["system", "light", "dark"]);

export const ocrEngineIdSchema = z.enum(["mac-vision", "windows-ocr", "tesseract", "auto"]);

export const shortcutIdSchema = z.enum(["extractText", "copyImage"]);

export const captureModeSchema = z.enum(["text", "image"]);

export const appSettingsSchema = z.object({
  shortcut: z.string().min(1).max(64),
  imageShortcut: z.string().min(1).max(64),
  theme: themeSchema,
  ocrLanguage: z.string().min(2).max(16),
  additionalLanguages: z.array(z.string().min(2).max(16)).max(8),
  preserveLineBreaks: z.boolean(),
  normalizeWhitespace: z.boolean(),
  autoPaste: z.boolean(),
  startAtLogin: z.boolean(),
  onboardingComplete: z.boolean(),
  shortcutPaused: z.boolean(),
  preferredOcrEngine: ocrEngineIdSchema,
  soundEnabled: z.boolean(),
  clipboardWatcherEnabled: z.boolean(),
  windowBounds: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive()
    })
    .optional()
});

export const partialSettingsSchema = appSettingsSchema.partial();

export const captureRegionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive().max(20000),
  height: z.number().positive().max(20000),
  displayId: z.number(),
  mode: captureModeSchema
});

export const captureStartSchema = z.object({ mode: captureModeSchema });

export const historyDeleteSchema = z.object({ id: z.string().min(1).max(128) });

export const historyCopySchema = z.object({ id: z.string().min(1).max(128) });

export const historyGetImageSchema = z.object({ id: z.string().min(1).max(128) });

export const shortcutSetSchema = z.object({ id: shortcutIdSchema, accelerator: z.string().min(1).max(64) });

export const shortcutValidateSchema = z.object({ accelerator: z.string().min(1).max(64) });

export const permissionKindSchema = z.enum(["screen-recording", "accessibility"]);

export const permissionsRequestSchema = z.object({ kind: permissionKindSchema });

export const navigateSchema = z.object({
  route: z.enum([
    "quick-capture",
    "history",
    "settings-keyboard",
    "settings-clipboard",
    "settings-ocr",
    "settings-appearance",
    "permissions",
    "about"
  ])
});

/** Parses & throws a descriptive error on invalid input — used at every IPC handler entry point. */
export function parseOrThrow<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(`Invalid IPC payload: ${result.error.issues.map((i) => i.message).join(", ")}`);
  }
  return result.data;
}
