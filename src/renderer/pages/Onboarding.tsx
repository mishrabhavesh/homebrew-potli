import React, { useState } from "react";
import { ShortcutBadge } from "../components/ShortcutBadge";
import { useSettingsStore } from "../stores/settingsStore";
import { useUiStore } from "../stores/uiStore";

const STEPS = 3;

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const { settings, update } = useSettingsStore();
  const platform = useUiStore((s) => s.platform);
  const [requestingScreen, setRequestingScreen] = useState(false);
  const [screenGranted, setScreenGranted] = useState(false);

  const requestScreenRecording = async () => {
    setRequestingScreen(true);
    try {
      const snapshot = await window.copyclip.permissions.request("screen-recording");
      setScreenGranted(snapshot.screenRecording === "granted");
    } finally {
      setRequestingScreen(false);
    }
  };

  const finish = async () => {
    await update({ onboardingComplete: true });
    onFinish();
  };

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-between bg-canvas-light px-10 py-12 dark:bg-canvas-dark">
      <div className="w-full max-w-sm flex-1 flex flex-col items-center justify-center text-center animate-fade-up">
        {step === 0 && (
          <>
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1c1c1e] text-white dark:bg-white dark:text-[#141416]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 12h8M8 8h5M8 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-[20px] font-semibold tracking-tight">Extract text from anywhere.</h1>
            <p className="mt-2.5 text-[13px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">
              Take any text on your screen and copy it instantly.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <p className="mb-4 text-[13px] font-medium text-[#6b6b70] dark:text-[#9c9ca3]">Use your shortcut</p>
            <div className="mb-6 scale-125">
              <ShortcutBadge accelerator={settings.shortcut} size="lg" />
            </div>
            <h1 className="text-[18px] font-semibold tracking-tight">Press it anytime to start a text capture.</h1>
            <p className="mt-2.5 text-[13px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">
              You can change this later in Settings → Keyboard.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-[20px] font-semibold tracking-tight">Privacy first.</h1>
            <p className="mt-2.5 text-[13px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">
              OCR happens locally on your device.
              <br />
              No screenshots are uploaded.
              <br />
              CopyClip also keeps a local history of things you copy — password managers are automatically excluded, and you can turn this off anytime in Settings → Clipboard.
            </p>
            {platform === "darwin" && (
              <button
                className="btn-secondary mt-5 text-[12.5px]"
                onClick={requestScreenRecording}
                disabled={requestingScreen || screenGranted}
              >
                {screenGranted ? "Screen Recording access granted ✓" : requestingScreen ? "Requesting…" : "Grant Screen Recording Access"}
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === step ? "w-5 bg-accent" : "w-1.5 bg-black/15 dark:bg-white/15"
              }`}
            />
          ))}
        </div>

        {step < STEPS - 1 ? (
          <div className="flex w-full items-center justify-between">
            <button className="text-[13px] text-[#8a8a90] hover:text-[#4b4b4f] dark:hover:text-[#d0d0d4]" onClick={finish}>
              Skip
            </button>
            <button className="btn-primary px-5" onClick={() => setStep((s) => s + 1)}>
              Continue
            </button>
          </div>
        ) : (
          <button className="btn-primary w-full py-2.5" onClick={finish}>
            Get Started
          </button>
        )}
      </div>
    </div>
  );
}
