import { describe, it, expect } from "vitest";
import { looksLikeTechnicalNoise } from "../src/shared/format/looksLikeTechnicalNoise";

describe("looksLikeTechnicalNoise", () => {
  it("does not flag a normal short sentence", () => {
    expect(looksLikeTechnicalNoise("Pick up milk and eggs on the way home.")).toBe(false);
  });

  it("does not flag a normal multi-line note", () => {
    const text = ["Meeting notes:", "- discuss Q3 roadmap", "- follow up with design team"].join("\n");
    expect(looksLikeTechnicalNoise(text)).toBe(false);
  });

  it("does not flag a bare URL, even a long one", () => {
    const url = "https://example.com/some/very/long/path/that/keeps/going/and/going/and/going/forever/ok";
    expect(looksLikeTechnicalNoise(url)).toBe(false);
  });

  it("does not flag a long sentence with normal spacing", () => {
    const text =
      "This is a fairly long paragraph of ordinary prose that a person might copy from an article or an email, and it should not be treated as technical noise just because it happens to be over one hundred and sixty characters long.";
    expect(looksLikeTechnicalNoise(text)).toBe(false);
  });

  it("flags a multi-line stack trace", () => {
    const text = [
      "TypeError: Cannot read properties of undefined (reading 'foo')",
      "    at Object.<anonymous> (/Users/dev/project/src/index.js:12:5)",
      "    at Module._compile (node:internal/modules/cjs/loader:1105:14)",
      "    at Module._extensions..js (node:internal/modules/cjs/loader:1159:10)"
    ].join("\n");
    expect(looksLikeTechnicalNoise(text)).toBe(true);
  });

  it("flags multi-line shell/CLI output", () => {
    const text = [
      "$ npm run build",
      "> potli@0.1.0 build",
      "npx tsc -p tsconfig.main.json",
      "git status --short"
    ].join("\n");
    expect(looksLikeTechnicalNoise(text)).toBe(true);
  });

  it("flags a long single line with almost no spaces (hash/minified-style blob)", () => {
    const blob = "a1b2c3d4e5f6".repeat(20);
    expect(blob.length).toBeGreaterThan(160);
    expect(looksLikeTechnicalNoise(blob)).toBe(true);
  });

  it("flags a deep filesystem path block", () => {
    const text = [
      "/Users/dev/project/src/main/clipboard/clipboardWatcher.ts",
      "/Users/dev/project/src/main/windows/quickPanelWindow.ts",
      "/Users/dev/project/src/main/tray/trayManager.ts"
    ].join("\n");
    expect(looksLikeTechnicalNoise(text)).toBe(true);
  });

  it("does not flag empty or whitespace-only input", () => {
    expect(looksLikeTechnicalNoise("")).toBe(false);
    expect(looksLikeTechnicalNoise("   \n  \n  ")).toBe(false);
  });
});
