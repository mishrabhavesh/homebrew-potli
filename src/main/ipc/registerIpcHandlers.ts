import { app, ipcMain, IpcMainInvokeEvent } from "electron";
import { IPC } from "../../shared/ipc/channels";
import {
  partialSettingsSchema,
  captureRegionSchema,
  captureStartSchema,
  historyDeleteSchema,
  historyCopySchema,
  historyGetImageSchema,
  shortcutSetSchema,
  shortcutValidateSchema,
  permissionKindSchema,
  navigateSchema,
  parseOrThrow
} from "../../shared/ipc/schemas";
import { settingsStore } from "../settings/settingsStore";
import { historyStore } from "../history/historyStore";
import { readHistoryImageAsDataUrl, readHistoryImageBuffer } from "../history/historyImageStore";
import { shortcutManager } from "../shortcuts/shortcutManager";
import { handlerForShortcut } from "../shortcuts/shortcutHandlers";
import { validateAccelerator } from "../../shared/shortcut/validateAccelerator";
import { openSelectionOverlays } from "../windows/overlayWindow";
import { runCaptureFlow, cancelCaptureFlow, isCaptureInFlight } from "../capture/captureFlow";
import { listDisplays } from "../capture/displayUtils";
import { clipboardService } from "../clipboard/clipboardService";
import {
  getPermissionsSnapshot,
  openPermissionSettings,
  requestAccessibilityAccess,
  requestScreenRecordingAccess
} from "../permissions/permissionsService";
import { getMainWindow, showMainWindow } from "../windows/mainWindow";
import { logger } from "../logger";

/** Wraps a handler so any thrown error becomes a clean IPC rejection with a
 * user-safe message instead of leaking a stack trace to the renderer. */
function safeHandle<T>(channel: string, handler: (event: IpcMainInvokeEvent, payload: unknown) => Promise<T> | T) {
  ipcMain.handle(channel, async (event, payload) => {
    try {
      return await handler(event, payload);
    } catch (error) {
      logger.error(`IPC handler failed: ${channel}`, error);
      throw error instanceof Error ? error : new Error("Unexpected error.");
    }
  });
}

export function registerIpcHandlers(): void {
  // Settings
  safeHandle(IPC.SETTINGS_GET, () => settingsStore.getAll());
  safeHandle(IPC.SETTINGS_SET, (_e, payload) => {
    const partial = parseOrThrow(partialSettingsSchema, payload);
    return settingsStore.update(partial);
  });

  // History
  safeHandle(IPC.HISTORY_GET, () => historyStore.getAll());
  safeHandle(IPC.HISTORY_DELETE, async (_e, payload) => {
    const { id } = parseOrThrow(historyDeleteSchema, payload);
    await historyStore.delete(id);
  });
  safeHandle(IPC.HISTORY_CLEAR, async () => {
    await historyStore.clear();
  });
  safeHandle(IPC.HISTORY_COPY, async (_e, payload) => {
    const { id } = parseOrThrow(historyCopySchema, payload);
    const item = historyStore.getAll().find((i) => i.id === id);
    if (!item) return;
    if (item.kind === "text") {
      clipboardService.writeText(item.text);
    } else {
      const buffer = await readHistoryImageBuffer(item.imagePath);
      clipboardService.writeImagePng(buffer);
    }
  });
  safeHandle(IPC.HISTORY_GET_IMAGE, async (_e, payload) => {
    const { id } = parseOrThrow(historyGetImageSchema, payload);
    const item = historyStore.getAll().find((i) => i.id === id);
    if (!item || item.kind !== "image") {
      throw new Error("That image is no longer available.");
    }
    return readHistoryImageAsDataUrl(item.imagePath);
  });

  // Capture flow
  safeHandle(IPC.CAPTURE_START, (_e, payload) => {
    const { mode } = parseOrThrow(captureStartSchema, payload);
    if (isCaptureInFlight()) return;
    openSelectionOverlays(mode);
  });
  safeHandle(IPC.CAPTURE_GET_DISPLAYS, () => listDisplays());
  safeHandle(IPC.CAPTURE_REGION_SELECTED, async (_e, payload) => {
    const region = parseOrThrow(captureRegionSchema, payload);
    // Fire and forget from the IPC caller's perspective — the overlay window
    // that sent this is about to be closed by the flow itself.
    void runCaptureFlow(region);
  });
  safeHandle(IPC.CAPTURE_CANCEL, () => {
    cancelCaptureFlow();
  });

  // Shortcut
  safeHandle(IPC.SHORTCUT_SET, (_e, payload) => {
    const { id, accelerator } = parseOrThrow(shortcutSetSchema, payload);
    const result = shortcutManager.register(id, accelerator, handlerForShortcut(id));
    if (result.success) {
      settingsStore.update(id === "extractText" ? { shortcut: accelerator } : { imageShortcut: accelerator });
    }
    return result;
  });
  safeHandle(IPC.SHORTCUT_RECORD_VALIDATE, (_e, payload) => {
    const { accelerator } = parseOrThrow(shortcutValidateSchema, payload);
    return validateAccelerator(accelerator);
  });
  safeHandle(IPC.SHORTCUT_PAUSE_TOGGLE, () => {
    const next = !shortcutManager.isPaused();
    shortcutManager.setPaused(next);
    settingsStore.update({ shortcutPaused: next });
    return next;
  });

  // Permissions
  safeHandle(IPC.PERMISSIONS_GET, () => getPermissionsSnapshot());
  safeHandle(IPC.PERMISSIONS_OPEN_SETTINGS, (_e, payload) => {
    const kind = permissionKindSchema.parse(payload);
    return openPermissionSettings(kind);
  });
  safeHandle(IPC.PERMISSIONS_REQUEST, async (_e, payload) => {
    const kind = permissionKindSchema.parse(payload);
    if (kind === "screen-recording") {
      await requestScreenRecordingAccess();
    } else {
      requestAccessibilityAccess();
    }
    // Return a fresh snapshot so the renderer can update its UI in one round trip.
    return getPermissionsSnapshot();
  });

  // Window
  safeHandle(IPC.WINDOW_SHOW_MAIN, (_e, payload) => {
    const route = payload ? navigateSchema.parse({ route: payload }).route : undefined;
    showMainWindow(route);
  });
  safeHandle(IPC.WINDOW_MINIMIZE, () => getMainWindow()?.minimize());
  safeHandle(IPC.WINDOW_CLOSE, () => getMainWindow()?.close());

  // App
  safeHandle(IPC.APP_GET_INFO, () => ({ version: app.getVersion(), platform: process.platform }));
  safeHandle(IPC.APP_QUIT, () => {
    (app as unknown as { isQuitting: boolean }).isQuitting = true;
    app.quit();
  });

  // Push settings/history changes to every renderer that's listening.
  settingsStore.onChange((settings) => {
    getMainWindow()?.webContents.send(IPC.SETTINGS_CHANGED, settings);
  });
  historyStore.onChange((items) => {
    getMainWindow()?.webContents.send(IPC.HISTORY_CHANGED, items);
  });
}
