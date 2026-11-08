import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <span aria-hidden="true">✦</span>
      <p className="hybrid-eyebrow">VIBENEST · OFFLINE</p>
      <h1>Bạn đang mất kết nối</h1>
      <p>Những câu chuyện sẽ ở đây khi mạng trở lại. Dữ liệu riêng tư và phiên đăng nhập không được lưu vào bộ nhớ offline.</p>
      <Link href="/">Thử kết nối lại</Link>
    </main>
  );
}
