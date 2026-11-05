"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { signInAnonymously } from "@/lib/supabase/anonymous-auth";

type AccountDialogProps = { open: boolean; onClose: () => void };

export function AccountDialog({ open, onClose }: AccountDialogProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoreAcknowledged, setRestoreAcknowledged] = useState(false);
  const [mode, setMode] = useState<"link" | "restore">("link");

  if (!open) return null;

  async function linkEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setBusy(true);
    setStatus("");
    try {
      const supabase = createClient();
      let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        const session = await signInAnonymously();
        if (!session) throw new Error("Chưa thể khởi tạo danh tính ẩn danh.");
        sessionData = { session };
      }
      if (!sessionData.session.user.is_anonymous) {
        throw new Error("Tài khoản này đã được liên kết. Hãy dùng chức năng khôi phục nếu bạn muốn chuyển sang tài khoản khác.");
      }
      const { error } = await supabase.auth.updateUser(
        { email: normalizedEmail },
        { emailRedirectTo: `${window.location.origin}/auth/callback` },
      );
      if (error) throw error;
      setStatus("Đã gửi email xác nhận. Hãy mở hộp thư và xác nhận để liên kết Email với danh tính hiện tại. Lịch sử và UID được giữ nguyên.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể liên kết Email.";
      setStatus(message.includes("manual") || message.includes("linking")
        ? "Supabase chưa bật Allow manual linking. Hãy bật trong Authentication → Sign In / Providers rồi thử lại."
        : message);
    } finally {
      setBusy(false);
    }
  }

  async function restoreAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !restoreAcknowledged) return;
    setBusy(true);
    setStatus("");
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setStatus("Nếu Email đã được xác minh và liên kết với VibeNest, chúng tôi đã gửi liên kết đăng nhập. Hãy mở email trên thiết bị muốn khôi phục.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể gửi liên kết đăng nhập.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="account-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <header className="center-header">
          <div><p className="eyebrow">VIBENEST ACCOUNT</p><h2 id="account-dialog-title">Giữ lại những câu chuyện của bạn</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng">×</button>
        </header>
        <p className="center-subtitle">Bạn vẫn có thể vào VibeNest ẩn danh. Liên kết Email chỉ cần khi muốn mang danh tính và lịch sử trò chuyện sang thiết bị khác.</p>
        <div className="center-tabs" role="tablist" aria-label="Tùy chọn tài khoản">
          <button className={mode === "link" ? "selected" : ""} onClick={() => { setMode("link"); setStatus(""); }}>Liên kết tài khoản</button>
          <button className={mode === "restore" ? "selected" : ""} onClick={() => { setMode("restore"); setStatus(""); }}>Đăng nhập / Khôi phục</button>
        </div>
        <form className="account-form" onSubmit={mode === "link" ? linkEmail : restoreAccount}>
          <label htmlFor="vibenest-account-email">Địa chỉ Email</label>
          <input id="vibenest-account-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" />
          {mode === "link" ? (
            <p className="account-hint">Liên kết Email với phiên ẩn danh hiện tại. Supabase giữ nguyên user ID nên bài viết, cuộc trò chuyện và thông báo không bị chuyển sang tài khoản mới.</p>
          ) : (
            <>
              <p className="account-warning">Đăng nhập sẽ chuyển phiên hiện tại sang tài khoản Email. Dữ liệu của một phiên ẩn danh khác trên thiết bị này không tự động được gộp vào tài khoản đó.</p>
              <label className="account-consent"><input type="checkbox" checked={restoreAcknowledged} onChange={(event) => setRestoreAcknowledged(event.target.checked)} /> Tôi hiểu và muốn tiếp tục khôi phục tài khoản Email.</label>
            </>
          )}
          {status && <p className="account-status" role="status" aria-live="polite">{status}</p>}
          <button className="primary-button account-submit" type="submit" disabled={busy || (mode === "restore" && !restoreAcknowledged)}>
            {busy ? "Đang xử lý…" : mode === "link" ? "Gửi email liên kết" : "Gửi liên kết đăng nhập"}
          </button>
        </form>
        <p className="privacy-note">VibeNest không hiển thị Email của bạn cho cộng đồng. Không chia sẻ mã xác minh với bất kỳ ai.</p>
      </section>
    </div>
  );
}
