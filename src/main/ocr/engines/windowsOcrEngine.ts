import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { OcrEngine, OcrOptions, OcrResult } from "../../../shared/types/ocr";
import { withTempImageFile } from "../tempImageFile";
import { logger } from "../../logger";
import { bundledResourcesPath } from "../../paths";

const execFileAsync = promisify(execFile);

function scriptPath(): string {
  return path.join(bundledResourcesPath(), "windows", "OcrHelper.ps1");
}

/**
 * Windows-native adapter using the built-in Windows.Media.Ocr WinRT API,
 * invoked through a bundled PowerShell helper script. This is the same
 * engine Windows itself uses for on-device text recognition — no network
 * access, no extra runtime to install.
 *
 * If the language pack for the requested language isn't installed, or
 * PowerShell/WinRT projection isn't available (very old Windows builds),
 * isAvailable() returns false and OcrService falls back to Tesseract.
 */
export class WindowsOcrEngine implements OcrEngine {
  readonly id = "windows-ocr";
  readonly label = "Windows OCR";

  async isAvailable(): Promise<boolean> {
    if (process.platform !== "win32") return false;
    try {
      await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.Major"], {
        timeout: 8_000
      });
      return true;
    } catch {
      return false;
    }
  }

  async recognize(image: Buffer, options?: OcrOptions): Promise<OcrResult> {
    const start = Date.now();
    const language = toBcp47(options?.language);

    const rawText = await withTempImageFile(image, async (filePath) => {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          scriptPath(),
          "-ImagePath",
          filePath,
          "-Language",
          language
        ],
        { maxBuffer: 16 * 1024 * 1024, timeout: 30_000, windowsHide: true }
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

function toBcp47(language?: string): string {
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
  return map[language ?? "eng"] ?? "en-US";
}

function parseHelperOutput(stdout: string): { text: string } | { error: string } {
  const lastLine = stdout.trim().split("\n").filter(Boolean).pop();
  if (!lastLine) {
    return { error: "The Windows OCR helper returned no output." };
  }
  try {
    const parsed = JSON.parse(lastLine) as { text?: string; error?: string };
    if (parsed.error) return { error: parsed.error };
    return { text: parsed.text ?? "" };
  } catch (error) {
    logger.error("Failed to parse Windows OCR helper output", error);
    return { error: "The Windows OCR helper returned an unexpected response." };
  }
}
