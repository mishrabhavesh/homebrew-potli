import { globalShortcut } from "electron";
import { validateAccelerator } from "../../shared/shortcut/validateAccelerator";
import { ShortcutId } from "../../shared/types/settings";
import { logger } from "../logger";

export interface RegisterResult {
  success: boolean;
  error?: string;
}

interface ManagedShortcut {
  accelerator: string;
  handler: () => void;
}

/**
 * Owns every global shortcut registration for the app (currently "Extract Text"
 * and "Copy as Image"). Electron only lets one accelerator map to one callback
 * at a time process-wide, so this class is the sole owner of globalShortcut
 * calls — nothing else in the app should call globalShortcut directly.
 *
 * Shortcuts are tracked by a stable id (ShortcutId) rather than by accelerator
 * string, so changing one shortcut's key combo doesn't disturb the others, and
 * "pause" applies uniformly to whatever is currently registered.
 */
class ShortcutManager {
  private shortcuts = new Map<ShortcutId, ManagedShortcut>();
  private paused = false;

  register(id: ShortcutId, accelerator: string, handler: () => void): RegisterResult {
    const validation = validateAccelerator(accelerator);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    this.unregister(id);
    this.shortcuts.set(id, { accelerator, handler });

    if (this.paused) {
      // Remembered but not actually bound while paused.
      return { success: true };
    }

    return this.bind(id);
  }

  private bind(id: ShortcutId): RegisterResult {
    const entry = this.shortcuts.get(id);
    if (!entry) return { success: false, error: "Unknown shortcut." };

    try {
      const ok = globalShortcut.register(entry.accelerator, entry.handler);
      if (!ok) {
        return {
          success: false,
          error: "This shortcut is already used by another application. Try a different combination."
        };
      }
      return { success: true };
    } catch (error) {
      logger.error(`Failed to register global shortcut "${id}"`, error);
      return { success: false, error: "This shortcut could not be registered on your system." };
    }
  }

  unregister(id: ShortcutId): void {
    const entry = this.shortcuts.get(id);
    if (!entry) return;
    try {
      globalShortcut.unregister(entry.accelerator);
    } catch {
      // ignore — accelerator may already be unregistered
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      for (const id of this.shortcuts.keys()) this.unregister(id);
    } else {
      for (const id of this.shortcuts.keys()) this.bind(id);
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  getAccelerator(id: ShortcutId): string | null {
    return this.shortcuts.get(id)?.accelerator ?? null;
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.shortcuts.clear();
  }
}

export const shortcutManager = new ShortcutManager();
