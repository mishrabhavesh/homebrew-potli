import { app, BrowserWindow } from "electron";
import { createMainWindow, showMainWindow } from "./windows/mainWindow";
import { closeSelectionOverlays } from "./windows/overlayWindow";
import { createTray, destroyTray } from "./tray/trayManager";
import { shortcutManager } from "./shortcuts/shortcutManager";
import { handlerForShortcut, triggerCapture } from "./shortcuts/shortcutHandlers";
import { settingsStore } from "./settings/settingsStore";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers";
import { ocrService } from "./ocr/ocrService";
import { startClipboardWatcher, stopClipboardWatcher } from "./clipboard/clipboardWatcher";
import { logger } from "./logger";
import { APP_NAME } from "../shared/constants";
import { ShortcutId } from "../shared/types/settings";

app.setName(APP_NAME);

// Only one instance of a background utility like this should ever run.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showMainWindow("quick-capture");
  });

  app.whenReady().then(bootstrap);
}

async function bootstrap(): Promise<void> {
  registerIpcHandlers();

  // This is a background/menu-bar-style utility: no Dock icon on macOS, and
  // closing the main window (see mainWindow.ts) hides rather than quits.
  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  const settings = settingsStore.getAll();

  // Both independent shortcuts ("Extract Text" and "Copy as Image") share one
  // paused/active state — set it before registering so a saved "paused"
  // preference is honored immediately rather than briefly flashing active.
  shortcutManager.setPaused(settings.shortcutPaused);
  registerShortcut("extractText", settings.shortcut);
  registerShortcut("copyImage", settings.imageShortcut);

  createTray({
    onExtractText: () => triggerCapture("text"),
    onCopyImage: () => triggerCapture("image"),
    onOpenHistory: () => showMainWindow("history"),
    onOpenSettings: () => showMainWindow("settings-keyboard"),
    onQuit: () => {
      (app as unknown as { isQuitting: boolean }).isQuitting = true;
      app.quit();
    }
  });

  if (!settings.onboardingComplete) {
    createMainWindow("onboarding");
  }

  // Passive system-wide clipboard capture (spec: "if we do Cmd+C or Cmd+X it
  // will get attached to history"). Always started — the watcher itself
  // no-ops on every poll when the user has turned it off in Settings, so
  // toggling the setting takes effect immediately without a restart.
  startClipboardWatcher();

  app.on("activate", () => {
    // Only relevant on macOS with a Dock icon, which we hide — kept for
    // correctness if a future build re-enables the Dock icon.
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      showMainWindow();
    }
  });
}

function registerShortcut(id: ShortcutId, accelerator: string): void {
  const registration = shortcutManager.register(id, accelerator, handlerForShortcut(id));
  if (!registration.success) {
    logger.warn(`Could not register saved shortcut "${accelerator}" (${id}): ${registration.error}`);
  }
}

app.on("window-all-closed", () => {
  // Background utility: never quit just because windows closed. macOS also
  // conventionally never quits on this event; we extend that to all platforms
  // since the app's whole purpose is to keep running in the tray.
});

app.on("before-quit", () => {
  (app as unknown as { isQuitting: boolean }).isQuitting = true;
  shortcutManager.unregisterAll();
  stopClipboardWatcher();
  closeSelectionOverlays();
  destroyTray();
  void ocrService.dispose();
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception in main process", error);
});
