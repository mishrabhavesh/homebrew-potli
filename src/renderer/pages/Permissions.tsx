import React, { useEffect, useState } from "react";
import { useUiStore } from "../stores/uiStore";

interface Snapshot {
  screenRecording: string;
  accessibility: string;
  platform: string;
}

export function Permissions() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [requesting, setRequesting] = useState<"screen-recording" | "accessibility" | null>(null);
  const platform = useUiStore((s) => s.platform);

  const refresh = () => window.copyclip.permissions.get().then(setSnapshot);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const isMac = platform === "darwin";

  const grantAccess = async (kind: "screen-recording" | "accessibility") => {
    setRequesting(kind);
    try {
      const next = await window.copyclip.permissions.request(kind);
      setSnapshot(next);
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-8 py-8">
      <h1 className="mb-2 text-[17px] font-semibold tracking-tight">Permissions</h1>
      <p className="mb-6 text-[12.5px] text-[#9c9ca3]">
        CopyClip only asks for what the primary workflow actually needs.
      </p>

      {!isMac ? (
        <div className="panel p-5">
          <p className="text-[13px] font-medium">No extra permissions required</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">
            On {platform === "win32" ? "Windows" : "Linux"}, screen capture works out of the box. If you enable
            &ldquo;Copy and paste automatically&rdquo;, your desktop environment may show its own prompt the first
            time a keystroke is simulated.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <PermissionCard
            title="Screen Recording"
            description="Required to capture the area of your screen — for both Extract Text and Copy as Image."
            status={snapshot?.screenRecording ?? "not-determined"}
            requesting={requesting === "screen-recording"}
            onGrantAccess={() => grantAccess("screen-recording")}
            onOpenSettings={() => window.copyclip.permissions.openSettings("screen-recording")}
          />
          <PermissionCard
            title="Accessibility"
            description='Only needed if "Copy and paste automatically" is enabled — lets CopyClip simulate a paste keystroke.'
            status={snapshot?.accessibility ?? "not-determined"}
            requesting={requesting === "accessibility"}
            onGrantAccess={() => grantAccess("accessibility")}
            onOpenSettings={() => window.copyclip.permissions.openSettings("accessibility")}
          />
        </div>
      )}
    </div>
  );
}

function PermissionCard({
  title,
  description,
  status,
  requesting,
  onGrantAccess,
  onOpenSettings
}: {
  title: string;
  description: string;
  status: string;
  requesting: boolean;
  onGrantAccess: () => void;
  onOpenSettings: () => void;
}) {
  const granted = status === "granted";
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium">{title}</p>
            <StatusPill granted={granted} status={status} />
          </div>
          <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-[#6b6b70] dark:text-[#9c9ca3]">{description}</p>
        </div>
        {!granted && (
          <div className="flex shrink-0 flex-col items-stretch gap-1.5">
            <button className="btn-primary text-[12px]" onClick={onGrantAccess} disabled={requesting}>
              {requesting ? "Requesting…" : "Grant Access"}
            </button>
            <button className="text-[11.5px] text-[#9c9ca3] hover:text-[#4b4b4f] dark:hover:text-[#d0d0d4]" onClick={onOpenSettings}>
              Open System Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ granted, status }: { granted: boolean; status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
        granted ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      }`}
    >
      {granted ? "Granted" : status === "denied" ? "Denied" : "Not granted"}
    </span>
  );
}
