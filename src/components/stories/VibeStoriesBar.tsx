"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useVibeStories } from "@/hooks/useVibeStories";
import type { VibeStory, VibeStoryReaction } from "@/lib/vibe/types";
import type { VibeStoryQuestion } from "@/hooks/useVibeStories";

type Props = {
  currentUserName: string;
  currentUserHandle: string;
  onNotify?: (message: string) => void;
};

const moods = ["Đêm muộn", "Chênh vênh", "Chữa lành", "Thầm thương"] as const;

function remainingHours(expiresAt: string): string {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  return `${Math.max(1, Math.ceil(remaining / 3_600_000))}h`;
}

function getStorySticker(caption: string | null, label: string): string | null {
  if (!caption) return null;
  const line = caption.split("\n").find((item) => item.startsWith(label));
  return line ? line.slice(label.length).trim() : null;
}

function parseStoryPoll(caption: string | null): { question: string; options: [string, string] } | null {
  const raw = getStorySticker(caption, "[BÌNH CHỌN]");
  if (!raw) return null;
  const match = raw.match(/^(.*?) · A: (.*?) · B: (.*)$/);
  if (!match) return null;
  return { question: match[1], options: [match[2], match[3]] };
}

function getStoryBody(caption: string | null): string {
  if (!caption) return "";
  return caption.split(/\n\n\[(?:HỎI ẨN DANH|BÌNH CHỌN|ĐANG NGHE)\]/)[0];
}

function createdLabel(createdAt: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return "Vừa đăng";
  if (minutes < 60) return `${minutes} phút trước`;
  return `${Math.floor(minutes / 60)} giờ trước`;
}

function StoryTile({ story, onOpen }: { story: VibeStory; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="vn-story-circle" aria-label={`Xem khoảnh khắc của ${story.alias}, còn ${remainingHours(story.expires_at)}`}>
      {story.image_url && <Image src={story.image_url} alt="" fill sizes="76px" unoptimized className="vn-story-photo" />}
      <span className="vn-story-shade" />
      <span className="vn-story-avatar">{story.alias.slice(0, 1).toUpperCase()}</span>
      <span className="vn-story-label">{story.alias}</span>
      <span className="vn-story-hours">{remainingHours(story.expires_at)}</span>
    </button>
  );
}

