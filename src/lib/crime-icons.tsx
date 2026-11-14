/**
 * Crime category icons.
 *
 * Each icon is an inline SVG React component.
 * Two size presets:
 *   "map"     — 20 px, used inside Leaflet DivIcon markers
 *   "panel"   — 48 px, used in the case-file / recent-crime panel header
 *   "badge"   — 28 px, used in list rows / badges
 *
 * Historical categories (Old Bailey): Theft, Murder, Burglary, Fraud, Assault, Arson,
 *   Coining, Deception, Riot, Sexual Offences, Forgery, Receiving
 *
 * Recent categories (police.uk slugs): theft-from-the-person, violence-and-sexual-offences,
 *   burglary, anti-social-behaviour, drugs, criminal-damage-arson, robbery,
 *   vehicle-crime, shoplifting, public-order, other-theft, possession-of-weapons,
 *   bicycle-theft, other-crime
 *
 * Unknown categories fall back to a generic ⚖ scales icon.
 */

import React from "react";

export type IconSize = "map" | "badge" | "panel";

const SIZE: Record<IconSize, number> = { map: 20, badge: 28, panel: 48 };

interface IconProps {
  size?: IconSize | number;
  /** Override fill/stroke colour. Defaults to currentColor. */
  color?: string;
  className?: string;
}

function Icon({
  size = "badge",
  color = "currentColor",
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  const px = typeof size === "number" ? size : SIZE[size];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// ── Individual icons ───────────────────────────────────────────────────────────

/** Theft / Theft from the person / Shoplifting / Other theft / Bicycle theft */
export function TheftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* open hand with coin lifted away */}
      <path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5" />
      <path d="M2 15h20" />
      <path d="M12 15v6" />
      <circle cx="12" cy="5" r="1.5" />
      <path d="M9 10l3-5 3 5" />
    </Icon>
  );
}

/** Murder / Homicide */
export function MurderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* skull outline */}
      <path d="M12 3a7 7 0 0 1 7 7c0 2.8-1.6 5.2-4 6.4V18H9v-1.6C6.6 15.2 5 12.8 5 10a7 7 0 0 1 7-7z" />
      <line x1="9" y1="21" x2="15" y2="21" />
      <line x1="9" y1="18" x2="9" y2="21" />
      <line x1="15" y1="18" x2="15" y2="21" />
      <circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** Burglary */
export function BurglaryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* house with broken window */}
      <path d="M3 12L12 3l9 9" />
      <path d="M9 21V12h6v9" />
      <rect x="13" y="6" width="4" height="4" rx="0.5" />
      <line x1="13" y1="6" x2="17" y2="10" />
    </Icon>
  );
}

/** Fraud / Deception / Forgery */
export function FraudIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* document with false seal / crossed-out stamp */}
      <rect x="4" y="3" width="12" height="16" rx="1.5" />
      <line x1="8" y1="8" x2="12" y2="8" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="8" y1="14" x2="11" y2="14" />
      {/* seal mark — circle with X */}
      <circle cx="17" cy="17" r="4" />
      <line x1="15" y1="15" x2="19" y2="19" />
      <line x1="19" y1="15" x2="15" y2="19" />
    </Icon>
  );
}

/** Assault / Violence and sexual offences */
export function AssaultIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* fist */}
      <rect x="6" y="10" width="12" height="7" rx="2" />
      <path d="M9 10V7a1 1 0 0 1 2 0v3" />
      <path d="M12 10V6a1 1 0 0 1 2 0v4" />
      <path d="M15 10V7a1 1 0 0 1 2 0v3" />
      <path d="M6 13c-1.1 0-2-.9-2-2V9a2 2 0 0 1 2-2" />
    </Icon>
  );
}

/** Arson / Criminal damage & arson */
export function ArsonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* flame */}
      <path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-3-2-5-2-5s-1 2-2 2c0-3-1-7-1-7z" />
      <path d="M10 16a2 2 0 0 0 4 0" />
    </Icon>
  );
}

/** Drugs */
export function DrugsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* pill capsule */}
      <rect x="3" y="9" width="18" height="6" rx="3" />
      <line x1="12" y1="9" x2="12" y2="15" />
    </Icon>
  );
}

/** Robbery */
export function RobberyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* bag with lightning bolt */}
      <path d="M6 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8z" />
      <path d="M9 6V5a3 3 0 0 1 6 0v1" />
      <polyline points="13 11 11 14 13 14 11 17" />
    </Icon>
  );
}

