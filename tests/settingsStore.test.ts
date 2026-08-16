import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * electron-store (and Electron itself) aren't available under plain Node/vitest,
 * so we substitute a minimal in-memory Store that mimics the handful of methods
 * settingsStore.ts actually uses. This still exercises the real merge/validate/
 * persist/notify logic in SettingsStore — only the disk-backed Conf layer is faked.
 */
class FakeStore<T extends object> {
  store: T;
  constructor(opts: { defaults: T }) {
    this.store = { ...opts.defaults };
  }
  get(key: keyof T) {
    return this.store[key];
  }
  set(key: keyof T, value: unknown) {
    (this.store as Record<string, unknown>)[key as string] = value;
  }
}

vi.mock("electron-store", () => ({ default: FakeStore }));

const { settingsStore } = await import("../src/main/settings/settingsStore");
const { DEFAULT_SETTINGS } = await import("../src/shared/types/settings");

describe("settingsStore", () => {
  beforeEach(() => {
    settingsStore.update({ ...DEFAULT_SETTINGS });
  });

  it("returns all default settings on first read", () => {
    const all = settingsStore.getAll();
    expect(all.shortcut).toBe(DEFAULT_SETTINGS.shortcut);
    expect(all.theme).toBe("system");
  });

  it("persists a partial update while leaving other fields untouched", () => {
    settingsStore.update({ theme: "dark" });
    const all = settingsStore.getAll();
    expect(all.theme).toBe("dark");
    expect(all.shortcut).toBe(DEFAULT_SETTINGS.shortcut);
  });

  it("notifies listeners on every update", () => {
    const listener = vi.fn();
    const unsubscribe = settingsStore.onChange(listener);
    settingsStore.update({ autoPaste: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].autoPaste).toBe(true);
    unsubscribe();
    settingsStore.update({ autoPaste: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("rejects an update that would produce an invalid settings shape", () => {
    // @ts-expect-error intentionally passing a wrong type to verify runtime validation
    expect(() => settingsStore.update({ theme: "not-a-theme" })).toThrow();
  });

  it("returns a defensive copy from getAll (mutating the result doesn't affect the store)", () => {
    const snapshot = settingsStore.getAll();
    snapshot.theme = "light";
    expect(settingsStore.getAll().theme).not.toBe("light");
  });
});