export function VibeStoriesBar({ currentUserName, currentUserHandle, onNotify }: Props) {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const { stories, loading, error, createStory, toggleWarmth, refreshStories, submitAnonymousQuestion, loadAnonymousQuestions, submitStoryPollVote, loadStoryPollResults } = useVibeStories(hasSupabaseConfig, 60);
  const [composerOpen, setComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<(typeof moods)[number]>("Đêm muộn");
  const [location, setLocation] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [qaEnabled, setQaEnabled] = useState(false);
  const [qaPrompt, setQaPrompt] = useState("Hỏi mình bất cứ điều gì nhé…");
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("Tối nay nên làm gì?");
  const [pollOptionA, setPollOptionA] = useState("Đi dạo");
  const [pollOptionB, setPollOptionB] = useState("Ở nhà chill");
  const [musicSticker, setMusicSticker] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [storyQuestions, setStoryQuestions] = useState<VibeStoryQuestion[]>([]);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionNotice, setQuestionNotice] = useState("");
  const [pollResults, setPollResults] = useState<[number, number]>([0, 0]);
  const [pollVoted, setPollVoted] = useState(false);
  const [pollVoteBusy, setPollVoteBusy] = useState(false);
  const [pollNotice, setPollNotice] = useState("");

  const activeIndex = activeStoryId === null ? -1 : stories.findIndex((story) => story.id === activeStoryId);
  const activeStory = activeIndex < 0 ? null : stories[activeIndex] ?? null;

  useEffect(() => {
    if (!activeStoryId) { setPollResults([0, 0]); setPollVoted(false); return; }
    let alive = true;
    void loadStoryPollResults(activeStoryId).then((counts) => {
      if (alive) setPollResults(counts);
    }).catch(() => {
      if (alive) setPollResults([0, 0]);
    });
    return () => { alive = false; };
  }, [activeStoryId, loadStoryPollResults]);

  useEffect(() => {
    if (!activeStoryId) { setStoryQuestions([]); return; }
    let alive = true;
    void loadAnonymousQuestions(activeStoryId).then((items) => {
      if (alive) setStoryQuestions(items);
    }).catch(() => {
      if (alive) setStoryQuestions([]);
    });
    return () => { alive = false; };
  }, [activeStoryId, loadAnonymousQuestions]);


  useEffect(() => {
    if (activeIndex < 0 || !activeStory || !activeStoryId) return;
    const timer = window.setTimeout(() => {
      const currentIndex = stories.findIndex((story) => story.id === activeStoryId);
      setActiveStoryId(currentIndex >= 0 && currentIndex + 1 < stories.length
        ? stories[currentIndex + 1].id
        : null);
    }, 5_500);
    return () => window.clearTimeout(timer);
  }, [activeIndex, activeStory, activeStoryId, stories]);

  async function submitStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = caption.trim();
    if (!text || saving) return;
    const stickers = [
      qaEnabled ? `[HỎI ẨN DANH] ${qaPrompt.trim() || "Hỏi mình bất cứ điều gì"}` : "",
      pollEnabled ? `[BÌNH CHỌN] ${pollQuestion.trim()} · A: ${pollOptionA.trim()} · B: ${pollOptionB.trim()}` : "",
      musicSticker.trim() ? `[ĐANG NGHE] ♪ ${musicSticker.trim()}` : "",
    ].filter(Boolean);
    const storyCaption = [text, ...stickers].join("\n\n");
    if (storyCaption.length > 500) {
      onNotify?.("Nội dung và nhãn dán vượt quá giới hạn 500 ký tự. Hãy rút gọn nội dung.");
      return;
    }
    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      if (media) {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("Bạn cần có phiên VibeNest để đăng ảnh.");
        const extension = media.type === "image/jpeg" ? "jpg" : media.type === "image/png" ? "png" : "webp";
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("vibenest-post-media")
          .upload(uploadedPath, media, { cacheControl: "3600", contentType: media.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      await createStory({
        alias: currentUserName.trim().slice(0, 48),
        mood,
        location: location.trim().slice(0, 120) || null,
        caption: storyCaption,
        imagePath: uploadedPath,
      });
      setCaption("");
      setLocation("");
      setMedia(null);
      setMediaError("");
      setQaEnabled(false); setPollEnabled(false); setMusicSticker("");
      setComposerOpen(false);
      onNotify?.("Khoảnh khắc 24h đã được lưu và đồng bộ với VibeNest.");
    } catch (cause) {
      if (uploadedPath) {
        const { error: cleanupError } = await createClient().storage
          .from("vibenest-post-media")
          .remove([uploadedPath]);
        if (cleanupError) console.warn("[VibeNest] Không thể dọn ảnh Stories chưa được lưu:", cleanupError);
      }
      onNotify?.(cause instanceof Error ? cause.message : "Chưa thể đăng Khoảnh khắc. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function voteOnStoryPoll(optionIndex: number) {
    if (!activeStory || pollVoteBusy || pollVoted) return;
    setPollVoteBusy(true); setPollNotice("");
    try {
      await submitStoryPollVote(activeStory.id, optionIndex);
      const counts = await loadStoryPollResults(activeStory.id);
      setPollResults(counts); setPollVoted(true);
      setPollNotice("Bình chọn của bạn đã được ghi nhận.");
    } catch (cause) {
      setPollNotice(cause instanceof Error ? cause.message : "Chưa thể gửi bình chọn.");
    } finally { setPollVoteBusy(false); }
  }

  async function sendAnonymousQuestion() {
    if (!activeStory || !questionDraft.trim() || questionBusy) return;
    setQuestionBusy(true);
    setQuestionNotice("");
    try {
      await submitAnonymousQuestion(activeStory.id, questionDraft);
      setQuestionDraft("");
      setQuestionNotice("Câu hỏi đã được gửi ẩn danh.");
    } catch (cause) {
      setQuestionNotice(cause instanceof Error ? cause.message : "Chưa thể gửi câu hỏi.");
    } finally { setQuestionBusy(false); }
  }

  async function reactToStory(reaction: VibeStoryReaction) {
    if (!activeStory || reactionBusy) return;
    setReactionBusy(true);
    try {
      await toggleWarmth(activeStory.id, reaction);
    } catch (cause) {
      onNotify?.(cause instanceof Error ? cause.message : "Chưa thể gửi cảm xúc cho Khoảnh khắc.");
    } finally {
      setReactionBusy(false);
    }
  }

  return (
    <section aria-label="Khoảnh khắc 24h"
      className="rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.035]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Khoảnh khắc 24h</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Stories thật · tự hết hạn sau 24 giờ</p>
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-rose-600 dark:text-rose-400">{stories.length} khoảnh khắc</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto py-0.5 [scrollbar-width:none]">
        <button type="button" onClick={() => setComposerOpen(true)}
          className="vn-story-create">
          <span className="vn-story-create-avatar">＋</span><strong className="vn-story-create-label">Tạo Story</strong>
        </button>
        {stories.map((story) => <StoryTile key={story.id} story={story} onOpen={() => setActiveStoryId(story.id)} />)}
        {!loading && stories.length === 0 && <p className="max-w-[190px] text-xs leading-relaxed text-slate-500">Chưa có Stories đang hoạt động. Bạn có thể mở đầu khoảnh khắc đầu tiên.</p>}
      </div>

      {loading && <p className="mt-2 text-xs text-slate-500" role="status">Đang tải Stories từ Supabase…</p>}
      {error && <div className="mt-2 flex items-center justify-between gap-2 text-xs text-rose-600" role="alert"><span>{error}</span><button type="button" onClick={() => void refreshStories()}>Thử lại</button></div>}

      {composerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="story-composer-title">
          <form onSubmit={submitStory} className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-white p-5 shadow-2xl dark:bg-[#111827]">
            <div className="flex items-center justify-between"><h3 id="story-composer-title" className="font-semibold text-slate-900 dark:text-white">Tạo Khoảnh khắc 24h</h3><button type="button" onClick={() => setComposerOpen(false)} aria-label="Đóng">✕</button></div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Đăng bằng tài khoản VibeNest hiện tại: @{currentUserHandle}. Nội dung được lưu trên Supabase và tự hết hạn sau 24 giờ.</p>
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">Tâm trạng
              <select value={mood} onChange={(event) => setMood(event.target.value as (typeof moods)[number])} className="min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-white/10">
                {moods.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">Ảnh Stories (không bắt buộc)
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (!file) return;
                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
                  setMedia(null);
                  setMediaError("Chỉ nhận ảnh JPG, PNG hoặc WebP tối đa 10 MB.");
                  event.target.value = "";
                  return;
                }
                setMedia(file);
                setMediaError("");
              }} className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-rose-500/10 file:px-3 file:py-2 file:text-rose-600" />
              {media && <span className="block truncate text-[11px] text-slate-500">{media.name} · {(media.size / (1024 * 1024)).toFixed(1)} MB</span>}
              {mediaError && <span className="block text-[11px] text-rose-600" role="alert">{mediaError}</span>}
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">Khoảnh khắc của bạn
              <textarea value={caption} onChange={(event) => setCaption(event.target.value)} required maxLength={500} rows={4} placeholder="Chia sẻ một điều nhỏ trong ngày…" className="w-full resize-none rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-white/10" />
            </label>
            <section className="space-y-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.05] p-3">
              <label className="flex items-center justify-between gap-3 text-sm font-semibold"><span>💌 Hộp hỏi ẩn danh</span><input type="checkbox" checked={qaEnabled} onChange={(event) => setQaEnabled(event.target.checked)} /></label>
              {qaEnabled && <input value={qaPrompt} onChange={(event) => setQaPrompt(event.target.value)} maxLength={100} placeholder="Ví dụ: Hỏi mình điều bạn tò mò…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-white/10" />}
              <label className="flex items-center justify-between gap-3 text-sm font-semibold"><span>📊 Nhãn dán bình chọn</span><input type="checkbox" checked={pollEnabled} onChange={(event) => setPollEnabled(event.target.checked)} /></label>
              {pollEnabled && <div className="grid gap-2"><input value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} maxLength={80} placeholder="Câu hỏi bình chọn" className="min-h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-white/10" /><div className="grid grid-cols-2 gap-2"><input value={pollOptionA} onChange={(event) => setPollOptionA(event.target.value)} maxLength={32} placeholder="Lựa chọn A" className="min-h-10 min-w-0 rounded-xl border border-slate-200 bg-transparent px-2 text-sm dark:border-white/10" /><input value={pollOptionB} onChange={(event) => setPollOptionB(event.target.value)} maxLength={32} placeholder="Lựa chọn B" className="min-h-10 min-w-0 rounded-xl border border-slate-200 bg-transparent px-2 text-sm dark:border-white/10" /></div></div>}
              <label className="block space-y-1 text-xs font-medium">♫ Nhãn dán nhạc đang nghe<input value={musicSticker} onChange={(event) => setMusicSticker(event.target.value)} maxLength={80} placeholder="Tên bài hát · nghệ sĩ" className="min-h-10 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-white/10" /></label>
              <p className="text-[10px] leading-relaxed text-slate-500">Nhãn dán được lưu cùng nội dung Story. Hộp hỏi ẩn danh có thể nhận câu hỏi sau khi migration được triển khai.</p>
            </section>
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">Khu vực (không bắt buộc)
              <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={120} placeholder="Ví dụ: Sài Gòn" className="min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-white/10" />
            </label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setComposerOpen(false)} className="rounded-xl px-4 py-2 text-sm">Hủy</button><button type="submit" disabled={!caption.trim() || saving} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang đăng…" : "Đăng Stories"}</button></div>
          </form>
        </div>
      )}

      {activeStory && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/90 p-0 backdrop-blur-md sm:p-4" role="dialog" aria-modal="true" aria-label="Xem Khoảnh khắc 24h">
          <article className="relative flex h-full w-full max-w-md flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-rose-950 p-5 text-white sm:h-[min(720px,92vh)] sm:rounded-3xl">
            {activeStory.image_url && <Image src={activeStory.image_url} alt="" fill sizes="(max-width: 640px) 100vw, 448px" unoptimized className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/20 to-black/80" />
            <header className="relative z-10 flex items-center justify-between gap-3">
              <div className="min-w-0"><strong className="block truncate text-sm">{activeStory.alias}</strong><span className="text-xs text-white/70">{activeStory.mood} · {createdLabel(activeStory.created_at)} · còn {remainingHours(activeStory.expires_at)}</span></div>
              <button type="button" onClick={() => setActiveStoryId(null)} className="min-h-11 min-w-11 rounded-xl bg-white/10" aria-label="Đóng Stories">✕</button>
            </header>
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-5 py-8"><p className="whitespace-pre-wrap text-center text-xl font-medium leading-relaxed drop-shadow-lg">{getStoryBody(activeStory.caption) || activeStory.mood}</p>
              {getStorySticker(activeStory.caption, "[HỎI ẨN DANH]") && <span className="rounded-full border border-fuchsia-200/30 bg-fuchsia-500/20 px-4 py-2 text-xs">💌 {getStorySticker(activeStory.caption, "[HỎI ẨN DANH]")}</span>}
              {getStorySticker(activeStory.caption, "[BÌNH CHỌN]") && {parseStoryPoll(activeStory.caption) && <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/35 p-3"><strong className="text-sm">📊 {parseStoryPoll(activeStory.caption)?.question}</strong>{parseStoryPoll(activeStory.caption)?.options.map((option,index)=>{const total=pollResults[0]+pollResults[1];const percent=total?Math.round((pollResults[index]/total)*100):0;return <button key={option} type="button" disabled={pollVoteBusy||pollVoted} onClick={()=>void voteOnStoryPoll(index)} className="mt-2 flex min-h-10 w-full items-center justify-between rounded-xl border border-white/15 bg-white/10 px-3 text-left text-xs disabled:opacity-75"><span>{option}</span><span>{total?(`${pollResults[index]} · ${percent}%`):"Bình chọn"}</span></button>;})}{pollNotice&&<p className="mt-2 text-[10px] text-white/75" role="status">{pollNotice}</p>}</div>}}
              {getStorySticker(activeStory.caption, "[ĐANG NGHE]") && <span className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs">♫ {getStorySticker(activeStory.caption, "[ĐANG NGHE]")}</span>}
              {activeStory.caption?.includes("[HỎI ẨN DANH]") && <form onSubmit={(event) => { event.preventDefault(); void sendAnonymousQuestion(); }} className="w-full max-w-sm space-y-2 rounded-2xl border border-white/20 bg-black/35 p-3 backdrop-blur"><strong className="block text-sm">💌 {getStorySticker(activeStory.caption, "[HỎI ẨN DANH]") || "Gửi câu hỏi ẩn danh"}</strong><textarea value={questionDraft} onChange={(event) => setQuestionDraft(event.target.value)} maxLength={500} rows={2} placeholder="Viết câu hỏi của bạn…" className="w-full rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-white placeholder:text-white/55" /><button type="submit" disabled={!questionDraft.trim() || questionBusy} className="min-h-10 rounded-xl bg-fuchsia-600 px-4 text-xs font-semibold disabled:opacity-50">{questionBusy ? "Đang gửi…" : "Gửi ẩn danh"}</button>{questionNotice && <p className="text-xs text-white/80" role="status">{questionNotice}</p>}</form>}
              {storyQuestions.length>0 && <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-black/35 p-3"><strong className="text-sm">Hộp thư câu hỏi · {storyQuestions.length}</strong>{storyQuestions.map((item)=><p key={item.id} className="mt-2 rounded-xl bg-white/10 p-2 text-sm">{item.question}</p>)}</div>}
            </div>
            <footer className="relative z-10 flex items-center justify-between gap-3">
              <span className="text-xs text-white/80">♡ {activeStory.heart_count} · ✧ {activeStory.warmth_count}</span>
              <div className="flex gap-2"><button type="button" disabled={reactionBusy} onClick={() => void reactToStory("heart")} className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-3 text-sm disabled:opacity-50">♡ Quan tâm</button><button type="button" disabled={reactionBusy} onClick={() => void reactToStory("warmth")} className="min-h-11 rounded-xl bg-rose-600 px-3 text-sm font-semibold disabled:opacity-50">✧ Gửi ấm áp</button></div>
            </footer>
            <div className="relative z-10 mt-4 flex justify-between"><button type="button" onClick={() => setActiveStoryId(activeIndex > 0 ? stories[activeIndex - 1].id : activeStoryId)} className="text-xs text-white/75">← Trước</button><button type="button" onClick={() => setActiveStoryId(activeIndex >= 0 && activeIndex + 1 < stories.length ? stories[activeIndex + 1].id : null)} className="text-xs text-white/75">Tiếp →</button></div>
          </article>
        </div>
      )}
    </section>
  );
}
