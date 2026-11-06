'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAvatarThemeFromAlias } from '../../lib/avatar-hash';

export interface VibeStoryItem {
  id: string;
  alias: string;
  mood: string;
  location: string;
  caption: string;
  imageUrl?: string;
  canvasPreset: 'dusk-rose' | 'midnight-indigo' | 'amber-rain' | 'emerald-mist';
  createdAt: number;
  expiresAt: number;
  warmthCount: number;
  warmedByMe: boolean;
  seen: boolean;
}

export interface VibeStoriesBarProps {
  currentAlias: string;
  initialStories?: VibeStoryItem[];
  onStoryCreated?: (story: VibeStoryItem) => void;
  onStoryWarmthToggled?: (storyId: string, warmed: boolean) => void;
  onStoryReplySent?: (storyId: string, replyText: string) => void;
}

const CANVAS_PRESET_STYLES: Record<
  VibeStoryItem['canvasPreset'],
  { label: string; bgClass: string; previewStyle: string }
> = {
  'dusk-rose': {
    label: 'Chiều tà Sài Gòn',
    bgClass: 'bg-gradient-to-br from-[#2a1224] via-[#171226] to-[#0b0f19]',
    previewStyle: 'linear-gradient(135deg, #e11d48 0%, #4f46e5 100%)',
  },
  'midnight-indigo': {
    label: 'Đêm sương Đà Lạt',
    bgClass: 'bg-gradient-to-br from-[#131b38] via-[#0e1526] to-[#080b12]',
    previewStyle: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)',
  },
  'amber-rain': {
    label: 'Đèn vàng phố cũ',
    bgClass: 'bg-gradient-to-br from-[#2d1d12] via-[#19141d] to-[#090c14]',
    previewStyle: 'linear-gradient(135deg, #f59e0b 0%, #e11d48 100%)',
  },
  'emerald-mist': {
    label: 'Mưa đầu mùa',
    bgClass: 'bg-gradient-to-br from-[#0f2926] via-[#101a28] to-[#080b12]',
    previewStyle: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
  },
};

const DEFAULT_STORIES: VibeStoryItem[] = [
  {
    id: 'st-201',
    alias: 'Cú Đêm Sài Gòn #812',
    mood: 'Đêm muộn',
    location: 'Sài Gòn',
    caption: 'Góc ban công 1h sáng sau cơn mưa rào. Tự thưởng một lon nước ngọt lạnh và thấy lòng dịu lại.',
    canvasPreset: 'dusk-rose',
    createdAt: Date.now() - 2 * 3600 * 1000,
    expiresAt: Date.now() + 22 * 3600 * 1000,
    warmthCount: 34,
    warmedByMe: false,
    seen: false,
  },
  {
    id: 'st-202',
    alias: 'Nắng Chiều Muộn #642',
    mood: 'Chữa lành',
    location: 'Đà Lạt',
    caption: 'Hôm nay mình đã dám từ chối một cuộc hẹn làm mình mệt mỏi. Một bước nhỏ học cách yêu bản thân.',
    canvasPreset: 'midnight-indigo',
    createdAt: Date.now() - 5 * 3600 * 1000,
    expiresAt: Date.now() + 19 * 3600 * 1000,
    warmthCount: 61,
    warmedByMe: true,
    seen: false,
  },
  {
    id: 'st-203',
    alias: 'Tách Trà Nóng #204',
    mood: 'Biết ơn',
    location: 'Hà Nội',
    caption: 'Bác bảo vệ tòa nhà hôm nay nhớ tên mình và dắt giúp xe lúc trời đổ mưa. Những điều tử tế nhỏ bé.',
    canvasPreset: 'amber-rain',
    createdAt: Date.now() - 9 * 3600 * 1000,
    expiresAt: Date.now() + 15 * 3600 * 1000,
    warmthCount: 49,
    warmedByMe: false,
    seen: false,
  },
  {
    id: 'st-204',
    alias: 'Gió Mùa Thu #519',
    mood: 'Thầm thương',
    location: 'Đà Nẵng',
    caption: 'Chuyến xe buýt cuối ngày hôm nay vắng tanh, chỉ có tiếng nhạc trong tai nghe và nỗi nhớ một người.',
    canvasPreset: 'emerald-mist',
    createdAt: Date.now() - 14 * 3600 * 1000,
    expiresAt: Date.now() + 10 * 3600 * 1000,
    warmthCount: 28,
    warmedByMe: false,
    seen: true,
  },
];

const STORY_DURATION_MS = 5500;

