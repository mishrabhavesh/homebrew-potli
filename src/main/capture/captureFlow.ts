import { CaptureRegion } from "../../shared/types/ocr";
import { captureRegion } from "./captureService";
import { ocrService } from "../ocr/ocrService";
import { clipboardService } from "../clipboard/clipboardService";
import { attemptAutoPaste } from "../clipboard/autoPaste";
import { historyStore } from "../history/historyStore";
import { settingsStore } from "../settings/settingsStore";
import { closeSelectionOverlays } from "../windows/overlayWindow";
import { showToast } from "../notifications/toastWindow";
import { getMainWindow } from "../windows/mainWindow";
import { IPC } from "../../shared/ipc/channels";
import { logger } from "../logger";
import { getPermissionsSnapshot } from "../permissions/permissionsService";

let inFlight = false;

/** True while a capture pipeline is running — used to ignore shortcut re-triggers. */
export function isCaptureInFlight(): boolean {
  return inFlight;
}

/**
 * The full pipeline: capture region -> (OCR for "text" mode) -> clipboard ->
 * close overlay -> toast -> history. Called once the overlay reports a
 * completed selection. Branches on `region.mode` — "text" runs the OCR
 * pipeline from spec §5, "image" is the simpler "just copy the screenshot"
 * path with no OCR involved.
 */
export async function runCaptureFlow(region: CaptureRegion): Promise<void> {
  if (inFlight) return;
  inFlight = true;

  try {
    if (process.platform === "darwin") {
      const perms = getPermissionsSnapshot();
      if (perms.screenRecording === "denied") {
        closeSelectionOverlays();
        showToast("Screen access required — check Settings > Permissions", "error", region.displayId);
        return;
      }
    }

    const imageBuffer = await captureRegion(region);
    closeSelectionOverlays();

    if (region.mode === "image") {
      await runImageCapture(region, imageBuffer);
    } else {
      await runTextCapture(region, imageBuffer);
    }

    getMainWindow()?.webContents.send(IPC.CAPTURE_RESULT, { ok: true });
  } catch (error) {
    logger.error("Capture flow failed", error);
    closeSelectionOverlays();
    const message = error instanceof Error ? error.message : "Something went wrong capturing that area.";
    showToast(message, "error", region.displayId);
    getMainWindow()?.webContents.send(IPC.CAPTURE_RESULT, { ok: false, error: message });
  } finally {
    inFlight = false;
  }
}

async function runTextCapture(region: CaptureRegion, imageBuffer: Buffer): Promise<void> {
  const settings = settingsStore.getAll();

  const result = await ocrService.recognize(
    imageBuffer,
    { language: settings.ocrLanguage, additionalLanguages: settings.additionalLanguages },
    { preserveLineBreaks: settings.preserveLineBreaks, normalizeWhitespace: settings.normalizeWhitespace },
    settings.preferredOcrEngine
  );

  if (!result.text.trim()) {
    showToast("No text detected — try a larger or clearer area", "error", region.displayId);
    return;
  }

  clipboardService.writeText(result.text);
  await handleAutoPasteAndToast(settings.autoPaste, region.displayId, "Text");

  await historyStore.addText({
    text: result.text,
    rawText: result.rawText,
    region: { width: region.width, height: region.height },
    engine: result.engine,
    language: settings.ocrLanguage,
    origin: "capture"
  });
}

async function runImageCapture(region: CaptureRegion, imageBuffer: Buffer): Promise<void> {
  const settings = settingsStore.getAll();

  clipboardService.writeImagePng(imageBuffer);
  await handleAutoPasteAndToast(settings.autoPaste, region.displayId, "Image");

  await historyStore.addImage({
    region: { width: region.width, height: region.height },
    imageBuffer,
    origin: "capture"
  });
}

async function handleAutoPasteAndToast(autoPaste: boolean, displayId: number, label: "Text" | "Image"): Promise<void> {
  if (autoPaste) {
    const pasteResult = await attemptAutoPaste();
    if (!pasteResult.succeeded && pasteResult.reason === "accessibility-permission") {
      showToast(`Copied — enable Accessibility to auto-paste`, "info", displayId);
      return;
    }
    if (pasteResult.succeeded) {
      showToast(`${label} copied & pasted`, "success", displayId);
      return;
    }
  }
  showToast(`${label} copied`, "success", displayId);
}

export function cancelCaptureFlow(): void {
  closeSelectionOverlays();
}
