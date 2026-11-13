"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import type { VibePostItem } from "@/components/feed/VibeFeedCard";
import { createClient } from "@/lib/supabase/client";

type Props = { alias: string; posts: VibePostItem[]; children: ReactNode; onCompose: () => void; onSearch: () => void; onNotifications: () => void };
type MediaRow = Record<string, unknown> & { id: string };
type Story = MediaRow & { owner: string; media: string; captionText: string; created: string; expires: string; qa: string | null; poll: string | null; options: [string, string] };
type Reel = MediaRow & { owner: string; media: string; captionText: string; audio: string; audioTitle: string; persisted?: boolean };
type ReelComment = { id: string; author_alias: string; content: string; created_at: string };
const STORY_TABLES = ["vibenest_stories", "vibe_stories"] as const;
const REEL_TABLE = "vibenest_reels";
const QUESTION_TABLES = ["vibenest_story_questions", "vibe_story_questions"] as const;
const POLL_TABLES = ["vibenest_story_poll_votes", "vibe_story_poll_votes"] as const;

function str(row: MediaRow, keys: string[], fallback = "") { for (const key of keys) { const value = row[key]; if (typeof value === "string" && value.trim()) return value.trim(); } return fallback; }
function num(row: MediaRow, keys: string[]) { for (const key of keys) { const value = row[key]; if (typeof value === "number" && Number.isFinite(value)) return value; } return 0; }
function parseOptions(row: MediaRow): [string, string] {
 const raw = row.poll_options ?? row.options;
 if (Array.isArray(raw)) return [String(raw[0] ?? "Có"), String(raw[1] ?? "Không")];
 return [str(row, ["poll_option_1", "option_1", "option_a"], "Có"), str(row, ["poll_option_2", "option_2", "option_b"], "Không")];
}
function normalizeStory(row: MediaRow): Story {
 return { ...row, id: String(row.id), owner: str(row, ["alias", "handle", "username", "display_name"], "VibeNest"), media: str(row, ["media_url", "image_url", "video_url", "media_path", "image_path"]), captionText: str(row, ["caption", "content", "text"]), created: str(row, ["created_at"], new Date().toISOString()), expires: str(row, ["expires_at"], new Date(Date.now() + 86400000).toISOString()), qa: str(row, ["qa_question", "question_prompt"]) || null, poll: str(row, ["poll_question"]) || null, options: parseOptions(row) };
}
function normalizeReel(row: MediaRow): Reel {
 return { ...row, id: String(row.id), owner: str(row, ["handle", "alias", "username", "display_name"], "VibeNest"), media: str(row, ["video_url", "media_url", "video_path", "media_path", "url"]), captionText: str(row, ["caption", "content", "description"]), audio: str(row, ["audio_url", "sound_url"]), audioTitle: str(row, ["audio_title", "sound_title", "music_title"], "Original audio"), persisted: true };
}

