"use client";

import { ArrowLeft, BarChart3, Building2, Check, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { Card, ContentNote, PrimaryButton, RoundButton } from "./ui";

const ITEMS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Names only after 100 years",
    body: "Named, detailed records come from trials over 100 years old, like the Old Bailey (1674–1913).",
  },
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Recent cases: concluded only",
    body: "A conviction is recorded and no appeal is pending. Every pin links to the court record.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Area counts, not addresses",
    body: "police.uk data is shown as counts within an area, never as exact addresses.",
  },
  {
    icon: <Check className="h-5 w-5" />,
    title: "Every verdict, always",
    body: "Acquitted means acquitted. Every case shows its verdict, source and how sure we are of the place.",
  },
];

/** M2 · Before you begin. */
export function BeforeYouBegin({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col overflow-y-auto px-6 pb-8 pt-6">
      <div className="mb-4">
        <RoundButton label="Back" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </RoundButton>
      </div>
      <h1 className="cb-serif text-[32px] font-bold leading-tight">
        Before you begin
      </h1>
      <div className="mt-5 flex flex-col gap-3">
        {ITEMS.map((it) => (
          <Card key={it.title} className="flex gap-4 p-4">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--cb-note-bg)", color: "var(--cb-crimson)" }}
            >
              {it.icon}
            </span>
            <div>
              <p className="font-semibold">{it.title}</p>
              <p className="mt-1 text-sm leading-snug" style={{ color: "var(--cb-muted)" }}>
                {it.body}
              </p>
            </div>
          </Card>
        ))}
        <ContentNote />
      </div>
      <div className="mt-auto pt-8">
        <PrimaryButton onClick={onContinue}>I understand</PrimaryButton>
      </div>
    </div>
  );
}
