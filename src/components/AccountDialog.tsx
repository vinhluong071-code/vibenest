"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type AccountDialogProps = { open: boolean; onClose: () => void };

export function AccountDialog({ open, onClose }: AccountDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoreAcknowledged, setRestoreAcknowledged] = useState(false);
  const [mode, setMode] = useState<"link" | "restore">("link");
  const [emailOnReplies, setEmailOnReplies] = useState(false);
  const [emailOnMessages, setEmailOnMessages] = useState(false);
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  const [isLinked, setIsLinked] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      setEmail(user.email ?? "");
      setIsLinked(Boolean(user.email && user.email_confirmed_at) && !user.is_anonymous);
      const { data } = await supabase.from("vibenest_email_preferences")
        .select("email_on_replies,email_on_messages").eq("user_id", user.id).maybeSingle();
      if (active && data) {
        setEmailOnReplies(Boolean(data.email_on_replies));
        setEmailOnMessages(Boolean(data.email_on_messages));
      }
    })();
    return () => { active = false; };
  }, [open]);

  if (!open) return null;

  async function linkEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setBusy(true);
    setStatus("");
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Phiên đăng nhập chưa sẵn sàng. Hãy tải lại trang.");

      if (user.email && user.email_confirmed_at && !user.is_anonymous) {
        if (user.email.toLowerCase() !== normalizedEmail) {
          throw new Error("Email này khác Email đang liên kết. Hãy dùng mục Đăng nhập / Khôi phục để chuyển tài khoản.");
        }
        if (password.length < 8) throw new Error("Nhập mật khẩu mới có ít nhất 8 ký tự để bật đăng nhập bằng mật khẩu.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
        setStatus("Mật khẩu đăng nhập đã được cập nhật cho tài khoản hiện tại.");
        return;
      }

      if (!user.is_anonymous) throw new Error("Phiên này đã có danh tính Email. Hãy đăng nhập lại bằng tài khoản đó.");
      const { error } = await supabase.auth.updateUser(
        { email: normalizedEmail },
        { emailRedirectTo: `${window.location.origin}/auth/callback` },
      );
      if (error) throw error;
      setStatus("Đã gửi email xác nhận. Hãy mở hộp thư và xác nhận. Sau khi xác minh, quay lại đây để đặt mật khẩu. UID và dữ liệu hiện tại được giữ nguyên.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể liên kết Email.";
      setStatus(message.toLowerCase().includes("manual") || message.toLowerCase().includes("linking")
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
      const supabase = createClient();
      if (password) {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        setStatus("Đăng nhập thành công. Đang khôi phục phiên tài khoản…");
        setPassword("");
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setStatus("Nếu Email đã được xác minh và liên kết với VibeNest, chúng tôi đã gửi liên kết đăng nhập.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể đăng nhập hoặc gửi liên kết khôi phục.");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    setBusy(true);
    setStatus("");
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Phiên đăng nhập chưa sẵn sàng.");
      const redirectTo = `${window.location.origin}/auth/callback`;
      const result = user.is_anonymous
        ? await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } })
        : await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (result.error) throw result.error;
      if (!result.data.url) throw new Error("Không nhận được địa chỉ chuyển tiếp Google OAuth.");
      window.location.assign(result.data.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể kết nối Google.";
      setStatus(message.toLowerCase().includes("identity") || message.toLowerCase().includes("manual")
        ? "Không thể liên kết danh tính Google này. Có thể Google đã thuộc một tài khoản khác; hãy đăng nhập tài khoản đó để tránh tạo bản ghi trùng."
        : message);
      setBusy(false);
    }
  }

  async function saveEmailPreferences() {
    setPreferencesBusy(true);
    setStatus("");
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user || user.is_anonymous || !user.email_confirmed_at) {
        throw new Error("Hãy liên kết và xác minh Email trước khi bật thông báo qua thư.");
      }
      const { error } = await supabase.from("vibenest_email_preferences").upsert({
        user_id: user.id,
        email_on_replies: emailOnReplies,
        email_on_messages: emailOnMessages,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      setIsLinked(true);
      setStatus("Đã lưu tùy chọn email thông báo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể lưu tùy chọn email.");
    } finally {
      setPreferencesBusy(false);
    }
  }

  return (
    <div className="center-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="account-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <header className="center-header">
          <div><p className="eyebrow">VIBENEST ACCOUNT</p><h2 id="account-dialog-title">Giữ lại những câu chuyện của bạn</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng">×</button>
        </header>
        <p className="center-subtitle">Bắt đầu ẩn danh, nâng cấp bất cứ lúc nào. Khi liên kết trực tiếp phiên hiện tại, UID và dữ liệu của bạn không đổi.</p>
        <div className="center-tabs" role="tablist" aria-label="Tùy chọn tài khoản">
          <button className={mode === "link" ? "selected" : ""} onClick={() => { setMode("link"); setStatus(""); }}>Liên kết tài khoản</button>
          <button className={mode === "restore" ? "selected" : ""} onClick={() => { setMode("restore"); setStatus(""); }}>Đăng nhập / Khôi phục</button>
        </div>
        <form className="account-form" onSubmit={mode === "link" ? linkEmail : restoreAccount}>
          <label htmlFor="vibenest-account-email">Địa chỉ Email</label>
          <input id="vibenest-account-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" />
          <label htmlFor="vibenest-account-password">{mode === "link" ? "Mật khẩu (ít nhất 8 ký tự)" : "Mật khẩu (để trống để nhận magic link)"}</label>
          <input id="vibenest-account-password" type="password" autoComplete={mode === "link" ? "new-password" : "current-password"} minLength={mode === "link" ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "link" ? "Tạo mật khẩu sau khi xác minh Email" : "Nhập mật khẩu hoặc để trống"} />
          {mode === "link" ? (
            <p className="account-hint">{isLinked ? "Email đã xác minh. Nhập mật khẩu mới để bật đăng nhập Email/mật khẩu." : "Chúng tôi sẽ gửi thư xác minh trước. Sau khi xác minh, mở lại cửa sổ này để đặt mật khẩu."}</p>
          ) : (
            <label className="account-consent"><input type="checkbox" checked={restoreAcknowledged} onChange={(event) => setRestoreAcknowledged(event.target.checked)} /> Tôi hiểu thao tác đăng nhập sẽ thay phiên hiện tại bằng tài khoản đã liên kết.</label>
          )}
          {status && <p className="account-status" role="status" aria-live="polite">{status}</p>}
          <button className="primary-button account-submit" type="submit" disabled={busy || (mode === "restore" && !restoreAcknowledged)}>
            {busy ? "Đang xử lý…" : mode === "link" ? (isLinked ? "Lưu mật khẩu" : "Gửi email xác minh") : (password ? "Đăng nhập bằng mật khẩu" : "Gửi magic link")}
          </button>
        </form>
        <button className="oauth-button" type="button" disabled={busy} onClick={() => void continueWithGoogle()}>
          <span aria-hidden="true">G</span> Tiếp tục với Google
        </button>
        <div className="email-preferences">
          <div><strong>Thông báo qua Email</strong><small>Chỉ gửi tới Email đã xác minh; bạn có thể tắt bất cứ lúc nào.</small></div>
          <label><input type="checkbox" checked={emailOnReplies} onChange={(event) => setEmailOnReplies(event.target.checked)} /> Khi có lời hồi âm</label>
          <label><input type="checkbox" checked={emailOnMessages} onChange={(event) => setEmailOnMessages(event.target.checked)} /> Khi có tin nhắn mới</label>
          <button className="secondary-button" type="button" disabled={preferencesBusy} onClick={() => void saveEmailPreferences()}>{preferencesBusy ? "Đang lưu…" : "Lưu tùy chọn Email"}</button>
        </div>
        <p className="privacy-note">Email của bạn không hiển thị với cộng đồng. Không chia sẻ mật khẩu hoặc mã xác minh với bất kỳ ai.</p>
      </section>
    </div>
  );
}
