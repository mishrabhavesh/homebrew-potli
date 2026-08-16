import { describe, it, expect } from "vitest";
import {
  appSettingsSchema,
  partialSettingsSchema,
  captureRegionSchema,
  captureStartSchema,
  captureModeSchema,
  shortcutIdSchema,
  historyDeleteSchema,
  historyGetImageSchema,
  shortcutSetSchema,
  permissionKindSchema,
  navigateSchema,
  toastShowSchema,
  parseOrThrow
} from "../src/shared/ipc/schemas";
import { DEFAULT_SETTINGS } from "../src/shared/types/settings";

describe("appSettingsSchema", () => {
  it("accepts the default settings object", () => {
    expect(() => appSettingsSchema.parse(DEFAULT_SETTINGS)).not.toThrow();
  });

  it("rejects a settings object with a wrong-typed field", () => {
    const bad = { ...DEFAULT_SETTINGS, theme: "purple" };
    expect(() => appSettingsSchema.parse(bad)).toThrow();
  });

  it("rejects a missing required field", () => {
    const { shortcut, ...rest } = DEFAULT_SETTINGS;
    expect(() => appSettingsSchema.parse(rest)).toThrow();
  });

  it("rejects a settings object missing the second (image) shortcut", () => {
    const { imageShortcut, ...rest } = DEFAULT_SETTINGS;
    expect(() => appSettingsSchema.parse(rest)).toThrow();
  });
});

describe("partialSettingsSchema", () => {
  it("accepts an empty object", () => {
    expect(() => partialSettingsSchema.parse({})).not.toThrow();
  });

  it("accepts a single valid field update", () => {
    expect(() => partialSettingsSchema.parse({ autoPaste: true })).not.toThrow();
  });

  it("accepts an imageShortcut-only update", () => {
    expect(() => partialSettingsSchema.parse({ imageShortcut: "CommandOrControl+Shift+I" })).not.toThrow();
  });

  it("rejects an unknown-shaped field even in a partial update", () => {
    expect(() => partialSettingsSchema.parse({ theme: 123 })).toThrow();
  });
});

describe("captureModeSchema / shortcutIdSchema", () => {
  it("accepts the two known capture modes", () => {
    expect(() => captureModeSchema.parse("text")).not.toThrow();
    expect(() => captureModeSchema.parse("image")).not.toThrow();
  });

  it("rejects an unknown capture mode", () => {
    expect(() => captureModeSchema.parse("video")).toThrow();
  });

  it("accepts the two known shortcut ids", () => {
    expect(() => shortcutIdSchema.parse("extractText")).not.toThrow();
    expect(() => shortcutIdSchema.parse("copyImage")).not.toThrow();
  });

  it("rejects an unknown shortcut id", () => {
    expect(() => shortcutIdSchema.parse("doSomethingElse")).toThrow();
  });
});

describe("captureRegionSchema", () => {
  it("accepts a well-formed text-mode capture region", () => {
    const region = { x: 10, y: 20, width: 300, height: 150, displayId: 1, mode: "text" };
    expect(() => captureRegionSchema.parse(region)).not.toThrow();
  });

  it("accepts a well-formed image-mode capture region", () => {
    const region = { x: 10, y: 20, width: 300, height: 150, displayId: 1, mode: "image" };
    expect(() => captureRegionSchema.parse(region)).not.toThrow();
  });

  it("rejects a region missing mode", () => {
    const region = { x: 10, y: 20, width: 300, height: 150, displayId: 1 };
    expect(() => captureRegionSchema.parse(region)).toThrow();
  });

  it("rejects a zero or negative width/height (guards against degenerate captures)", () => {
    expect(() => captureRegionSchema.parse({ x: 0, y: 0, width: 0, height: 100, displayId: 1, mode: "text" })).toThrow();
    expect(() => captureRegionSchema.parse({ x: 0, y: 0, width: 100, height: -5, displayId: 1, mode: "text" })).toThrow();
  });

  it("rejects an absurdly large region (protects against a malicious/buggy renderer payload)", () => {
    expect(() => captureRegionSchema.parse({ x: 0, y: 0, width: 999999, height: 100, displayId: 1, mode: "text" })).toThrow();
  });
});

describe("captureStartSchema", () => {
  it("accepts either capture mode", () => {
    expect(() => captureStartSchema.parse({ mode: "text" })).not.toThrow();
    expect(() => captureStartSchema.parse({ mode: "image" })).not.toThrow();
  });

  it("rejects a missing mode", () => {
    expect(() => captureStartSchema.parse({})).toThrow();
  });
});

describe("historyDeleteSchema / historyGetImageSchema / shortcutSetSchema / navigateSchema", () => {
  it("rejects an empty id", () => {
    expect(() => historyDeleteSchema.parse({ id: "" })).toThrow();
    expect(() => historyGetImageSchema.parse({ id: "" })).toThrow();
  });

  it("accepts a well-formed historyGetImageSchema payload", () => {
    expect(() => historyGetImageSchema.parse({ id: "abc" })).not.toThrow();
  });

  it("requires both id and accelerator on shortcutSetSchema", () => {
    expect(() => shortcutSetSchema.parse({ accelerator: "CommandOrControl+Shift+T" })).toThrow();
    expect(() => shortcutSetSchema.parse({ id: "extractText" })).toThrow();
  });

  it("accepts a well-formed shortcutSetSchema payload for either shortcut id", () => {
    expect(() => shortcutSetSchema.parse({ id: "extractText", accelerator: "CommandOrControl+Shift+T" })).not.toThrow();
    expect(() => shortcutSetSchema.parse({ id: "copyImage", accelerator: "CommandOrControl+Shift+I" })).not.toThrow();
  });

  it("rejects an empty accelerator string", () => {
    expect(() => shortcutSetSchema.parse({ id: "extractText", accelerator: "" })).toThrow();
  });

  it("only accepts known route names", () => {
    expect(() => navigateSchema.parse({ route: "quick-capture" })).not.toThrow();
    expect(() => navigateSchema.parse({ route: "not-a-real-route" })).toThrow();
  });
});

describe("permissionKindSchema", () => {
  it("accepts the two known permission kinds", () => {
    expect(() => permissionKindSchema.parse("screen-recording")).not.toThrow();
    expect(() => permissionKindSchema.parse("accessibility")).not.toThrow();
  });

  it("rejects an unknown permission kind", () => {
    expect(() => permissionKindSchema.parse("camera")).toThrow();
  });
});

describe("toastShowSchema", () => {
  it("accepts a message with an explicit status", () => {
    expect(toastShowSchema.parse({ message: "Text copied", status: "success" })).toEqual({
      message: "Text copied",
      status: "success"
    });
  });

  it("defaults status to success when omitted", () => {
    expect(toastShowSchema.parse({ message: "Text copied" })).toEqual({ message: "Text copied", status: "success" });
  });

  it("rejects an empty message", () => {
    expect(() => toastShowSchema.parse({ message: "" })).toThrow();
  });

  it("rejects an unknown status", () => {
    expect(() => toastShowSchema.parse({ message: "hi", status: "warning" })).toThrow();
  });

  it("rejects an overly long message", () => {
    expect(() => toastShowSchema.parse({ message: "a".repeat(201) })).toThrow();
  });
});

describe("parseOrThrow", () => {
  it("throws a descriptive error including the validation message", () => {
    expect(() => parseOrThrow(historyDeleteSchema, { id: "" })).toThrow(/Invalid IPC payload/);
  });

  it("returns the parsed value on success", () => {
    expect(parseOrThrow(historyDeleteSchema, { id: "abc" })).toEqual({ id: "abc" });
  });
});
