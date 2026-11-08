import type { Metadata } from "next";
import { VibeNestCameraFirst } from "@/components/VibeNestCameraFirst";
import "./vibenest-camera-first.css";

export const metadata: Metadata = {
  title: "VibeNest — Your Vibe, Your People",
  description: "Chụp, lưu giữ và kết nối những khoảnh khắc chân thật.",
};

export default function HomePage() {
  return <VibeNestCameraFirst />;
}
