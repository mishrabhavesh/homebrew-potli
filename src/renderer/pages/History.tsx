import React, { useEffect, useMemo, useState } from "react";
import { useHistoryStore } from "../stores/historyStore";
import { formatRelativeTime } from "@shared/format/relativeTime";
import type { HistoryItem } from "@shared/types/history";

export function History() {
  const items = useHistoryStore((s) => s.items);
  const remove = useHistoryStore((s) => s.remove);
  const clear = useHistoryStore((s) => s.clear);
  const copyAgain = useHistoryStore((s) => s.copyAgain);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);

  const groups = useMemo(() => groupByDay(items), [items]);

  const handleCopy = async (id: string) => {
    await copyAgain(id);
    setJustCopiedId(id);
    setTimeout(() => setJustCopiedId(null), 1200);
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight">History</h1>
          <p className="mt-0.5 text-[12px] text-[#9c9ca3]">
            Every capture and copy on this device — text and images. Click any entry to copy it again.
          </p>
        </div>
        {items.length > 0 && (
          <button
            className="shrink-0 text-[12.5px] text-[#9c9ca3] hover:text-red-500"
            onClick={() => setConfirmClear(true)}
          >
            Clear History
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([label, groupItems]) => (
            <div key={label}>
              <p className="section-label mb-2">{label}</p>
              <div className="flex flex-col gap-1.5">
                {groupItems.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    justCopied={justCopiedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onCopy={() => handleCopy(item.id)}
                    onDelete={() => remove(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear all history?"
          description="This permanently deletes every saved capture — text and images — on this device. This can't be undone."
          confirmLabel="Clear History"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clear();
            setConfirmClear(false);
          }}
        />
      )}
    </div>
  );
}

function HistoryRow({
  item,
  expanded,
  justCopied,
  onToggle,
  onCopy,
  onDelete
}: {
  item: HistoryItem;
  expanded: boolean;
  justCopied: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const loadImage = useHistoryStore((s) => s.loadImage);
  const thumbUrl = useHistoryStore((s) => s.imageUrls[item.id]);

  useEffect(() => {
    if (item.kind === "image" && !thumbUrl) {
      loadImage(item.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the item identity changes
  }, [item.id, item.kind]);

  return (
    <div className="panel overflow-hidden">
      <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={onToggle}>
        {item.kind === "image" ? (
          <ImageRowHeader item={item} thumbUrl={thumbUrl} />
        ) : (
          <TextRowHeader item={item} />
        )}
        <svg
          className={`shrink-0 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border-light px-4 py-3 dark:border-border-dark">
          {item.kind === "text" ? (
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[12.5px] leading-relaxed text-[#3a3a3d] dark:text-[#c8c8cc]">
              {item.text}
            </pre>
          ) : thumbUrl ? (
            <img
              src={thumbUrl}
              alt="Captured screenshot"
              className="max-h-72 w-full rounded-md border border-border-light object-contain dark:border-border-dark"
            />
          ) : (
            <div className="flex h-24 items-center justify-center text-[12px] text-[#9c9ca3]">Loading image…</div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button className="btn-secondary text-[12px]" onClick={onCopy}>
              {justCopied ? "Copied ✓" : "Copy"}
            </button>
            <button className="btn-secondary text-[12px] text-red-500" onClick={onDelete}>
              Delete
            </button>
            <span className="ml-auto text-[11px] text-[#9c9ca3]">
              {item.kind === "text"
                ? item.origin === "clipboard"
                  ? "Copied from clipboard"
                  : item.engine
                : `${item.region.width} × ${item.region.height}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TextRowHeader({ item }: { item: Extract<HistoryItem, { kind: "text" }> }) {
  const firstLine = item.text.split("\n").find((l) => l.trim().length > 0) ?? "";
  const secondLine = item.text.split("\n").filter((l) => l.trim().length > 0)[1];
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="truncate text-[13px] font-medium">{firstLine || "(empty)"}</p>
        <OriginBadge origin={item.origin} />
      </div>
      {secondLine && <p className="truncate text-[12px] text-[#9c9ca3]">{secondLine}</p>}
      <p className="mt-0.5 text-[11px] text-[#9c9ca3]">{formatRelativeTime(item.createdAt)}</p>
    </div>
  );
}

function ImageRowHeader({ item, thumbUrl }: { item: Extract<HistoryItem, { kind: "image" }>; thumbUrl?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border-light bg-black/[0.03] dark:border-border-dark dark:bg-white/[0.05]">
        {thumbUrl && <img src={thumbUrl} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13px] font-medium">
            Image · {item.region.width} × {item.region.height}
          </p>
          <OriginBadge origin={item.origin} />
        </div>
        <p className="mt-0.5 text-[11px] text-[#9c9ca3]">{formatRelativeTime(item.createdAt)}</p>
      </div>
    </div>
  );
}

function OriginBadge({ origin }: { origin: HistoryItem["origin"] }) {
  if (origin === "capture") return null; // captures are the default/expected case — no need to label every row
  return (
    <span className="shrink-0 rounded-full bg-black/[0.04] px-1.5 py-[1px] text-[10px] font-medium text-[#9c9ca3] dark:bg-white/[0.06]">
      Copied
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-light py-16 text-center dark:border-border-dark">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.03] dark:bg-white/[0.05]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M3 12a9 9 0 1 0 3-6.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-[13px] font-medium">No captures yet</p>
      <p className="mt-1 max-w-[240px] text-[12px] text-[#9c9ca3]">
        Captures show up here — and so does anything you copy elsewhere, if clipboard watching is on in Settings.
      </p>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px] animate-fade-in" onClick={onCancel}>
      <div className="panel w-[320px] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary text-[12.5px]" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="rounded-md bg-red-500 px-3.5 py-2 text-[12.5px] font-medium text-white transition-all hover:bg-red-600 active:scale-[0.98]"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function groupByDay(items: HistoryItem[]): [string, HistoryItem[]][] {
  const groups = new Map<string, HistoryItem[]>();
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  for (const item of items) {
    const d = new Date(item.createdAt);
    const key = d.toDateString() === today ? "Today" : d.toDateString() === yesterday ? "Yesterday" : d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries());
}
