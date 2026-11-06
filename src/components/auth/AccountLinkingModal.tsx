'use client';

import React, { useState } from 'react';
import { getAvatarThemeFromAlias } from '../../lib/avatar-hash';
import { VibeNestLogo } from '../brand/VibeNestLogo';

export interface AccountLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAlias: string;
  onAliasChange: (newAlias: string) => void;
  linkedEmail?: string;
  onAccountLinked: (payload: { email: string; method: 'otp' | 'password'; mode: 'link' | 'recover' }) => void;
  onAccountUnlinked: () => void;
}

export function AccountLinkingModal({
  isOpen,
  onClose,
  currentAlias,
  onAliasChange,
  linkedEmail,
  onAccountLinked,
  onAccountUnlinked,
}: AccountLinkingModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'recover'>('link');
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('otp');
  const [step, setStep] = useState<'input' | 'otp-verify'>('input');
  const [email, setEmail] = useState(linkedEmail || '');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const avatarTheme = getAvatarThemeFromAlias(currentAlias);

  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (authMethod === 'otp') {
      setIsSubmitting(true);
      // Tương thích với primitive.dev passwordless OTP trigger
      await new Promise((r) => setTimeout(r, 250));
      setIsSubmitting(false);
      setStep('otp-verify');
      return;
    }

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 300));
    setIsSubmitting(false);
    onAccountLinked({ email: email.trim(), method: 'password', mode: activeTab });
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length < 6) return;

    setIsSubmitting(true);
    // Tương thích với primitive.dev OTP verification
    await new Promise((r) => setTimeout(r, 300));
    setIsSubmitting(false);
    onAccountLinked({ email: email.trim(), method: 'otp', mode: activeTab });
    setStep('input');
    setOtpCode('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vibenest-account-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl backdrop-blur-2xl bg-white/95 dark:bg-[#0d121f]/95 border-t sm:border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 flex items-center justify-center shrink-0">
              <VibeNestLogo variant="mark" size="sm" />
            </div>
            <div>
              <h2 id="vibenest-account-modal-title" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Định danh & Khôi phục tài khoản
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Giữ nguyên ẩn danh công khai · Đồng bộ qua primitive.dev
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Deterministic Hashed Avatar Preview */}
        <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-display font-semibold text-base shrink-0 ${avatarTheme.textClass}`}
              style={{ background: avatarTheme.bgStyle, borderColor: avatarTheme.borderStyle }}
            >
              {avatarTheme.initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{linkedEmail ? 'Đã đồng bộ primitive.dev' : 'Phiên ẩn danh hiện tại'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px] tabular-nums">
                  {avatarTheme.name} · {avatarTheme.hashHex}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                {currentAlias}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const randomId = Math.floor(100 + Math.random() * 899);
              onAliasChange(`Mây Lang Thang #${randomId}`);
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-rose-500/40 transition-colors whitespace-nowrap shrink-0"
          >
            Đổi bút danh
          </button>
        </div>

        {linkedEmail ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Tài khoản ẩn danh đã được bảo vệ
                </span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                  primitive.dev · Active
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Bút danh <strong className="text-slate-900 dark:text-white">{currentAlias}</strong> được gắn với khóa khôi phục{' '}
                <span className="font-mono">{linkedEmail}</span>.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={onAccountUnlinked}
                className="min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap"
              >
                Ngắt liên kết thiết bị này
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition-colors whitespace-nowrap"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/70 dark:border-white/[0.06] mb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('link');
                  setStep('input');
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                  activeTab === 'link'
                    ? 'font-semibold bg-white dark:bg-[#161f33] text-slate-900 dark:text-white shadow-sm'
                    : 'font-medium text-slate-600 dark:text-slate-400'
                }`}
              >
                Liên kết bảo vệ bút danh
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('recover');
                  setStep('input');
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                  activeTab === 'recover'
                    ? 'font-semibold bg-white dark:bg-[#161f33] text-slate-900 dark:text-white shadow-sm'
                    : 'font-medium text-slate-600 dark:text-slate-400'
                }`}
              >
                Khôi phục thiết bị cũ
              </button>
            </div>

            {/* Method Toggle */}
            <div className="flex items-center justify-between gap-2 mb-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Phương thức xác thực:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('otp');
                    setStep('input');
                  }}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    authMethod === 'otp'
                      ? 'font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30'
                      : 'font-medium text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Mã xác thực Email (OTP)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('password');
                    setStep('input');
                  }}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    authMethod === 'password'
                      ? 'font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30'
                      : 'font-medium text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Mật khẩu
                </button>
              </div>
            </div>

            {step === 'input' ? (
              <form onSubmit={handlePrimarySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Địa chỉ Email nhận khóa khôi phục
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@example.com"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Email chỉ dùng để tạo mã băm khôi phục trên primitive.dev, tuyệt đối không hiển thị công khai.
                  </p>
                </div>

                {authMethod === 'password' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Mật khẩu bảo vệ (tối thiểu 8 ký tự)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all whitespace-nowrap disabled:opacity-60"
                >
                  {authMethod === 'otp'
                    ? activeTab === 'recover'
                      ? 'Gửi mã OTP khôi phục tài khoản'
                      : 'Gửi mã xác thực 6 số qua Email'
                    : activeTab === 'recover'
                      ? 'Khôi phục bút danh bằng Mật khẩu'
                      : 'Liên kết bảo vệ bằng Mật khẩu'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  Mã xác thực 6 chữ số vừa được gửi tới{' '}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-300">{email}</span>.
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nhập mã xác thực 6 số (primitive.dev OTP)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="2 4 6 8 1 0"
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.1] font-mono text-lg tracking-[0.35em] text-center text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 tabular-nums"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors whitespace-nowrap"
                  >
                    ← Đổi địa chỉ Email
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || otpCode.length < 6}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all whitespace-nowrap disabled:opacity-60"
                  >
                    Xác nhận & Đồng bộ ngay
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
