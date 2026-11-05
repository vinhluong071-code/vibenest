import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SupabaseSessionBridge } from "@/components/supabase-session-bridge";

export const metadata: Metadata = {
  title: "VibeNest",
  description: "Không gian tâm sự và kết nối cảm xúc ẩn danh.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0f19",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className="dark">
      <body>
        <SupabaseSessionBridge />
        {children}
      </body>
    </html>
  );
}
