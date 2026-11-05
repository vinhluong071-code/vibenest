"use client";

import { useState, type FormEvent } from "react";
import type { VibePost } from "@/lib/vibe/types";

type VibeCardProps = {
  post: VibePost;
  busy: boolean;
  onEmpathy: (post: VibePost) => void;
  onSave: (post: VibePost) => void;
  onReply: (post: VibePost, content: string) => Promise<void>;
};

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return minutes + " phút trước";
  if (minutes < 1440) return Math.floor(minutes / 60) + " giờ trước";
  return Math.floor(minutes / 1440) + " ngày trước";
}

export function VibeCard({ post, busy, onEmpathy, onSave, onReply }: VibeCardProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = reply.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onReply(post, value);
      setReply("");
      setShowReplies(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="vibe-card glass-panel">
      <div className="vibe-card-top">
        <div className="avatar">{post.alias.slice(0, 1)}</div>
        <div className="vibe-author">
          <strong>{post.alias}</strong>
          <span>{timeAgo(post.created_at)}{post.location ? " · " + post.location : ""}</span>
        </div>
        <span className="mood-pill">{post.mood}</span>
      </div>
      <p className="vibe-copy">{post.content}</p>
      <div className="vibe-actions">
        <button className={post.empathized ? "vibe-action is-active" : "vibe-action"} onClick={() => onEmpathy(post)} disabled={busy}>
          <span aria-hidden="true">♡</span> Đồng cảm <b>{post.empathy_count}</b>
        </button>
        <button className="vibe-action" onClick={() => setShowReplies((value) => !value)}>
          <span aria-hidden="true">◌</span> Lời hồi âm <b>{post.replies.length}</b>
        </button>
        <button className={post.saved ? "vibe-action is-active" : "vibe-action"} onClick={() => onSave(post)} disabled={busy}>
          <span aria-hidden="true">⌑</span> {post.saved ? "Đã lưu" : "Lưu lại"}
        </button>
      </div>
      {showReplies && (
        <div className="reply-area">
          {post.replies.map((item) => (
            <div className="reply-item" key={item.id}>
              <strong>{item.author_alias}</strong>
              <p>{item.content}</p>
            </div>
          ))}
          <form className="reply-form" onSubmit={submitReply}>
            <input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={240} placeholder="Gửi một lời vỗ về ấm áp..." aria-label="Nội dung hồi âm" />
            <button type="submit" disabled={!reply.trim() || sending}>{sending ? "Đang gửi…" : "Gửi"}</button>
          </form>
        </div>
      )}
    </article>
  );
}