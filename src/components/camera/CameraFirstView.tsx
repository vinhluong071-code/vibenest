'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface CameraFirstViewProps {
  active: boolean;
  onCapture: (file: File) => void;
  onOpenBooth: () => void;
  onOpenFeed: () => void;
  onSoftGate: () => void;
}

export const CameraFirstView: React.FC<CameraFirstViewProps> = ({
  active,
  onCapture,
  onOpenBooth,
  onOpenFeed,
  onSoftGate,
}) => {
  const [streamReady, setStreamReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      releaseStream();
    }
    return () => {
      releaseStream();
    };
  }, [active, releaseStream]);

  const startCameraWithGesture = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Trình duyệt trên thiết bị này chưa hỗ trợ Camera WebRTC.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } },
        audio: false,
      });
      streamRef.current = stream;
      setStreamReady(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {
            setCameraError('Chạm vào khung hình để phát video trên iOS Safari.');
          });
        }
      });
    } catch {
      setCameraError('Vui lòng cấp quyền truy cập Camera để chụp khoảnh khắc.');
    }
  };

  const handleShutterClick = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `vibenest-${Date.now()}.webp`, {
          type: 'image/webp',
        });
        onCapture(file);
      },
      'image/webp',
      0.92
    );
  };

  return (
    <section className="min-h-[82vh] rounded-3xl bg-[#090d16] border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden">
      <header className="flex items-center justify-between gap-2 z-10">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400">
            VibeNest Camera-First
          </span>
          <h2 className="text-lg font-semibold text-white">Khoảnh khắc tức thì</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenBooth}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-300"
          >
            Life4Cuts 4 Ô
          </button>
          <button
            type="button"
            onClick={onOpenFeed}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/10 text-xs font-medium text-white"
          >
            Bảng tin →
          </button>
        </div>
      </header>

      <div className="my-4 flex-1 rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center relative min-h-[360px]">
        {!streamReady ? (
          <div className="text-center p-6 space-y-3">
            <p className="text-sm font-medium text-white">
              Chạm để kích hoạt Camera (Chuẩn iOS Safari WebRTC)
            </p>
            {cameraError && <p className="text-xs text-rose-400">{cameraError}</p>}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={startCameraWithGesture}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Mở Camera ngay
              </button>
              <button
                type="button"
                onClick={onSoftGate}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-white/10 text-white text-xs font-medium"
              >
                Liên kết tài khoản
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}
      </div>

      <footer className="flex items-center justify-center gap-4 z-10">
        <button
          type="button"
          disabled={!streamReady}
          onClick={handleShutterClick}
          aria-label="Chụp khoảnh khắc"
          className="w-16 h-16 rounded-full border-4 border-white bg-rose-600/80 hover:bg-rose-500 disabled:opacity-40 transition-transform active:scale-95"
        />
      </footer>
    </section>
  );
};

export default CameraFirstView;