export function HomeFeedView({ alias, posts, children, onCompose, onSearch, onNotifications }: Props) {
 const [mode, setMode] = useState<"stories" | "reels">("stories");
 const [stories, setStories] = useState<Story[]>([]);
 const [reels, setReels] = useState<Reel[]>([]);
 const [storyIndex, setStoryIndex] = useState<number | null>(null);
 const [storyProgress, setStoryProgress] = useState(0);
 const [storyQuestion, setStoryQuestion] = useState("");
 const [pollVotes, setPollVotes] = useState<Record<string, { a: number; b: number; mine: number | null }>>({});
 const [busy, setBusy] = useState(false);
 const [notice, setNotice] = useState("");
 const [muted, setMuted] = useState(true);
 const [liked, setLiked] = useState<string[]>([]);
 const [reelComments, setReelComments] = useState<ReelComment[]>([]);
 const [commentReel, setCommentReel] = useState<string | null>(null);
 const [commentText, setCommentText] = useState("");
 const [reelProgress, setReelProgress] = useState<Record<string, number>>({});
 const [reelFeedback, setReelFeedback] = useState<{ id: string; kind: "play" | "pause" | "heart"; x: number; y: number } | null>(null);
 const reelTapTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
 const reelFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const storyTimer = useRef<ReturnType<typeof setInterval> | null>(null);
 const reelsContainerRef = useRef<HTMLElement | null>(null);
 const supabase = useMemo(() => { try { return createClient(); } catch { return null; } }, []);
 const activeStory = storyIndex === null ? null : stories[storyIndex] ?? null;

 const loadMedia = useCallback(async () => {
  if (!supabase) return;
  const now = new Date().toISOString();
  let storyRows: MediaRow[] = [];
  for (const table of STORY_TABLES) {
   const result = await (supabase.from(table) as any).select("*").gt("expires_at", now).order("created_at", { ascending: false }).limit(60);
   if (!result.error) { storyRows = (result.data ?? []) as MediaRow[]; break; }
  }
  setStories(storyRows.map(normalizeStory));
  const reelsResult = await (supabase.from(REEL_TABLE) as any).select("*").order("created_at", { ascending: false }).limit(50);
  if (!reelsResult.error) {
   const nextReels = ((reelsResult.data ?? []) as MediaRow[]).map(normalizeReel).filter(item => item.media);
   setReels(nextReels);
   const { data: authData } = await supabase.auth.getUser();
   if (authData.user && nextReels.length) {
    const likesResult = await (supabase.from("vibenest_reel_likes") as any).select("reel_id").eq("user_id", authData.user.id).in("reel_id", nextReels.map(item => item.id));
    if (!likesResult.error) setLiked((likesResult.data ?? []).map((row: { reel_id: string }) => row.reel_id));
   }
  }
  else setNotice("Không tải được Reels: " + reelsResult.error.message);
 }, [supabase]);

 useEffect(() => {
  const initialLoad = window.setTimeout(() => void loadMedia(), 0);
  return () => window.clearTimeout(initialLoad);
 }, [loadMedia]);
 useEffect(() => {
  if (!supabase) return;
  const channel = supabase.channel("vibenest-home-media")
   .on("postgres_changes", { event: "*", schema: "public", table: "vibe_stories" }, () => void loadMedia())
   .on("postgres_changes", { event: "*", schema: "public", table: "vibenest_stories" }, () => void loadMedia())
   .on("postgres_changes", { event: "*", schema: "public", table: REEL_TABLE }, () => void loadMedia())
   .subscribe();
  return () => { void supabase.removeChannel(channel); };
 }, [supabase, loadMedia]);

 useEffect(() => {
  if (storyIndex === null) return;
  const started = Date.now();
  storyTimer.current = setInterval(() => {
   const progress = Math.min(100, ((Date.now() - started) / 5000) * 100);
   setStoryProgress(progress);
   if (progress >= 100) setStoryIndex(index => index === null ? null : index < stories.length - 1 ? index + 1 : null);
  }, 50);
  return () => { if (storyTimer.current) clearInterval(storyTimer.current); };
 }, [storyIndex, stories.length]);

 useEffect(() => {
  if (mode !== "reels") return;
  const nodes = Array.from(reelsContainerRef.current?.querySelectorAll("video") ?? []);
  if (!nodes.length) return;
  const observer = new IntersectionObserver(entries => {
   entries.forEach(entry => {
    const video = entry.target as HTMLVideoElement;
    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) void video.play().catch(() => undefined);
    else video.pause();
   });
  }, { threshold: [0, 0.65, 1] });
  nodes.forEach(node => observer.observe(node));
  return () => observer.disconnect();
 }, [mode, reels]);

 const createStory = async () => {
  if (!supabase) { onCompose(); return; }
  const mediaUrl = window.prompt("Dán đường dẫn HTTPS ảnh/video cho Story (24 giờ):");
  if (!mediaUrl) return;
  const qaPrompt = window.prompt("Thêm hộp câu hỏi ẩn danh? Để trống nếu không cần.", "Hãy gửi cho tôi một câu hỏi ẩn danh…");
  if (!/^https:\/\//i.test(mediaUrl.trim())) { setNotice("Story cần đường dẫn HTTPS hợp lệ."); return; }
  setBusy(true);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) { setBusy(false); setNotice("Hãy đăng nhập để tạo Story."); return; }
  let created = false;
  for (const table of STORY_TABLES) {
   const payloads = [
    { author_id: userId, alias, mood: "Tâm trạng", caption: "", image_url: mediaUrl.trim(), qa_question: qaPrompt?.trim() || null, expires_at: new Date(Date.now() + 86400000).toISOString() },
    { user_id: userId, author_id: userId, handle: alias, caption: "", media_url: mediaUrl.trim(), qa_question: qaPrompt?.trim() || null, expires_at: new Date(Date.now() + 86400000).toISOString() },
   ];
   for (const payload of payloads) {
    const result = await (supabase.from(table) as any).insert(payload);
    if (!result.error) { created = true; break; }
   }
   if (created) break;
  }
  setBusy(false);
  setNotice(created ? "Đã đăng Story. Tin sẽ hết hạn sau 24 giờ." : "Không tạo được Story. Kiểm tra schema, RLS và quyền INSERT của bảng Stories.");
  if (created) await loadMedia();
 };

 const sendQuestion = async () => {
  if (!supabase || !activeStory || !storyQuestion.trim()) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) { setNotice("Đăng nhập để gửi câu hỏi ẩn danh."); return; }
  let sent = false;
  for (const table of QUESTION_TABLES) {
   const result = await (supabase.from(table) as any).insert({ story_id: activeStory.id, sender_id: data.user.id, question: storyQuestion.trim() });
   if (!result.error) { sent = true; break; }
  }
  setNotice(sent ? "Đã gửi câu hỏi ẩn danh cho chủ Story." : "Không gửi được câu hỏi. Có thể bạn đã gửi câu hỏi cho Story này.");
  if (sent) setStoryQuestion("");
 };

 const votePoll = async (option: 0 | 1) => {
  if (!supabase || !activeStory) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) { setNotice("Đăng nhập để bình chọn."); return; }
  let saved = false;
  for (const table of POLL_TABLES) {
   const result = await (supabase.from(table) as any).insert({ story_id: activeStory.id, voter_id: data.user.id, option_index: option });
   if (!result.error) { saved = true; break; }
  }
  if (!saved) { setNotice("Bạn có thể đã bình chọn Story này rồi."); return; }
  setPollVotes(current => ({ ...current, [activeStory.id]: { a: (current[activeStory.id]?.a ?? 0) + (option === 0 ? 1 : 0), b: (current[activeStory.id]?.b ?? 0) + (option === 1 ? 1 : 0), mine: option } }));
 };

 const toggleLike = async (id: string) => {
  if (!supabase) return;
  if (!reels.some(item => item.id === id)) { setNotice("Tương tác Reel chỉ bật cho video đã đăng trong Reels."); return; }
  const { data } = await supabase.auth.getUser();
  if (!data.user) { setNotice("Đăng nhập để thích Reel."); return; }
  const alreadyLiked = liked.includes(id);
  const result = alreadyLiked
   ? await (supabase.from("vibenest_reel_likes") as any).delete().eq("reel_id", id).eq("user_id", data.user.id)
   : await (supabase.from("vibenest_reel_likes") as any).insert({ reel_id: id, user_id: data.user.id });
  if (result.error) { setNotice("Không thể lưu lượt thích: " + result.error.message); return; }
  setLiked(current => alreadyLiked ? current.filter(item => item !== id) : [...current, id]);
 };
 const openReelComments = async (id: string) => {
  if (!supabase || !reels.some(item => item.id === id)) { setNotice("Bình luận chỉ khả dụng với Reel đã được lưu trên máy chủ."); return; }
  const result = await (supabase.from("vibenest_reel_comments") as any).select("id,author_alias,content,created_at").eq("reel_id", id).order("created_at", { ascending: true }).limit(100);
  if (result.error) { setNotice("Không tải được bình luận: " + result.error.message); return; }
  setReelComments((result.data ?? []) as ReelComment[]);
  setCommentText("");
  setCommentReel(id);
 };
 const sendReelComment = async (id: string) => {
  if (!supabase || !commentText.trim()) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) { setNotice("Đăng nhập để bình luận."); return; }
  const result = await (supabase.from("vibenest_reel_comments") as any).insert({ reel_id: id, user_id: data.user.id, author_alias: alias, content: commentText.trim() }).select("id,author_alias,content,created_at").single();
  if (result.error) { setNotice("Không thể gửi bình luận: " + result.error.message); return; }
  setReelComments(current => [...current, result.data as ReelComment]);
  setCommentText("");
 };
 const showReelFeedback = (id: string, kind: "play" | "pause" | "heart", x = 50, y = 50) => {
  if (reelFeedbackTimer.current) clearTimeout(reelFeedbackTimer.current);
  setReelFeedback({ id, kind, x, y });
  reelFeedbackTimer.current = setTimeout(() => setReelFeedback(null), 560);
 };
 useEffect(() => () => {
  reelTapTimers.current.forEach(timer => clearTimeout(timer));
  if (reelFeedbackTimer.current) clearTimeout(reelFeedbackTimer.current);
 }, []);
 function handleReelTap(event: ReactMouseEvent<HTMLVideoElement>) {
  const video = event.currentTarget;
  const reelId = video.dataset.reelId;
  if (!reelId) return;
  const rect = video.getBoundingClientRect();
  const x = Math.max(8, Math.min(92, ((event.clientX - rect.left) / rect.width) * 100));
  const y = Math.max(8, Math.min(92, ((event.clientY - rect.top) / rect.height) * 100));
  const pending = reelTapTimers.current.get(reelId);
  if (pending) {
   clearTimeout(pending);
   reelTapTimers.current.delete(reelId);
   setLiked(current => current.includes(reelId) ? current : [...current, reelId]);
   if (reelFeedbackTimer.current) clearTimeout(reelFeedbackTimer.current);
   setReelFeedback({ id: reelId, kind: "heart", x, y });
   reelFeedbackTimer.current = setTimeout(() => setReelFeedback(null), 560);
   if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(18);
   return;
  }
  const timer = setTimeout(() => {
   reelTapTimers.current.delete(reelId);
   if (video.paused) {
    void video.play().then(() => {
     if (reelFeedbackTimer.current) clearTimeout(reelFeedbackTimer.current);
     setReelFeedback({ id: reelId, kind: "play", x: 50, y: 50 });
     reelFeedbackTimer.current = setTimeout(() => setReelFeedback(null), 560);
    }).catch(() => undefined);
   } else {
    video.pause();
    if (reelFeedbackTimer.current) clearTimeout(reelFeedbackTimer.current);
    setReelFeedback({ id: reelId, kind: "pause", x: 50, y: 50 });
    reelFeedbackTimer.current = setTimeout(() => setReelFeedback(null), 560);
   }
  }, 230);
  reelTapTimers.current.set(reelId, timer);
 }
 const activePoll = activeStory ? pollVotes[activeStory.id] : undefined;
 const reelsFromPosts = posts.filter(post => /video\//i.test(post.imageUrl ?? "") || /\.(mp4|webm|mov)(\?|$)/i.test(post.imageUrl ?? "")).map(post => ({ id: post.id, owner: post.handle, media: post.imageUrl ?? "", captionText: post.content, audio: "", audioTitle: "Original audio", persisted: false }));

 return <section className="vn-home-feed-shell" aria-label="Home feed">
  <header className="vn-home-feed-top">
   <span className="vn-home-feed-avatar" aria-hidden="true">{alias.slice(0,1).toUpperCase()}</span>
   <button type="button" className="vn-home-thought-prompt" onClick={onCompose}>Bạn đang nghĩ gì?</button>
   <button type="button" className="vn-home-feed-icon vn-home-media-trigger" onClick={onCompose} aria-label="Thêm ảnh hoặc video"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg></button>
  </header>
  <div className="vn-home-feed-tabs" role="tablist" aria-label="Nội dung Home">
   <button type="button" role="tab" aria-selected={mode==="stories"} className={mode==="stories"?"selected":""} onClick={()=>setMode("stories")}><span aria-hidden="true">📖</span> Tin</button>
   <button type="button" role="tab" aria-selected={mode==="reels"} className={mode==="reels"?"selected":""} onClick={()=>setMode("reels")}><span aria-hidden="true">🎬</span> Reels</button>
  </div>
  {mode === "stories" ? <>
   <section className="vn-home-stories-rail" aria-label="Stories">
    <button type="button" className="vn-home-story-create" onClick={() => void createStory()} disabled={busy} aria-label="Tạo tin">
     <span className="vn-home-create-avatar">{alias.slice(0,1).toUpperCase()}</span><span className="vn-home-create-plus" aria-hidden="true">＋</span><small>{busy ? "Đang đăng…" : "Tạo tin"}</small>
    </button>
    {stories.map((story, index) => <button type="button" className="vn-home-story-card vn-home-story-neon" key={story.id} onClick={() => { setStoryProgress(0); setStoryQuestion(""); setStoryIndex(index); }}>
     {story.media ? (/\.(mp4|webm|mov)(\?|$)/i.test(story.media) ? <video src={story.media} muted playsInline /> : <Image src={story.media} alt="" fill sizes="104px" unoptimized />) : <span className="vn-home-story-gradient" />}
     <span>{story.owner}</span>
    </button>)}
   </section>
   {children}
  </> : <section ref={reelsContainerRef} className="vn-home-reels-player" aria-label="Reels video dọc">
   {[...reels, ...reelsFromPosts].length ? [...reels, ...reelsFromPosts].map(reel => <article className="vn-reel-slide" key={reel.id} style={{ aspectRatio: "9 / 16" }}>
    <video src={reel.media} playsInline loop muted={muted} preload="metadata" data-reel-id={reel.id} onClick={handleReelTap} onTimeUpdate={event => { const video = event.currentTarget; if (video.duration) setReelProgress(current => ({ ...current, [reel.id]: (video.currentTime / video.duration) * 100 })); }} />
    {reelFeedback?.id === reel.id && <span key={`${reel.id}-${reelFeedback.kind}-${Math.round(reelFeedback.x)}`} className={`vn-reel-feedback vn-reel-feedback-${reelFeedback.kind}`} style={{ left: `${reelFeedback.x}%`, top: `${reelFeedback.y}%` }} aria-hidden="true">{reelFeedback.kind === "heart" ? "♥" : reelFeedback.kind === "play" ? "▶" : "Ⅱ"}</span>}
    <div className="vn-reel-progress"><span style={{ width: `${reelProgress[reel.id] ?? 0}%` }} /></div><div className="vn-reel-gradient" />
    <div className="vn-reel-caption"><strong>@{reel.owner}</strong><p>{reel.captionText}</p><span>♫ {reel.audioTitle}</span></div>
    <aside className="vn-reel-actions">
     <button type="button" className={liked.includes(reel.id) ? "liked" : ""} onClick={() => void toggleLike(reel.id)} aria-label="Thả tim"><span>♥</span><small>{liked.includes(reel.id) ? "Đã thích" : "Thích"}</small></button>
     <button type="button" onClick={() => void openReelComments(reel.id)} aria-label="Bình luận"><span>▢</span><small>Bình luận</small></button>
     <button type="button" onClick={() => { if (navigator.share) void navigator.share({ title: "VibeNest Reel", text: reel.captionText, url: reel.media }).catch(() => undefined); else void navigator.clipboard?.writeText(reel.media); }} aria-label="Chia sẻ"><span>↗</span><small>Chia sẻ</small></button>
     <button type="button" className="vn-reel-disc" onClick={() => setMuted(value => !value)} aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}>♫</button>
    </aside>
   </article>) : <div className="vn-home-media-empty"><h2>Chưa có Reels</h2></div>}
  </section>}
  {activeStory && <div className="vn-story-viewer" role="dialog" aria-modal="true" aria-label={"Story của " + activeStory.owner}>
   <div className="vn-story-progress"><span style={{ width: storyProgress + "%" }} /></div>
   <header><strong>{activeStory.owner}</strong><time>{new Date(activeStory.created).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time><button type="button" onClick={() => setStoryIndex(null)} aria-label="Đóng Story">×</button></header>
   {activeStory.media && (/\.(mp4|webm|mov)(\?|$)/i.test(activeStory.media) ? <video className="vn-story-media" src={activeStory.media} autoPlay muted playsInline /> : <Image className="vn-story-media" src={activeStory.media} alt="" fill unoptimized />)}
   {activeStory.captionText && <p className="vn-story-caption">{activeStory.captionText}</p>}
   {activeStory.qa && <form className="vn-story-interaction" onSubmit={event => { event.preventDefault(); void sendQuestion(); }}><strong className="vn-ngl-story-sticker"><span>?</span><small>HỘP CÂU HỎI ẨN DANH</small>{activeStory.qa}</strong><input value={storyQuestion} onChange={event => setStoryQuestion(event.target.value)} maxLength={500} placeholder="Gửi câu hỏi ẩn danh…" /><button type="submit">Gửi</button></form>}
   {activeStory.poll && <div className="vn-story-interaction"><strong>{activeStory.poll}</strong>{activeStory.options.map((option, index) => { const total = (activePoll?.a ?? 0) + (activePoll?.b ?? 0); const count = index === 0 ? activePoll?.a ?? 0 : activePoll?.b ?? 0; const percent = total ? Math.round(count / total * 100) : 0; return <button type="button" key={option} onClick={() => void votePoll(index as 0 | 1)} disabled={activePoll?.mine !== undefined && activePoll?.mine !== null}><span>{option}</span><b>{percent}%</b></button>; })}</div>}
   <button type="button" className="vn-story-prev" onClick={() => setStoryIndex(index => index === null ? null : Math.max(0, index - 1))} aria-label="Story trước" />
   <button type="button" className="vn-story-next" onClick={() => setStoryIndex(index => index === null ? null : index + 1 < stories.length ? index + 1 : null)} aria-label="Story tiếp theo" />
  </div>}
  {commentReel && <form className="vn-reel-comment-sheet" onSubmit={event => { event.preventDefault(); if (commentReel) void sendReelComment(commentReel); }}><label htmlFor="vn-reel-comment">Bình luận Reel ({reelComments.length})</label><div className="vn-reel-comment-list">{reelComments.map(comment => <article key={comment.id}><strong>@{comment.author_alias}</strong><p>{comment.content}</p></article>)}</div><input id="vn-reel-comment" value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Viết bình luận…" maxLength={1000} /><button type="submit">Gửi</button><button type="button" onClick={() => setCommentReel(null)}>Đóng</button></form>}
  {notice && <div className="vn-home-media-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")}>×</button></div>}
 </section>;
}
