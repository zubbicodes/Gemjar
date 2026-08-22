import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope, Poppins } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { CartPersistence } from "@/components/cart-persistence";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
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
  themeColor: "#e94f37",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${bricolage.variable} ${poppins.variable}`}
    >
      <body>
        <PwaRegister />
        <CartPersistence />
        {children}
      </body>
    </html>
  );
}
