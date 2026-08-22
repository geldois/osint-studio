import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const zedMono = localFont({
  src: [
    { path: "./fonts/ZedMonoNerdFontMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/ZedMonoNerdFontMono-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-zed-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://osint.angelitochagas.com"),
  title: "OSINT Studio",
  description: "Corporate intelligence graph explorer",
};

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${zedMono.variable} h-dvh`} suppressHydrationWarning>
      <body className="h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
