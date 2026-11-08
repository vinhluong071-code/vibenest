"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Provider } from "@supabase/supabase-js";

type Props = { open: boolean; onClose: () => void; intent?: string; onDemoContinue: () => void };
const PROVIDERS: { id: Provider; label: string; mark: string }[] = [
  { id: "apple", label: "Tiếp tục với Apple", mark: "●" },
  { id: "google", label: "Tiếp tục với Google", mark: "G" },
];

export function LitmatchThirdPartyAuthModal({ open, onClose, intent = "tiếp tục", onDemoContinue }: Props) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  if (!open) return null;

  async function connect(provider: Provider) {
    setPending(provider);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const redirectTo = window.location.origin + "/auth/callback?next=%2F";
      const result = user?.is_anonymous
        ? await supabase.auth.linkIdentity({ provider, options: { redirectTo } })
        : await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (result.error) throw result.error;
      if (result.data.url) window.location.assign(result.data.url);
      else throw new Error("Nhà cung cấp chưa trả về URL xác thực.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "OAuth chưa được cấu hình. Bạn vẫn có thể tạo hồ sơ bằng phiên khách.");
      setPending(null);
    }
  }

  return (
    <div className="vn-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="vn-auth-title">
      <section className="vn-auth-modal">
        <button type="button" className="vn-modal-close" onClick={onClose} aria-label="Đóng">×</button>
        <span className="vn-brand-mark vn-auth-mark">V</span>
        <small>YOUR VIBE, YOUR PEOPLE</small>
        <h2 id="vn-auth-title">Một chạm để {intent}</h2>
        <p>Liên kết Apple hoặc Google để giữ tài khoản trên nhiều thiết bị. Nếu OAuth chưa được cấu hình, bạn vẫn có thể tạo hồ sơ trên thiết bị này.</p>
        <div className="vn-oauth-row">
          {PROVIDERS.map((provider) => (
            <button type="button" key={provider.id} className="vn-oauth-primary" disabled={pending !== null} onClick={() => void connect(provider.id)}>
              <b>{provider.mark}</b>{pending === provider.id ? "Đang kết nối…" : provider.label}
            </button>
          ))}
        </div>
        {error && <p className="vn-error" role="alert">{error}</p>}
        <div className="vn-auth-divider"><span>hoặc</span></div>
        <button type="button" className="vn-oauth-secondary" disabled={pending !== null} onClick={onDemoContinue}>Tiếp tục bằng phiên khách · Tạo hồ sơ</button>
        <p className="vn-auth-legal">Hồ sơ khách được lưu trên Supabase nếu kết nối khả dụng và trên thiết bị này. Liên kết OAuth có thể thực hiện sau. Đọc <Link href="/terms">Điều khoản</Link> và <Link href="/privacy">Quyền riêng tư</Link>.</p>
      </section>
    </div>
  );
}
