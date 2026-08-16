import { BrowserWindow, app, screen } from "electron";
import { listDisplays } from "../capture/displayUtils";
import { preloadPath, overlayHtmlPath } from "../paths";
import { CaptureMode } from "../../shared/types/ocr";

const isDev = !app.isPackaged;
const DEV_SERVER_URL = "http://localhost:5173";

let overlayWindows: BrowserWindow[] = [];

/**
 * Opens one fullscreen, transparent, always-on-top overlay window per connected
 * display so the user can drag-select on whichever monitor they're pointing at
 * (spec §4/§20). Each window is positioned/sized to exactly match its display's
 * bounds (device-independent pixels), which is also what makes the coordinate
 * math in captureService.ts work out.
 */
export function openSelectionOverlays(mode: CaptureMode): BrowserWindow[] {
  closeSelectionOverlays();

  const displays = listDisplays();
  const cursorPoint = screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(cursorPoint);

  overlayWindows = displays.map((display) => {
    const win = new BrowserWindow({
      x: display.x,
      y: display.y,
      width: display.width,
      height: display.height,
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      show: false,
      backgroundColor: "#00000000",
      focusable: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: preloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    win.setAlwaysOnTop(true, "screen-saver");
    try {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch {
      // Not supported on all platforms/window managers — non-fatal.
    }

    const query = `displayId=${display.id}&isActive=${display.id === activeDisplay.id ? "1" : "0"}&mode=${mode}`;
    if (isDev) {
      win.loadURL(`${DEV_SERVER_URL}/overlay/overlay.html?${query}`);
    } else {
      win.loadFile(overlayHtmlPath(), {
        search: query
      });
    }

    win.once("ready-to-show", () => {
      win.show();
      if (display.id === activeDisplay.id) {
        win.focus();
      }
    });

    win.on("closed", () => {
      overlayWindows = overlayWindows.filter((w) => w !== win);
    });

    return win;
  });

  return overlayWindows;
}

export function closeSelectionOverlays(): void {
  for (const win of overlayWindows) {
    if (!win.isDestroyed()) win.close();
  }
  overlayWindows = [];
}

export function broadcastToOverlays(channel: string, ...args: unknown[]): void {
  for (const win of overlayWindows) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args);
  }
}

export function areOverlaysOpen(): boolean {
  return overlayWindows.length > 0;
}
