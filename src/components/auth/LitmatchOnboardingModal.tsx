'use client';

import React, { useState } from 'react';
import { getAvatarThemeFromIdentity } from '../../lib/avatar-hash';
import { VibeNestLogo } from '../brand/VibeNestLogo';

export interface UserProfile {
  displayName: string;
  handle: string;
  city: string;
  vibeTag: string;
  bio: string;
  avatarUrl?: string;
}

export interface LitmatchOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCompleteAuth: (profile: UserProfile) => void | Promise<void>;
}

const VIBE_ARCHETYPES = [
  'Kẻ Mộng Mơ Đêm Muộn',
  'Nhiếp Ảnh Phim & Cà Phê',
  'Tần Số Chữa Lành',
  'Acoustic & Mưa Rào',
  'Du Mục Đô Thị',
];

const QUICK_PROFILES: UserProfile[] = [
  {
    displayName: 'Linh Đan',
    handle: 'linhdan.vibe',
    city: 'Sài Gòn',
    vibeTag: 'Nhiếp Ảnh Phim & Cà Phê',
    bio: 'Thích chụp ảnh phố lên đèn và những cuộc trò chuyện không vội vã.',
  },
  {
    displayName: 'Minh Khôi',
    handle: 'khoi.soulsync',
    city: 'Hà Nội',
    vibeTag: 'Kẻ Mộng Mơ Đêm Muộn',
    bio: 'Kiến trúc sư trẻ, hay nghe indie và dạo hồ Tây lúc nửa đêm.',
  },
  {
    displayName: 'Hạ Vy',
    handle: 'havy.dalat',
    city: 'Đà Lạt',
    vibeTag: 'Tần Số Chữa Lành',
    bio: 'Góc nhỏ bình yên giữa đồi thông và những trang sách dở.',
  },
];

export const LitmatchOnboardingModal: React.FC<LitmatchOnboardingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCompleteAuth,
}) => {
  const [displayName, setDisplayName] = useState<string>(currentUser.displayName);
  const [handle, setHandle] = useState<string>(currentUser.handle.replace(/^@/, ''));
  const [city, setCity] = useState<string>(currentUser.city);
  const [vibeTag, setVibeTag] = useState<string>(currentUser.vibeTag);
  const [bio, setBio] = useState<string>(currentUser.bio);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (!isOpen) return null;

  const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9._]/g, '') || 'vibenest.user';
  const avatarTheme = getAvatarThemeFromIdentity(cleanHandle);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!displayName.trim() || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await onCompleteAuth({
        displayName: displayName.trim(),
        handle: cleanHandle,
        city,
        vibeTag,
        bio: bio.trim() || 'Đang tìm kiếm những tần số đồng điệu tại VibeNest.',
      });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Không thể lưu hồ sơ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const applyQuickPreset = (preset: UserProfile) => {
    setDisplayName(preset.displayName);
    setHandle(preset.handle);
    setCity(preset.city);
    setVibeTag(preset.vibeTag);
    setBio(preset.bio);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="litmatchOnboardingTitle"
    >
      <div className="w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-[#0d121f]/95 border-t sm:border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shrink-0">
              <VibeNestLogo size="md" />
            </div>
            <div>
              <h2
                id="litmatchOnboardingTitle"
                className="font-display text-lg font-semibold text-slate-900 dark:text-white"
              >
                Hồ sơ kết nối VibeNest
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bước vào không gian cảm xúc với cá tính riêng của bạn
              </p>
            </div>
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

        {/* Live Identity Card Preview (Litmatch Soul Card Style) */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-rose-500/[0.09] via-indigo-500/[0.06] to-transparent border border-slate-200/80 dark:border-white/10 mb-5">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-display font-semibold text-xl shrink-0 shadow-sm ${avatarTheme.textClass}`}
              style={{
                background: avatarTheme.bgStyle,
                borderColor: avatarTheme.borderStyle,
              }}
            >
              {(displayName || 'V').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-slate-900 dark:text-white truncate">
                  {displayName.trim() || 'Tên của bạn'}
                </p>
                <span className="text-xs font-mono text-rose-600 dark:text-rose-400 truncate">
                  @{cleanHandle}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {vibeTag} · {city}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-1">
                {bio.trim() || 'Chạm để giới thiệu đôi nét về tần số cảm xúc của bạn...'}
              </p>
            </div>
          </div>
        </div>

        {/* Instant 1-Tap Profile Switcher for Fast Onboarding */}
        <div className="mb-4">
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
            Chuyển nhanh tài khoản mẫu (1 chạm):
          </span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {QUICK_PROFILES.map((preset) => (
              <button
                key={preset.handle}
                type="button"
                onClick={() => applyQuickPreset(preset)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                {preset.displayName} (@{preset.handle.split('.')[0]})
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tần số cá nhân (Vibe Tag)
              </label>
              <select
                value={vibeTag}
                onChange={(e) => setVibeTag(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
              >
                {VIBE_ARCHETYPES.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Thành phố
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="Sài Gòn">Sài Gòn</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Lạt">Đà Lạt</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Lời chào trên trang cá nhân
            </label>
            <input
              type="text"
              maxLength={120}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Viết một câu ngắn thể hiện chất riêng của bạn..."
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] px-5 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-[0.99] text-white shadow-lg shadow-rose-600/20 transition-all"
          >
            {saving ? "Đang tạo hồ sơ…" : "Vào không gian VibeNest ngay"}
          </button>
          {saveError && <p role="alert" className="text-sm text-rose-500">{saveError}</p>}
        </form>
      </div>
    </div>
  );
};

export default LitmatchOnboardingModal;
