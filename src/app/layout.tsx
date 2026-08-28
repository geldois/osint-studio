import type { Metadata, Viewport } from "next";
import { Victor_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const victorMono = Victor_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-victor-mono",
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
    <html
      lang="pt-BR"
      className={`${victorMono.variable} h-dvh`}
      suppressHydrationWarning
    >
      <body className="h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
