import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc/channels";
import { AppSettings } from "../shared/types/settings";
import { HistoryItem } from "../shared/types/history";
import { CaptureRegion, CaptureMode } from "../shared/types/ocr";

/**
 * The only bridge between renderer code and the main process. contextIsolation
 * is on and nodeIntegration is off (see mainWindow.ts/overlayWindow.ts), so
 * this is the entire surface area available to any web content running in
 * these windows — nothing else from Node/Electron leaks through.
 *
 * Every exposed function forwards to a single, specific ipcRenderer call; the
 * renderer can never construct arbitrary IPC messages.
 */
const api = {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (partial: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_SET, partial),
    onChanged: (cb: (settings: AppSettings) => void) => {
      const listener = (_: unknown, settings: AppSettings) => cb(settings);
      ipcRenderer.on(IPC.SETTINGS_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC.SETTINGS_CHANGED, listener);
    }
  },
  history: {
    getAll: (): Promise<HistoryItem[]> => ipcRenderer.invoke(IPC.HISTORY_GET),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC.HISTORY_DELETE, { id }),
    clear: (): Promise<void> => ipcRenderer.invoke(IPC.HISTORY_CLEAR),
    copyAgain: (id: string): Promise<void> => ipcRenderer.invoke(IPC.HISTORY_COPY, { id }),
    /** Fetches a saved "Copy as Image" entry's pixels as a base64 data URL — the
     * renderer never gets a raw filesystem path. */
    getImage: (id: string): Promise<string> => ipcRenderer.invoke(IPC.HISTORY_GET_IMAGE, { id }),
    onChanged: (cb: (items: HistoryItem[]) => void) => {
      const listener = (_: unknown, items: HistoryItem[]) => cb(items);
      ipcRenderer.on(IPC.HISTORY_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC.HISTORY_CHANGED, listener);
    }
  },
  capture: {
    start: (mode: CaptureMode): Promise<void> => ipcRenderer.invoke(IPC.CAPTURE_START, { mode }),
    getDisplays: (): Promise<Array<{ id: number; x: number; y: number; width: number; height: number; scaleFactor: number }>> =>
      ipcRenderer.invoke(IPC.CAPTURE_GET_DISPLAYS),
    regionSelected: (region: CaptureRegion): Promise<void> => ipcRenderer.invoke(IPC.CAPTURE_REGION_SELECTED, region),
    cancel: (): Promise<void> => ipcRenderer.invoke(IPC.CAPTURE_CANCEL),
    onResult: (cb: (result: { ok: boolean; error?: string }) => void) => {
      const listener = (_: unknown, result: { ok: boolean; error?: string }) => cb(result);
      ipcRenderer.on(IPC.CAPTURE_RESULT, listener);
      return () => ipcRenderer.removeListener(IPC.CAPTURE_RESULT, listener);
    }
  },
  shortcut: {
    set: (id: "extractText" | "copyImage", accelerator: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC.SHORTCUT_SET, { id, accelerator }),
    validate: (accelerator: string): Promise<{ valid: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC.SHORTCUT_RECORD_VALIDATE, { accelerator }),
    togglePause: (): Promise<boolean> => ipcRenderer.invoke(IPC.SHORTCUT_PAUSE_TOGGLE)
  },
  permissions: {
    get: () => ipcRenderer.invoke(IPC.PERMISSIONS_GET),
    openSettings: (kind: "screen-recording" | "accessibility"): Promise<void> =>
      ipcRenderer.invoke(IPC.PERMISSIONS_OPEN_SETTINGS, kind),
    /** Proactively triggers the OS's native permission prompt where one exists
     * (macOS Screen Recording / Accessibility), instead of only pointing the
     * user at System Settings. Returns the refreshed permissions snapshot. */
    request: (kind: "screen-recording" | "accessibility") => ipcRenderer.invoke(IPC.PERMISSIONS_REQUEST, kind)
  },
  window: {
    showMain: (route?: string): Promise<void> => ipcRenderer.invoke(IPC.WINDOW_SHOW_MAIN, route),
    minimize: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
    close: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW_CLOSE),
    onNavigate: (cb: (route: string) => void) => {
      const listener = (_: unknown, payload: { route: string }) => cb(payload.route);
      ipcRenderer.on(IPC.WINDOW_NAVIGATE, listener);
      return () => ipcRenderer.removeListener(IPC.WINDOW_NAVIGATE, listener);
    }
  },
  app: {
    getInfo: (): Promise<{ version: string; platform: NodeJS.Platform }> => ipcRenderer.invoke(IPC.APP_GET_INFO),
    quit: (): Promise<void> => ipcRenderer.invoke(IPC.APP_QUIT)
  }
};

contextBridge.exposeInMainWorld("copyclip", api);

export type CopyClipApi = typeof api;
