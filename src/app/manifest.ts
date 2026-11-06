import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "VibeNest — Kết nối cảm xúc",
    short_name: "VibeNest",
    description: "Không gian tâm sự và kết nối cảm xúc.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#080b12",
    theme_color: "#0b0f19",
    lang: "vi",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
    ]
  };
}
