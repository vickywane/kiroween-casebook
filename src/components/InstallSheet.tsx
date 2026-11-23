"use client";

import { Check, Plus, Search, Share2 } from "lucide-react";
import { PrimaryButton, TextButton } from "./ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/** M9 · Install to home screen. */
export function InstallSheet({
  onClose,
  installEvent,
}: {
  onClose: () => void;
  installEvent: Event | null;
}) {
  const steps = [
    { icon: <Share2 className="h-4 w-4" />, text: "Tap Share in the toolbar" },
    { icon: <Plus className="h-4 w-4" />, text: "Choose “Add to Home Screen”" },
    { icon: <Check className="h-4 w-4" />, text: "Tap Add" },
  ];
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/30">
      <div className="w-full max-w-[520px] rounded-t-3xl bg-white px-6 pb-8 pt-4 shadow-xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full" style={{ background: "var(--cb-border)" }} />
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-white" style={{ background: "var(--cb-crimson)" }}>
            <Search className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-semibold">Casebook</p>
            <p className="text-sm" style={{ color: "var(--cb-muted)" }}>
              London&apos;s court records, on the street
            </p>
          </div>
        </div>
        <h2 className="cb-serif mt-5 text-[28px] font-bold leading-tight">
          Add Casebook to your home screen
        </h2>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--cb-muted)" }}>
          It opens full screen, starts faster, and keeps the last area you
          viewed for when you lose signal.
        </p>
        <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--cb-stone)" }}>
          <p className="cb-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--cb-muted)" }}>
            On iPhone (Safari)
          </p>
          <ul className="mt-3 space-y-3">
            {steps.map((s) => (
              <li key={s.text} className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  {s.icon}
                </span>
                {s.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <PrimaryButton
            disabled={!installEvent}
            className="disabled:opacity-50"
            onClick={async () => {
              await (installEvent as BeforeInstallPromptEvent | null)?.prompt();
              onClose();
            }}
          >
            Install app
          </PrimaryButton>
          <TextButton onClick={onClose}>Not now</TextButton>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--cb-muted)" }}>
          “Install app” shows on Android and desktop browsers. On iPhone, use
          the steps above.
        </p>
      </div>
    </div>
  );
}
