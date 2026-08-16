import { app } from "electron";
import path from "node:path";

/**
 * Centralized, single-source-of-truth path resolution for compiled output.
 * Using `app.getAppPath()` (rather than ad-hoc `__dirname` traversal from
 * whichever file happens to be calling) means every caller gets the same
 * answer regardless of how deep in dist/main/** it lives, and it works
 * identically whether the app is running unpackaged (dist/ next to
 * package.json) or packaged (dist/ inside app.asar).
 */
const APP_ROOT = app.getAppPath();

export function preloadPath(): string {
  return path.join(APP_ROOT, "dist", "main", "preload.js");
}

export function rendererIndexPath(): string {
  return path.join(APP_ROOT, "dist", "renderer", "index.html");
}

export function overlayHtmlPath(): string {
  return path.join(APP_ROOT, "dist", "renderer", "overlay", "overlay.html");
}

export function quickPanelHtmlPath(): string {
  return path.join(APP_ROOT, "dist", "renderer", "quickpanel", "quickpanel.html");
}

/** Bundled non-JS resources (Swift/PowerShell OCR helpers, icons). Packaged builds
 * copy `resources/` to `process.resourcesPath` via electron-builder's `extraResources`. */
export function bundledResourcesPath(): string {
  return app.isPackaged ? process.resourcesPath : path.join(APP_ROOT, "resources");
}
