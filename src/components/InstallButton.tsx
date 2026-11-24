"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Plus, Share2, X } from "lucide-react";
import { promptInstall, useInstallMode } from "@/lib/install";

/**
 * Install icon for the navbar. Opens the browser's install dialog where one
 * exists; on iPhone it shows the two Safari steps. Hidden when the app is
 * already installed or the browser cannot install it.
 */
export function InstallButton({ className = "" }: { className?: string }) {
  const mode = useInstallMode();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!mode) return null;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        onClick={() => (mode === "prompt" ? void promptInstall() : setOpen((o) => !o))}
        aria-label="Install app"
        title="Install app"
        aria-expanded={mode === "ios" ? open : undefined}
        className="flex h-10 w-10 items-center justify-center rounded-full border bg-white hover:bg-[var(--cb-stone)]"
        style={{ borderColor: "var(--cb-border)", color: "var(--cb-ink)" }}
      >
        <Download className="h-4 w-4" />
      </button>

      {open && mode === "ios" && (
        <div
          role="dialog"
          aria-label="Install app"
          className="absolute right-0 top-12 z-[1200] w-[260px] rounded-2xl border bg-white p-4 shadow-xl"
          style={{ borderColor: "var(--cb-border)", color: "var(--cb-ink)" }}
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold">Add to home screen</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--cb-stone)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-3 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Share2 className="h-4 w-4 shrink-0" /> Tap Share in Safari
            </li>
            <li className="flex items-center gap-3">
              <Plus className="h-4 w-4 shrink-0" /> Choose “Add to Home Screen”
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
