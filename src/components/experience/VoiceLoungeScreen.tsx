"use client";

export function VoiceLoungeScreen() {
  return (
    <section className="experience-screen voice-lounge-screen" aria-labelledby="voice-lounge-title">
      <div className="experience-kicker">VIBENEST · LIVE AUDIO</div>
      <div className="voice-orb" aria-hidden="true"><span>♫</span><i /><i /><i /></div>
      <h1 id="voice-lounge-title">Voice Lounge</h1>
      <p className="experience-lead">Một căn phòng nhỏ để lắng nghe nhau bằng giọng nói — nhẹ nhàng, tự nguyện và có kiểm soát.</p>
      <div className="voice-lounge-status"><span className="status-dot" /> Đang chuẩn bị hạ tầng âm thanh</div>
      <div className="voice-feature-grid">
        <article><span>◉</span><strong>Phòng theo chủ đề</strong><p>Chữa lành, âm nhạc, tâm sự đêm muộn.</p></article>
        <article><span>♧</span><strong>Quyền riêng tư</strong><p>Kiểm soát micro, rời phòng và chặn người dùng.</p></article>
        <article><span>⌁</span><strong>Âm thanh realtime</strong><p>Chỉ mở khi kết nối WebRTC và kiểm duyệt đã sẵn sàng.</p></article>
      </div>
      <div className="experience-notice">
        <strong>Chưa mở phòng trực tiếp</strong>
        <p>Voice Lounge hiện là giao diện chuẩn bị. Chưa có phòng giả, người nghe giả hoặc cuộc gọi được mô phỏng là thật.</p>
      </div>
    </section>
  );
}
