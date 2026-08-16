import Store from "electron-store";
import { randomUUID } from "node:crypto";
import { HistoryItem, TextHistoryItem, ImageHistoryItem } from "../../shared/types/history";
import { HISTORY_LIMIT } from "../../shared/constants";
import { saveHistoryImage, deleteHistoryImage } from "./historyImageStore";
import { logger } from "../logger";

interface HistorySchema {
  items: HistoryItem[];
}

type Listener = (items: HistoryItem[]) => void;

export type NewTextEntry = Omit<TextHistoryItem, "id" | "createdAt" | "kind">;
export type NewImageEntry = Omit<ImageHistoryItem, "id" | "createdAt" | "kind" | "imagePath"> & {
  /** Raw PNG bytes — historyStore owns writing this to disk under a path keyed by the new entry's id. */
  imageBuffer: Buffer;
};

/**
 * Local-only capture history — both OCR text results and "Copy as Image"
 * screenshots. Per spec §13/§18: nothing here ever leaves the device, and
 * nothing is logged. Image bytes are written to disk (see
 * historyImageStore.ts) only for entries the user chose to keep as images;
 * that file is deleted the moment its history entry is deleted or history is
 * cleared, so nothing outlives its history entry.
 */
class HistoryStore {
  private store: Store<HistorySchema>;
  private listeners = new Set<Listener>();

  constructor() {
    this.store = new Store<HistorySchema>({
      name: "history",
      defaults: { items: [] }
    });
  }

  getAll(): HistoryItem[] {
    return this.store.get("items", []);
  }

  async addText(entry: NewTextEntry): Promise<TextHistoryItem> {
    const item: TextHistoryItem = {
      ...entry,
      kind: "text",
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    await this.persist(item);
    return item;
  }

  async addImage(entry: NewImageEntry): Promise<ImageHistoryItem> {
    const id = randomUUID();
    const imagePath = await saveHistoryImage(id, entry.imageBuffer);
    const item: ImageHistoryItem = {
      kind: "image",
      origin: entry.origin,
      id,
      createdAt: new Date().toISOString(),
      region: entry.region,
      imagePath
    };
    await this.persist(item);
    return item;
  }

  private async persist(item: HistoryItem): Promise<void> {
    const current = this.getAll();
    const next = [item, ...current];

    // Prune beyond the retention limit, cleaning up any dropped images' files.
    const overflow = next.slice(HISTORY_LIMIT);
    const kept = next.slice(0, HISTORY_LIMIT);
    await Promise.all(overflow.filter((i): i is ImageHistoryItem => i.kind === "image").map((i) => deleteHistoryImage(i.imagePath)));

    this.store.set("items", kept);
    this.emit(kept);
  }

  async delete(id: string): Promise<void> {
    const items = this.getAll();
    const target = items.find((i) => i.id === id);
    const remaining = items.filter((i) => i.id !== id);
    this.store.set("items", remaining);
    this.emit(remaining);
    if (target?.kind === "image") {
      await deleteHistoryImage(target.imagePath);
    }
  }

  async clear(): Promise<void> {
    const items = this.getAll();
    this.store.set("items", []);
    this.emit([]);
    await Promise.all(
      items.filter((i): i is ImageHistoryItem => i.kind === "image").map((i) => deleteHistoryImage(i.imagePath))
    ).catch((error) => logger.warn("Failed to clean up some history image files", { error: String(error) }));
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(items: HistoryItem[]): void {
    for (const listener of this.listeners) listener(items);
  }
}

export const historyStore = new HistoryStore();
