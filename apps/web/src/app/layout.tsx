import type { Metadata, Viewport } from "next";
import { Jost, Karla } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { CartPersistence } from "@/components/cart-persistence";

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});
const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gemjarsocks.com"),
  title: {
    default: "Gemjar — Colourful bamboo and wool socks",
    template: "%s — Gemjar",
  },
  description:
    "Colourful bamboo and wool-blend socks, cosy accessories and bamboo nightwear from Gemjar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Gemjar",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f758b",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${karla.variable} ${jost.variable}`}
    >
      <body>
        <PwaRegister />
        <CartPersistence />
        {children}
      </body>
    </html>
  );
}
