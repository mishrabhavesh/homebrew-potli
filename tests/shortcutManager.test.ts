import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeGlobalShortcut = {
  registered: new Map<string, () => void>(),
  register(accelerator: string, handler: () => void) {
    if (accelerator === "CommandOrControl+Shift+Q") return false; // simulate "taken by another app"
    this.registered.set(accelerator, handler);
    return true;
  },
  unregister(accelerator: string) {
    this.registered.delete(accelerator);
  },
  unregisterAll() {
    this.registered.clear();
  }
};

vi.mock("electron", () => ({ globalShortcut: fakeGlobalShortcut }));

const { shortcutManager } = await import("../src/main/shortcuts/shortcutManager");

describe("shortcutManager", () => {
  beforeEach(() => {
    shortcutManager.unregisterAll();
    shortcutManager.setPaused(false);
    fakeGlobalShortcut.registered.clear();
  });

  it("registers the two independent shortcuts under their own ids without disturbing each other", () => {
    const textResult = shortcutManager.register("extractText", "CommandOrControl+Shift+T", () => {});
    const imageResult = shortcutManager.register("copyImage", "CommandOrControl+Shift+I", () => {});

    expect(textResult.success).toBe(true);
    expect(imageResult.success).toBe(true);
    expect(shortcutManager.getAccelerator("extractText")).toBe("CommandOrControl+Shift+T");
    expect(shortcutManager.getAccelerator("copyImage")).toBe("CommandOrControl+Shift+I");
    expect(fakeGlobalShortcut.registered.size).toBe(2);
  });

  it("rejects an invalid accelerator before ever calling globalShortcut.register", () => {
    const result = shortcutManager.register("extractText", "T", () => {});
    expect(result.success).toBe(false);
    expect(fakeGlobalShortcut.registered.size).toBe(0);
  });

  it("surfaces a clear error when the OS reports the accelerator is already taken", () => {
    const result = shortcutManager.register("extractText", "CommandOrControl+Shift+Q", () => {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already used/i);
  });

  it("changing one shortcut's accelerator doesn't affect the other", () => {
    shortcutManager.register("extractText", "CommandOrControl+Shift+T", () => {});
    shortcutManager.register("copyImage", "CommandOrControl+Shift+I", () => {});

    shortcutManager.register("extractText", "CommandOrControl+Shift+X", () => {});

    expect(shortcutManager.getAccelerator("extractText")).toBe("CommandOrControl+Shift+X");
    expect(shortcutManager.getAccelerator("copyImage")).toBe("CommandOrControl+Shift+I");
    expect(fakeGlobalShortcut.registered.has("CommandOrControl+Shift+T")).toBe(false);
    expect(fakeGlobalShortcut.registered.has("CommandOrControl+Shift+X")).toBe(true);
  });

  it("pausing unbinds every registered shortcut from the OS but remembers them", () => {
    shortcutManager.register("extractText", "CommandOrControl+Shift+T", () => {});
    shortcutManager.register("copyImage", "CommandOrControl+Shift+I", () => {});

    shortcutManager.setPaused(true);
    expect(fakeGlobalShortcut.registered.size).toBe(0);
    expect(shortcutManager.isPaused()).toBe(true);
    // Still remembered even though unbound from the OS.
    expect(shortcutManager.getAccelerator("extractText")).toBe("CommandOrControl+Shift+T");

    shortcutManager.setPaused(false);
    expect(fakeGlobalShortcut.registered.size).toBe(2);
  });

  it("unregisterAll clears every shortcut and the OS-level registrations", () => {
    shortcutManager.register("extractText", "CommandOrControl+Shift+T", () => {});
    shortcutManager.register("copyImage", "CommandOrControl+Shift+I", () => {});

    shortcutManager.unregisterAll();

    expect(shortcutManager.getAccelerator("extractText")).toBeNull();
    expect(shortcutManager.getAccelerator("copyImage")).toBeNull();
    expect(fakeGlobalShortcut.registered.size).toBe(0);
  });
});
