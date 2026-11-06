'use client';

import React, { useMemo, useState } from 'react';
import { getAvatarThemeFromIdentity } from '../../lib/avatar-hash';
import { useVibeStories } from '../../hooks/useVibeStories';
import type { VibeStory, VibeStoryReaction } from '../../lib/vibe/types';

export type StoryMood = 'Đêm muộn' | 'Chênh vênh' | 'Chữa lành' | 'Thầm thương';
export type StoryCanvasPreset = 'rose-dusk' | 'midnight-indigo' | 'amber-rain' | 'emerald-mist';

export interface VibeStoriesBarProps {
  currentUserName: string;
  currentUserHandle: string;
  onNotify?: (message: string) => void;
  enabled?: boolean;
}

const STORY_PRESETS: Record<StoryCanvasPreset, { label: string; cardGradient: string }> = {
  'rose-dusk': {
    label: 'Chiều tà Sài Gòn',
    cardGradient: 'bg-gradient-to-br from-[#3b122b] via-[#1c1330] to-[#0b0f19]',
  },
  'midnight-indigo': {
    label: 'Đêm sương Đà Lạt',
    cardGradient: 'bg-gradient-to-br from-[#172347] via-[#10182b] to-[#080b12]',
  },
  'amber-rain': {
    label: 'Đèn vàng phố cũ',
    cardGradient: 'bg-gradient-to-br from-[#3d2414] via-[#1f1624] to-[#090c14]',
  },
  'emerald-mist': {
    label: 'Mưa đầu mùa',
    cardGradient: 'bg-gradient-to-br from-[#11332f] via-[#111d2d] to-[#080b12]',
  },
};

const MOODS: StoryMood[] = ['Đêm muộn', 'Chênh vênh', 'Chữa lành', 'Thầm thương'];

function normalizePreset(value: string): StoryCanvasPreset {
  const normalized = value === 'dusk-rose' ? 'rose-dusk' : value;
  return normalized in STORY_PRESETS ? (normalized as StoryCanvasPreset) : 'rose-dusk';
}

