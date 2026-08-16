import { Tray, Menu, nativeImage, MenuItemConstructorOptions } from "electron";
import path from "node:path";
import { APP_NAME } from "../../shared/constants";
import { settingsStore } from "../settings/settingsStore";
import { shortcutManager } from "../shortcuts/shortcutManager";
import { toggleQuickPanel, hideQuickPanel } from "../windows/quickPanelWindow";
import { humanizeAccelerator } from "../../shared/shortcut/humanize";
import { bundledResourcesPath } from "../paths";

let tray: Tray | null = null;

function resolveTrayIconPath(): string {
  const filename = process.platform === "darwin" ? "trayIconTemplate.png" : "trayIcon.png";
  return path.join(bundledResourcesPath(), filename);
}

export function createTray(handlers: {
  onExtractText: () => void;
  onCopyImage: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}): Tray {
  if (tray) return tray;

  let image = nativeImage.createFromPath(resolveTrayIconPath());
  if (image.isEmpty()) {
    // Fallback: a minimal generated glyph so the app never ships with a blank tray icon.
    image = nativeImage.createEmpty();
  }
  if (process.platform === "darwin") {
    image = image.resize({ width: 18, height: 18 });
    image.setTemplateImage(true);
  }

  tray = new Tray(image);
  tray.setToolTip(APP_NAME);

  // Left click (or the only click on Windows/Linux) opens the custom
  // floating quick-access panel — full History/thumbnails/spacing that a
  // native OS menu can't give us. Right click keeps a slim native menu
  // as the traditional fallback (also reachable from the panel's footer).
  tray.on("click", () => {
    if (tray) toggleQuickPanel(tray);
  });

  tray.on("right-click", () => {
    hideQuickPanel();
    if (tray) tray.popUpContextMenu(buildSlimMenu(handlers));
  });

  return tray;
}

function buildSlimMenu(handlers: {
  onExtractText: () => void;
  onCopyImage: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}): Menu {
  const textAccel = humanizeAccelerator(settingsStore.get("shortcut"), process.platform);
  const imageAccel = humanizeAccelerator(settingsStore.get("imageShortcut"), process.platform);
  const paused = shortcutManager.isPaused();

  const template: MenuItemConstructorOptions[] = [
    { label: APP_NAME, enabled: false },
    { type: "separator" },
    { label: `Extract Text${textAccel ? `   ${textAccel}` : ""}`, click: handlers.onExtractText, enabled: !paused },
    { label: `Copy as Image${imageAccel ? `   ${imageAccel}` : ""}`, click: handlers.onCopyImage, enabled: !paused },
    { type: "separator" },
    { label: "View All History…", click: handlers.onOpenHistory },
    { label: "Settings", click: handlers.onOpenSettings },
    { type: "separator" },
    {
      label: "Pause Shortcuts",
      type: "checkbox",
      checked: paused,
      click: () => {
        const next = !shortcutManager.isPaused();
        shortcutManager.setPaused(next);
        settingsStore.update({ shortcutPaused: next });
      }
    },
    { type: "separator" },
    { label: `Quit ${APP_NAME}`, click: handlers.onQuit, role: "quit" }
  ];

  return Menu.buildFromTemplate(template);
}

export function getTray(): Tray | null {
  return tray;
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
