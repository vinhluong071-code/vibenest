"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAvatarThemeFromAlias } from "@/lib/avatar-hash";
import { VibeNestLogo } from "@/components/brand/VibeNestLogo";

export interface AccountLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAlias: string;
  onAliasChange: (newAlias: string) => void;
  linkedEmail?: string;
  onAccountLinked: (payload: { email: string; method: "otp" | "password"; mode: "link" | "recover" }) => void;
  onAccountUnlinked: () => void;
}

type AccountMode = "link" | "recover";
type AuthMethod = "otp" | "password";
type ModalStep = "input" | "otp-verify";

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Không thể hoàn tất xác thực.";
  const lower = message.toLowerCase();
  if (lower.includes("manual") || lower.includes("identity") || lower.includes("linking")) {
    return "Supabase từ chối liên kết danh tính. Hãy kiểm tra Authentication → Sign In / Providers và bảo đảm email chưa thuộc tài khoản khác.";
  }
  if (lower.includes("already") && lower.includes("registered")) {
    return "Email này đã thuộc một tài khoản. Hãy chuyển sang mục Khôi phục thiết bị cũ để đăng nhập tài khoản đó.";
  }
  return message;
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
  const [activeTab, setActiveTab] = useState<AccountMode>("link");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("otp");
  const [step, setStep] = useState<ModalStep>("input");
  const [emailDraft, setEmailDraft] = useState({
    linkedEmail: linkedEmail ?? null,
    isOpen,
    value: linkedEmail ?? "",
  });
  const email = emailDraft.linkedEmail === (linkedEmail ?? null) && emailDraft.isOpen === isOpen
    ? emailDraft.value
    : linkedEmail ?? "";
  const setEmail = (value: string) => setEmailDraft({
    linkedEmail: linkedEmail ?? null,
    isOpen,
    value,
  });
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  if (!isOpen) return null;

  const avatarTheme = getAvatarThemeFromAlias(currentAlias);

  function changeMode(mode: AccountMode) {
    setActiveTab(mode);
    setStep("input");
    setOtpCode("");
    setPassword("");
    setStatus("");
  }

  async function handlePrimarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setIsSubmitting(true);
    setStatus("");
    try {
      const supabase = createClient();

      if (activeTab === "link") {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("Phiên đăng nhập chưa sẵn sàng. Vui lòng tải lại trang.");
        if (!user.is_anonymous) {
          if (user.email?.toLowerCase() === normalizedEmail && user.email_confirmed_at) {
            if (authMethod === "password") {
              if (password.length < 8) throw new Error("Mật khẩu cần có ít nhất 8 ký tự.");
              const { error } = await supabase.auth.updateUser({ password });
              if (error) throw error;
              onAccountLinked({ email: normalizedEmail, method: "password", mode: "link" });
              setStatus("Mật khẩu đã được cập nhật cho tài khoản hiện tại.");
              return;
            }
            throw new Error("Email này đã được xác minh. Tài khoản đã được liên kết.");
          }
          throw new Error("Phiên hiện tại không còn là phiên ẩn danh. Hãy đăng xuất hoặc dùng mục khôi phục.");
        }

        if (authMethod === "password" && password.length < 8) {
          throw new Error("Mật khẩu cần có ít nhất 8 ký tự.");
        }

        const { error } = await supabase.auth.updateUser(
          { email: normalizedEmail },
          { emailRedirectTo: `${window.location.origin}/auth/callback` },
        );
        if (error) throw error;
        setStep("otp-verify");
        setStatus("Supabase đã gửi mã xác minh tới email. Nhập mã 6 chữ số để hoàn tất liên kết; không cần tạo tài khoản mới.");
        return;
      }

      if (authMethod === "password") {
        if (!password) throw new Error("Hãy nhập mật khẩu tài khoản.");
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        onAccountLinked({ email: normalizedEmail, method: "password", mode: "recover" });
        setStatus("Đăng nhập và khôi phục phiên tài khoản thành công.");
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setStep("otp-verify");
      setStatus("Nếu email đã được xác minh và liên kết với VibeNest, mã đăng nhập sẽ được gửi tới hộp thư.");
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const token = otpCode.replace(/\D/g, "");
    if (token.length !== 6) return;

    setIsSubmitting(true);
    setStatus("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token,
        type: activeTab === "link" ? "email_change" : "email",
      });
      if (error) throw error;

      if (activeTab === "link") {
        if (authMethod === "password") {
          if (password.length < 8) throw new Error("Email đã xác minh. Hãy nhập mật khẩu có ít nhất 8 ký tự rồi gửi lại.");
          const { error: passwordError } = await supabase.auth.updateUser({ password });
          if (passwordError) throw passwordError;
        }
        onAccountLinked({ email: normalizedEmail, method: authMethod, mode: "link" });
        setStatus("Đã xác minh email và liên kết với phiên hiện tại. UID hiện tại được giữ nguyên.");
      } else {
        onAccountLinked({ email: normalizedEmail, method: "otp", mode: "recover" });
        setStatus("Đăng nhập OTP thành công. Tài khoản cũ đã được khôi phục trên thiết bị này.");
      }
      setStep("input");
      setOtpCode("");
      setPassword("");
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vibenest-account-modal-title"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-slate-200/80 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d121f]/95 sm:rounded-3xl sm:border sm:p-6">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20 sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-white/[0.05]">
              <VibeNestLogo size="sm" variant="mark" />
            </div>
            <div>
              <h2 id="vibenest-account-modal-title" className="font-display text-lg font-semibold text-slate-900 dark:text-white">Định danh & Khôi phục tài khoản</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Giữ nguyên bút danh · Xác thực qua Supabase Auth</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng cửa sổ" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]">✕</button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border font-display text-base font-semibold ${avatarTheme.textClass}`} style={{ background: avatarTheme.bgStyle, borderColor: avatarTheme.borderStyle }}>{avatarTheme.initial}</div>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{linkedEmail ? "Email đã liên kết" : "Phiên ẩn danh hiện tại"} · <span className="font-mono">{avatarTheme.name} · {avatarTheme.hashHex}</span></p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">{currentAlias || "Ẩn danh"}</p>
            </div>
          </div>
          <button type="button" onClick={() => onAliasChange(`Mây Lang Thang #${Math.floor(100 + Math.random() * 900)}`)} className="min-h-10 shrink-0 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">Đổi bút danh</button>
        </div>

        {linkedEmail ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs">
              <strong className="text-emerald-700 dark:text-emerald-300">Email khôi phục đã xác minh</strong>
              <p className="mt-1 text-slate-600 dark:text-slate-300">Bút danh <strong>{currentAlias}</strong> đang dùng email <span className="font-mono">{linkedEmail}</span>.</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={onAccountUnlinked} className="min-h-11 rounded-xl px-3 text-xs font-medium text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">Ngắt liên kết thiết bị này</button>
              <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">Hoàn tất</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200/70 bg-slate-100 p-1 dark:border-white/[0.06] dark:bg-white/[0.05]">
              <button type="button" onClick={() => changeMode("link")} className={`min-h-10 rounded-lg px-3 text-xs ${activeTab === "link" ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-[#161f33] dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>Liên kết bút danh</button>
              <button type="button" onClick={() => changeMode("recover")} className={`min-h-10 rounded-lg px-3 text-xs ${activeTab === "recover" ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-[#161f33] dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>Khôi phục thiết bị cũ</button>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Phương thức xác thực:</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setAuthMethod("otp"); setStep("input"); setStatus(""); }} className={`min-h-9 rounded-lg px-2.5 ${authMethod === "otp" ? "border border-rose-500/30 bg-rose-500/10 font-semibold text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"}`}>Email OTP</button>
                <button type="button" onClick={() => { setAuthMethod("password"); setStep("input"); setStatus(""); }} className={`min-h-9 rounded-lg px-2.5 ${authMethod === "password" ? "border border-rose-500/30 bg-rose-500/10 font-semibold text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"}`}>Mật khẩu</button>
              </div>
            </div>

            {step === "input" ? (
              <form onSubmit={handlePrimarySubmit} className="space-y-4">
                <div>
                  <label htmlFor="vibenest-link-email" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Địa chỉ Email</label>
                  <input id="vibenest-link-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-slate-100/90 px-3.5 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-100" />
                </div>
                {authMethod === "password" && (
                  <div>
                    <label htmlFor="vibenest-link-password" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{activeTab === "link" ? "Mật khẩu mới (ít nhất 8 ký tự)" : "Mật khẩu tài khoản"}</label>
                    <input id="vibenest-link-password" type="password" autoComplete={activeTab === "link" ? "new-password" : "current-password"} required minLength={activeTab === "link" ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-slate-100/90 px-3.5 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-100" />
                  </div>
                )}
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{activeTab === "link" ? "Liên kết được thực hiện trên phiên ẩn danh đang mở. Không tạo user mới; UID và dữ liệu hiện tại được giữ nguyên." : "Đăng nhập sẽ thay phiên hiện tại bằng tài khoản đã liên kết với email này."}</p>
                {status && <p className="rounded-xl bg-indigo-500/10 p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-200" role="status" aria-live="polite">{status}</p>}
                <button type="submit" disabled={isSubmitting} className="min-h-11 w-full rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 disabled:opacity-60">{isSubmitting ? "Đang xử lý…" : activeTab === "recover" && authMethod === "password" ? "Đăng nhập bằng mật khẩu" : activeTab === "recover" ? "Gửi mã OTP khôi phục" : "Gửi mã xác minh Email"}</button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-200">Mã xác minh được gửi tới <strong className="text-indigo-600 dark:text-indigo-300">{email}</strong>. {status}</div>
                <div>
                  <label htmlFor="vibenest-otp" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Mã OTP 6 chữ số</label>
                  <input id="vibenest-otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="246810" className="min-h-12 w-full rounded-xl border border-slate-200/80 bg-slate-100/90 px-4 py-2.5 text-center font-mono text-lg tracking-[0.35em] tabular-nums text-slate-900 focus:border-rose-500 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-white" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => { setStep("input"); setStatus(""); }} className="min-h-11 rounded-xl px-3 text-xs font-medium text-slate-600 dark:text-slate-400">← Đổi email</button>
                  <button type="submit" disabled={isSubmitting || otpCode.length !== 6} className="min-h-11 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{isSubmitting ? "Đang xác minh…" : "Xác nhận & đồng bộ"}</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
