'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export type BoothFrameThemeId =
  | 'indigo'
  | 'purple'
  | 'cyan'
  | 'obsidian'
  | 'rose-pastel';

export interface BoothFrameTheme {
  id: BoothFrameThemeId;
  label: string;
  bgFill: string;
  borderStroke: string;
  textFill: string;
  subtextFill: string;
  swatchStyle: string;
}

export interface VibeBoothStudioProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  userHandle?: string;
  onSoftGate?: () => void;
  onSaveMemoryStrip?: (stripDataUrl: string, themeId: BoothFrameThemeId) => void;
  onNotify?: (message: string) => void;
}

const BOOTH_THEMES: BoothFrameTheme[] = [
  {
    id: 'indigo',
    label: 'Indigo',
    bgFill: '#1E1B4B',
    borderStroke: '#4338CA',
    textFill: '#F8FAFC',
    subtextFill: '#A5B4FC',
    swatchStyle: 'linear-gradient(135deg, #312E81, #1E1B4B)',
  },
  {
    id: 'purple',
    label: 'Purple',
    bgFill: '#2E1065',
    borderStroke: '#7E22CE',
    textFill: '#FAF5FF',
    subtextFill: '#D8B4FE',
    swatchStyle: 'linear-gradient(135deg, #581C87, #2E1065)',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    bgFill: '#083344',
    borderStroke: '#0891B2',
    textFill: '#ECFEFF',
    subtextFill: '#67E8F9',
    swatchStyle: 'linear-gradient(135deg, #155E75, #083344)',
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    bgFill: '#090D16',
    borderStroke: '#334155',
    textFill: '#F8FAFC',
    subtextFill: '#94A3B8',
    swatchStyle: 'linear-gradient(135deg, #1E293B, #090D16)',
  },
  {
    id: 'rose-pastel',
    label: 'Rose Pastel',
    bgFill: '#FFF1F2',
    borderStroke: '#FDA4AF',
    textFill: '#881337',
    subtextFill: '#E11D48',
    swatchStyle: 'linear-gradient(135deg, #FFE4E6, #FECDD3)',
  },
];

