import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulates safeStorage with a simple reversible transform — real safeStorage
// needs an actual Electron runtime with OS keychain access, unavailable in
// plain Node/vitest. This is enough to exercise the marker/fallback logic.
let encryptionAvailable = true;
vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => encryptionAvailable,
    encryptString: (plain: string) => Buffer.from(`ENC[${plain}]`),
    decryptString: (buf: Buffer) => {
      const str = buf.toString();
      const match = str.match(/^ENC\[([\s\S]*)\]$/);
      if (!match) throw new Error("bad ciphertext");
      return match[1];
    }
  }
}));

const { encryptText, decryptText, encryptBuffer, decryptBuffer, isSecureStorageAvailable } = await import(
  "../src/main/security/secureStorage"
);

describe("secureStorage", () => {
  beforeEach(() => {
    encryptionAvailable = true;
  });

  describe("text", () => {
    it("round-trips through encryptText/decryptText when encryption is available", () => {
      const original = JSON.stringify({ items: [{ id: "1", text: "hello world" }] });
      const stored = encryptText(original);
      expect(stored).not.toContain("hello world"); // not plaintext on disk
      expect(decryptText(stored)).toBe(original);
    });

    it("falls back to a marked plaintext form when encryption is unavailable", () => {
      encryptionAvailable = false;
      const original = "{\"items\":[]}";
      const stored = encryptText(original);
      expect(decryptText(stored)).toBe(original);
    });

    it("still reads legacy content written before encryption existed (no marker at all)", () => {
      const legacy = "{\"items\":[{\"id\":\"old\"}]}";
      expect(decryptText(legacy)).toBe(legacy);
    });

    it("throws when content is encrypted but secure storage becomes unavailable", () => {
      const stored = encryptText("{\"items\":[]}");
      encryptionAvailable = false;
      expect(() => decryptText(stored)).toThrow();
    });
  });

  describe("buffer (images)", () => {
    function fakePng(): Buffer {
      return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03]);
    }

    it("round-trips through encryptBuffer/decryptBuffer when encryption is available", () => {
      const original = fakePng();
      const stored = encryptBuffer(original);
      expect(stored.equals(original)).toBe(false); // not plaintext on disk
      expect(decryptBuffer(stored).equals(original)).toBe(true);
    });

    it("falls back to writing plain bytes unchanged when encryption is unavailable", () => {
      encryptionAvailable = false;
      const original = fakePng();
      const stored = encryptBuffer(original);
      expect(stored.equals(original)).toBe(true);
      expect(decryptBuffer(stored).equals(original)).toBe(true);
    });

    it("still reads legacy plain image bytes written before encryption existed", () => {
      const legacy = fakePng();
      expect(decryptBuffer(legacy).equals(legacy)).toBe(true);
    });

    it("throws when an encrypted image is read but secure storage becomes unavailable", () => {
      const stored = encryptBuffer(fakePng());
      encryptionAvailable = false;
      expect(() => decryptBuffer(stored)).toThrow();
    });
  });

  it("isSecureStorageAvailable reflects the underlying safeStorage state", () => {
    encryptionAvailable = true;
    expect(isSecureStorageAvailable()).toBe(true);
    encryptionAvailable = false;
    expect(isSecureStorageAvailable()).toBe(false);
  });
});
