"use client";
import { useEffect, useRef, useState } from "react";

type Props = { open: boolean; onClose: () => void; onCaptured: (file: File) => void };

export function CameraFirstView({ open, onClose, onCaptured }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const resetTimer = window.setTimeout(() => { setError(""); setReady(false); }, 0);
    if (!navigator.mediaDevices?.getUserMedia) {
      const unsupportedTimer = window.setTimeout(() => setError("Trình duyệt không hỗ trợ camera trực tiếp. Bạn có thể chọn ảnh từ thiết bị."), 0);
      return () => { active = false; window.clearTimeout(resetTimer); window.clearTimeout(unsupportedTimer); };
    }
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().then(() => setReady(true)).catch(() => setError("Không thể khởi động camera."));
        }
      })
      .catch(() => setError("Không thể truy cập camera. Hãy cấp quyền camera hoặc chọn ảnh từ thư viện."));
    return () => {
      active = false;
      window.clearTimeout(resetTimer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Không thể xử lý ảnh từ camera.");
      context.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể chụp ảnh.")), "image/jpeg", .92));
      onCaptured(new File([blob], `vibenest-${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể chụp ảnh.");
    } finally { setBusy(false); }
  }

  return (
    <div className="vn-modal-backdrop vn-camera-backdrop" role="dialog" aria-modal="true" aria-label="Camera VibeNest">
      <section className="vn-camera-view">
        <header><div><small>CAMERA FIRST</small><h2>Khoảnh khắc của bạn</h2></div><button type="button" onClick={onClose} aria-label="Đóng camera">×</button></header>
        <div className="vn-camera-preview">
          <video ref={videoRef} autoPlay muted playsInline />
          {!ready && <div className="vn-camera-placeholder">Đang chờ camera…</div>}
        </div>
        {error && <p className="vn-camera-error" role="alert">{error}</p>}
        <div className="vn-camera-actions">
          <label className="vn-secondary-button">Chọn từ thư viện<input hidden type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) onCaptured(file); }} /></label>
          <button type="button" className="vn-camera-shutter" disabled={!ready || busy} onClick={() => void capture()} aria-label="Chụp ảnh">{busy ? "…" : "●"}</button>
        </div>
      </section>
    </div>
  );
}