function formatRemainingHours(expiresAt: string): string {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  return `${Math.max(1, Math.ceil(remaining / 3_600_000))}h`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function getStoryReaction(story: VibeStory): VibeStoryReaction {
  return story.my_reaction ?? 'warmth';
}

export const VibeStoriesBar: React.FC<VibeStoriesBarProps> = ({
  currentUserName,
  currentUserHandle,
  onNotify,
  enabled = true,
}) => {
  const { stories, loading, error, refreshStories, createStory, toggleWarmth } = useVibeStories(enabled);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<VibeStory | null>(null);
  const [caption, setCaption] = useState('');
  const [mood, setMood] = useState<StoryMood>('Đêm muộn');
  const [location, setLocation] = useState('Sài Gòn');
  const [preset, setPreset] = useState<StoryCanvasPreset>('rose-dusk');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentUserTheme = getAvatarThemeFromIdentity(currentUserHandle);
  const visibleStories = useMemo(
    () => stories.filter((story) => new Date(story.expires_at).getTime() > Date.now()),
    [stories],
  );

  const handleCreateStory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caption.trim() || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      await createStory({
        alias: currentUserName.trim(),
        mood,
        location: location.trim(),
        caption: caption.trim(),
        canvasPreset: preset,
      });
      setCaption('');
      setIsComposerOpen(false);
      onNotify?.('Đã đăng Khoảnh khắc 24h lên VibeNest.');
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Không thể đăng Khoảnh khắc. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleWarmth = async (story: VibeStory) => {
    try {
      await toggleWarmth(story.id, getStoryReaction(story));
      setActiveStory(null);
      onNotify?.('Đã gửi hơi ấm đến Khoảnh khắc.');
    } catch (reactionError) {
      setActionError(reactionError instanceof Error ? reactionError.message : 'Không thể gửi hơi ấm. Vui lòng thử lại.');
    }
  };

  return (
    <section
      aria-label="Khoảnh khắc 24h"
      className="rounded-3xl p-4 bg-white/85 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Khoảnh khắc 24h</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Chạm để xem và gửi hơi ấm</span>
        </div>
        <span className="font-mono text-[11px] text-rose-600 dark:text-rose-400 tabular-nums">
          {visibleStories.length} khoảnh khắc
        </span>
      </div>

      {actionError && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400" role="alert">{actionError}</p>}
      {error && (
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-rose-600 dark:text-rose-400" role="status">
          <span>{error}</span>
          <button type="button" onClick={() => void refreshStories()} className="underline">Thử lại</button>
        </div>
      )}

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setIsComposerOpen(true)}
          className="group relative w-[106px] h-[152px] rounded-2xl overflow-hidden shrink-0 border border-dashed border-rose-500/45 hover:border-rose-500 bg-gradient-to-b from-slate-100 to-slate-200/70 dark:from-white/[0.06] dark:to-white/[0.02] flex flex-col justify-between p-3 text-left transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <div className="flex items-center justify-between">
            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center font-display font-semibold text-xs ${currentUserTheme.textClass}`}
              style={{ background: currentUserTheme.bgStyle, borderColor: currentUserTheme.borderStyle }}
            >
              {currentUserTheme.initial}
            </div>
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-rose-600/30 group-hover:scale-105 transition-transform">+</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">Tạo khoảnh khắc</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Lưu giữ 24 giờ</p>
          </div>
        </button>

        {loading && !visibleStories.length && (
          <div className="h-[152px] min-w-[106px] flex items-center justify-center text-[11px] text-slate-400">Đang tải…</div>
        )}

        {visibleStories.map((story) => {
          const theme = getAvatarThemeFromIdentity(story.alias);
          const storyPreset = normalizePreset(story.canvas_preset);
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => setActiveStory(story)}
              className={`group relative w-[106px] h-[152px] rounded-2xl overflow-hidden shrink-0 flex flex-col justify-between p-2.5 text-left transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 shadow-md ${STORY_PRESETS[storyPreset].cardGradient} ring-2 ring-rose-500/90`}
            >
              {story.image_url && (
                <div className="absolute inset-0 z-0">
                  <img src={story.image_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/50" />
                </div>
              )}
              <div className="relative z-10 flex items-center justify-between gap-1">
                <div className="p-[1.5px] rounded-xl bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500">
                  <div className="w-7 h-7 rounded-[10px] border flex items-center justify-center font-display font-semibold text-[11px] bg-slate-950/90 text-white" style={{ borderColor: theme.borderStyle }}>
                    {story.alias.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-white/80 tabular-nums drop-shadow">{formatRemainingHours(story.expires_at)}</span>
              </div>
              <div className="relative z-10">
                <p className="text-[11px] text-white/90 line-clamp-2 leading-snug mb-1 drop-shadow-sm">{story.caption || story.mood}</p>
                <p className="text-[11px] font-semibold text-white truncate drop-shadow">{story.alias}</p>
                <p className="text-[9px] text-white/70 truncate">{STORY_PRESETS[storyPreset].label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {isComposerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <section className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-white/10 p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="story-composer-title">
            <div className="flex items-center justify-between mb-4">
              <div><h3 id="story-composer-title" className="text-base font-semibold text-slate-900 dark:text-white">Tạo Khoảnh khắc 24h</h3><p className="text-xs text-slate-500 mt-1">Khoảnh khắc sẽ tự hết hạn sau 24 giờ.</p></div>
              <button type="button" onClick={() => setIsComposerOpen(false)} className="min-w-10 min-h-10 rounded-xl text-slate-500" aria-label="Đóng">×</button>
            </div>
            <form onSubmit={handleCreateStory} className="space-y-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Tâm trạng
                <select value={mood} onChange={(event) => setMood(event.target.value as StoryMood)} className="mt-1 w-full min-h-11 rounded-xl px-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm">
                  {MOODS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Địa điểm
                <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={80} className="mt-1 w-full min-h-11 rounded-xl px-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm" placeholder="Không bắt buộc" />
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Không gian màu
                <select value={preset} onChange={(event) => setPreset(event.target.value as StoryCanvasPreset)} className="mt-1 w-full min-h-11 rounded-xl px-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm">
                  {Object.entries(STORY_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Khoảnh khắc của bạn
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} required maxLength={500} rows={4} placeholder="Một điều nhỏ đang ở trong tâm trí bạn…" className="mt-1 w-full rounded-xl px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm resize-y" />
              </label>
              <button type="submit" disabled={saving || !caption.trim()} className="w-full min-h-11 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? 'Đang đăng…' : 'Đăng Khoảnh khắc'}
              </button>
            </form>
          </section>
        </div>
      )}

      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setActiveStory(null)}>
          <article className={`relative w-full max-w-sm min-h-[520px] rounded-3xl overflow-hidden p-6 flex flex-col justify-between text-white shadow-2xl ${STORY_PRESETS[normalizePreset(activeStory.canvas_preset)].cardGradient}`} onClick={(event) => event.stopPropagation()}>
            {activeStory.image_url && <img src={activeStory.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />}
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/80" />
            <div className="relative z-10 flex items-center justify-between">
              <div><p className="font-semibold">{activeStory.alias}</p><p className="text-xs text-white/70">{formatTime(activeStory.created_at)} · {formatRemainingHours(activeStory.expires_at)} còn lại</p></div>
              <button type="button" onClick={() => setActiveStory(null)} className="w-10 h-10 rounded-full bg-black/30 text-white" aria-label="Đóng Khoảnh khắc">×</button>
            </div>
            <div className="relative z-10 py-8">
              <p className="text-xs uppercase tracking-widest text-white/70 mb-3">{activeStory.mood}{activeStory.location ? ` · ${activeStory.location}` : ''}</p>
              <p className="text-xl font-medium leading-relaxed">{activeStory.caption || 'Một khoảnh khắc không lời.'}</p>
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-xs text-white/75">♡ {(activeStory.heart_count ?? 0) + (activeStory.warmth_count ?? 0)} hơi ấm</span>
              <button type="button" onClick={() => void handleWarmth(activeStory)} className="min-h-11 px-4 rounded-xl bg-white text-slate-900 text-sm font-semibold">Gửi hơi ấm ♡</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
};

export default VibeStoriesBar;
