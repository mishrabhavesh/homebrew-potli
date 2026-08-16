import React from "react";
import { useSettingsStore } from "../stores/settingsStore";

export function SettingsClipboard() {
  const { settings, update } = useSettingsStore();

  return (
    <div className="mx-auto max-w-xl px-8 py-8">
      <h1 className="mb-6 text-[17px] font-semibold tracking-tight">Clipboard</h1>

      <section className="panel flex items-center justify-between p-5">
        <div className="pr-4">
          <p className="text-[13px] font-medium">Watch clipboard for copies</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#9c9ca3]">
            When on, anything you copy or cut anywhere — not just Potli captures — is added to History
            automatically, so it&rsquo;s there if you need it again.
          </p>
        </div>
        <Toggle checked={settings.clipboardWatcherEnabled} onChange={(v) => update({ clipboardWatcherEnabled: v })} />
      </section>

      <section className="panel mt-4 p-5">
        <p className="text-[13px] font-medium">What gets skipped</p>
        <ul className="mt-2.5 flex flex-col gap-2">
          <InfoRow text="Content marked private by password managers (1Password, Bitwarden, and similar) — this is a standard convention those apps use to opt out of clipboard managers, and Potli always respects it." />
          <InfoRow text="Anything Potli itself just copied — capturing text or an image doesn't create a duplicate entry." />
        </ul>
      </section>

      <section className="panel mt-4 p-5">
        <p className="text-[13px] font-medium">Local only</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">
          Clipboard history is stored only on this device, exactly like captures — nothing is ever uploaded.
          Turn the toggle above off at any time to stop watching; entries already in History stay until you delete them.
        </p>
      </section>
    </div>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#9c9ca3]" />
      <p className="text-[12.5px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">{text}</p>
    </li>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-150 ${
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
