import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#08080E", borderRadius: 108 }}>
      <svg width="180" height="180" viewBox="0 0 512 512" fill="none">
        <defs><linearGradient id="vn-neon" x1="78" y1="300" x2="434" y2="456"><stop stopColor="#F43F5E"/><stop offset="1" stopColor="#9333EA"/></linearGradient></defs>
        <path d="M82 218 C132 218 151 102 211 102 C273 102 274 302 324 302 C371 302 379 154 430 154 C457 154 468 190 492 190" stroke="#F7F4FA" strokeWidth="31" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M78 278 C78 410 158 472 256 472 C354 472 434 410 434 278" stroke="url(#vn-neon)" strokeWidth="34" strokeLinecap="round"/>
        <path d="M142 316 C166 382 210 411 256 411 C302 411 346 382 370 316" stroke="url(#vn-neon)" strokeWidth="29" strokeLinecap="round"/>
      </svg>
    </div>,
    { ...size },
  );
}
