'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export type OAuthProviderType = 'apple' | 'google' | 'discord' | 'tiktok';

export interface CompletedUserProfile {
  displayName: string;
  handle: string;
  birthDate: string;
  age: number;
  zodiacSign: string;
  zodiacSymbol: string;
  avatarDataUrl: string;
  oauthProvider: OAuthProviderType;
  acceptedTermsAt: string;
}

export interface SupabaseLikeClient {
  auth: {
    signInWithOAuth: (params: {
      provider: string;
      options?: { redirectTo?: string; scopes?: string };
    }) => Promise<{ data?: unknown; error?: { message: string } | null }>;
  };
}

export interface LitmatchThirdPartyAuthModalProps {
  isOpen?: boolean;
  open?: boolean;
  intent?: string;
  onClose: () => void;
  supabaseClient?: SupabaseLikeClient;
  redirectBaseUrl?: string;
  initialStep?: 'oauth' | 'profile';
  onProfileCompleted?: (profile: CompletedUserProfile) => void;
}

interface ZodiacInfo {
  name: string;
  symbol: string;
}

export function getZodiacFromDate(month: number, day: number): ZodiacInfo {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return { name: 'Bạch Dương', symbol: '♈' };
  }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return { name: 'Kim Ngưu', symbol: '♉' };
  }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return { name: 'Song Tử', symbol: '♊' };
  }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return { name: 'Cự Giải', symbol: '♋' };
  }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return { name: 'Sư Tử', symbol: '♌' };
  }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return { name: 'Xử Nữ', symbol: '♍' };
  }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return { name: 'Thiên Bình', symbol: '♎' };
  }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return { name: 'Bọ Cạp', symbol: '♏' };
  }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return { name: 'Nhân Mã', symbol: '♐' };
  }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return { name: 'Ma Kết', symbol: '♑' };
  }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return { name: 'Bảo Bình', symbol: '♒' };
  }
  return { name: 'Song Ngư', symbol: '♓' };
}

export function calculateAgeAndZodiac(birthDateStr: string): {
  age: number;
  zodiac: ZodiacInfo;
  isCoppaCompliant: boolean;
} | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

  const [year, month, day] = parts;
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }

  const zodiac = getZodiacFromDate(month, day);
  return {
    age,
    zodiac,
    isCoppaCompliant: age >= 13 && age <= 110,
  };
}

