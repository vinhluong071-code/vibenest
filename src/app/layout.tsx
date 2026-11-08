import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SupabaseSessionBridge } from "@/components/supabase-session-bridge";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "VibeNest",
  applicationName: "VibeNest",
  manifest: "/manifest.webmanifest",
  description: "Không gian tâm sự và kết nối cảm xúc ẩn danh.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "VibeNest",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07080d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className="dark">
      <body>
        <PwaRegister />
        <SupabaseSessionBridge />
        {children}
      </body>
    </html>
  );
}
