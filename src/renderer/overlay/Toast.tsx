import React from "react";

export function Toast({ message, status }: { message: string; status: "success" | "error" | "info" }) {
  return (
    <div className="flex h-screen w-screen items-center px-2">
      <div className="flex w-full animate-toast-in items-center gap-2.5 rounded-lg border border-black/[0.06] bg-white/95 px-3.5 py-3 shadow-panel backdrop-blur dark:border-white/[0.08] dark:bg-[#1f1f22]/95">
        <StatusIcon status={status} />
        <p className="truncate text-[12.5px] font-medium text-[#1c1c1e] dark:text-[#ececef]">{message}</p>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: "success" | "error" | "info" }) {
  if (status === "success") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5 9-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-500">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 11v5.5M12 8v.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
