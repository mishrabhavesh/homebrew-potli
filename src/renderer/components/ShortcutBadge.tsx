import React from "react";

/** Renders an accelerator string ("CommandOrControl+Shift+T") as individual key badges. */
export function ShortcutBadge({ accelerator, size = "md" }: { accelerator: string; platform?: string; size?: "sm" | "md" | "lg" }) {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const symbolMap: Record<string, string> = {
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
    Enter: "⏎"
  };

  const parts = accelerator.split("+").filter(Boolean).map((p) => symbolMap[p] ?? p);
  const sizeClasses = size === "lg" ? "text-lg px-3 py-1.5 min-w-[2.25rem]" : size === "sm" ? "text-[11px] px-1.5 py-0.5 min-w-[1.4rem]" : "text-sm px-2 py-1 min-w-[1.8rem]";

  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((part, i) => (
        <kbd
          key={i}
          className={`kbd-badge justify-center font-mono ${sizeClasses}`}
        >
          {part}
        </kbd>
      ))}
    </span>
  );
}
