import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { fr } from "@/i18n/fr";
import "./globals.css";

// Rounded, very legible, full French accent support.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: fr.appName,
  description: fr.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#15191f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* The frame: full screen on phones, a phone-width column on larger screens. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-canvas text-ink md:border-x md:border-line md:shadow-[0_0_60px_-20px_rgba(30,36,48,0.35)]">
          {children}
        </div>
      </body>
    </html>
  );
}
