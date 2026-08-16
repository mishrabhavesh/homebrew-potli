import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "../logger";

const execFileAsync = promisify(execFile);

/**
 * "Copy and paste automatically" (spec §7). This simulates a paste keystroke
 * into whatever application currently has focus. It is inherently platform-
 * specific and, on macOS, requires the Accessibility permission — if that
 * permission is missing the OS will simply no-op the keystroke, so callers
 * should treat failures here as non-fatal (the text is already on the
 * clipboard regardless).
 */
export interface AutoPasteResult {
  attempted: boolean;
  succeeded: boolean;
  reason?: string;
}

async function pasteMac(): Promise<AutoPasteResult> {
  try {
    await execFileAsync("osascript", [
      "-e",
      'tell application "System Events" to keystroke "v" using command down'
    ]);
    return { attempted: true, succeeded: true };
  } catch (error) {
    logger.warn("macOS auto-paste failed (likely missing Accessibility permission).");
    return { attempted: true, succeeded: false, reason: "accessibility-permission" };
  }
}

async function pasteWindows(): Promise<AutoPasteResult> {
  try {
    // SendKeys targets the foreground window, which is exactly what we want:
    // whatever the user had focused before invoking the capture shortcut.
    const script = "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')";
    await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
    return { attempted: true, succeeded: true };
  } catch (error) {
    logger.warn("Windows auto-paste failed.");
    return { attempted: true, succeeded: false, reason: "sendkeys-failed" };
  }
}

async function pasteLinux(): Promise<AutoPasteResult> {
  // xdotool works reliably on X11; Wayland compositors generally block synthetic
  // input for security reasons unless the compositor explicitly supports it
  // (e.g. via ydotool with a running daemon). We try xdotool first and fail
  // soft with a clear reason otherwise, per spec §21 (explain, don't silently fail).
  try {
    await execFileAsync("xdotool", ["key", "--clearmodifiers", "ctrl+v"]);
    return { attempted: true, succeeded: true };
  } catch (error) {
    logger.warn("Linux auto-paste failed (xdotool missing or Wayland session).");
    return {
      attempted: true,
      succeeded: false,
      reason: "xdotool-unavailable-or-wayland"
    };
  }
}

export async function attemptAutoPaste(): Promise<AutoPasteResult> {
  switch (process.platform) {
    case "darwin":
      return pasteMac();
    case "win32":
      return pasteWindows();
    case "linux":
      return pasteLinux();
    default:
      return { attempted: false, succeeded: false, reason: "unsupported-platform" };
  }
}
