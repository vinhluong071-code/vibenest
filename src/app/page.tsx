import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VibeNest — Không Gian Tâm Sự Ẩn Danh",
  description:
    "Nền tảng kết nối và chia sẻ tâm sự ẩn danh tối ưu cho di động với thiết kế Glassmorphism hiện đại, giàu cảm xúc.",
};

export default function HomePage() {
  return (
    <main className="min-h-dvh w-full overflow-hidden bg-[#080b12]">
      <iframe
        title="VibeNest"
        src="/vibenest-legacy.html"
        className="block min-h-dvh w-full border-0"
        style={{ height: "100dvh" }}
        allow="autoplay; clipboard-read; clipboard-write"
      />
    </main>
  );
}