/** Vehicle crime */
export function VehicleCrimeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* car outline with smashed window */}
      <rect x="1" y="11" width="22" height="8" rx="2" />
      <path d="M5 11L8 5h8l3 6" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="17" cy="19" r="2" />
      <line x1="13" y1="8" x2="15" y2="6" />
      <line x1="15" y1="8" x2="13" y2="6" />
    </Icon>
  );
}

/** Anti-social behaviour */
export function AntisocialIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* person with warning triangle */}
      <circle cx="10" cy="7" r="3" />
      <path d="M4 21v-2a4 4 0 0 1 4-4h4" />
      <path d="M17 13l-3 5h6l-3-5z" />
      <line x1="17" y1="16" x2="17" y2="17.5" />
      <circle cx="17" cy="19" r="0.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** Coining / Counterfeiting */
export function CoiningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* coin stack with fake cross */}
      <ellipse cx="12" cy="17" rx="6" ry="2" />
      <rect x="6" y="13" width="12" height="4" rx="1" />
      <ellipse cx="12" cy="13" rx="6" ry="2" />
      <line x1="10" y1="9" x2="14" y2="9" />
      <line x1="12" y1="7" x2="12" y2="11" />
    </Icon>
  );
}

/** Receiving (stolen goods) */
export function ReceivingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* open box with arrow in */}
      <path d="M5 8l7-5 7 5v11H5V8z" />
      <polyline points="9 21 9 13 15 13 15 21" />
      <polyline points="10 10 12 8 14 10" />
      <line x1="12" y1="8" x2="12" y2="13" />
    </Icon>
  );
}

/** Riot / Public order */
export function RiotIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* crowd lines + megaphone */}
      <path d="M18 8c1.1 0 2 .9 2 2v2a2 2 0 0 1-2 2h-1l-2 3V7l2 1h1z" />
      <line x1="6" y1="10" x2="12" y2="10" />
      <line x1="6" y1="14" x2="12" y2="14" />
      <line x1="8" y1="6" x2="10" y2="6" />
      <line x1="6" y1="18" x2="11" y2="18" />
    </Icon>
  );
}

/** Sexual offences (standalone category) */
export function SexualOffencesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* shield with person */}
      <path d="M12 2l8 4v6c0 4.4-3.4 8.5-8 10C7.4 20.5 4 16.4 4 12V6l8-4z" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M9 17c0-1.7 1.3-3 3-3s3 1.3 3 3" />
    </Icon>
  );
}

/** Possession of weapons */
export function WeaponsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* knife blade */}
      <path d="M20 4L8.5 15.5" />
      <path d="M20 4c0 0-2 2-2 6L8.5 15.5" />
      <path d="M6 17l-2 3 3-2 1-3-2 2z" />
    </Icon>
  );
}

/** Fallback / Other */
export function OtherCrimeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* scales of justice */}
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M6 6l-3 6a3 3 0 0 0 6 0L6 6z" />
      <path d="M18 6l-3 6a3 3 0 0 0 6 0L18 6z" />
    </Icon>
  );
}

// ── Category → component map ──────────────────────────────────────────────────

type IconComponent = (props: IconProps) => React.ReactElement;

const CATEGORY_ICON_MAP: Record<string, IconComponent> = {
  // Historical (Old Bailey) — matched case-insensitively in getCrimeIcon()
  theft: TheftIcon,
  murder: MurderIcon,
  homicide: MurderIcon,
  burglary: BurglaryIcon,
  fraud: FraudIcon,
  deception: FraudIcon,
  forgery: FraudIcon,
  assault: AssaultIcon,
  arson: ArsonIcon,
  coining: CoiningIcon,
  counterfeiting: CoiningIcon,
  receiving: ReceivingIcon,
  riot: RiotIcon,

  // police.uk category slugs
  "theft-from-the-person": TheftIcon,
  shoplifting: TheftIcon,
  "other-theft": TheftIcon,
  "bicycle-theft": TheftIcon,
  "violence-and-sexual-offences": AssaultIcon,
  "sexual-offences": SexualOffencesIcon,
  robbery: RobberyIcon,
  "criminal-damage-arson": ArsonIcon,
  "anti-social-behaviour": AntisocialIcon,
  drugs: DrugsIcon,
  "vehicle-crime": VehicleCrimeIcon,
  "public-order": RiotIcon,
  "possession-of-weapons": WeaponsIcon,
  "other-crime": OtherCrimeIcon,
};

