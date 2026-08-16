/**
 * Validates an Electron accelerator string before we ever attempt to register it
 * with globalShortcut. This is pure logic (no Electron import) so it can run in
 * both the main process and unit tests.
 *
 * Electron accelerator format: modifier(s) joined by "+", ending in exactly one
 * non-modifier key, e.g. "CommandOrControl+Shift+T".
 * Reference: https://www.electronjs.org/docs/latest/api/accelerator
 */

const VALID_MODIFIERS = new Set([
  "Command",
  "Cmd",
  "CommandOrControl",
  "CmdOrCtrl",
  "Control",
  "Ctrl",
  "Alt",
  "Option",
  "AltGr",
  "Shift",
  "Super",
  "Meta"
]);

const VALID_KEYS = new Set([
  ..."0123456789".split(""),
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  ...["F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","F13","F14","F15","F16","F17","F18","F19","F20","F21","F22","F23","F24"],
  ")","!","@","#","$","%","^","&","*","(",":",";",":","+","=","<",",","_","-",">",".","?","/","~","`","{","]","[","|","\\","'",'"',
  "Plus","Space","Tab","Backspace","Delete","Insert","Return","Enter","Up","Down","Left","Right",
  "Home","End","PageUp","PageDown","Escape","Esc",
  "VolumeUp","VolumeDown","VolumeMute","MediaNextTrack","MediaPreviousTrack","MediaStop","MediaPlayPause",
  "PrintScreen","Num0","Num1","Num2","Num3","Num4","Num5","Num6","Num7","Num8","Num9"
]);

export interface AcceleratorValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAccelerator(accelerator: string): AcceleratorValidationResult {
  if (!accelerator || !accelerator.trim()) {
    return { valid: false, error: "Shortcut cannot be empty." };
  }

  const parts = accelerator.split("+").map((p) => p.trim()).filter(Boolean);

  if (parts.length < 2) {
    return { valid: false, error: "Shortcut needs at least one modifier (e.g. Shift, Cmd/Ctrl) plus a key." };
  }

  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  for (const mod of modifiers) {
    if (!VALID_MODIFIERS.has(mod)) {
      return { valid: false, error: `"${mod}" is not a recognized modifier key.` };
    }
  }

  // Require at least one "real" modifier so single-key-adjacent combos like just
  // "Shift+Shift" can't happen, and so the shortcut won't collide with normal typing.
  const hasPrimaryModifier = modifiers.some((m) =>
    ["Command", "Cmd", "CommandOrControl", "CmdOrCtrl", "Control", "Ctrl", "Alt", "Option", "Super", "Meta"].includes(m)
  );
  if (!hasPrimaryModifier) {
    return { valid: false, error: "Shortcut needs Cmd/Ctrl, Alt, or Super — Shift alone is not enough." };
  }

  if (VALID_MODIFIERS.has(key)) {
    return { valid: false, error: "Shortcut must end with a non-modifier key." };
  }

  if (!VALID_KEYS.has(key) && !VALID_KEYS.has(key.toUpperCase())) {
    return { valid: false, error: `"${key}" is not a supported key.` };
  }

  // De-duplicate modifiers
  if (new Set(modifiers).size !== modifiers.length) {
    return { valid: false, error: "Duplicate modifier in shortcut." };
  }

  return { valid: true };
}

/** Normalizes raw keyboard event info (from the renderer's recorder) into an Electron accelerator string. */
export function acceleratorFromKeyEvent(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  const modifiers: string[] = [];
  if (event.metaKey || event.ctrlKey) modifiers.push("CommandOrControl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");

  const rawKey = event.key;
  if (["Meta", "Control", "Alt", "Shift", "Command"].includes(rawKey)) {
    return null; // still waiting on a non-modifier key
  }

  let key = rawKey;
  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();
  else key = key.charAt(0).toUpperCase() + key.slice(1);

  if (modifiers.length === 0) return null;

  return [...modifiers, key].join("+");
}
