/** Accepts `process.platform` or any other platform-like string identifier. */
export type Platform = string;

/**
 * Pure formatting helper — deliberately takes `platform` as a parameter rather
 * than reading `process.platform` at module scope, because this file is
 * imported from both the main process (Node) and the renderer (browser
 * context, where `process` doesn't exist under our secure preload setup).
 */
function symbolsFor(platform: Platform): Record<string, string> {
  const isMac = platform === "darwin";
  return {
    CommandOrControl: isMac ? "⌘" : "Ctrl",
    CmdOrCtrl: isMac ? "⌘" : "Ctrl",
    Command: "⌘",
    Cmd: "⌘",
    Control: "Ctrl",
    Ctrl: "Ctrl",
    Alt: isMac ? "⌥" : "Alt",
    Option: "⌥",
    Shift: isMac ? "⇧" : "Shift",
    Super: isMac ? "⌘" : "Win",
    Meta: isMac ? "⌘" : "Win",
    Space: "Space",
    Return: "⏎",
    Enter: "⏎",
    Escape: "Esc"
  };
}

/** Turns an Electron accelerator ("CommandOrControl+Shift+T") into a display string ("⌘⇧T" on mac, "Ctrl+Shift+T" elsewhere). */
export function humanizeAccelerator(accelerator: string | null | undefined, platform: Platform): string {
  if (!accelerator) return "";
  const isMac = platform === "darwin";
  const symbols = symbolsFor(platform);
  const parts = accelerator.split("+").map((p) => p.trim());
  const mapped = parts.map((p) => symbols[p] ?? p);
  return isMac ? mapped.join("") : mapped.join("+");
}
