import React, { useCallback, useEffect, useState } from "react";
import { ShortcutBadge } from "../components/ShortcutBadge";
import { useSettingsStore } from "../stores/settingsStore";
import { acceleratorFromKeyEvent } from "@shared/shortcut/validateAccelerator";
import type { ShortcutId } from "@shared/types/settings";

export function SettingsKeyboard() {
  const { settings, update } = useSettingsStore();

  return (
    <div className="mx-auto max-w-xl px-8 py-8">
      <h1 className="mb-6 text-[17px] font-semibold tracking-tight">Keyboard</h1>

      <section className="panel p-5">
        <ShortcutRow
          id="extractText"
          title="Extract Text"
          description="Select an area and copy the recognized text to your clipboard."
          value={settings.shortcut}
        />
        <div className="my-4 h-px bg-border-light dark:bg-border-dark" />
        <ShortcutRow
          id="copyImage"
          title="Copy as Image"
          description="Select an area and copy it as a plain screenshot — no OCR."
          value={settings.imageShortcut}
        />
      </section>

      <section className="panel mt-4 flex items-center justify-between p-5">
        <div>
          <p className="text-[13px] font-medium">Pause Shortcuts</p>
          <p className="mt-0.5 text-[12px] text-[#9c9ca3]">Temporarily disable both global shortcuts without changing them.</p>
        </div>
        <Toggle checked={settings.shortcutPaused} onChange={(v) => update({ shortcutPaused: v })} />
      </section>

      <section className="panel mt-4 p-5">
        <p className="text-[13px] font-medium">After extraction</p>
        <div className="mt-3 flex flex-col gap-2.5">
          <RadioRow
            label="Copy to clipboard"
            description="Text and images are copied — paste them wherever you need."
            checked={!settings.autoPaste}
            onSelect={() => update({ autoPaste: false })}
          />
          <RadioRow
            label="Copy and paste automatically"
            description="Also attempts to paste into the app you were using (text only)."
            checked={settings.autoPaste}
            onSelect={() => update({ autoPaste: true })}
          />
        </div>
      </section>
    </div>
  );
}

function ShortcutRow({
  id,
  title,
  description,
  value
}: {
  id: ShortcutId;
  title: string;
  description: string;
  value: string;
}) {
  const [recording, setRecording] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<string | null>(null);

  const stopRecording = useCallback(() => {
    setRecording(false);
    setCandidate(null);
  }, []);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        stopRecording();
        return;
      }

      const accelerator = acceleratorFromKeyEvent({
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey
      });

      if (!accelerator) return; // still just modifiers held down

      setCandidate(accelerator);
      const validation = await window.potli.shortcut.validate(accelerator);
      if (!validation.valid) {
        setPendingError(validation.error ?? "Invalid shortcut.");
        return;
      }

      const result = await window.potli.shortcut.set(id, accelerator);
      if (!result.success) {
        setPendingError(result.error ?? "Could not register this shortcut.");
        return;
      }

      setPendingError(null);
      stopRecording();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [recording, id, stopRecording]);

  const startRecording = () => {
    setPendingError(null);
    setCandidate(null);
    setRecording(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium">{title}</p>
          <p className="mt-0.5 text-[12px] text-[#9c9ca3]">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {recording ? (
            <div className="flex items-center gap-2">
              <div className="kbd-badge min-w-[110px] justify-center border-accent/50 text-accent">
                {candidate ? <ShortcutBadge accelerator={candidate} /> : "Press keys…"}
              </div>
              <button className="text-[12px] text-[#9c9ca3] hover:text-[#4b4b4f]" onClick={stopRecording}>
                Esc to cancel
              </button>
            </div>
          ) : (
            <>
              <ShortcutBadge accelerator={value} />
              <button className="btn-secondary" onClick={startRecording}>
                Change
              </button>
            </>
          )}
        </div>
      </div>
      {pendingError && (
        <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-[12px] text-red-500">{pendingError}</p>
      )}
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

function RadioRow({
  label,
  description,
  checked,
  onSelect
}: {
  label: string;
  description: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button className="flex items-start gap-3 rounded-md p-1.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03]" onClick={onSelect}>
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          checked ? "border-accent" : "border-border-light dark:border-border-dark"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-accent" />}
      </span>
      <span>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[12px] text-[#9c9ca3]">{description}</p>
      </span>
    </button>
  );
}
