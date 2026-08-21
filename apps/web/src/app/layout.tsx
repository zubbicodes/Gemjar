import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-cormorant", weight: ["500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://gemjar.example"),
  title: { default: "Gemjar — Objects of quiet distinction", template: "%s — Gemjar" },
  description: "Considered jewellery and objects, selected for their material beauty and lasting character.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Gemjar", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#12372f", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${cormorant.variable}`}>
      <body><PwaRegister />{children}</body>
    </html>
  );
}
