"use client";

import { AuraDiscoveryRail } from "@/components/discovery/AuraDiscoveryRail";
import type { VibePostItem } from "@/components/feed/VibeFeedCard";

type Props = {
  displayName: string;
  vibeTag: string;
  posts: VibePostItem[];
  onOpenChat: (postId: string) => void;
};

export function VibeRadarScreen({ displayName, vibeTag, posts, onOpenChat }: Props) {
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
      <p className="experience-lead">Khám phá những tâm sự đang mở lời và chủ động bắt chuyện với người viết. Radar hiện không dùng vị trí chính xác hay ghép đôi ngẫu nhiên.</p>
      <div className="radar-user-chip"><span>{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>Tần số bạn chọn · {vibeTag}</small></div></div>
      <div className="radar-privacy-note"><strong>Riêng tư theo thiết kế</strong><p>Danh sách bên dưới lấy từ bài đăng thật đang hiển thị trên VibeNest. Không hiển thị khoảng cách, tọa độ hoặc trạng thái online nếu người dùng chưa chủ động chia sẻ.</p></div>
      {posts.length > 0 ? (
        <AuraDiscoveryRail posts={posts} onOpenChat={onOpenChat} />
      ) : (
        <div className="empty-state glass-panel"><h2>Chưa có tín hiệu phù hợp</h2><p>Khi có bài đăng mới, chúng sẽ xuất hiện ở đây để bạn tự chọn kết nối.</p></div>
      )}
      <p className="radar-preview-note">Vibe Radar hiện là khám phá nội dung thật. Ghép đôi theo hồ sơ, vị trí gần đúng và presence realtime sẽ chỉ mở sau khi có quyền riêng tư và backend matching riêng.</p>
    </section>
  );
}
