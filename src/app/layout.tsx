import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SupabaseSessionBridge } from "@/components/supabase-session-bridge";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "VibeNest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }, { url: "/icon", type: "image/png", sizes: "512x512" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  applicationName: "VibeNest",
  manifest: "/manifest.json",
  description: "Không gian tâm sự và kết nối cảm xúc ẩn danh.",
  appleWebApp: { capable: true, title: "VibeNest", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08080E",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
