import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Playfair_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  applicationName: "Casebook",
  appleWebApp: { capable: true, title: "Casebook", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
  title: "Casebook · London's court records, on the street",
  description:
    "Walk the streets of London and uncover the crimes committed where you stand — from Old Bailey records to present-day police data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${plexMono.variable} h-full`}
    >
      <body className="h-full bg-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
