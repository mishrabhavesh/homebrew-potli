import { safeStorage } from "electron";
import { logger } from "../logger";

/**
 * Encrypts history text and saved screenshots at rest using Electron's
 * `safeStorage` — backed by the OS's own secure storage (macOS Keychain,
 * Windows DPAPI, Linux Secret Service via libsecret). The encryption key
 * never lives in the app itself; the OS manages it, tied to the logged-in
 * user's own session, the same way a password manager does.
 *
 * Everything here degrades gracefully rather than breaking the app: if the
 * OS's secure storage isn't available (most commonly a Linux install with no
 * keyring daemon running), content is written in a clearly-marked plaintext
 * form instead, and a single warning is logged. Content written by earlier,
 * pre-encryption versions of Potli (no marker at all) is still read
 * correctly — see the "legacy" branches below.
 */

let warnedUnavailable = false;

export function isSecureStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function warnUnavailableOnce(): void {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  logger.warn(
    "OS secure storage isn't available on this system — history is being stored unencrypted. " +
      "This is common on Linux without a keyring daemon (e.g. gnome-keyring) running."
  );
}

const TEXT_ENCRYPTED_PREFIX = "potli:enc:v1:";
const TEXT_PLAIN_PREFIX = "potli:plain:v1:";

/** Encrypts a string for storage in a text-based store (electron-store's
 * on-disk JSON file, via its `serialize` hook). Falls back to a
 * clearly-marked plaintext form if OS secure storage isn't available. */
export function encryptText(plainText: string): string {
  if (isSecureStorageAvailable()) {
    const encrypted = safeStorage.encryptString(plainText);
    return TEXT_ENCRYPTED_PREFIX + encrypted.toString("base64");
  }
  warnUnavailableOnce();
  return TEXT_PLAIN_PREFIX + plainText;
}

/** Reverses `encryptText` — also transparently reads files written before
 * encryption existed (plain JSON with no marker prefix at all). */
export function decryptText(stored: string): string {
  if (stored.startsWith(TEXT_ENCRYPTED_PREFIX)) {
    if (!isSecureStorageAvailable()) {
      throw new Error("Content is encrypted but OS secure storage is unavailable on this system.");
    }
    const encrypted = Buffer.from(stored.slice(TEXT_ENCRYPTED_PREFIX.length), "base64");
    return safeStorage.decryptString(encrypted);
  }
  if (stored.startsWith(TEXT_PLAIN_PREFIX)) {
    return stored.slice(TEXT_PLAIN_PREFIX.length);
  }
  // Legacy: written before encryption was added — plain JSON, no marker.
  return stored;
}

const IMAGE_MAGIC = Buffer.from("POTLIENC1");

/** Encrypts raw image bytes for storage on disk. Falls back to writing the
 * plain PNG bytes unchanged if OS secure storage isn't available. */
export function encryptBuffer(plain: Buffer): Buffer {
  if (isSecureStorageAvailable()) {
    const encrypted = safeStorage.encryptString(plain.toString("base64"));
    return Buffer.concat([IMAGE_MAGIC, encrypted]);
  }
  warnUnavailableOnce();
  return plain;
}

/** Reverses `encryptBuffer` — also transparently reads legacy plain PNGs
 * written before encryption existed. */
export function decryptBuffer(stored: Buffer): Buffer {
  const isEncrypted = stored.length >= IMAGE_MAGIC.length && stored.subarray(0, IMAGE_MAGIC.length).equals(IMAGE_MAGIC);
  if (isEncrypted) {
    if (!isSecureStorageAvailable()) {
      throw new Error("Image is encrypted but OS secure storage is unavailable on this system.");
    }
    const encrypted = stored.subarray(IMAGE_MAGIC.length);
    const base64 = safeStorage.decryptString(encrypted);
    return Buffer.from(base64, "base64");
  }
  // Legacy plaintext PNG (or a plaintext fallback write) — pass through.
  return stored;
}
