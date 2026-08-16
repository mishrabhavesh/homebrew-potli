import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeClipboard = {
  text: "",
  writeText(value: string) {
    this.text = value;
  },
  readText() {
    return this.text;
  }
};

vi.mock("electron", () => ({ clipboard: fakeClipboard }));

const { clipboardService } = await import("../src/main/clipboard/clipboardService");

describe("clipboardService", () => {
  beforeEach(() => {
    fakeClipboard.text = "";
  });

  it("writes text to the system clipboard", () => {
    clipboardService.writeText("Hello from OCR");
    expect(clipboardService.readText()).toBe("Hello from OCR");
  });

  it("overwrites previous clipboard contents on a new capture", () => {
    clipboardService.writeText("first capture");
    clipboardService.writeText("second capture");
    expect(clipboardService.readText()).toBe("second capture");
  });

  it("propagates a clear, user-safe error if the underlying write throws", () => {
    const original = fakeClipboard.writeText;
    fakeClipboard.writeText = () => {
      throw new Error("native clipboard failure");
    };
    expect(() => clipboardService.writeText("x")).toThrow(/clipboard/i);
    fakeClipboard.writeText = original;
  });
});
