import React, { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { useHistoryStore } from "../stores/historyStore";
import { useTheme } from "../hooks/useTheme";
import { formatRelativeTime } from "@shared/format/relativeTime";
import type { HistoryItem } from "@shared/types/history";
import type { CaptureMode } from "@shared/types/ocr";

const QUICK_LIST_LIMIT = 30;

/**
 * The tray's custom floating quick-access panel — replaces what used to be a
 * flat list jammed into the native OS menu. As a real window we get full
 * control over spacing, real image thumbnails, hover states, and grouping,
 * which a native NSMenu (used for the right-click fallback menu) simply
 * can't offer.
 */
export function QuickPanel() {
  const { settings, loaded: settingsLoaded, load: loadSettings, update } = useSettingsStore();
  const items = useHistoryStore((s) => s.items);
  const historyLoaded = useHistoryStore((s) => s.loaded);
  const loadHistory = useHistoryStore((s) => s.load);
  const loadImage = useHistoryStore((s) => s.loadImage);
  const imageUrls = useHistoryStore((s) => s.imageUrls);
  const copyAgain = useHistoryStore((s) => s.copyAgain);
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);

  useTheme(settings.theme);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once on mount
  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const hidePanel = () => {
    void window.potli.panel.hide();
  };

  const triggerCapture = async (mode: CaptureMode) => {
    await window.potli.capture.start(mode);
    hidePanel();
  };

  const handleRowClick = async (item: HistoryItem) => {
    await copyAgain(item.id);
    setJustCopiedId(item.id);
    setTimeout(hidePanel, 260);
  };

  const openHistory = async () => {
    await window.potli.window.showMain("history");
    hidePanel();
  };

  const openSettings = async () => {
    await window.potli.window.showMain("settings-clipboard");
    hidePanel();
  };

  const togglePause = () => update({ shortcutPaused: !settings.shortcutPaused });
  const quit = () => window.potli.app.quit();

  if (!settingsLoaded || !historyLoaded) {
    return (
      <PanelShell>
        <div className="flex h-full items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <div className="flex items-center gap-2 border-b border-border-light p-3 dark:border-border-dark">
        <button
          onClick={() => triggerCapture("text")}
          disabled={settings.shortcutPaused}
          className="btn-primary flex-1 justify-center gap-1.5 py-2 text-[12.5px] disabled:opacity-40"
        >
          <TextIcon />
          Extract Text
        </button>
        <button
          onClick={() => triggerCapture("image")}
          disabled={settings.shortcutPaused}
          className="btn-secondary flex-1 justify-center gap-1.5 py-2 text-[12.5px] disabled:opacity-40"
        >
          <ImageIcon />
          Copy as Image
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.slice(0, QUICK_LIST_LIMIT).map((item) => (
            <PanelRow
              key={item.id}
              item={item}
              justCopied={justCopiedId === item.id}
              thumbUrl={item.kind === "image" ? imageUrls[item.id] : undefined}
              onLoadImage={() => loadImage(item.id)}
              onClick={() => handleRowClick(item)}
            />
          ))
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border-light px-2.5 py-1.5 dark:border-border-dark">
        <button
          onClick={openHistory}
          className="rounded-md px-2 py-1.5 text-[11.5px] font-medium text-[#6b6b70] transition-colors hover:bg-black/[0.04] hover:text-accent dark:text-[#9c9ca3] dark:hover:bg-white/[0.05]"
        >
          View All History
        </button>
        <div className="flex items-center gap-0.5">
          <IconButton title={settings.shortcutPaused ? "Resume Shortcuts" : "Pause Shortcuts"} active={settings.shortcutPaused} onClick={togglePause}>
            <PauseIcon />
          </IconButton>
          <IconButton title="Settings" onClick={openSettings}>
            <GearIcon />
          </IconButton>
          <IconButton title="Quit Potli" onClick={quit}>
            <PowerIcon />
          </IconButton>
        </div>
      </div>
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden rounded-xl border border-border-light bg-white/95 text-[13px] text-[#1c1c1e] shadow-panel backdrop-blur-xl dark:border-border-dark dark:bg-[#1c1c1e]/95 dark:text-[#ececef]">
      {children}
    </div>
  );
}

function PanelRow({
  item,
  justCopied,
  thumbUrl,
  onLoadImage,
  onClick
}: {
  item: HistoryItem;
  justCopied: boolean;
  thumbUrl?: string;
  onLoadImage: () => void;
  onClick: () => void;
}) {
  useEffect(() => {
    if (item.kind === "image" && !thumbUrl) onLoadImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the item identity changes
  }, [item.id, item.kind]);

  const primaryLine =
    item.kind === "text"
      ? item.text.split("\n").find((l) => l.trim().length > 0) || "(empty)"
      : `Image · ${item.region.width} × ${item.region.height}`;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-100 ${
        justCopied ? "bg-accent/10" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
      }`}
    >
      {item.kind === "image" ? (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border-light bg-black/[0.03] dark:border-border-dark dark:bg-white/[0.05]">
          {thumbUrl && <img src={thumbUrl} alt="" className="h-full w-full object-cover" />}
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-black/[0.03] text-[#9c9ca3] dark:bg-white/[0.05]">
          <TextIcon small />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium">{primaryLine}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-[#9c9ca3]">
          {formatRelativeTime(item.createdAt)}
          {item.origin === "clipboard" && " · Copied"}
        </p>
      </div>
      {justCopied && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-accent">
          <path d="M5 12l5 5 9-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-[12.5px] font-medium text-[#9c9ca3]">Nothing here yet</p>
      <p className="mt-1 max-w-[220px] text-[11.5px] leading-relaxed text-[#9c9ca3]/80">
        Capture something, or copy anywhere on your Mac, and it&rsquo;ll show up here.
      </p>
    </div>
  );
}

function IconButton({
  title,
  active,
  onClick,
  children
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        active ? "text-accent" : "text-[#6b6b70] hover:bg-black/[0.04] dark:text-[#9c9ca3] dark:hover:bg-white/[0.05]"
      }`}
    >
      {children}
    </button>
  );
}

function TextIcon({ small }: { small?: boolean }) {
  const size = small ? 14 : 15;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 13a7.97 7.97 0 000-2l2.1-1.6-2-3.4-2.5 1a8 8 0 00-1.7-1L15 3h-6l-.3 2.6a8 8 0 00-1.7 1l-2.5-1-2 3.4L4.6 11a7.97 7.97 0 000 2l-2.1 1.6 2 3.4 2.5-1a8 8 0 001.7 1L9 21h6l.3-2.6a8 8 0 001.7-1l2.5 1 2-3.4L19.4 13z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 5.5a8 8 0 1 0 10 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