function formatRemainingHours(expiresAt: number): string {
  const diffMs = Math.max(0, expiresAt - Date.now());
  const hours = Math.max(1, Math.ceil(diffMs / (3600 * 1000)));
  return `${hours}h`;
}

export function VibeStoriesBar({
  currentAlias,
  initialStories = DEFAULT_STORIES,
  onStoryCreated,
  onStoryWarmthToggled,
  onStoryReplySent,
}: VibeStoriesBarProps) {
  const [stories, setStories] = useState<VibeStoryItem[]>(() =>
    initialStories.filter((s) => s.expiresAt > Date.now())
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [replyInput, setReplyInput] = useState<string>('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Story Creator State
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [composeCaption, setComposeCaption] = useState<string>('');
  const [composeMood, setComposeMood] = useState<string>('Đêm muộn');
  const [composeLocation, setComposeLocation] = useState<string>('Sài Gòn');
  const [composePreset, setComposePreset] = useState<VibeStoryItem['canvasPreset']>('dusk-rose');
  const [composeImageUrl, setComposeImageUrl] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentUserAvatar = getAvatarThemeFromAlias(currentAlias);

  const triggerFeedback = useCallback((msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => {
      setFeedbackNotice((prev) => (prev === msg ? null : prev));
    }, 2200);
  }, []);

  const openStoryAt = (index: number) => {
    setStories((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, seen: true } : item))
    );
    setProgress(0);
    setActiveIndex(index);
  };

  const closeViewer = useCallback(() => {
    setActiveIndex(null);
    setProgress(0);
    setReplyInput('');
    setIsPaused(false);
  }, []);

  const goNextStory = useCallback(() => {
    if (activeIndex === null) return;
    if (activeIndex < stories.length - 1) {
      const nextIdx = activeIndex + 1;
      setStories((prev) =>
        prev.map((item, idx) => (idx === nextIdx ? { ...item, seen: true } : item))
      );
      setActiveIndex(nextIdx);
      setProgress(0);
    } else {
      closeViewer();
    }
  }, [activeIndex, stories.length, closeViewer]);

  const goPrevStory = useCallback(() => {
    if (activeIndex === null) return;
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [activeIndex]);

  // Auto-advance timer for active story
  useEffect(() => {
    if (activeIndex === null || isPaused) return;

    const intervalMs = 50;
    const stepIncrement = (intervalMs / STORY_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + stepIncrement >= 100) {
          goNextStory();
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeIndex, isPaused, goNextStory]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setComposeImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeCaption.trim() && !composeImageUrl) return;

    const now = Date.now();
    const newStory: VibeStoryItem = {
      id: `st-${now}`,
      alias: currentAlias,
      mood: composeMood,
      location: composeLocation,
      caption: composeCaption.trim() || 'Khoảnh khắc không lời đêm nay.',
      imageUrl: composeImageUrl,
      canvasPreset: composePreset,
      createdAt: now,
      expiresAt: now + 24 * 3600 * 1000,
      warmthCount: 1,
      warmedByMe: true,
      seen: false,
    };

    setStories((prev) => [newStory, ...prev]);
    onStoryCreated?.(newStory);
    setComposeCaption('');
    setComposeImageUrl(undefined);
    setIsComposerOpen(false);
    triggerFeedback('Đã đăng Khoảnh khắc 24h ẩn danh');
  };

  const activeStory = activeIndex !== null ? stories[activeIndex] : null;
  const activeStoryAvatar = activeStory ? getAvatarThemeFromAlias(activeStory.alias) : null;

  return (
    <section aria-label="Khoảnh khắc 24 giờ ẩn danh" className="relative">
      {/* Horizontal Circular Bubble Strip */}
      <div className="glass-surface rounded-2xl p-4 bg-white/80 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">Khoảnh khắc 24h</span>
            <span aria-hidden="true">·</span>
            <span>Tự hủy sau 24 giờ</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {stories.length} đang mở
          </span>
        </div>

        <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. Add New 24h Story Bubble */}
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="group flex flex-col items-center gap-1.5 shrink-0 min-w-[68px] focus-visible:outline-none"
          >
            <div className="relative p-[2.5px] rounded-full border border-dashed border-rose-500/60 group-hover:border-rose-500 transition-transform duration-200 group-active:scale-95">
              <div
                className={`w-14 h-14 rounded-full border flex items-center justify-center font-display font-semibold text-base ${currentUserAvatar.textClass}`}
                style={{
                  background: currentUserAvatar.bgStyle,
                  borderColor: currentUserAvatar.borderStyle,
                }}
              >
                {currentUserAvatar.initial}
              </div>
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white dark:ring-[#080b12]"
              >
                +
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[72px] truncate">
              Đăng 24h
            </span>
          </button>

          {/* 2. Active 24h Story Bubbles */}
          {stories.map((story, idx) => {
            const avatarTheme = getAvatarThemeFromAlias(story.alias);
            const remainingLabel = formatRemainingHours(story.expiresAt);

            return (
              <button
                key={story.id}
                type="button"
                onClick={() => openStoryAt(idx)}
                className="group flex flex-col items-center gap-1.5 shrink-0 min-w-[68px] focus-visible:outline-none"
              >
                <div
                  className={`relative p-[2.5px] rounded-full transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${
                    story.seen
                      ? 'bg-slate-200 dark:bg-white/15'
                      : 'bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500'
                  }`}
                >
                  <div className="p-[2px] rounded-full bg-white dark:bg-[#080b12]">
                    {story.imageUrl ? (
                      <img
                        src={story.imageUrl}
                        alt={story.alias}
                        referrerPolicy="no-referrer"
                        className="w-[52px] h-[52px] rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-[52px] h-[52px] rounded-full border flex items-center justify-center font-display font-semibold text-sm ${avatarTheme.textClass}`}
                        style={{
                          background: avatarTheme.bgStyle,
                          borderColor: avatarTheme.borderStyle,
                        }}
                      >
                        {avatarTheme.initial}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-slate-900/90 dark:bg-night-900/95 text-[9px] font-mono text-slate-200 tabular-nums border border-white/10">
                    {remainingLabel}
                  </span>
                </div>
                <span
                  className={`text-[11px] max-w-[74px] truncate ${
                    story.seen
                      ? 'font-normal text-slate-500 dark:text-slate-400'
                      : 'font-semibold text-slate-900 dark:text-white'
                  }`}
                >
                  {story.alias.split('#')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FULL-SCREEN / MODAL 24H STORY VIEWER */}
      {activeStory && activeStoryAvatar && activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Khoảnh khắc 24h của ${activeStory.alias}`}
        >
          <div
            className={`relative w-full h-full sm:h-[640px] sm:max-w-[400px] sm:rounded-3xl overflow-hidden flex flex-col justify-between border border-white/15 shadow-2xl ${
              CANVAS_PRESET_STYLES[activeStory.canvasPreset].bgClass
            }`}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Optional Uploaded Photo Backdrop with Measured Scrim */}
            {activeStory.imageUrl && (
              <div className="absolute inset-0 z-0">
                <img
                  src={activeStory.imageUrl}
                  alt={activeStory.caption}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/60" />
              </div>
            )}

            {/* Top Segmented Progress Bars & Author Header */}
            <div className="relative z-10 p-4 pt-5 space-y-3 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-1.5">
                {stories.map((st, idx) => {
                  const barWidth =
                    idx < activeIndex ? 100 : idx === activeIndex ? progress : 0;
                  return (
                    <div
                      key={st.id}
                      className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden"
                    >
                      <div
                        className="h-full bg-white transition-all duration-75"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center font-display font-semibold text-xs shrink-0 ${activeStoryAvatar.textClass}`}
                    style={{
                      background: activeStoryAvatar.bgStyle,
                      borderColor: activeStoryAvatar.borderStyle,
                    }}
                  >
                    {activeStoryAvatar.initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {activeStory.alias}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-white/75">
                      <span>{activeStory.mood}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeStory.location}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Tự hủy sau {formatRemainingHours(activeStory.expiresAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeViewer}
                  aria-label="Đóng khoảnh khắc"
                  className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Center Story Content with Left/Right Tap Navigation Zones */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-7 py-6 select-none">
              <button
                type="button"
                aria-label="Khoảnh khắc trước"
                onClick={goPrevStory}
                className="absolute inset-y-0 left-0 w-1/3 z-10 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Khoảnh khắc tiếp theo"
                onClick={goNextStory}
                className="absolute inset-y-0 right-0 w-1/3 z-10 focus:outline-none"
              />

              <p
                className="font-display text-xl sm:text-2xl font-medium text-white text-center leading-relaxed drop-shadow-sm"
                style={{ textWrap: 'balance' }}
              >
                “{activeStory.caption}”
              </p>
            </div>

            {/* Bottom Interactive Reply & Warmth Bar */}
            <div
              className="relative z-20 p-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent space-y-2.5"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {feedbackNotice && (
                <div className="text-center text-xs font-medium text-emerald-300 py-1">
                  {feedbackNotice}
                </div>
              )}

              <div className="flex items-center gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!replyInput.trim()) return;
                    onStoryReplySent?.(activeStory.id, replyInput.trim());
                    setReplyInput('');
                    setIsPaused(false);
                    triggerFeedback('Đã gửi lời nhắn ẩn danh tới khoảnh khắc này');
                  }}
                  className="flex-1 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={replyInput}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                    onChange={(e) => setReplyInput(e.target.value)}
                    maxLength={180}
                    placeholder="Gửi lời vỗ về cho khoảnh khắc này..."
                    className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-white/55 focus:outline-none focus:border-rose-400"
                  />
                  {replyInput.trim().length > 0 && (
                    <button
                      type="submit"
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                    >
                      Gửi
                    </button>
                  )}
                </form>

                <button
                  type="button"
                  onClick={() => {
                    const nextWarmed = !activeStory.warmedByMe;
                    setStories((prev) =>
                      prev.map((st) =>
                        st.id === activeStory.id
                          ? {
                              ...st,
                              warmedByMe: nextWarmed,
                              warmthCount: st.warmthCount + (nextWarmed ? 1 : -1),
                            }
                          : st
                      )
                    );
                    onStoryWarmthToggled?.(activeStory.id, nextWarmed);
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-all shrink-0 ${
                    activeStory.warmedByMe
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                  }`}
                >
                  <span>♥</span>
                  <span className="font-mono tabular-nums">{activeStory.warmthCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE 24H STORY MODAL / SHEET */}
      {isComposerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-story-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsComposerOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl backdrop-blur-2xl bg-white/95 dark:bg-[#0d121f]/95 border-t sm:border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2
                  id="create-story-modal-title"
                  className="font-display text-lg font-semibold text-slate-900 dark:text-white"
                >
                  Đăng Khoảnh khắc 24h
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tự động xóa hoàn toàn sau 24 giờ · Ẩn danh dưới tên {currentAlias}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                aria-label="Đóng cửa sổ"
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="space-y-4">
              {/* Live Story Card Preview */}
              <div
                className={`relative h-48 rounded-2xl overflow-hidden p-5 flex items-center justify-center border border-white/15 ${
                  CANVAS_PRESET_STYLES[composePreset].bgClass
                }`}
              >
                {composeImageUrl && (
                  <div className="absolute inset-0">
                    <img
                      src={composeImageUrl}
                      alt="Xem trước ảnh khoảnh khắc"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                  </div>
                )}
                <p className="relative z-10 font-display text-base text-white text-center leading-relaxed line-clamp-4">
                  {composeCaption.trim() || 'Viết vài dòng ngắn hoặc chọn ảnh cho khoảnh khắc 24h...'}
                </p>
              </div>

              {/* Backdrop Aura Selector & Photo Upload */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {(
                    Object.keys(CANVAS_PRESET_STYLES) as Array<VibeStoryItem['canvasPreset']>
                  ).map((presetKey) => (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => setComposePreset(presetKey)}
                      title={CANVAS_PRESET_STYLES[presetKey].label}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        composePreset === presetKey
                          ? 'scale-110 border-white ring-2 ring-rose-500'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                      style={{ background: CANVAS_PRESET_STYLES[presetKey].previewStyle }}
                    />
                  ))}
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-rose-500/40 transition-colors whitespace-nowrap"
                  >
                    {composeImageUrl ? 'Đổi ảnh khác' : '+ Chọn ảnh nền'}
                  </button>
                </div>
              </div>

              {/* Mood & Location */}
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={composeMood}
                  onChange={(e) => setComposeMood(e.target.value)}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="Đêm muộn">Đêm muộn</option>
                  <option value="Chênh vênh">Chênh vênh</option>
                  <option value="Chữa lành">Chữa lành</option>
                  <option value="Biết ơn">Biết ơn</option>
                  <option value="Thầm thương">Thầm thương</option>
                </select>

                <select
                  value={composeLocation}
                  onChange={(e) => setComposeLocation(e.target.value)}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="Sài Gòn">Sài Gòn</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Đà Lạt">Đà Lạt</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                </select>
              </div>

              {/* Short Caption Input */}
              <div>
                <textarea
                  rows={3}
                  maxLength={180}
                  value={composeCaption}
                  onChange={(e) => setComposeCaption(e.target.value)}
                  placeholder="Khoảnh khắc ngắn bạn muốn lưu lại trong 24 giờ tới..."
                  className="w-full p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 resize-none"
                />
                <div className="flex justify-end text-[11px] font-mono text-slate-400 tabular-nums mt-1">
                  {composeCaption.length}/180
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all whitespace-nowrap"
                >
                  Đăng Khoảnh khắc 24h
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
