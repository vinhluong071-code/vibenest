"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useVibeStories } from "@/hooks/useVibeStories";
import type { VibeStory, VibeStoryReaction } from "@/lib/vibe/types";

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

function createdLabel(createdAt: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return "Vừa đăng";
  if (minutes < 60) return `${minutes} phút trước`;
  return `${Math.floor(minutes / 60)} giờ trước`;
}

function StoryTile({ story, onOpen }: { story: VibeStory; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}
      className="relative flex h-[152px] w-[106px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-950 via-slate-900 to-rose-950 p-3 text-left shadow-md transition-transform hover:-translate-y-0.5 active:scale-95">
      {story.image_url && <Image src={story.image_url} alt="" fill sizes="106px" unoptimized className="absolute inset-0 h-full w-full object-cover" />}
      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/45" />
      <span className="relative z-10 flex items-center justify-between gap-1 text-[10px] text-white/80">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-black/40 text-xs font-semibold">{story.alias.slice(0, 1).toUpperCase()}</span>
        <span>{remainingHours(story.expires_at)}</span>
      </span>
      <span className="relative z-10 min-w-0">
        <span className="mb-1 block line-clamp-2 text-[11px] leading-snug text-white/90">{story.caption || story.mood}</span>
        <strong className="block truncate text-[11px] text-white">{story.alias}</strong>
      </span>
    </button>
  );
}

export function VibeStoriesBar({ currentUserName, currentUserHandle, onNotify }: Props) {
  const { stories, loading, error, createStory, toggleWarmth, refreshStories } = useVibeStories(true, 60);
  const [composerOpen, setComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<(typeof moods)[number]>("Đêm muộn");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [reactionBusy, setReactionBusy] = useState(false);

  const activeStory = activeIndex === null ? null : stories[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex === null) return;
    if (!activeStory) {
      setActiveIndex(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => index === null ? null : index + 1 < stories.length ? index + 1 : null);
    }, 5_500);
    return () => window.clearTimeout(timer);
  }, [activeIndex, activeStory, stories.length]);

  async function submitStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = caption.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await createStory({
        alias: currentUserName.trim().slice(0, 48),
        mood,
        location: location.trim().slice(0, 120) || null,
        caption: text.slice(0, 500),
      });
      setCaption("");
      setLocation("");
      setComposerOpen(false);
      onNotify?.("Khoảnh khắc 24h đã được lưu và đồng bộ với VibeNest.");
    } catch (cause) {
      onNotify?.(cause instanceof Error ? cause.message : "Chưa thể đăng Khoảnh khắc. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
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
          className="flex h-[152px] w-[106px] shrink-0 flex-col justify-between rounded-2xl border border-dashed border-rose-500/45 bg-gradient-to-b from-slate-100 to-slate-200/70 p-3 text-left transition-transform active:scale-95 dark:from-white/[0.06] dark:to-white/[0.02]">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm font-semibold text-rose-600">{currentUserName.slice(0, 1).toUpperCase()}</span>
          <span><strong className="block text-xs text-slate-900 dark:text-white">Tạo khoảnh khắc</strong><small className="text-[10px] text-slate-500 dark:text-slate-400">Lưu giữ 24 giờ</small></span>
        </button>
        {stories.map((story) => <StoryTile key={story.id} story={story} onOpen={() => setActiveIndex(stories.findIndex((item) => item.id === story.id))} />)}
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
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">Khoảnh khắc của bạn
              <textarea value={caption} onChange={(event) => setCaption(event.target.value)} required maxLength={500} rows={4} placeholder="Chia sẻ một điều nhỏ trong ngày…" className="w-full resize-none rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-white/10" />
            </label>
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
              <button type="button" onClick={() => setActiveIndex(null)} className="min-h-11 min-w-11 rounded-xl bg-white/10" aria-label="Đóng Stories">✕</button>
            </header>
            <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-8"><p className="whitespace-pre-wrap text-center text-xl font-medium leading-relaxed drop-shadow-lg">{activeStory.caption || activeStory.mood}</p></div>
            <footer className="relative z-10 flex items-center justify-between gap-3">
              <span className="text-xs text-white/80">♡ {activeStory.heart_count} · ✧ {activeStory.warmth_count}</span>
              <div className="flex gap-2"><button type="button" disabled={reactionBusy} onClick={() => void reactToStory("heart")} className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-3 text-sm disabled:opacity-50">♡ Quan tâm</button><button type="button" disabled={reactionBusy} onClick={() => void reactToStory("warmth")} className="min-h-11 rounded-xl bg-rose-600 px-3 text-sm font-semibold disabled:opacity-50">✧ Gửi ấm áp</button></div>
            </footer>
            <div className="relative z-10 mt-4 flex justify-between"><button type="button" onClick={() => setActiveIndex((index) => index !== null && index > 0 ? index - 1 : index)} className="text-xs text-white/75">← Trước</button><button type="button" onClick={() => setActiveIndex((index) => index !== null && index + 1 < stories.length ? index + 1 : null)} className="text-xs text-white/75">Tiếp →</button></div>
          </article>
        </div>
      )}
    </section>
  );
}
