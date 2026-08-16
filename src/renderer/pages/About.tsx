import React from "react";
import { useUiStore } from "../stores/uiStore";

export function About() {
  const { appVersion, platform } = useUiStore();

  return (
    <div className="mx-auto max-w-xl px-8 py-8">
      <h1 className="mb-6 text-[17px] font-semibold tracking-tight">About</h1>

      <section className="panel flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1c1c1e] text-white dark:bg-white dark:text-[#141416]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.7" />
            <path d="M8 12h8M8 8h5M8 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-[14px] font-semibold">CopyClip</p>
          <p className="text-[12px] text-[#9c9ca3]">
            Version {appVersion} · {platformLabel(platform)}
          </p>
        </div>
      </section>

      <section className="panel mt-4 p-5">
        <p className="text-[13px] font-medium">Your screenshots stay on your device.</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">
          CopyClip performs OCR entirely on-device using your operating system&rsquo;s native recognition where available,
          with a local fallback engine everywhere else. Nothing is uploaded, nothing is sent to a server, and no
          screenshot is ever written permanently to disk.
        </p>
      </section>

      <section className="panel mt-4 p-5">
        <p className="text-[13px] font-medium">One shortcut. Select text. It&rsquo;s copied.</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">
          That&rsquo;s the whole product. Everything else in Settings is there to help the primary workflow fit your habits
          — not to get in its way.
        </p>
      </section>
    </div>
  );
}

function platformLabel(platform: string): string {
  if (platform === "darwin") return "macOS";
  if (platform === "win32") return "Windows";
  if (platform === "linux") return "Linux";
  return platform;
}
