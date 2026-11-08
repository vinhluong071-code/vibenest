import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#08080E", borderRadius: 38 }}>
      <svg width="180" height="180" viewBox="0 0 512 512" fill="none">
        <defs><linearGradient id="smile" x1="90" y1="280" x2="430" y2="470"><stop stopColor="#F43F5E"/><stop offset="1" stopColor="#9333EA"/></linearGradient></defs>
        <path d="M92 176h42l23-42 33 88 35-119 38 145 34-92 28 54h95" stroke="white" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M105 302c65 85 145 128 151 128s86-43 151-128" stroke="url(#smile)" strokeWidth="18" strokeLinecap="round"/>
        <path d="M145 320c38 42 78 65 111 65s73-23 111-65" stroke="url(#smile)" strokeWidth="10" strokeLinecap="round"/>
      </svg>
    </div>,
    { ...size },
  );
}
