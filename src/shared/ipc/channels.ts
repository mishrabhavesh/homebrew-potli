/**
 * Every IPC channel the app uses, in one place. The preload script only exposes
 * wrapper functions (see src/main/preload.ts) that call `ipcRenderer.invoke`/`on`
 * against these exact strings — renderer code never touches ipcRenderer directly.
 */
export const IPC = {
  // Settings
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  SETTINGS_CHANGED: "settings:changed", // main -> renderer push

  // History
  HISTORY_GET: "history:get",
  HISTORY_DELETE: "history:delete",
  HISTORY_CLEAR: "history:clear",
  HISTORY_COPY: "history:copy",
  HISTORY_GET_IMAGE: "history:get-image", // renderer -> main: fetch a saved image as a data URL, by id
  HISTORY_CHANGED: "history:changed", // main -> renderer push

  // Capture flow
  CAPTURE_START: "capture:start", // renderer (tray/quick-capture) -> main: begin selection flow, { mode }
  CAPTURE_GET_DISPLAYS: "capture:get-displays", // overlay -> main
  CAPTURE_REGION_SELECTED: "capture:region-selected", // overlay -> main
  CAPTURE_CANCEL: "capture:cancel", // overlay -> main
  CAPTURE_RESULT: "capture:result", // main -> main-window renderer push (for toasts/history refresh)
  CAPTURE_STATE: "capture:state", // main -> overlay push (e.g. "processing")

  // Shortcut
  SHORTCUT_SET: "shortcut:set",
  SHORTCUT_RECORD_VALIDATE: "shortcut:record-validate",
  SHORTCUT_PAUSE_TOGGLE: "shortcut:pause-toggle",

  // Permissions
  PERMISSIONS_GET: "permissions:get",
  PERMISSIONS_OPEN_SETTINGS: "permissions:open-settings",
  PERMISSIONS_REQUEST: "permissions:request",

  // Window / navigation
  WINDOW_SHOW_MAIN: "window:show-main",
  WINDOW_NAVIGATE: "window:navigate", // main -> renderer push (tray menu deep link)
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_CLOSE: "window:close",

  // Tray quick-access panel (custom floating window, not the native tray menu)
  PANEL_HIDE: "panel:hide",

  // Security
  SECURITY_GET_STATUS: "security:get-status", // renderer -> main: is history encrypted at rest on this machine?

  // Toast — the small bottom-right confirmation window (see notifications/toastWindow.ts)
  TOAST_SHOW: "toast:show", // renderer -> main: show it, same one used for capture confirmations

  // App info
  APP_GET_INFO: "app:get-info",
  APP_QUIT: "app:quit"
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
