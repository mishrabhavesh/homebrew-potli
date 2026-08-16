import React from "react";
import { useSettingsStore } from "../stores/settingsStore";
import type { ThemePreference } from "@shared/types/settings";

const THEMES: { value: ThemePreference; label: string; description: string }[] = [
  { value: "system", label: "System", description: "Match your OS appearance" },
  { value: "light", label: "Light", description: "Always use light mode" },
  { value: "dark", label: "Dark", description: "Always use dark mode" }
];

export function SettingsAppearance() {
  const { settings, update } = useSettingsStore();

  return (
    <div className="mx-auto max-w-xl px-8 py-8">
      <h1 className="mb-6 text-[17px] font-semibold tracking-tight">Appearance</h1>

      <section className="panel p-5">
        <p className="mb-3 text-[13px] font-medium">Theme</p>
        <div className="grid grid-cols-3 gap-2.5">
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => update({ theme: t.value })}
              className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                settings.theme === t.value
                  ? "border-accent/60 bg-accent/[0.06]"
                  : "border-border-light hover:bg-black/[0.02] dark:border-border-dark dark:hover:bg-white/[0.03]"
              }`}
            >
              <ThemePreviewSwatch theme={t.value} />
              <span className="text-[12.5px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel mt-4 flex items-center justify-between p-5">
        <div>
          <p className="text-[13px] font-medium">Start at login</p>
          <p className="mt-0.5 text-[12px] text-[#9c9ca3]">Launch CopyClip automatically when you sign in.</p>
        </div>
        <Toggle checked={settings.startAtLogin} onChange={(v) => update({ startAtLogin: v })} />
      </section>

      <section className="panel mt-4 flex items-center justify-between p-5">
        <div>
          <p className="text-[13px] font-medium">Sound</p>
          <p className="mt-0.5 text-[12px] text-[#9c9ca3]">Play a subtle sound after a successful capture.</p>
        </div>
        <Toggle checked={settings.soundEnabled} onChange={(v) => update({ soundEnabled: v })} />
      </section>
    </div>
  );
}

function ThemePreviewSwatch({ theme }: { theme: ThemePreference }) {
  const isDark = theme === "dark";
  return (
    <div
      className={`h-12 w-full rounded-md border ${
        isDark ? "border-white/10 bg-[#141416]" : "border-black/10 bg-white"
      } ${theme === "system" ? "bg-gradient-to-br from-white to-[#141416]" : ""} flex items-center gap-1 p-2`}
    >
      <div className="h-full w-2.5 rounded-sm bg-black/10 dark:bg-white/10" />
      <div className="flex-1 space-y-1">
        <div className="h-1.5 w-3/4 rounded-full bg-black/15 dark:bg-white/20" />
        <div className="h-1.5 w-1/2 rounded-full bg-black/10 dark:bg-white/10" />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] rounded-full transition-colors duration-150 ${
        checked ? "bg-accent" : "bg-black/15 dark:bg-white/15"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}
