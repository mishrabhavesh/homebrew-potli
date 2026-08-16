import { CaptureMode } from "../../shared/types/ocr";
import { ShortcutId } from "../../shared/types/settings";
import { isCaptureInFlight } from "../capture/captureFlow";
import { openSelectionOverlays } from "../windows/overlayWindow";

/**
 * Single source of truth for "what happens when a capture is triggered" — used
 * by the global shortcut registrations (shortcutManager), the tray menu's
 * "Extract Text"/"Copy as Image" items, and any future in-app trigger, so
 * every entry point behaves identically (in-flight guard included).
 */
export function triggerCapture(mode: CaptureMode): void {
  if (isCaptureInFlight()) return;
  openSelectionOverlays(mode);
}

export function modeForShortcut(id: ShortcutId): CaptureMode {
  return id === "copyImage" ? "image" : "text";
}

export function handlerForShortcut(id: ShortcutId): () => void {
  return () => triggerCapture(modeForShortcut(id));
}
