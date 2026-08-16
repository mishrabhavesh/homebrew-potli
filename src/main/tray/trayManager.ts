import { Tray, Menu, nativeImage, MenuItemConstructorOptions } from "electron";
import path from "node:path";
import { APP_NAME, TRAY_HISTORY_LIMIT, TRAY_HISTORY_LABEL_MAX_LENGTH } from "../../shared/constants";
import { settingsStore } from "../settings/settingsStore";
import { shortcutManager } from "../shortcuts/shortcutManager";
import { showMainWindow } from "../windows/mainWindow";
import { humanizeAccelerator } from "../../shared/shortcut/humanize";
import { bundledResourcesPath } from "../paths";
import { historyStore } from "../history/historyStore";
import { readHistoryImageBuffer } from "../history/historyImageStore";
import { clipboardService } from "../clipboard/clipboardService";
import { showToast } from "../notifications/toastWindow";
import { formatRelativeTimeShort } from "../../shared/format/relativeTime";
import { truncate } from "../../shared/format/text";
import { logger } from "../logger";
import type { HistoryItem } from "../../shared/types/history";

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

  rebuildMenu(handlers);

  settingsStore.onChange(() => rebuildMenu(handlers));
  historyStore.onChange(() => rebuildMenu(handlers));

  tray.on("click", () => {
    if (process.platform !== "darwin") {
      // On Windows/Linux a plain click commonly toggles the app; on macOS the
      // menu bar convention is to always show the dropdown menu instead.
      showMainWindow("quick-capture");
    }
  });

  return tray;

  function rebuildMenu(h: typeof handlers): void {
    if (!tray) return;
    const textAccel = humanizeAccelerator(settingsStore.get("shortcut"), process.platform);
    const imageAccel = humanizeAccelerator(settingsStore.get("imageShortcut"), process.platform);
    const paused = shortcutManager.isPaused();

    const template: MenuItemConstructorOptions[] = [
      { label: APP_NAME, enabled: false },
      { type: "separator" },
      { label: `Extract Text${textAccel ? `   ${textAccel}` : ""}`, click: h.onExtractText, enabled: !paused },
      { label: `Copy as Image${imageAccel ? `   ${imageAccel}` : ""}`, click: h.onCopyImage, enabled: !paused },
      { type: "separator" },
      ...buildFlatHistoryItems(),
      { type: "separator" },
      { label: "View All History…", click: h.onOpenHistory },
      { label: "Settings", click: h.onOpenSettings },
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
      { label: `Quit ${APP_NAME}`, click: h.onQuit, role: "quit" }
    ];

    tray.setContextMenu(Menu.buildFromTemplate(template));
  }
}

/**
 * The most recent captures (spec: "30 in quick view, rest in app"), shown
 * directly in the main tray dropdown — not tucked behind a "History" submenu
 * hover — for instant one-click re-copy. Both text and image entries are
 * clickable, matching the in-app History page's behavior. Image entries show
 * a 🖼 marker + dimensions instead of a thumbnail — a known, accepted
 * limitation of native OS menus.
 */
function buildFlatHistoryItems(): MenuItemConstructorOptions[] {
  const items = historyStore.getAll().slice(0, TRAY_HISTORY_LIMIT);

  if (items.length === 0) {
    return [{ label: "No captures yet", enabled: false }];
  }

  return items.map((item) => ({
    label: trayLabelFor(item),
    click: () => void copyHistoryItemToClipboard(item)
  }));
}

function trayLabelFor(item: HistoryItem): string {
  const time = formatRelativeTimeShort(item.createdAt);
  if (item.kind === "text") {
    const firstLine = item.text.split("\n").find((l) => l.trim().length > 0) ?? "(empty)";
    return `${truncate(firstLine, TRAY_HISTORY_LABEL_MAX_LENGTH)}   ·   ${time}`;
  }
  return `🖼  Image · ${item.region.width}×${item.region.height}   ·   ${time}`;
}

async function copyHistoryItemToClipboard(item: HistoryItem): Promise<void> {
  try {
    if (item.kind === "text") {
      clipboardService.writeText(item.text);
    } else {
      const buffer = await readHistoryImageBuffer(item.imagePath);
      clipboardService.writeImagePng(buffer);
    }
    showToast(`${item.kind === "text" ? "Text" : "Image"} copied`, "success");
  } catch (error) {
    logger.error("Failed to re-copy history item from tray", error);
    showToast("Couldn't copy that item", "error");
  }
}

export function getTray(): Tray | null {
  return tray;
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
