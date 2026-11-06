"use client";

import type { VibePostItem } from "@/components/feed/VibeFeedCard";

type Props = {
  posts: VibePostItem[];
  onOpenChat: (postId: string) => void;
};

export function AuraDiscoveryRail({ posts, onOpenChat }: Props) {
  if (posts.length === 0) return null;

  return (
    <section className="aura-rail" aria-labelledby="aura-rail-title">
      <div className="aura-rail-heading">
        <div>
          <p className="hybrid-eyebrow">KẾT NỐI CÙNG TẦN SỐ</p>
          <h2 id="aura-rail-title">Aura cards <span>✦</span></h2>
          <p>Những tâm sự đang mở lời — bắt đầu bằng sự đồng cảm.</p>
        </div>
        <span className="aura-live-label"><i /> Từ bảng tin</span>
      </div>
      <div className="aura-card-track">
        {posts.map((post, index) => (
          <article className="aura-card" key={post.id}>
            <div className="aura-card-top">
              <span className="aura-orbit" aria-hidden="true">{post.displayName.slice(0, 1).toUpperCase()}</span>
              <span className="aura-index">AURA 0{index + 1}</span>
              <span className="aura-mood">{post.mood}</span>
            </div>
            <strong className="aura-name">{post.displayName}</strong>
            <span className="aura-handle">@{post.handle} · {post.timeAgo}</span>
            <p className="aura-excerpt">{post.content}</p>
            <div className="aura-card-footer">
              <span>✧ {post.vibeTag || post.mood}</span>
              <button type="button" onClick={() => onOpenChat(post.id)}>Bắt chuyện <span aria-hidden="true">↗</span></button>
            </div>
          </article>
        ))}
      </div>
      <p className="aura-disclaimer">Gợi ý được lấy từ bài đăng thật đang hiển thị; không suy đoán khoảng cách hoặc vị trí người dùng.</p>
    </section>
  );
}
