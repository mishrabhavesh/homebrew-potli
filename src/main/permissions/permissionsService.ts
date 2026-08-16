import { shell, systemPreferences, desktopCapturer } from "electron";
import { logger } from "../logger";

export type PermissionStatus = "granted" | "denied" | "not-determined" | "not-applicable";

export interface PermissionsSnapshot {
  screenRecording: PermissionStatus;
  accessibility: PermissionStatus;
  platform: NodeJS.Platform;
}

/**
 * macOS gates screen capture behind "Screen Recording" and simulated keystrokes
 * (used for auto-paste) behind "Accessibility". Windows and Linux have no
 * equivalent OS-level prompts for these specific capabilities, so we report
 * "not-applicable" there rather than asking for permissions the platform
 * doesn't have — per spec §17, only request what's actually needed.
 */
export function getPermissionsSnapshot(): PermissionsSnapshot {
  if (process.platform === "darwin") {
    return {
      screenRecording: mapMacStatus(systemPreferences.getMediaAccessStatus("screen")),
      accessibility: systemPreferences.isTrustedAccessibilityClient(false) ? "granted" : "denied",
      platform: process.platform
    };
  }

  return {
    screenRecording: "not-applicable",
    accessibility: "not-applicable",
    platform: process.platform
  };
}

function mapMacStatus(status: string): PermissionStatus {
  switch (status) {
    case "granted":
      return "granted";
    case "denied":
    case "restricted":
      return "denied";
    default:
      return "not-determined";
  }
}

export async function openPermissionSettings(kind: "screen-recording" | "accessibility"): Promise<void> {
  if (process.platform !== "darwin") return;
  const url =
    kind === "screen-recording"
      ? "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
      : "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
  try {
    await shell.openExternal(url);
  } catch (error) {
    logger.error("Failed to open System Settings", error);
  }
}

/** Prompts for Accessibility trust (macOS shows its native dialog the first time). */
export function requestAccessibilityAccess(): boolean {
  if (process.platform !== "darwin") return true;
  return systemPreferences.isTrustedAccessibilityClient(true);
}

/**
 * Actively attempts to trigger macOS's native Screen Recording permission
 * prompt, instead of only telling the user to go find the app in System
 * Settings themselves.
 *
 * There is no dedicated "request screen recording access" API on macOS
 * (unlike camera/microphone, which have `systemPreferences.askForMediaAccess`).
 * The documented, standard way to nudge the OS into showing its prompt is to
 * actually attempt the capture call the real feature uses —
 * `desktopCapturer.getSources()` — the first time an app does this, macOS
 * registers it in the TCC permissions database and, for a properly signed
 * app, shows its system dialog. Unsigned/ad-hoc dev builds sometimes don't
 * get a dialog at all, which is why Settings → Permissions always keeps the
 * "Open System Settings" fallback alongside this.
 */
export async function requestScreenRecordingAccess(): Promise<PermissionStatus> {
  if (process.platform !== "darwin") return "not-applicable";
  try {
    await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 1, height: 1 } });
  } catch (error) {
    logger.warn("Screen Recording access probe failed", { error: String(error) });
  }
  return mapMacStatus(systemPreferences.getMediaAccessStatus("screen"));
}
