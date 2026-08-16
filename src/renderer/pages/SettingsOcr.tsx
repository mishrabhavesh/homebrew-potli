import React, { useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { SUPPORTED_LANGUAGES } from "@shared/types/settings";

export function SettingsOcr() {
  const { settings, update } = useSettingsStore();
  const [addingLanguage, setAddingLanguage] = useState(false);

  const availableToAdd = SUPPORTED_LANGUAGES.filter(
    (l) => l.code !== settings.ocrLanguage && !settings.additionalLanguages.includes(l.code)
  );

  return (
    <div className="mx-auto max-w-xl px-8 py-8">
      <h1 className="mb-6 text-[17px] font-semibold tracking-tight">OCR</h1>

      <section className="panel p-5">
        <p className="text-[13px] font-medium">Recognition Language</p>
        <select
          className="input-field mt-2.5"
          value={settings.ocrLanguage}
          onChange={(e) => update({ ocrLanguage: e.target.value })}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>

        <div className="mt-4 border-t border-border-light pt-4 dark:border-border-dark">
          <p className="mb-2 text-[12.5px] font-medium text-[#6b6b70] dark:text-[#9c9ca3]">Additional languages</p>
          <div className="flex flex-wrap gap-1.5">
            {settings.additionalLanguages.map((code) => {
              const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
              return (
                <span key={code} className="kbd-badge gap-1.5 py-1">
                  {lang?.label ?? code}
                  <button
                    className="text-[#9c9ca3] hover:text-red-500"
                    onClick={() => update({ additionalLanguages: settings.additionalLanguages.filter((c) => c !== code) })}
                  >
                    ×
                  </button>
                </span>
              );
            })}

            {addingLanguage ? (
              <select
                autoFocus
                className="input-field w-auto text-[12px]"
                onChange={(e) => {
                  if (e.target.value) {
                    update({ additionalLanguages: [...settings.additionalLanguages, e.target.value] });
                  }
                  setAddingLanguage(false);
                }}
                onBlur={() => setAddingLanguage(false)}
              >
                <option value="">Choose…</option>
                {availableToAdd.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            ) : (
              <button className="btn-secondary text-[12px]" onClick={() => setAddingLanguage(true)} disabled={availableToAdd.length === 0}>
                + Add language
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="panel mt-4 p-5">
        <p className="mb-3 text-[13px] font-medium">Text Processing</p>
        <div className="flex flex-col gap-3">
          <Checkbox
            label="Preserve line breaks"
            checked={settings.preserveLineBreaks}
            onChange={(v) => update({ preserveLineBreaks: v })}
          />
          <Checkbox
            label="Normalize whitespace"
            checked={settings.normalizeWhitespace}
            onChange={(v) => update({ normalizeWhitespace: v })}
          />
        </div>
      </section>

      <section className="panel mt-4 p-5">
        <p className="text-[13px] font-medium">Privacy</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">
          OCR processing happens locally on this device. Your screenshots are never uploaded, and extracted text never
          leaves your computer.
        </p>
      </section>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="flex items-center gap-2.5 text-left" onClick={() => onChange(!checked)}>
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
          checked ? "border-accent bg-accent" : "border-border-light dark:border-border-dark"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5 9-10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[13px]">{label}</span>
    </button>
  );
}
