import { describe, it, expect } from "vitest";
import { validateAccelerator, acceleratorFromKeyEvent } from "../src/shared/shortcut/validateAccelerator";

describe("validateAccelerator", () => {
  it("accepts the default shortcut", () => {
    expect(validateAccelerator("CommandOrControl+Shift+T").valid).toBe(true);
  });

  it("accepts a simple two-part combo", () => {
    expect(validateAccelerator("Alt+F1").valid).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = validateAccelerator("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects a single key with no modifier", () => {
    const result = validateAccelerator("T");
    expect(result.valid).toBe(false);
  });

  it("rejects Shift-only combos (no primary modifier)", () => {
    const result = validateAccelerator("Shift+T");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Cmd\/Ctrl|Alt|Super/);
  });

  it("rejects a shortcut ending in a modifier key", () => {
    const result = validateAccelerator("CommandOrControl+Shift");
    expect(result.valid).toBe(false);
  });

  it("rejects unknown modifier names", () => {
    const result = validateAccelerator("Fn+T");
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate modifiers", () => {
    const result = validateAccelerator("Control+Control+T");
    expect(result.valid).toBe(false);
  });

  it("accepts function keys", () => {
    expect(validateAccelerator("CommandOrControl+F5").valid).toBe(true);
  });

  it("accepts punctuation keys", () => {
    expect(validateAccelerator("CommandOrControl+Shift+/").valid).toBe(true);
  });
});

describe("acceleratorFromKeyEvent", () => {
  it("returns null while only modifiers are held", () => {
    expect(acceleratorFromKeyEvent({ key: "Shift", metaKey: false, ctrlKey: false, altKey: false, shiftKey: true })).toBeNull();
  });

  it("builds an accelerator from Cmd+Shift+T", () => {
    const result = acceleratorFromKeyEvent({ key: "t", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true });
    expect(result).toBe("CommandOrControl+Shift+T");
  });

  it("builds an accelerator from Ctrl+Alt+X", () => {
    const result = acceleratorFromKeyEvent({ key: "x", metaKey: false, ctrlKey: true, altKey: true, shiftKey: false });
    expect(result).toBe("CommandOrControl+Alt+X");
  });

  it("returns null when no modifier is held (bare key press)", () => {
    const result = acceleratorFromKeyEvent({ key: "t", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false });
    expect(result).toBeNull();
  });

  it("handles the space key", () => {
    const result = acceleratorFromKeyEvent({ key: " ", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false });
    expect(result).toBe("CommandOrControl+Space");
  });
});
