import Store from "electron-store";
import { AppSettings, DEFAULT_SETTINGS } from "../../shared/types/settings";
import { appSettingsSchema } from "../../shared/ipc/schemas";
import { logger } from "../logger";

type Listener = (settings: AppSettings) => void;

/**
 * Thin wrapper around electron-store that guarantees whatever is on disk always
 * conforms to AppSettings (missing keys are backfilled with defaults; unknown
 * keys are dropped), and notifies listeners (IPC broadcast, shortcut manager,
 * tray) whenever settings change.
 */
class SettingsStore {
  private store: Store<AppSettings>;
  private listeners = new Set<Listener>();

  constructor() {
    this.store = new Store<AppSettings>({
      name: "settings",
      defaults: DEFAULT_SETTINGS,
      clearInvalidConfig: true
    });
    this.migrate();
  }

  private migrate(): void {
    const current = this.store.store as Partial<AppSettings>;
    const merged: AppSettings = { ...DEFAULT_SETTINGS, ...current };
    const parsed = appSettingsSchema.safeParse(merged);
    if (!parsed.success) {
      logger.warn("Settings failed validation on load; resetting invalid fields.");
      this.store.set(DEFAULT_SETTINGS);
      return;
    }
    this.store.store = parsed.data;
  }

  getAll(): AppSettings {
    return { ...this.store.store };
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  /** Merge a partial update, validate the resulting whole object, persist, and notify listeners. */
  update(partial: Partial<AppSettings>): AppSettings {
    const next = { ...this.getAll(), ...partial };
    const parsed = appSettingsSchema.parse(next);
    this.store.store = parsed;
    this.emit(parsed);
    return parsed;
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(settings: AppSettings): void {
    for (const listener of this.listeners) listener(settings);
  }
}

export const settingsStore = new SettingsStore();
