import type { Metadata } from "next";
import { VibeNestApp } from "@/components/VibeNestApp";

export const metadata: Metadata = {
  title: "VibeNest — Không Gian Tâm Sự Ẩn Danh",
  description: "Một không gian dịu dàng để chia sẻ và kết nối cảm xúc ẩn danh.",
};

export default function HomePage() {
  return <VibeNestApp />;
}
