"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Info, Search, ShieldAlert } from "lucide-react";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-16 w-16 rounded-2xl" : "h-8 w-8 rounded-lg";
  const icon = size === "lg" ? "h-7 w-7" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center text-white ${box}`}
        style={{ background: "var(--cb-crimson)" }}
      >
        <Search className={icon} strokeWidth={2.25} />
      </span>
      <span className="cb-serif text-[22px] font-bold leading-none">
        Casebook
      </span>
    </span>
  );
}

export function PrimaryButton({
  className = "",
  tone = "crimson",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "crimson" | "blue" }) {
  return (
    <button
      {...props}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 ${className}`}
      style={{
        background: tone === "blue" ? "var(--cb-blue)" : "var(--cb-crimson)",
      }}
    />
  );
}

export function SecondaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-white px-5 text-[15px] font-semibold transition-colors hover:bg-[var(--cb-stone)] ${className}`}
      style={{ borderColor: "var(--cb-border)", color: "var(--cb-ink)" }}
    />
  );
}

export function TextButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-10 text-sm font-semibold hover:underline ${className}`}
      style={{ color: "var(--cb-crimson)" }}
    />
  );
}

/** Round white icon button used over maps. */
export function RoundButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-[var(--cb-stone)] ${className}`}
      style={{ color: "var(--cb-ink)" }}
    >
      {children}
    </button>
  );
}

/** Mono eyebrow label, e.g. "TIMELINE". */
export function Eyebrow({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "crimson" | "blue";
}) {
  const color =
    tone === "crimson"
      ? "var(--cb-crimson)"
      : tone === "blue"
        ? "var(--cb-blue)"
        : "var(--cb-muted)";
  return (
    <p
      className="cb-mono text-[11px] uppercase tracking-[0.14em]"
      style={{ color }}
    >
      {children}
    </p>
  );
}

/** Gold content note for historical case files. */
export function ContentNote({ message }: { message?: string }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-snug"
      style={{
        background: "var(--cb-note-bg)",
        borderColor: "var(--cb-note-border)",
        color: "var(--cb-ink)",
      }}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {message ??
          "Content note: these are real records of violence and death. Victims are people, not plot points."}
      </span>
    </div>
  );
}

/** Neutral grey-blue information box (recent layer + system notices). */
export function InfoBox({
  title,
  children,
  tone = "info",
  icon,
}: {
  title?: string;
  children: ReactNode;
  tone?: "info" | "note";
  icon?: ReactNode;
}) {
  const note = tone === "note";
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-snug"
      style={{
        background: note ? "var(--cb-note-bg)" : "var(--cb-info-bg)",
        borderColor: note ? "var(--cb-note-border)" : "transparent",
        color: "var(--cb-text)",
      }}
    >
      {icon ?? <Info className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>
        {title && (
          <p className="font-semibold" style={{ color: "var(--cb-ink)" }}>
            {title}
          </p>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white ${className}`}
      style={{ borderColor: "var(--cb-border)" }}
    >
      {children}
    </div>
  );
}