/**
 * Returns the icon component for a given category string.
 * Accepts both Old Bailey plain-text categories and police.uk slugs.
 * Falls back to OtherCrimeIcon if unknown.
 */
export function getCrimeIcon(category: string): IconComponent {
  const key = category.toLowerCase().trim();
  return CATEGORY_ICON_MAP[key] ?? OtherCrimeIcon;
}

/**
 * Convenience: render the icon for a category directly.
 */
export function CrimeIcon({
  category,
  size = "badge",
  color,
  className,
}: {
  category: string;
} & IconProps) {
  const Component = getCrimeIcon(category);
  return <Component size={size} color={color} className={className} />;
}

// ── SVG string for Leaflet DivIcon (no React) ─────────────────────────────────

/**
 * Returns a raw SVG string for embedding in a Leaflet DivIcon.
 * We can't use React components inside L.divIcon's html string,
 * so each category has a minimal path string here.
 */
export const CATEGORY_SVG_PATHS: Record<string, string> = {
  // Theft — open hand reaching
  theft: `<path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5"/><path d="M2 15h20"/><path d="M12 15v6"/><circle cx="12" cy="5" r="1.5"/><path d="M9 10l3-5 3 5"/>`,
  "theft-from-the-person": `<path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5"/><path d="M2 15h20"/><path d="M12 15v6"/><circle cx="12" cy="5" r="1.5"/><path d="M9 10l3-5 3 5"/>`,
  shoplifting: `<path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5"/><path d="M2 15h20"/><path d="M12 15v6"/><circle cx="12" cy="5" r="1.5"/><path d="M9 10l3-5 3 5"/>`,
  "other-theft": `<path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5"/><path d="M2 15h20"/><path d="M12 15v6"/><circle cx="12" cy="5" r="1.5"/><path d="M9 10l3-5 3 5"/>`,
  "bicycle-theft": `<path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5"/><path d="M2 15h20"/><path d="M12 15v6"/><circle cx="12" cy="5" r="1.5"/><path d="M9 10l3-5 3 5"/>`,

  // Murder — skull
  murder: `<path d="M12 3a7 7 0 0 1 7 7c0 2.8-1.6 5.2-4 6.4V18H9v-1.6C6.6 15.2 5 12.8 5 10a7 7 0 0 1 7-7z"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="9" y1="18" x2="9" y2="21"/><line x1="15" y1="18" x2="15" y2="21"/><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none"/>`,
  homicide: `<path d="M12 3a7 7 0 0 1 7 7c0 2.8-1.6 5.2-4 6.4V18H9v-1.6C6.6 15.2 5 12.8 5 10a7 7 0 0 1 7-7z"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="9" y1="18" x2="9" y2="21"/><line x1="15" y1="18" x2="15" y2="21"/><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none"/>`,

  // Burglary — house with broken window
  burglary: `<path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/><rect x="13" y="6" width="4" height="4" rx="0.5"/><line x1="13" y1="6" x2="17" y2="10"/>`,

  // Fraud — doc with X seal
  fraud: `<rect x="4" y="3" width="12" height="16" rx="1.5"/><line x1="8" y1="8" x2="12" y2="8"/><line x1="8" y1="11" x2="14" y2="11"/><circle cx="17" cy="17" r="4"/><line x1="15" y1="15" x2="19" y2="19"/><line x1="19" y1="15" x2="15" y2="19"/>`,
  deception: `<rect x="4" y="3" width="12" height="16" rx="1.5"/><line x1="8" y1="8" x2="12" y2="8"/><line x1="8" y1="11" x2="14" y2="11"/><circle cx="17" cy="17" r="4"/><line x1="15" y1="15" x2="19" y2="19"/><line x1="19" y1="15" x2="15" y2="19"/>`,
  forgery: `<rect x="4" y="3" width="12" height="16" rx="1.5"/><line x1="8" y1="8" x2="12" y2="8"/><line x1="8" y1="11" x2="14" y2="11"/><circle cx="17" cy="17" r="4"/><line x1="15" y1="15" x2="19" y2="19"/><line x1="19" y1="15" x2="15" y2="19"/>`,

  // Assault / violence — fist
  assault: `<rect x="6" y="10" width="12" height="7" rx="2"/><path d="M9 10V7a1 1 0 0 1 2 0v3"/><path d="M12 10V6a1 1 0 0 1 2 0v4"/><path d="M15 10V7a1 1 0 0 1 2 0v3"/><path d="M6 13c-1.1 0-2-.9-2-2V9a2 2 0 0 1 2-2"/>`,
  "violence-and-sexual-offences": `<rect x="6" y="10" width="12" height="7" rx="2"/><path d="M9 10V7a1 1 0 0 1 2 0v3"/><path d="M12 10V6a1 1 0 0 1 2 0v4"/><path d="M15 10V7a1 1 0 0 1 2 0v3"/><path d="M6 13c-1.1 0-2-.9-2-2V9a2 2 0 0 1 2-2"/>`,

  // Arson — flame
  arson: `<path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-3-2-5-2-5s-1 2-2 2c0-3-1-7-1-7z"/>`,
  "criminal-damage-arson": `<path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-3-2-5-2-5s-1 2-2 2c0-3-1-7-1-7z"/>`,

  // Drugs — pill
  drugs: `<rect x="3" y="9" width="18" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/>`,

  // Robbery — bag + lightning
  robbery: `<path d="M6 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8z"/><path d="M9 6V5a3 3 0 0 1 6 0v1"/><polyline points="13 11 11 14 13 14 11 17"/>`,

  // Vehicle crime — car + X
  "vehicle-crime": `<rect x="1" y="11" width="22" height="8" rx="2"/><path d="M5 11L8 5h8l3 6"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/><line x1="13" y1="8" x2="15" y2="6"/><line x1="15" y1="8" x2="13" y2="6"/>`,

  // Anti-social behaviour — person + warning triangle
  "anti-social-behaviour": `<circle cx="10" cy="7" r="3"/><path d="M4 21v-2a4 4 0 0 1 4-4h4"/><path d="M17 13l-3 5h6l-3-5z"/><line x1="17" y1="16" x2="17" y2="17.5"/>`,

  // Weapons — knife
  "possession-of-weapons": `<path d="M20 4L8.5 15.5"/><path d="M20 4c0 0-2 2-2 6L8.5 15.5"/><path d="M6 17l-2 3 3-2 1-3-2 2z"/>`,

  // Public order / riot — megaphone
  riot: `<path d="M18 8c1.1 0 2 .9 2 2v2a2 2 0 0 1-2 2h-1l-2 3V7l2 1h1z"/><line x1="6" y1="10" x2="12" y2="10"/><line x1="6" y1="14" x2="12" y2="14"/>`,
  "public-order": `<path d="M18 8c1.1 0 2 .9 2 2v2a2 2 0 0 1-2 2h-1l-2 3V7l2 1h1z"/><line x1="6" y1="10" x2="12" y2="10"/><line x1="6" y1="14" x2="12" y2="14"/>`,

  // Coining — coin stack
  coining: `<ellipse cx="12" cy="17" rx="6" ry="2"/><rect x="6" y="13" width="12" height="4" rx="1"/><ellipse cx="12" cy="13" rx="6" ry="2"/><line x1="10" y1="9" x2="14" y2="9"/><line x1="12" y1="7" x2="12" y2="11"/>`,
};

