import { create } from "zustand";
import type { HistoryItem } from "@shared/types/history";

interface HistoryState {
  items: HistoryItem[];
  loaded: boolean;
  /** Data-URL cache for "Copy as Image" entries, keyed by history item id —
   * avoids re-fetching the same image bytes over IPC every render. */
  imageUrls: Record<string, string>;
  load: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  copyAgain: (id: string) => Promise<void>;
  loadImage: (id: string) => Promise<string | undefined>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  loaded: false,
  imageUrls: {},
  load: async () => {
    const items = await window.potli.history.getAll();
    set({ items, loaded: true });
  },
  remove: async (id) => {
    set({ items: get().items.filter((i) => i.id !== id) });
    await window.potli.history.delete(id);
  },
  clear: async () => {
    set({ items: [], imageUrls: {} });
    await window.potli.history.clear();
  },
  copyAgain: async (id) => {
    await window.potli.history.copyAgain(id);
  },
  loadImage: async (id) => {
    const cached = get().imageUrls[id];
    if (cached) return cached;
    try {
      const url = await window.potli.history.getImage(id);
      set({ imageUrls: { ...get().imageUrls, [id]: url } });
      return url;
    } catch {
      return undefined;
    }
  }
}));

if (typeof window !== "undefined" && window.potli) {
  window.potli.history.onChanged((items) => {
    useHistoryStore.setState({ items, loaded: true });
  });
}
