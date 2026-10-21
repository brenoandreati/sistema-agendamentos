import type { Metadata, Viewport } from "next";
import { Fredoka, Geist, Geist_Mono, Oswald, Outfit, Playfair_Display } from "next/font/google";
import { BRAND } from "@/config/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fontes de título de cada área (veja os temas em globals.css). Só baixam na página que usa.
const barberFont = Oswald({ variable: "--font-barber", subsets: ["latin"], preload: false });
const hairFont = Playfair_Display({ variable: "--font-hair", subsets: ["latin"], preload: false });
const nailsFont = Fredoka({ variable: "--font-nails", subsets: ["latin"], preload: false });
const otherFont = Outfit({ variable: "--font-other", subsets: ["latin"], preload: false });
const nicheFonts = [barberFont, hairFont, nailsFont, otherFont].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
  applicationName: BRAND.name,
  appleWebApp: { capable: true, title: BRAND.shortName, statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} ${nicheFonts} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
