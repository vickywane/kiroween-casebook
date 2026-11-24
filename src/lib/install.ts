"use client";

import { useSyncExternalStore } from "react";

/**
 * "Add to home screen" state, shared by every install button.
 *
 * Chrome, Edge and Android fire `beforeinstallprompt` once, early, so the
 * listener is registered when this module loads rather than when a button
 * mounts. iPhone Safari has no such event; there the button shows the
 * Share → Add to Home Screen steps instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallMode = "prompt" | "ios" | null;

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function getMode(): InstallMode {
  if (installed || isStandalone()) return null;
  if (deferred) return "prompt";
  if (isIos()) return "ios";
  return null;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Which install path this browser supports, or null to hide the button. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, getMode, () => null);
}

/** Shows the browser's own install dialog. */
export async function promptInstall() {
  const e = deferred;
  if (!e) return;
  await e.prompt();
  const { outcome } = await e.userChoice;
  deferred = null;
  if (outcome === "accepted") installed = true;
  emit();
}
