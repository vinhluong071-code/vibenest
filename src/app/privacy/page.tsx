import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Chính sách Quyền riêng tư (Privacy Policy) — VibeNest (omni.id.vn)',
  description:
    'Chính sách bảo mật dữ liệu cá nhân, quyền truy cập Camera/Micro WebRTC và cơ chế xóa dữ liệu vĩnh viễn theo chuẩn Apple App Store Guideline 5.1.1.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#07080d] text-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-xs font-semibold text-slate-300 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Quay lại VibeNest
          </Link>
          <span className="text-[11px] font-mono text-slate-500">Supabase Instance: vbuvkkheggkewnrpurqe</span>
        </div>

        <article className="rounded-3xl bg-[#10121c] border border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6">
          <header className="border-b border-white/[0.07] pb-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold mb-3">
              Apple Guideline 4.8 &amp; 5.1.1(v) Data Privacy
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Chính sách Quyền riêng tư &amp; Bảo vệ Dữ liệu Cá nhân
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Cập nhật lần cuối: 01/03/2025 • Áp dụng cho Web App https://omni.id.vn &amp; iOS/Android Capacitor App (vn.id.omni.app)
            </p>
          </header>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-300">
            <h2 className="text-base font-bold text-white">
              1. Phương thức Xác thực Không Mật khẩu (Apple Guideline 4.8)
            </h2>
            <p>
              VibeNest không thu thập mật khẩu văn bản thuần, không yêu cầu số điện thoại cá nhân và không gửi mã SMS
              OTP. Toàn bộ quá trình đăng nhập được thực hiện thông qua giao thức OAuth 2.0 PKCE an toàn với các nhà
              cung cấp định danh uy tín bao gồm <strong>Sign in with Apple</strong> (hỗ trợ ẩn địa chỉ email thật của
              bạn), <strong>Google</strong>, <strong>Discord</strong> và <strong>TikTok</strong>.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-300">
            <h2 className="text-base font-bold text-white">2. Dữ liệu Chúng tôi Thu thập &amp; Mục đích Sử dụng</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>
                <strong>Thông tin Hồ sơ:</strong> Tên hiển thị, định danh <code>@handle</code>, ảnh đại diện (Avatar)
                và ngày sinh (chỉ dùng để tính tuổi xác minh điều kiện &ge; 13 tuổi theo COPPA và hiển thị huy hiệu
                Cung hoàng đạo).
              </li>
              <li>
                <strong>Quyền truy cập Camera (WebRTC):</strong> Chỉ được kích hoạt khi có thao tác chạm trực tiếp của
                bạn (User Gesture) để chụp ảnh đại diện hoặc chụp dải ảnh 4 ô tại <em>VibeBooth Studio</em>. Luồng
                video được xử lý trực tiếp trên HTML5 Canvas tại thiết bị của bạn và chỉ lưu trữ khi bạn chủ động bấm
                lưu.
              </li>
              <li>
                <strong>Quyền truy cập Micro (Web Speech API):</strong> Chỉ kích hoạt khi bạn bấm nút nhập liệu giọng
                nói trong khung đăng tâm sự (Inline Composer) để chuyển giọng nói tiếng Việt thành văn bản. VibeNest
                không ghi âm nền dưới mọi hình thức.
              </li>
            </ul>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-300">
            <h2 className="text-base font-bold text-white">3. Lưu trữ &amp; Bảo mật Hạ tầng</h2>
            <p>
              Dữ liệu được mã hóa TLS 1.3 khi truyền tải và AES-256 khi lưu trữ trên cụm cơ sở dữ liệu đám mây Supabase
              (<code>https://vbuvkkheggkewnrpurqe.supabase.co</code>) với chính sách Row Level Security (RLS) nghiêm
              ngặt. Khoảnh khắc 24h (Vibe Stories) được tự động thu hồi sau chu kỳ 24 giờ.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-300">
            <h2 className="text-base font-bold text-white">
              4. Quyền Xóa Dữ liệu Vĩnh viễn Tức thì (Apple Guideline 5.1.1(v))
            </h2>
            <p>
              Bạn có quyền yêu cầu xóa toàn bộ dữ liệu cá nhân ngay lập tức mà không cần chờ đợi xét duyệt thủ công:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
              <li>Mở trang cá nhân <strong>SnapProfileView</strong> trên ứng dụng VibeNest.</li>
              <li>Cuộn xuống mục <strong>Cài đặt An toàn &amp; Quyền riêng tư</strong>.</li>
              <li>
                Chọn nút <strong>&ldquo;Xóa tài khoản vĩnh viễn&rdquo;</strong> và nhập từ khóa xác nhận{' '}
                <code>XOA TAI KHOAN</code>.
              </li>
              <li>
                Hệ thống sẽ gọi trực tiếp hàm RPC <code>delete_user_account_permanently</code> trên Supabase để hủy
                vĩnh viễn tài khoản Auth, hồ sơ, bài đăng, dải ảnh VibeBooth và giải phóng phiên đăng nhập ngay lập
                tức.
              </li>
            </ol>
          </section>

          <footer className="pt-5 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>Liên hệ DPO: privacy@omni.id.vn</span>
            <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              &larr; Xem Điều khoản Sử dụng (EULA)
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