export const LitmatchThirdPartyAuthModal: React.FC<LitmatchThirdPartyAuthModalProps> = ({
  isOpen,
  open,
  onClose,
  supabaseClient,
  redirectBaseUrl = 'https://omni.id.vn',
  initialStep = 'oauth',
  onProfileCompleted,
}) => {
  const modalVisible = Boolean(isOpen ?? open);
  const [step, setStep] = useState<'oauth' | 'profile'>(initialStep);
  const [selectedProvider, setSelectedProvider] = useState<OAuthProviderType>('apple');
  const [showExtendedProviders, setShowExtendedProviders] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isLoadingOAuth, setIsLoadingOAuth] = useState<boolean>(false);

  // Profile Completion State
  const [displayName, setDisplayName] = useState<string>('');
  const [handle, setHandle] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('2002-10-18');
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);

  // Avatar & Circular Cropper State
  const [rawImageSrc, setRawImageSrc] = useState<string>('');
  const [croppedAvatarUrl, setCroppedAvatarUrl] = useState<string>('');
  const [cropZoom, setCropZoom] = useState<number>(1.2);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // iOS Safari WebRTC Camera Capture State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const releaseMediaTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    releaseMediaTracks();
    setIsCameraOpen(false);
  }, [releaseMediaTracks]);

  useEffect(() => {
    if (!modalVisible) {
      releaseMediaTracks();
    }
    return () => {
      releaseMediaTracks();
    };
  }, [modalVisible, releaseMediaTracks]);

  // Render circular crop preview onto HTML5 Canvas whenever zoom/offset/image changes
  const renderCropCanvas = useCallback(() => {
    const canvas = cropCanvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 240;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const baseScale = Math.max(size / img.width, size / img.height);
    const finalScale = baseScale * cropZoom;
    const drawWidth = img.width * finalScale;
    const drawHeight = img.height * finalScale;
    const drawX = (size - drawWidth) / 2 + cropOffset.x;
    const drawY = (size - drawHeight) / 2 + cropOffset.y;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();

    // Circular rim border
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  }, [cropZoom, cropOffset]);

  useEffect(() => {
    if (!rawImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      renderCropCanvas();
    };
    img.src = rawImageSrc;
  }, [rawImageSrc, renderCropCanvas]);

  useEffect(() => {
    if (rawImageSrc) {
      renderCropCanvas();
    }
  }, [cropZoom, cropOffset, rawImageSrc, renderCropCanvas]);

  if (!modalVisible) return null;

  const handleOAuthLogin = async (provider: OAuthProviderType) => {
    setAuthError('');
    setSelectedProvider(provider);
    setIsLoadingOAuth(true);

    try {
      const callbackUrl = `${redirectBaseUrl.replace(/\/$/, '')}/auth/callback?next=/`;
      if (supabaseClient) {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: callbackUrl,
          },
        });
        if (error) {
          throw new Error(error.message);
        }
      }
      // Transition to Profile Completion step
      setIsLoadingOAuth(false);
      setStep('profile');
    } catch (err) {
      setIsLoadingOAuth(false);
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối nhà cung cấp OAuth. Vui lòng thử lại.'
      );
    }
  };

  // Explicit User Gesture camera initializer for iOS Safari WebRTC compliance
  const startCameraCapture = async () => {
    setAuthError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAuthError('Trình duyệt trên thiết bị này không hỗ trợ truy cập Camera WebRTC.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setIsCameraOpen(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {
            setAuthError('Vui lòng chạm vào khung hình để cho phép iOS Safari phát video.');
          });
        }
      });
    } catch {
      setAuthError('Không thể mở Camera. Vui lòng kiểm tra quyền truy cập máy ảnh trên thiết bị.');
    }
  };

  const captureFrameFromCamera = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const tempCanvas = document.createElement('canvas');
    const side = Math.min(video.videoWidth, video.videoHeight);
    tempCanvas.width = side;
    tempCanvas.height = side;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    // Mirror front camera horizontally
    ctx.translate(side, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);

    const dataUrl = tempCanvas.toDataURL('image/webp', 0.92);
    stopCameraStream();
    setCropOffset({ x: 0, y: 0 });
    setCropZoom(1.1);
    setRawImageSrc(dataUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropOffset({ x: 0, y: 0 });
        setCropZoom(1.15);
        setRawImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyCircularCrop = () => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const finalAvatar = canvas.toDataURL('image/webp', 0.92);
    setCroppedAvatarUrl(finalAvatar);
    setRawImageSrc('');
  };

  const birthStats = calculateAgeAndZodiac(birthDate);
  const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');

  const handleCompleteProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');

    if (!croppedAvatarUrl) {
      setAuthError('Vui lòng tải ảnh đại diện từ máy hoặc chụp từ Camera để hoàn tất hồ sơ.');
      return;
    }
    if (!displayName.trim() || cleanHandle.length < 3) {
      setAuthError('Vui lòng nhập Tên hiển thị và @handle hợp lệ (tối thiểu 3 ký tự).');
      return;
    }
    if (!birthStats) {
      setAuthError('Vui lòng chọn ngày sinh hợp lệ.');
      return;
    }
    if (!birthStats.isCoppaCompliant) {
      setAuthError(
        'Theo đạo luật bảo vệ quyền riêng tư trẻ em (COPPA), người dùng phải từ 13 tuổi trở lên.'
      );
      return;
    }
    if (!agreedTerms) {
      setAuthError('Vui lòng đồng ý với Điều khoản dịch vụ (EULA) và Chính sách quyền riêng tư.');
      return;
    }

    onProfileCompleted?.({
      displayName: displayName.trim(),
      handle: cleanHandle,
      birthDate,
      age: birthStats.age,
      zodiacSign: birthStats.zodiac.name,
      zodiacSymbol: birthStats.zodiac.symbol,
      avatarDataUrl: croppedAvatarUrl,
      oauthProvider: selectedProvider,
      acceptedTermsAt: new Date().toISOString(),
    });
    stopCameraStream();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="litmatchThirdPartyAuthTitle"
    >
      <div className="w-full max-w-[460px] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-[#0b101d]/95 border-t sm:border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400">
              VibeNest · vn.id.omni.app
            </span>
            <h2
              id="litmatchThirdPartyAuthTitle"
              className="font-display text-xl font-semibold text-slate-900 dark:text-white mt-0.5"
            >
              {step === 'oauth'
                ? 'Bước vào không gian VibeNest'
                : 'Hoàn thiện hồ sơ cá nhân'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {step === 'oauth'
                ? 'Đăng nhập an toàn 1 chạm qua tài khoản liên kết xác thực'
                : 'Tùy chỉnh ảnh đại diện, ngày sinh và cung hoàng đạo của bạn'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="min-h-[44px] min-w-[44px] -mr-1 -mt-1 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            ✕
          </button>
        </div>

        {authError && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300 leading-relaxed"
          >
            {authError}
          </div>
        )}

        {/* STEP 1: 100% THIRD-PARTY SUPABASE OAUTH (NO PASSWORD, NO PHONE, NO SMS OTP) */}
        {step === 'oauth' && (
          <div className="space-y-4">
            {/* Primary Equal-Prominence Row: Apple (Guideline 4.8) & Google Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isLoadingOAuth}
                onClick={() => handleOAuthLogin('apple')}
                className="min-h-[50px] px-4 py-3 rounded-2xl bg-black hover:bg-neutral-900 text-white border border-white/15 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] transition-all"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
                </svg>
                <span>Tiếp tục với Apple</span>
              </button>

              <button
                type="button"
                disabled={isLoadingOAuth}
                onClick={() => handleOAuthLogin('google')}
                className="min-h-[50px] px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200/90 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.617 0 3.082.593 4.234 1.691l3.172-3.172C17.457 1.691 14.965.5 12 .5 7.391.5 3.441 3.137 1.516 7.012l3.738 2.902C6.156 7.133 8.836 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.275c0-.85-.076-1.67-.218-2.455H12v4.645h6.45c-.278 1.495-1.12 2.762-2.388 3.61l3.715 2.883c2.172-2.002 3.713-4.95 3.713-8.683z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.254 14.086A7.01 7.01 0 014.875 12c0-.726.13-1.43.379-2.086L1.516 7.012A11.466 11.466 0 00.5 12c0 1.855.444 3.607 1.016 4.988l3.738-2.902z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.24 0 5.959-1.073 7.945-2.912l-3.715-2.883c-1.075.72-2.45 1.145-4.23 1.145-3.164 0-5.844-2.133-6.746-5.014L1.516 16.988C3.441 20.863 7.391 23.5 12 23.5z"
                  />
                </svg>
                <span>Tiếp tục với Google</span>
              </button>
            </div>

            {/* Expandable Discord / TikTok OAuth Options */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowExtendedProviders((prev) => !prev)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>
                  {showExtendedProviders
                    ? 'Thu gọn tùy chọn mạng xã hội khác'
                    : 'Mở rộng: Tiếp tục với Discord / TikTok'}
                </span>
                <span>{showExtendedProviders ? '↑' : '↓'}</span>
              </button>

              {showExtendedProviders && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                  <button
                    type="button"
                    disabled={isLoadingOAuth}
                    onClick={() => handleOAuthLogin('discord')}
                    className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>Tiếp tục với Discord</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoadingOAuth}
                    onClick={() => handleOAuthLogin('tiktok')}
                    className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white/[0.08] hover:bg-slate-800 dark:hover:bg-white/[0.14] text-white border border-white/10 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>Tiếp tục với TikTok</span>
                  </button>
                </div>
              )}
            </div>

            {/* Legal Notice Links */}
            <div className="pt-3 border-t border-slate-200/70 dark:border-white/[0.07] text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
              Bằng việc tiếp tục, bạn xác nhận mình từ đủ 13 tuổi trở lên và đồng ý với{' '}
              <Link
                href="/terms"
                className="font-semibold text-rose-600 dark:text-rose-400 underline underline-offset-2"
              >
                Điều khoản dịch vụ (EULA)
              </Link>{' '}
              cùng{' '}
              <Link
                href="/privacy"
                className="font-semibold text-rose-600 dark:text-rose-400 underline underline-offset-2"
              >
                Chính sách quyền riêng tư
              </Link>{' '}
              của VibeNest.
            </div>
          </div>
        )}

        {/* STEP 2: PROFILE COMPLETION (CUSTOM AVATAR CROPPER, AGE & ZODIAC, COPPA 13+ GATE) */}
        {step === 'profile' && (
          <form onSubmit={handleCompleteProfileSubmit} className="space-y-4">
            {/* Avatar Upload / Camera Capture / Circular Cropper */}
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
              <div className="flex flex-col items-center">
                {/* Active Camera View (iOS Safari playsInline + muted + autoPlay) */}
                {isCameraOpen && (
                  <div className="w-full flex flex-col items-center space-y-3 mb-2">
                    <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-rose-500 shadow-lg bg-black">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={captureFrameFromCamera}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                      >
                        Chụp ảnh này
                      </button>
                      <button
                        type="button"
                        onClick={stopCameraStream}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-200"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Circular Avatar Cropper */}
                {!isCameraOpen && rawImageSrc && (
                  <div className="w-full flex flex-col items-center space-y-3 mb-2">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Kéo để căn chỉnh và phóng/thu ảnh đại diện tròn
                    </p>
                    <canvas
                      ref={cropCanvasRef}
                      onMouseDown={(e) => {
                        setIsDraggingCrop(true);
                        dragStartRef.current = {
                          x: e.clientX - cropOffset.x,
                          y: e.clientY - cropOffset.y,
                        };
                      }}
                      onMouseMove={(e) => {
                        if (!isDraggingCrop) return;
                        setCropOffset({
                          x: e.clientX - dragStartRef.current.x,
                          y: e.clientY - dragStartRef.current.y,
                        });
                      }}
                      onMouseUp={() => setIsDraggingCrop(false)}
                      onMouseLeave={() => setIsDraggingCrop(false)}
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        if (!touch) return;
                        setIsDraggingCrop(true);
                        dragStartRef.current = {
                          x: touch.clientX - cropOffset.x,
                          y: touch.clientY - cropOffset.y,
                        };
                      }}
                      onTouchMove={(e) => {
                        if (!isDraggingCrop) return;
                        const touch = e.touches[0];
                        if (!touch) return;
                        setCropOffset({
                          x: touch.clientX - dragStartRef.current.x,
                          y: touch.clientY - dragStartRef.current.y,
                        });
                      }}
                      onTouchEnd={() => setIsDraggingCrop(false)}
                      className="w-36 h-36 rounded-full cursor-move touch-none shadow-md bg-slate-900"
                    />
                    <div className="w-full max-w-[220px] flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Thu/Phóng</span>
                      <input
                        type="range"
                        min="1"
                        max="2.6"
                        step="0.05"
                        value={cropZoom}
                        onChange={(e) => setCropZoom(Number(e.target.value))}
                        className="flex-1 accent-rose-600"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={applyCircularCrop}
                        className="min-h-[38px] px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                      >
                        Xác nhận cắt ảnh tròn
                      </button>
                      <button
                        type="button"
                        onClick={() => setRawImageSrc('')}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-medium"
                      >
                        Chọn lại
                      </button>
                    </div>
                  </div>
                )}

                {/* Cropped Avatar Preview & Upload/Camera Triggers */}
                {!isCameraOpen && !rawImageSrc && (
                  <div className="flex flex-col items-center gap-3">
                    {croppedAvatarUrl ? (
                      <img
                        src={croppedAvatarUrl}
                        alt="Avatar đã cắt"
                        className="w-24 h-24 rounded-full object-cover border-2 border-rose-500 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center text-center p-2">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Chưa có ảnh đại diện
                        </span>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white/10 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        Tải ảnh từ máy
                      </button>
                      <button
                        type="button"
                        onClick={startCameraCapture}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-600/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold hover:bg-rose-600/25 transition-colors"
                      >
                        Chụp từ Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Display Name & @handle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="VD: Linh Đan"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ID định danh (@handle)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="linhdan.vibe"
                    className="w-full min-h-[44px] pl-7 pr-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Birthdate with Automatic Age & Zodiac Sign Calculation + COPPA 13+ Enforcement */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ngày sinh (Tự động tính Tuổi & Cung hoàng đạo · Yêu cầu 13+)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
                {birthStats && (
                  <div
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0 ${
                      birthStats.isCoppaCompliant
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300'
                    }`}
                  >
                    <span>{birthStats.zodiac.symbol}</span>
                    <span>{birthStats.zodiac.name}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{birthStats.age} tuổi</span>
                  </div>
                )}
              </div>
              {birthStats && !birthStats.isCoppaCompliant && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                  Tài khoản dưới 13 tuổi bị chặn đăng ký theo quy định bảo vệ trẻ em COPPA.
                </p>
              )}
            </div>

            {/* EULA & Privacy Policy Checkbox */}
            <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded accent-rose-600"
              />
              <span className="leading-relaxed">
                Tôi đồng ý với{' '}
                <Link
                  href="/terms"
                  className="font-semibold text-rose-600 dark:text-rose-400 underline"
                >
                  Điều khoản dịch vụ (/terms)
                </Link>{' '}
                và{' '}
                <Link
                  href="/privacy"
                  className="font-semibold text-rose-600 dark:text-rose-400 underline"
                >
                  Chính sách quyền riêng tư (/privacy)
                </Link>{' '}
                của VibeNest (cam kết không dung thứ nội dung độc hại theo Apple Guideline 1.2).
              </span>
            </label>

            <div className="flex items-center justify-between gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep('oauth')}
                className="min-h-[46px] px-4 py-2.5 rounded-2xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              >
                ← Đổi liên kết OAuth
              </button>
              <button
                type="submit"
                disabled={Boolean(birthStats && !birthStats.isCoppaCompliant)}
                className="flex-1 min-h-[46px] px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 disabled:opacity-45 text-white shadow-lg shadow-rose-600/20 transition-all"
              >
                Hoàn tất & Vào VibeNest
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LitmatchThirdPartyAuthModal;
