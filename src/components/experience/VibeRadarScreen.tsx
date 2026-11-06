"use client";

type Props = {
  displayName: string;
  vibeTag: string;
  onStart: () => void;
};

export function VibeRadarScreen({ displayName, vibeTag, onStart }: Props) {
  return (
    <section className="experience-screen radar-screen" aria-labelledby="radar-screen-title">
      <div className="experience-kicker">DISCOVER YOUR FREQUENCY</div>
      <div className="radar-visual" aria-hidden="true">
        <span className="radar-ring radar-ring-a" />
        <span className="radar-ring radar-ring-b" />
        <span className="radar-ring radar-ring-c" />
        <span className="radar-center">✦</span>
      </div>
      <h1 id="radar-screen-title">Vibe Radar</h1>
      <p className="experience-lead">Khám phá những người có cùng tần số cảm xúc. Bạn luôn kiểm soát thông tin vị trí và quyền kết nối.</p>
      <div className="radar-user-chip"><span>{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>Tần số hiện tại · {vibeTag}</small></div></div>
      <div className="radar-privacy-note"><strong>Riêng tư theo thiết kế</strong><p>Không chia sẻ vị trí chính xác. Chỉ sử dụng khu vực gần đúng khi bạn chủ động cấp quyền và tính năng ghép nối thật đã được kết nối.</p></div>
      <button type="button" className="radar-launch-button" onClick={onStart}>Mở giao diện Radar <span>↗</span></button>
      <p className="radar-preview-note">Bản tương tác hiện tại là preview UI với dữ liệu minh họa, chưa ghép nối người dùng thật.</p>
    </section>
  );
}
