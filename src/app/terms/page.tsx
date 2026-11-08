import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Điều khoản Sử dụng (EULA) — VibeNest (omni.id.vn)',
  description:
    'Thỏa thuận cấp phép người dùng cuối (EULA) và tiêu chuẩn cộng đồng của mạng xã hội VibeNest theo chuẩn Apple App Store Guideline 1.2.',
};

export default function TermsOfServicePage() {
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
          <span className="text-[11px] font-mono text-slate-500">Package ID: vn.id.omni.app</span>
        </div>

        <article className="rounded-3xl bg-[#10121c] border border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6">
          <header className="border-b border-white/[0.07] pb-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold mb-3">
              Apple App Store Guideline 1.2 &amp; COPPA Compliant
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Điều khoản Dịch vụ &amp; Thỏa thuận Người dùng Cuối (EULA)
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Hiệu lực từ: 01/03/2025 • Áp dụng cho nền tảng web https://omni.id.vn và ứng dụng di động vn.id.omni.app
            </p>
          </header>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-300">
            <h2 className="text-base font-bold text-white">1. Giới hạn Độ tuổi &amp; Bảo vệ Trẻ em (COPPA)</h2>
            <p>
              VibeNest chỉ dành cho người dùng từ <strong>13 tuổi trở lên</strong>. Khi khởi tạo hồ sơ trên VibeNest,
              hệ thống xác thực ngày sinh tự động sẽ từ chối mọi yêu cầu đăng ký nếu người dùng chưa đủ 13 tuổi theo
              Đạo luật Bảo vệ Quyền riêng tư của Trẻ em trên Mạng (COPPA) và quy định an toàn của Apple App Store /
              Google Play.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-300">
            <h2 className="text-base font-bold text-white">
              2. Chính sách Không Khoan nhượng với Nội dung Độc hại (Apple Guideline 1.2)
            </h2>
            <p>
              VibeNest áp dụng chính sách <strong>Không khoan nhượng (Zero-Tolerance Policy)</strong> đối với mọi nội
              dung phản cảm, quấy rối, bắt nạt, kích động thù địch, bạo lực, khiêu dâm hoặc vi phạm pháp luật trên Bảng
              tin (Feed), Khoảnh khắc 24h (Vibe Stories), Tiệm ảnh Photobooth (VibeBooth) và Ghép đôi tần số (Soul
              Match).
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>Mọi nội dung văn bản và hình ảnh đều đi qua bộ lọc kiểm duyệt tự động trước khi hiển thị.</li>
              <li>
                Người dùng có quyền sử dụng nút <strong>Báo cáo (Report)</strong> và <strong>Chặn (Block)</strong> trực
                tiếp trên mọi thẻ bài đăng, phiên ghép đôi và trang cá nhân.
              </li>
              <li>
                Khi bạn chặn một người dùng, toàn bộ bài viết, khoảnh khắc 24h và phiên trò chuyện của người đó sẽ bị
                ẩn ngay lập tức khỏi bảng tin của bạn.
              </li>
              <li>
                Đội ngũ quản trị VibeNest cam kết xử lý mọi báo cáo vi phạm và gỡ bỏ nội dung độc hại kèm khóa tài
                khoản vi phạm trong vòng <strong>24 giờ</strong>.
              </li>
            </ul>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-300">
            <h2 className="text-base font-bold text-white">3. Quyền Sở hữu Nội dung &amp; Tiệm ảnh VibeBooth</h2>
            <p>
              Người dùng giữ toàn quyền sở hữu đối với hình ảnh đại diện, Khoảnh khắc 24h và dải ảnh 4 ô chụp tại
              VibeBooth Studio. Bằng việc đăng tải nội dung công khai lên VibeNest, bạn cấp cho VibeNest quyền hiển thị
              phi độc quyền trong phạm vi dịch vụ để phục vụ trải nghiệm kết nối cộng đồng. Khoảnh khắc 24h tự động hết
              hạn sau 24 giờ kể từ thời điểm đăng.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-300">
            <h2 className="text-base font-bold text-white">
              4. Quyền Tự Xóa Tài khoản Vĩnh viễn (Apple Guideline 5.1.1(v))
            </h2>
            <p>
              Người dùng có toàn quyền xóa vĩnh viễn tài khoản của mình bất kỳ lúc nào ngay trong ứng dụng tại mục{' '}
              <strong>Hồ sơ cá nhân &rarr; Cài đặt An toàn &rarr; Xóa tài khoản vĩnh viễn</strong>. Khi xác nhận xóa,
              hệ thống sẽ kích hoạt thủ tục RPC trên máy chủ Supabase để xóa sạch hồ sơ, bài viết, khoảnh khắc 24h, dải
              ảnh Photobooth và thông tin liên kết OAuth mà không yêu cầu liên hệ qua email hỗ trợ.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-300">
            <h2 className="text-base font-bold text-white">5. Liên hệ &amp; Hỗ trợ Pháp lý</h2>
            <p>
              Mọi thắc mắc hoặc báo cáo khẩn cấp về điều khoản sử dụng, vui lòng liên hệ trực tiếp qua cổng quản trị tại{' '}
              <a href="https://omni.id.vn" className="text-indigo-400 hover:underline">
                https://omni.id.vn
              </a>{' '}
              hoặc email: <span className="font-mono text-slate-200">trust-safety@omni.id.vn</span>.
            </p>
          </section>

          <footer className="pt-5 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>© 2025 VibeNest (omni.id.vn). All rights reserved.</span>
            <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Xem Chính sách Quyền riêng tư &rarr;
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
