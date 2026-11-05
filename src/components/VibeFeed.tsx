"use client";

import type { VibePost } from "@/lib/vibe/types";
import { VibeCard } from "@/components/VibeCard";

type VibeFeedProps = {
  posts: VibePost[];
  busyId: string | null;
  onEmpathy: (post: VibePost) => void;
  onSave: (post: VibePost) => void;
  onReply: (post: VibePost, content: string) => Promise<void>;
};

export function VibeFeed({ posts, busyId, onEmpathy, onSave, onReply }: VibeFeedProps) {
  if (!posts.length) {
    return <div className="empty-state glass-panel"><span>✧</span><h2>Khoảng lặng cũng có ý nghĩa</h2><p>Chưa có lời tâm sự phù hợp. Bạn có thể là người đầu tiên mở lời.</p></div>;
  }
  return <div className="feed-list">{posts.map((post) => <VibeCard key={post.id} post={post} busy={busyId !== null} onEmpathy={onEmpathy} onSave={onSave} onReply={onReply} />)}</div>;
}