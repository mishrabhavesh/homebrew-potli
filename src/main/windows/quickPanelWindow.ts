import { BrowserWindow, app, screen, Tray } from "electron";
import { preloadPath, quickPanelHtmlPath } from "../paths";

const isDev = !app.isPackaged;
const DEV_SERVER_URL = "http://localhost:5173";

const WIDTH = 360;
const HEIGHT = 480;

let panelWindow: BrowserWindow | null = null;
/** Guards against the "click tray icon while panel is already open" case
 * re-opening it a beat after blur just hid it (blur fires before click on
 * some platforms). */
let justHidByBlur = false;

export function getQuickPanelWindow(): BrowserWindow | null {
  return panelWindow;
}

function createPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.setAlwaysOnTop(true, "pop-up-menu");
  try {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {
    // Not supported on all platforms/window managers — non-fatal.
  }

  if (isDev) {
    win.loadURL(`${DEV_SERVER_URL}/quickpanel/quickpanel.html`);
  } else {
    win.loadFile(quickPanelHtmlPath());
  }

  win.on("blur", () => {
    justHidByBlur = true;
    win.hide();
    setTimeout(() => {
      justHidByBlur = false;
    }, 250);
  });

  win.on("closed", () => {
    panelWindow = null;
  });

  return win;
}

/** Positions the panel anchored just below (macOS/Windows menu-bar-style tray)
 * or above (Linux, where the tray icon is often at screen bottom) the tray
 * icon, clamped so it never runs off the edge of the display. */
function positionNearTray(win: BrowserWindow, tray: Tray): void {
  const trayBounds = tray.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - WIDTH / 2);
  x = Math.min(Math.max(x, display.workArea.x + 8), display.workArea.x + display.workArea.width - WIDTH - 8);

  const spaceBelow = display.workArea.y + display.workArea.height - (trayBounds.y + trayBounds.height);
  const openBelow = process.platform !== "linux" || spaceBelow >= HEIGHT + 12;
  const y = openBelow
    ? Math.round(trayBounds.y + trayBounds.height + 6)
    : Math.round(trayBounds.y - HEIGHT - 6);

  win.setPosition(x, y, false);
}

export function showQuickPanel(tray: Tray): void {
  if (!panelWindow || panelWindow.isDestroyed()) {
    panelWindow = createPanelWindow();
  }
  positionNearTray(panelWindow, tray);
  panelWindow.show();
  panelWindow.focus();
}

export function hideQuickPanel(): void {
  if (panelWindow && !panelWindow.isDestroyed()) panelWindow.hide();
}

export function toggleQuickPanel(tray: Tray): void {
  if (justHidByBlur) {
    // The click that's toggling us right now is the same click that just
    // blurred (and hid) the panel — treat it as "close", not "reopen".
    return;
  }
  if (panelWindow && !panelWindow.isDestroyed() && panelWindow.isVisible()) {
    hideQuickPanel();
    return;
  }
  showQuickPanel(tray);
}

export function closeQuickPanel(): void {
  if (panelWindow && !panelWindow.isDestroyed()) panelWindow.close();
  panelWindow = null;
}
