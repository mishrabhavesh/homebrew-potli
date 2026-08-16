import { BrowserWindow, app, shell } from "electron";
import { MAIN_WINDOW_MIN_SIZE, APP_NAME } from "../../shared/constants";
import { settingsStore } from "../settings/settingsStore";
import { sanitizeBounds, defaultBounds } from "./windowState";
import { IPC } from "../../shared/ipc/channels";
import { preloadPath, rendererIndexPath } from "../paths";
import { logger } from "../logger";

const isDev = !app.isPackaged;
const DEV_SERVER_URL = "http://localhost:5173";

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function createMainWindow(initialRoute?: string): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    if (initialRoute) mainWindow.webContents.send(IPC.WINDOW_NAVIGATE, { route: initialRoute });
    return mainWindow;
  }

  const bounds = sanitizeBounds(settingsStore.get("windowBounds")) ?? defaultBounds();

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: MAIN_WINDOW_MIN_SIZE.width,
    minHeight: MAIN_WINDOW_MIN_SIZE.height,
    title: APP_NAME,
    show: false,
    backgroundColor: "#18181a",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const persistBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    settingsStore.update({ windowBounds: mainWindow.getBounds() });
  };
  mainWindow.on("resize", persistBounds);
  mainWindow.on("move", persistBounds);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (initialRoute) mainWindow?.webContents.send(IPC.WINDOW_NAVIGATE, { route: initialRoute });
  });

  // Closing the window hides the app (it keeps running in the tray) rather than quitting —
  // this is a background utility per spec §1/§9.
  mainWindow.on("close", (event) => {
    const quitting = (app as unknown as { isQuitting?: boolean }).isQuitting;
    if (!quitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Surfaces otherwise-silent preload/renderer failures (e.g. a broken preload
  // script leaves the window showing only its backgroundColor with no content
  // and no obvious signal in the main-process log).
  mainWindow.webContents.on("preload-error", (_event, preloadPathArg, error) => {
    logger.error(`Preload script failed to load (${preloadPathArg})`, error);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logger.error("Renderer process gone", details);
  });
  if (isDev) {
    mainWindow.webContents.on("console-message", (_event, _level, message, line, sourceId) => {
      logger.info(`[renderer] ${message} (${sourceId}:${line})`);
    });
    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
      logger.error(`Renderer failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    });
  }

  if (isDev) {
    mainWindow.loadURL(`${DEV_SERVER_URL}/index.html`);
  } else {
    mainWindow.loadFile(rendererIndexPath());
  }

  return mainWindow;
}

export function showMainWindow(route?: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow(route);
    return;
  }
  mainWindow.show();
  mainWindow.focus();
  if (route) mainWindow.webContents.send(IPC.WINDOW_NAVIGATE, { route });
}
