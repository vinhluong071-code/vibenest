'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { getAvatarThemeFromIdentity } from '../../lib/avatar-hash';

export interface VibeReplyItem {
  id: string;
  displayName: string;
  handle: string;
  timeAgo: string;
  text: string;
}

export interface VibePostItem {
  id: string;
  displayName: string;
  handle: string;
  vibeTag: string;
  mood: string;
  location: string;
  timeAgo: string;
  timestamp: number;
  content: string;
  imageUrl?: string;
  empathyCount: number;
  auraScore: number;
  empathized: boolean;
  saved: boolean;
  replies: VibeReplyItem[];
}

export interface VibeFeedCardProps {
  post: VibePostItem;
  busy?: boolean;
  pinned?: boolean;
  onTogglePin: () => void;
  onChat: () => void;
  onToggleEmpathy: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onAddReply: (postId: string, text: string) => void;
  onShare: (post: VibePostItem) => void;
}

export const VibeFeedCard: React.FC<VibeFeedCardProps> = ({
  post,
  busy = false,
  pinned = false,
  onTogglePin,
  onChat,
  onToggleEmpathy,
  onToggleSave,
  onShare,
}) => {
  const [isRepliesOpen, setIsRepliesOpen] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  const [nestedReply, setNestedReply] = useState<{ id: string; text: string } | null>(null);
  const [threadComments, setThreadComments] = useState<Array<{ id: string; parent_comment_id: string | null; author_alias: string; content: string; created_at: string }>>([]);
  const [postVote, setPostVote] = useState<-1 | 0 | 1>(0);
  const [postScore, setPostScore] = useState(0);
  const [zodiac, setZodiac] = useState<{ zodiac_sign: string | null; zodiac_symbol: string | null } | null>(null);
  const [threadError, setThreadError] = useState("");
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const lastMediaTap = useRef(0);
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarTheme = getAvatarThemeFromIdentity(post.handle);

  useEffect(() => {
    let live = true;
    void (async () => {
      const supabase = createClient();
      const [profile, ownVote, score, comments] = await Promise.all([
        supabase.from("vibenest_profiles").select("zodiac_sign,zodiac_symbol").eq("handle", post.handle).maybeSingle(),
        supabase.from("vibenest_post_votes").select("vote").eq("post_id", post.id).maybeSingle(),
        supabase.rpc("vibenest_get_post_score", { p_post_id: post.id }),
        supabase.from("vibenest_comments").select("id,parent_comment_id,author_alias,content,created_at").eq("post_id", post.id).order("created_at", { ascending: true }),
      ]);
      if (!live) return;
      if (!profile.error) setZodiac(profile.data as typeof zodiac);
      if (!ownVote.error && ownVote.data?.vote) setPostVote(ownVote.data.vote as -1 | 1);
      if (!score.error) setPostScore(Number(score.data ?? 0));
      if (!comments.error) setThreadComments((comments.data ?? []) as typeof threadComments);
    })();
    return () => { live = false; };
  }, [post.id, post.handle]);

  const votePost = async (vote: -1 | 1) => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setThreadError("Đăng nhập để bình chọn."); return; }
    const nextVote = postVote === vote ? 0 : vote;
    const result = nextVote === 0
      ? await supabase.from("vibenest_post_votes").delete().eq("post_id", post.id).eq("user_id", auth.user.id)
      : await supabase.from("vibenest_post_votes").upsert({ post_id: post.id, user_id: auth.user.id, vote: nextVote }, { onConflict: "post_id,user_id" });
    if (result.error) { setThreadError(result.error.message); return; }
    setPostVote(nextVote);
    const score = await supabase.rpc("vibenest_get_post_score", { p_post_id: post.id });
    if (!score.error) setPostScore(Number(score.data ?? 0));
  };

  const submitNestedReply = async (parentId: string | null, content: string) => {
    const text = content.trim(); if (!text) return;
    const supabase = createClient(); const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setThreadError("Đăng nhập để bình luận."); return; }
    const { data, error } = await supabase.from("vibenest_comments").insert({ post_id: post.id, parent_comment_id: parentId, user_id: auth.user.id, author_alias: "Bạn", content: text }).select("id,parent_comment_id,author_alias,content,created_at").single();
    if (error) { setThreadError(error.message); return; }
    setThreadComments(current => [...current, data as typeof threadComments[number]]);
    setNestedReply(null); setReplyText("");
  };

  const handleReplySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed) return;
    void submitNestedReply(null, trimmed);
    setReplyText('');
    setIsRepliesOpen(true);
  };

  return (
    <article aria-busy={busy} className="vn-rich-post-card rounded-[24px] p-4 sm:p-5 bg-white/85 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.14] backdrop-blur-xl shadow-sm transition-colors">
      {/* Author Header (Personal Identity + Unboxed Metadata) */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`vn-rich-post-avatar w-10 h-10 rounded-full border flex items-center justify-center font-display font-semibold text-sm shrink-0 ${avatarTheme.textClass}`}
            style={{
              background: avatarTheme.bgStyle,
              borderColor: avatarTheme.borderStyle,
            }}
          >
            {post.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {post.displayName}
              </h3>
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                @{post.handle}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="vn-post-topic-pill font-medium text-rose-600 dark:text-rose-400">{post.vibeTag || post.mood}</span>
              <span aria-hidden="true">·</span>
              <span>{post.location}</span>
              <span aria-hidden="true">·</span>
              <span>{post.timeAgo}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onTogglePin} aria-pressed={pinned} aria-label={pinned ? "Bỏ ghim bài viết" : "Ghim bài viết lên đầu"} title={pinned ? "Bỏ ghim" : "Ghim lên đầu"} className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center ${pinned ? "text-fuchsia-500" : "text-slate-400 hover:text-fuchsia-500"}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8l-1 6 3 3v2H6v-2l3-3-1-6ZM12 15v6"/></svg>
          </button>
        <button
          type="button"
          onClick={() => onToggleSave(post.id)}
          disabled={busy}
          aria-label={post.saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
          className={`min-h-[44px] min-w-[44px] -mr-2 -mt-1 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
            post.saved
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill={post.saved ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
            />
          </svg>
        </button>
        </div>
      </div>

      {/* Post Body Text */}
      <p className="vn-rich-post-copy text-[16px] leading-[1.72] text-slate-800 dark:text-slate-200 whitespace-pre-line mb-3.5">
        {post.content}
      </p>

      {/* Optional Visual Media Attachment (Pinterest / IG Aesthetic) */}
      {post.imageUrl && (
        <div
          className="vn-rich-post-media relative mb-4 rounded-[20px] overflow-hidden border border-white/10 bg-slate-900/20 aspect-[16/10]"
          onClick={(event) => {
            const now = Date.now();
            if (now - lastMediaTap.current < 280) {
              if (!post.empathized) onToggleEmpathy(post.id);
              setDoubleTapHeart(true);
              if (heartTimer.current) clearTimeout(heartTimer.current);
              heartTimer.current = setTimeout(() => setDoubleTapHeart(false), 720);
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(18);
            }
            lastMediaTap.current = now;
          }}
        >
          {doubleTapHeart && <span className="vn-post-double-heart" aria-hidden="true">♥</span>}
          <Image
            src={post.imageUrl}
            alt={post.displayName}
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            unoptimized
            className="object-cover"
          />
        </div>
      )}

      {/* Ergonomic Action Bar (All Touch Targets >= 44px) */}
      <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="vn-vote-stack" aria-label="Điểm Vibe Score"><button type="button" aria-label="Upvote" aria-pressed={postVote === 1} className={postVote === 1 ? "is-upvoted" : ""} onClick={() => void votePost(1)}>▲</button><strong>{postScore}</strong><button type="button" aria-label="Downvote" aria-pressed={postVote === -1} className={postVote === -1 ? "is-downvoted" : ""} onClick={() => void votePost(-1)}>▼</button></div>
          <button
            type="button"
            onClick={() => onToggleEmpathy(post.id)}
            disabled={busy}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-medium transition-colors ${
              post.empathized
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill={post.empathized ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
            <span>Đồng cảm</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRepliesOpen((prev) => !prev)}
            disabled={busy}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
              />
            </svg>
            <span>Phản hồi</span>
            <span className="font-mono tabular-nums">{post.replies.length}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onShare(post)}
          className="min-h-[44px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
            />
          </svg>
          <span className="hidden sm:inline">Chia sẻ</span>
        </button>
        <button
          type="button"
          onClick={onChat}
          disabled={busy}
          className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0 disabled:opacity-50"
        >
          Nhắn riêng
        </button>
      </div>

      {/* Expandable Comments / Replies Drawer */}
      {isRepliesOpen && (
        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] space-y-3">
          <div className="space-y-2.5">
            {post.replies.map((reply) => {
              const replyTheme = getAvatarThemeFromIdentity(reply.handle);
              return (
                <div
                  key={reply.id}
                  className="p-3 rounded-2xl bg-slate-100/75 dark:bg-white/[0.03] text-xs flex items-start gap-2.5"
                >
                  <div
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center font-display font-semibold text-[11px] shrink-0 mt-0.5 ${replyTheme.textClass}`}
                    style={{
                      background: replyTheme.bgStyle,
                      borderColor: replyTheme.borderStyle,
                    }}
                  >
                    {reply.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-0.5">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {reply.displayName}
                      </span>
                      <span className="font-mono text-[11px]">@{reply.handle}</span>
                      <span aria-hidden="true">·</span>
                      <span>{reply.timeAgo}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {reply.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {threadComments.filter(comment => !comment.parent_comment_id).map(comment => <div className="vn-thread-comment" key={comment.id}><strong>{comment.author_alias}</strong><p>{comment.content}</p><button type="button" onClick={() => setNestedReply({ id: comment.id, text: "" })}>Trả lời</button>{threadComments.filter(reply => reply.parent_comment_id === comment.id).map(reply => <div className="vn-thread-reply" key={reply.id}><strong>{reply.author_alias}</strong><p>{reply.content}</p></div>)}{nestedReply?.id === comment.id && <form onSubmit={event => { event.preventDefault(); void submitNestedReply(comment.id, nestedReply.text); }}><input value={nestedReply.text} onChange={event => setNestedReply({ id: comment.id, text: event.target.value })} placeholder="Trả lời bình luận…" maxLength={1000}/><button type="submit">Gửi</button></form>}</div>)}
          {threadError && <p role="alert" className="text-xs text-rose-500">{threadError}</p>}
          <form onSubmit={handleReplySubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              maxLength={240}
              placeholder="Viết phản hồi kết nối..."
              className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shrink-0"
            >
              Gửi
            </button>
          </form>
        </div>
      )}
    </article>
  );
};

export default VibeFeedCard;