/**
 * Build a Leaflet DivIcon HTML string for a given crime category.
 * The icon is a filled circle (historical amber or recent grey) with the
 * category SVG centred inside it.
 */
export function buildMapIconHtml(
  category: string,
  layer: "historical" | "recent",
): string {
  const key = category.toLowerCase().trim();
  const paths =
    CATEGORY_SVG_PATHS[key] ??
    `<line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M6 6l-3 6a3 3 0 0 0 6 0L6 6z"/><path d="M18 6l-3 6a3 3 0 0 0 6 0L18 6z"/>`;

  const bg = layer === "historical" ? "#c9922a" : "#6b7280";
  const fg = layer === "historical" ? "#1a1a1a" : "#ffffff";
  const shadow =
    layer === "historical"
      ? "0 2px 8px rgba(0,0,0,.7)"
      : "0 2px 6px rgba(0,0,0,.4)";

  return `
    <div style="
      width:30px;height:30px;
      border-radius:50%;
      background:${bg};
      display:flex;align-items:center;justify-content:center;
      box-shadow:${shadow};
      border:2px solid ${layer === "historical" ? "#1a1a1a" : "#374151"};
    ">
      <svg xmlns="http://www.w3.org/2000/svg"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="${fg}" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        ${paths}
      </svg>
    </div>`;
}
