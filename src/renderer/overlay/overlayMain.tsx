import React from "react";
import ReactDOM from "react-dom/client";
import "../styles/globals.css";
import { SelectionOverlay } from "./SelectionOverlay";
import { Toast } from "./Toast";
import type { CaptureMode } from "@shared/types/ocr";

const params = new URLSearchParams(window.location.search);
// "mode" pulls double duty by design: for the toast window it's the literal
// string "toast"; for a selection-overlay window it's the capture mode
// ("text" | "image") set in overlayWindow.ts. The two never collide because a
// given window is loaded as one or the other, never both.
const windowMode = params.get("mode");

function Root() {
  if (windowMode === "toast") {
    return (
      <Toast
        message={params.get("message") ?? ""}
        status={(params.get("status") as "success" | "error" | "info") ?? "success"}
      />
    );
  }

  const displayId = Number(params.get("displayId") ?? "0");
  const isActive = params.get("isActive") === "1";
  const captureMode: CaptureMode = windowMode === "image" ? "image" : "text";
  return <SelectionOverlay displayId={displayId} isActive={isActive} mode={captureMode} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
