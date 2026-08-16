import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

class FakeStore<T extends object> {
  store: T;
  constructor(opts: { defaults: T }) {
    this.store = { ...opts.defaults };
  }
  get<K extends keyof T>(key: K, fallback?: T[K]) {
    return this.store[key] ?? fallback;
  }
  set<K extends keyof T>(key: K, value: T[K]) {
    this.store[key] = value;
  }
}

vi.mock("electron-store", () => ({ default: FakeStore }));

// historyImageStore.ts reads app.getPath("userData") to decide where saved
// image files live — point it at a throwaway temp directory so these tests
// exercise real file writes/deletes without touching the real userData dir
// (and without needing the real Electron runtime, which isn't available here).
const testUserDataDir = path.join(os.tmpdir(), `copyclip-history-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
vi.mock("electron", () => ({
  app: { getPath: () => testUserDataDir }
}));

const { historyStore } = await import("../src/main/history/historyStore");

function fakePng(): Buffer {
  // Not a structurally valid PNG — fine, since historyStore/historyImageStore
  // never decode image bytes, only write/read/delete them as opaque data.
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

describe("historyStore", () => {
  beforeEach(async () => {
    await historyStore.clear();
  });

  afterAll(async () => {
    await fs.rm(testUserDataDir, { recursive: true, force: true });
  });

  it("starts empty", () => {
    expect(historyStore.getAll()).toEqual([]);
  });

  it("adds a text entry with a generated id and timestamp, newest first", async () => {
    await historyStore.addText({ text: "first", rawText: "first", region: { width: 100, height: 40 }, engine: "tesseract", language: "eng", origin: "capture" });
    await historyStore.addText({ text: "second", rawText: "second", region: { width: 100, height: 40 }, engine: "tesseract", language: "eng", origin: "capture" });

    const items = historyStore.getAll();
    expect(items).toHaveLength(2);
    const [top] = items;
    expect(top.kind).toBe("text");
    if (top.kind !== "text") throw new Error("expected text item");
    expect(top.text).toBe("second"); // most recent first
    expect(top.id).toBeTruthy();
    expect(new Date(top.createdAt).toString()).not.toBe("Invalid Date");
  });

  it("adds an image entry, saving the PNG bytes to disk and recording an imagePath", async () => {
    const item = await historyStore.addImage({ region: { width: 200, height: 100 }, imageBuffer: fakePng(), origin: "capture" });
    expect(item.kind).toBe("image");
    expect(item.imagePath).toContain(testUserDataDir);
    const onDisk = await fs.readFile(item.imagePath);
    expect(onDisk.equals(fakePng())).toBe(true);
  });

  it("deletes a text entry by id", async () => {
    const item = await historyStore.addText({ text: "to-delete", rawText: "to-delete", region: { width: 1, height: 1 }, engine: "tesseract", language: "eng", origin: "capture" });
    await historyStore.delete(item.id);
    expect(historyStore.getAll().find((i) => i.id === item.id)).toBeUndefined();
  });

  it("deletes an image entry by id and removes its file from disk", async () => {
    const item = await historyStore.addImage({ region: { width: 10, height: 10 }, imageBuffer: fakePng(), origin: "capture" });
    await historyStore.delete(item.id);
    expect(historyStore.getAll().find((i) => i.id === item.id)).toBeUndefined();
    await expect(fs.readFile(item.imagePath)).rejects.toThrow();
  });

  it("clears all entries and deletes any saved image files", async () => {
    await historyStore.addText({ text: "a", rawText: "a", region: { width: 1, height: 1 }, engine: "tesseract", language: "eng", origin: "capture" });
    const imageItem = await historyStore.addImage({ region: { width: 1, height: 1 }, imageBuffer: fakePng(), origin: "capture" });
    await historyStore.clear();
    expect(historyStore.getAll()).toEqual([]);
    await expect(fs.readFile(imageItem.imagePath)).rejects.toThrow();
  });

  it("notifies listeners with the updated list on add/delete/clear", async () => {
    const listener = vi.fn();
    const unsubscribe = historyStore.onChange(listener);

    await historyStore.addText({ text: "x", rawText: "x", region: { width: 1, height: 1 }, engine: "tesseract", language: "eng", origin: "capture" });
    expect(listener).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ text: "x" })]));

    await historyStore.clear();
    expect(listener).toHaveBeenLastCalledWith([]);

    unsubscribe();
  });

  it("keeps the raw (uncleaned) text alongside the cleaned text", async () => {
    const item = await historyStore.addText({
      text: "Hello world",
      rawText: "Hello    world",
      region: { width: 1, height: 1 },
      engine: "tesseract",
      language: "eng",
      origin: "capture"
    });
    expect(item.rawText).toBe("Hello    world");
    expect(item.text).toBe("Hello world");
  });

  it("mixes text and image entries in one chronological list, newest first", async () => {
    await historyStore.addText({ text: "first", rawText: "first", region: { width: 1, height: 1 }, engine: "tesseract", language: "eng", origin: "capture" });
    const image = await historyStore.addImage({ region: { width: 1, height: 1 }, imageBuffer: fakePng(), origin: "capture" });

    const items = historyStore.getAll();
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(image.id);
    expect(items[0].kind).toBe("image");
    expect(items[1].kind).toBe("text");
  });

  it("records origin=capture for shortcut-triggered captures and origin=clipboard for passive clipboard copies", async () => {
    const captured = await historyStore.addText({ text: "from capture", rawText: "from capture", region: { width: 1, height: 1 }, engine: "tesseract", language: "eng", origin: "capture" });
    const copied = await historyStore.addText({ text: "from clipboard", rawText: "from clipboard", engine: "clipboard", language: "", origin: "clipboard" });

    expect(captured.origin).toBe("capture");
    expect(copied.origin).toBe("clipboard");
    expect(copied.region).toBeUndefined();
  });
});
