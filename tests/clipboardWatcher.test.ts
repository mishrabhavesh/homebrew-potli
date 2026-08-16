import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Fake electron-store (backs both settingsStore and historyStore) ---
class FakeStore<T extends object> {
  store: T;
  constructor(opts: { defaults: T }) {
    this.store = { ...opts.defaults };
  }
  get<K extends keyof T>(key: K, fallback?: T[K]) {
    return this.store[key] ?? fallback;
  }
  set<K extends keyof T>(key: K, value: T[K]) {
    if (typeof key === "object") {
      Object.assign(this.store as object, key);
    } else {
      (this.store as Record<string, unknown>)[key as string] = value;
    }
  }
}
vi.mock("electron-store", () => ({ default: FakeStore }));

// --- Fake electron: clipboard + a fake nativeImage/app for historyImageStore ---
const fakeClipboardState = {
  text: "",
  imageBuffer: Buffer.alloc(0),
  formats: [] as string[]
};

const fakeClipboard = {
  readText: () => fakeClipboardState.text,
  readImage: () => ({
    isEmpty: () => fakeClipboardState.imageBuffer.length === 0,
    toPNG: () => fakeClipboardState.imageBuffer,
    getSize: () => ({ width: fakeClipboardState.imageBuffer.length > 0 ? 10 : 0, height: fakeClipboardState.imageBuffer.length > 0 ? 10 : 0 })
  }),
  availableFormats: () => fakeClipboardState.formats
};

vi.mock("electron", () => ({
  clipboard: fakeClipboard,
  app: { getPath: () => "/tmp/copyclip-clipboard-watcher-test" }
}));

const { settingsStore } = await import("../src/main/settings/settingsStore");
const { historyStore } = await import("../src/main/history/historyStore");
const { checkClipboardOnce, noteProgrammaticWrite } = await import("../src/main/clipboard/clipboardWatcher");

function setClipboardText(text: string) {
  fakeClipboardState.text = text;
  fakeClipboardState.imageBuffer = Buffer.alloc(0);
  fakeClipboardState.formats = [];
}

describe("clipboardWatcher", () => {
  beforeEach(async () => {
    await historyStore.clear();
    settingsStore.update({ clipboardWatcherEnabled: true });
    fakeClipboardState.text = "";
    fakeClipboardState.imageBuffer = Buffer.alloc(0);
    fakeClipboardState.formats = [];
  });

  it("adds a new clipboard text entry with origin=clipboard", async () => {
    setClipboardText("hello from another app");
    await checkClipboardOnce();

    const items = historyStore.getAll();
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("text");
    if (items[0].kind !== "text") throw new Error("expected text");
    expect(items[0].text).toBe("hello from another app");
    expect(items[0].origin).toBe("clipboard");
    expect(items[0].engine).toBe("clipboard");
  });

  it("does not add the same clipboard content twice across polls", async () => {
    setClipboardText("same content");
    await checkClipboardOnce();
    await checkClipboardOnce();
    await checkClipboardOnce();

    expect(historyStore.getAll()).toHaveLength(1);
  });

  it("adds a new entry again once the clipboard content actually changes", async () => {
    setClipboardText("first");
    await checkClipboardOnce();
    setClipboardText("second");
    await checkClipboardOnce();

    expect(historyStore.getAll()).toHaveLength(2);
  });

  it("does nothing while clipboardWatcherEnabled is false", async () => {
    settingsStore.update({ clipboardWatcherEnabled: false });
    setClipboardText("should be ignored");
    await checkClipboardOnce();

    expect(historyStore.getAll()).toHaveLength(0);
  });

  it("skips content flagged concealed by a password manager", async () => {
    fakeClipboardState.text = "super-secret-generated-password";
    fakeClipboardState.formats = ["public.utf8-plain-text", "org.nspasteboard.ConcealedType"];
    await checkClipboardOnce();

    expect(historyStore.getAll()).toHaveLength(0);
  });

  it("skips a write CopyClip itself just made, avoiding a duplicate entry", async () => {
    noteProgrammaticWrite("text", "written by copyclip");
    setClipboardText("written by copyclip");
    await checkClipboardOnce();

    expect(historyStore.getAll()).toHaveLength(0);
  });

  it("still adds a later, genuinely different clipboard change after suppressing a programmatic write", async () => {
    noteProgrammaticWrite("text", "written by copyclip");
    setClipboardText("written by copyclip");
    await checkClipboardOnce();
    expect(historyStore.getAll()).toHaveLength(0);

    setClipboardText("something the user copied afterward");
    await checkClipboardOnce();
    expect(historyStore.getAll()).toHaveLength(1);
  });

  it("adds a new clipboard image entry with origin=clipboard", async () => {
    fakeClipboardState.imageBuffer = Buffer.from([1, 2, 3, 4]);
    fakeClipboardState.text = "";
    fakeClipboardState.formats = [];
    await checkClipboardOnce();

    const items = historyStore.getAll();
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("image");
    expect(items[0].origin).toBe("clipboard");
  });
});
