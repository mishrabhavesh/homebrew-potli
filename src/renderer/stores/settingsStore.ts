import { create } from "zustand";
import type { AppSettings } from "@shared/types/settings";
import { DEFAULT_SETTINGS } from "@shared/types/settings";

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const settings = await window.potli.settings.get();
    set({ settings, loaded: true });
  },
  update: async (partial) => {
    // Optimistic update for a snappy feel; the main process is the source of
    // truth and will push back the authoritative value via onChanged.
    set({ settings: { ...get().settings, ...partial } });
    await window.potli.settings.set(partial);
  }
}));

// Keep the store in sync with any change made elsewhere (tray pause toggle, etc).
if (typeof window !== "undefined" && window.potli) {
  window.potli.settings.onChanged((settings) => {
    useSettingsStore.setState({ settings, loaded: true });
  });
}