export const VibeBoothStudio: React.FC<VibeBoothStudioProps> = ({
  isOpen,
  open,
  onClose,
  userHandle = 'linhdan.vibe',
  onSaveMemoryStrip,
  onNotify,
}) => {
  const modalVisible = Boolean(isOpen ?? open);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [isShootingSequence, setIsShootingSequence] = useState<boolean>(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState<number>(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<BoothFrameThemeId>('obsidian');
  const [finalStripWebpUrl, setFinalStripWebpUrl] = useState<string>('');
  const [flashActive, setFlashActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stripCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const releaseCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!modalVisible) {
      releaseCameraTracks();
    }
    return () => {
      releaseCameraTracks();
    };
  }, [modalVisible, releaseCameraTracks]);

  // Explicit User Gesture WebRTC Camera activation for iOS Safari
  const requestCameraWithGesture = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Trình duyệt không hỗ trợ WebRTC Camera.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setHasCameraPermission(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {
            setCameraError('Vui lòng chạm vào khung video để cấp quyền phát trên iOS Safari.');
          });
        }
      });
    } catch (_) {
      setCameraError(
        'Không thể truy cập Camera. Bạn cũng có thể tạo bộ 4 khung nghệ thuật mẫu bên dưới.'
      );
    }
  };

  // Capture a single pose frame from the live <video> element
  const captureSingleFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;

    const canvas = document.createElement('canvas');
    const targetW = 640;
    const targetH = 480;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Mirror horizontally for natural selfie photobooth feel
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/webp', 0.92);
  }, []);

  // Automated 4-Pose Countdown Sequence (3.. 2.. 1.. Capture x 4)
  const startFourCutSequence = async () => {
    if (!hasCameraPermission || isShootingSequence) return;
    setCapturedFrames([]);
    setFinalStripWebpUrl('');
    setIsShootingSequence(true);

    const frames: string[] = [];

    for (let pose = 0; pose < 4; pose++) {
      setCurrentPoseIndex(pose + 1);
      for (let count = 3; count >= 1; count--) {
        setCountdownNum(count);
        await new Promise((r) => setTimeout(r, 850));
      }
      setCountdownNum(0);
      setFlashActive(true);
      const shot = captureSingleFrame();
      if (shot) {
        frames.push(shot);
        setCapturedFrames([...frames]);
      }
      await new Promise((r) => setTimeout(r, 220));
      setFlashActive(false);
      await new Promise((r) => setTimeout(r, 400));
    }

    setCountdownNum(null);
    setIsShootingSequence(false);
  };

  // Composite 4 frames onto a vertical 1:4 ratio Life4Cuts HTML5 Canvas strip
  const composeFourCutStrip = useCallback(async () => {
    if (capturedFrames.length < 4 || !stripCanvasRef.current) return;

    const theme =
      BOOTH_THEMES.find((t) => t.id === selectedTheme) || BOOTH_THEMES[3];
    const canvas = stripCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Vertical 1:4 Strip Dimensions (400px width x 1600px height)
    const stripW = 400;
    const stripH = 1600;
    canvas.width = stripW;
    canvas.height = stripH;

    // Fill Frame Background
    ctx.fillStyle = theme.bgFill;
    ctx.fillRect(0, 0, stripW, stripH);

    // Outer Border
    ctx.strokeStyle = theme.borderStroke;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, stripW - 6, stripH - 6);

    // Top Header Branding
    ctx.fillStyle = theme.textFill;
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VIBENEST · LIFE4CUTS', stripW / 2, 52);

    ctx.fillStyle = theme.subtextFill;
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText(`@${userHandle} · ${new Date().toLocaleDateString('vi-VN')}`, stripW / 2, 76);

    // Draw each of the 4 captured frames vertically
    const padX = 28;
    const frameW = stripW - padX * 2; // 344px
    const frameH = 310;
    const gapY = 22;
    const startY = 104;

    for (let i = 0; i < 4; i++) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = capturedFrames[i];
      });

      const y = startY + i * (frameH + gapY);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(padX, y, frameW, frameH, 14);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, padX, y, frameW, frameH);
      ctx.restore();

      ctx.strokeStyle = theme.borderStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(padX, y, frameW, frameH, 14);
      ctx.stroke();
    }

    // Footer Signature
    ctx.fillStyle = theme.textFill;
    ctx.font = '600 16px "Fraunces", serif';
    ctx.fillText('omni.id.vn · Khoảnh khắc đồng điệu', stripW / 2, stripH - 48);

    ctx.fillStyle = theme.subtextFill;
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText(`FRAME: ${theme.label.toUpperCase()} · WEBP`, stripW / 2, stripH - 24);

    const webpUrl = canvas.toDataURL('image/webp', 0.92);
    setFinalStripWebpUrl(webpUrl);
  }, [capturedFrames, selectedTheme, userHandle]);

  useEffect(() => {
    if (capturedFrames.length === 4) {
      composeFourCutStrip();
    }
  }, [capturedFrames, selectedTheme, composeFourCutStrip]);

  if (!modalVisible) return null;

  const handleDownloadWebP = () => {
    if (!finalStripWebpUrl) return;
    const a = document.createElement('a');
    a.href = finalStripWebpUrl;
    a.download = `vibenest-life4cuts-${userHandle}-${Date.now()}.webp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onNotify?.('Đã tải dải ảnh Photobooth 4 ô (.webp) về thiết bị');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vibeBoothTitle"
    >
      <div className="w-full max-w-3xl rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-[#0b101d]/95 border-t sm:border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/70 dark:border-white/[0.07]">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-500">
              VibeBooth Studio · Life4Cuts 1:4
            </span>
            <h2
              id="vibeBoothTitle"
              className="font-display text-xl font-semibold text-slate-900 dark:text-white"
            >
              Tiệm Ảnh Photobooth 4 Ô Tự Động
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng tiệm ảnh"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {cameraError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-300">
            {cameraError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 items-start">
          {/* Left Column (7 cols): Live Camera Viewfinder & Countdown Controls */}
          <div className="md:col-span-7 space-y-4">
            <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-slate-950 border border-white/15 flex items-center justify-center shadow-lg">
              {!hasCameraPermission ? (
                <div className="text-center p-6 space-y-3">
                  <p className="text-sm font-medium text-white">
                    Chạm để cấp quyền Camera (Tương thích iOS Safari WebRTC)
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Hệ thống sẽ tự động đếm ngược 3.. 2.. 1.. và chụp liên tiếp 4 tư thế chuẩn tiệm ảnh Hàn Quốc.
                  </p>
                  <button
                    type="button"
                    onClick={requestCameraWithGesture}
                    className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-rose-600/25"
                  >
                    Bật Camera ngay
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover scale-x-[-1]"
                  />

                  {/* White Shutter Flash Overlay */}
                  {flashActive && (
                    <div className="absolute inset-0 bg-white z-20 transition-opacity duration-150" />
                  )}

                  {/* Pose Progress & Countdown Overlay */}
                  {isShootingSequence && (
                    <div className="absolute inset-0 z-10 bg-black/30 flex flex-col items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-black/65 text-white font-mono text-xs mb-2">
                        Tư thế {currentPoseIndex} / 4
                      </span>
                      <span className="font-display text-6xl font-bold text-white drop-shadow-lg tabular-nums">
                        {countdownNum === 0 ? 'CHỤP!' : countdownNum}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Triggers */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!hasCameraPermission || isShootingSequence}
                onClick={startFourCutSequence}
                className="flex-1 min-h-[48px] px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 disabled:opacity-45 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-rose-600/20 transition-all"
              >
                {isShootingSequence
                  ? `Đang chụp tư thế ${currentPoseIndex}/4...`
                  : capturedFrames.length === 4
                  ? 'Chụp lại bộ 4 tư thế mới'
                  : 'Bắt đầu chụp tự động 4 tư thế (3.. 2.. 1)'}
              </button>
            </div>

            {/* Frame Color Theme Picker */}
            <div>
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Chọn màu khung dải ảnh (Frame Theme):
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {BOOTH_THEMES.map((theme) => {
                  const active = selectedTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                        active
                          ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-300 font-semibold'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/25"
                        style={{ background: theme.swatchStyle }}
                      />
                      <span>{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): 1:4 Vertical Strip Canvas Preview & WebP Export */}
          <div className="md:col-span-5 flex flex-col items-center space-y-4">
            <div className="w-full p-4 rounded-3xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] flex flex-col items-center">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-3">
                Dải ảnh dọc tỉ lệ 1:4 (400×1600 WebP)
              </span>

              {/* Hidden High-Res Canvas used for 1:4 stitching */}
              <canvas ref={stripCanvasRef} className="hidden" />

              {finalStripWebpUrl ? (
                <img
                  src={finalStripWebpUrl}
                  alt="Dải ảnh Life4Cuts"
                  className="w-44 h-auto rounded-xl shadow-2xl border border-white/10"
                />
              ) : (
                <div className="w-40 h-[420px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 flex flex-col items-center justify-between p-3">
                  {[1, 2, 3, 4].map((slot) => (
                    <div
                      key={slot}
                      className="w-full h-20 rounded-lg bg-slate-200/70 dark:bg-white/[0.05] flex items-center justify-center text-[11px] font-mono text-slate-400"
                    >
                      {capturedFrames[slot - 1] ? `Đã chụp #${slot}` : `Khung #${slot}`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {finalStripWebpUrl && (
              <div className="w-full flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadWebP}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20"
                >
                  Tải ảnh .WebP về máy
                </button>
                {onSaveMemoryStrip && (
                  <button
                    type="button"
                    onClick={() => {
                      onSaveMemoryStrip(finalStripWebpUrl, selectedTheme);
                      onNotify?.('Đã lưu dải ảnh vào Kho Kỷ Niệm cá nhân');
                    }}
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white/10 text-white text-xs font-semibold"
                  >
                    Lưu vào Kho Kỷ Niệm
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VibeBoothStudio;
