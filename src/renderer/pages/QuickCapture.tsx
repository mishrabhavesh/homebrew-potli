import React, { useEffect, useState } from "react";
import { ShortcutBadge } from "../components/ShortcutBadge";
import { useSettingsStore } from "../stores/settingsStore";
import { useHistoryStore } from "../stores/historyStore";
import { formatRelativeTime } from "@shared/format/relativeTime";

export function QuickCapture() {
  const { settings } = useSettingsStore();
  const items = useHistoryStore((s) => s.items);
  const loadImage = useHistoryStore((s) => s.loadImage);
  const imageUrls = useHistoryStore((s) => s.imageUrls);
  const [justTriggered, setJustTriggered] = useState(false);

  useEffect(() => {
    const off = window.copyclip.capture.onResult((result) => {
      if (result.ok) {
        setJustTriggered(true);
        setTimeout(() => setJustTriggered(false), 1400);
      }
    });
    return off;
  }, []);

  const mostRecent = items[0];

  useEffect(() => {
    if (mostRecent?.kind === "image" && !imageUrls[mostRecent.id]) {
      loadImage(mostRecent.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the most-recent item changes
  }, [mostRecent?.id, mostRecent?.kind]);

  const startCapture = async (mode: "text" | "image") => {
    await window.copyclip.window.minimize();
    await window.copyclip.capture.start(mode);
  };

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-8 py-10 text-center">
      <p className="section-label mb-4">{settings.shortcutPaused ? "Shortcuts paused" : "Ready"}</p>

      <h1 className="text-[26px] font-semibold tracking-tight">Capture anything from your screen.</h1>
      <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">
        Extract text instantly, or grab a clean screenshot — either way, it lands straight on your clipboard.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => startCapture("text")}
          disabled={settings.shortcutPaused}
          className="btn-primary gap-2 px-5 py-3 text-[14px] disabled:opacity-30"
        >
          <TextIcon />
          Capture Text
        </button>
        <button
          onClick={() => startCapture("image")}
          disabled={settings.shortcutPaused}
          className="btn-secondary gap-2 px-5 py-3 text-[14px] disabled:opacity-30"
        >
          <ImageIcon />
          Copy as Image
        </button>
      </div>

      <div className="mt-9 flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <span className="section-label">Extract text</span>
          <ShortcutBadge accelerator={settings.shortcut} size="lg" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="section-label">Copy as image</span>
          <ShortcutBadge accelerator={settings.imageShortcut} size="lg" />
        </div>
      </div>

      <WorkflowStrip />

      {mostRecent && (
        <div className="mt-10 w-full">
          <p className="section-label mb-2 text-left">Most recent</p>
          <div className="panel flex items-center gap-3 px-4 py-3 text-left">
            {mostRecent.kind === "image" && (
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border-light bg-black/[0.03] dark:border-border-dark dark:bg-white/[0.05]">
                {imageUrls[mostRecent.id] && (
                  <img src={imageUrls[mostRecent.id]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {mostRecent.kind === "text"
                  ? mostRecent.text.split("\n")[0] || "—"
                  : `Image · ${mostRecent.region.width} × ${mostRecent.region.height}`}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#9c9ca3]">
                {formatRelativeTime(mostRecent.createdAt)}
                {mostRecent.origin === "clipboard" && " · Copied"}
              </p>
            </div>
          </div>
        </div>
      )}

      {justTriggered && (
        <div className="mt-4 animate-fade-in text-[12px] text-accent">Copied — check your clipboard</div>
      )}
    </div>
  );
}

function WorkflowStrip() {
  const steps = ["Press shortcut", "Drag to select", "Copied to clipboard"];
  return (
    <div className="mt-10 flex items-center gap-2 text-[11.5px] text-[#9c9ca3]">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span className="rounded-full border border-border-light px-2.5 py-1 dark:border-border-dark">{s}</span>
          {i < steps.length - 1 && <span className="opacity-50">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

function TextIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.5" cy="10" r="1.6" fill="currentColor" />
      <path d="M4 17l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
