import { BrowserWindow, app, screen } from "electron";
import { TOAST_AUTO_DISMISS_MS } from "../../shared/constants";
import { preloadPath, overlayHtmlPath } from "../paths";

const isDev = !app.isPackaged;
const DEV_SERVER_URL = "http://localhost:5173";

export type ToastStatus = "success" | "error" | "info";

let toastWindow: BrowserWindow | null = null;
let closeTimer: NodeJS.Timeout | null = null;

const WIDTH = 300;
const HEIGHT = 56;
const MARGIN = 28;

/**
 * A tiny, borderless, click-through toast — deliberately not a native OS
 * notification (which reads as generic/system-y) and definitely not a modal
 * dialog. Positioned near the bottom-right of the display where the capture
 * happened, auto-dismisses, per spec §5/§25.
 */
export function showToast(message: string, status: ToastStatus = "success", displayId?: number): void {
  const display = displayId
    ? screen.getAllDisplays().find((d) => d.id === displayId) ?? screen.getPrimaryDisplay()
    : screen.getPrimaryDisplay();

  if (closeTimer) clearTimeout(closeTimer);
  if (toastWindow && !toastWindow.isDestroyed()) {
    toastWindow.close();
    toastWindow = null;
  }

  const x = Math.round(display.workArea.x + display.workArea.width - WIDTH - MARGIN);
  const y = Math.round(display.workArea.y + display.workArea.height - HEIGHT - MARGIN);

  toastWindow = new BrowserWindow({
    x,
    y,
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  toastWindow.setAlwaysOnTop(true, "screen-saver");
  toastWindow.setIgnoreMouseEvents(true);

  const query = `mode=toast&status=${encodeURIComponent(status)}&message=${encodeURIComponent(message)}`;
  if (isDev) {
    toastWindow.loadURL(`${DEV_SERVER_URL}/overlay/overlay.html?${query}`);
  } else {
    toastWindow.loadFile(overlayHtmlPath(), { search: query });
  }

  toastWindow.once("ready-to-show", () => toastWindow?.show());

  const win = toastWindow;
  closeTimer = setTimeout(() => {
    if (win && !win.isDestroyed()) win.close();
    if (toastWindow === win) toastWindow = null;
  }, TOAST_AUTO_DISMISS_MS + 400);
}
