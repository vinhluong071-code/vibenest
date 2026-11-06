'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getAvatarThemeFromIdentity } from '../../lib/avatar-hash';

export type StoryMood = 'Đêm muộn' | 'Chênh vênh' | 'Chữa lành' | 'Thầm thương';
export type StoryCanvasPreset = 'dusk-rose' | 'midnight-indigo' | 'amber-rain' | 'emerald-mist';

export interface VibeStoryItem {
  id: string;
  displayName: string;
  handle: string;
  mood: StoryMood;
  location: string;
  caption: string;
  imageUrl?: string;
  canvasPreset: StoryCanvasPreset;
  createdAt: number;
  expiresAt: number;
  warmthCount: number;
  warmedByMe: boolean;
  seen: boolean;
}

export interface VibeStoriesBarProps {
  currentUserName: string;
  currentUserHandle: string;
  onNotify?: (message: string) => void;
}

const STORY_PRESETS: Record<
  StoryCanvasPreset,
  { label: string; cardGradient: string; dotColor: string }
> = {
  'dusk-rose': {
    label: 'Chiều tà Sài Gòn',
    cardGradient: 'bg-gradient-to-br from-[#3b122b] via-[#1c1330] to-[#0b0f19]',
    dotColor: 'linear-gradient(135deg, #e11d48 0%, #4f46e5 100%)',
  },
  'midnight-indigo': {
    label: 'Đêm sương Đà Lạt',
    cardGradient: 'bg-gradient-to-br from-[#172347] via-[#10182b] to-[#080b12]',
    dotColor: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)',
  },
  'amber-rain': {
    label: 'Đèn vàng phố cũ',
    cardGradient: 'bg-gradient-to-br from-[#3d2414] via-[#1f1624] to-[#090c14]',
    dotColor: 'linear-gradient(135deg, #f59e0b 0%, #e11d48 100%)',
  },
  'emerald-mist': {
    label: 'Mưa đầu mùa',
    cardGradient: 'bg-gradient-to-br from-[#11332f] via-[#111d2d] to-[#080b12]',
    dotColor: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
  },
};

const INITIAL_STORIES: VibeStoryItem[] = [
  {
    id: 'st-301',
    displayName: 'Bảo Ngọc',
    handle: 'baongoc.film',
    mood: 'Đêm muộn',
    location: 'Sài Gòn',
    caption: 'Góc ban công 1h sáng sau cơn mưa rào, ánh đèn phố phản chiếu xuống mặt đường ướt lấp lánh.',
    imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=700&q=80',
    canvasPreset: 'dusk-rose',
    createdAt: Date.now() - 2 * 3600 * 1000,
    expiresAt: Date.now() + 22 * 3600 * 1000,
    warmthCount: 64,
    warmedByMe: false,
    seen: false,
  },
  {
    id: 'st-302',
    displayName: 'Hoàng Nam',
    handle: 'nam.arch',
    mood: 'Chữa lành',
    location: 'Đà Lạt',
    caption: 'Tự pha một bình cold brew cam sả và đọc nốt cuốn sách còn dang dở từ tháng trước.',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80',
    canvasPreset: 'midnight-indigo',
    createdAt: Date.now() - 5 * 3600 * 1000,
    expiresAt: Date.now() + 19 * 3600 * 1000,
    warmthCount: 92,
    warmedByMe: true,
    seen: false,
  },
  {
    id: 'st-303',
    displayName: 'Khánh Linh',
    handle: 'klinh.studio',
    mood: 'Thầm thương',
    location: 'Hà Nội',
    caption: 'Chuyến tàu điện trên cao chiều muộn, bắt gặp hoàng hôn nhuộm hồng cả bầu trời phía tây.',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=700&q=80',
    canvasPreset: 'amber-rain',
    createdAt: Date.now() - 8 * 3600 * 1000,
    expiresAt: Date.now() + 16 * 3600 * 1000,
    warmthCount: 53,
    warmedByMe: false,
    seen: false,
  },
  {
    id: 'st-304',
    displayName: 'Tuấn Kiệt',
    handle: 'kiet.wanders',
    mood: 'Chênh vênh',
    location: 'Đà Nẵng',
    caption: 'Đi bộ dọc bờ biển Mỹ Khê lúc thành phố vừa lên đèn, nghe tiếng sóng vỗ thấy lòng nhẹ tênh.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
    canvasPreset: 'emerald-mist',
    createdAt: Date.now() - 12 * 3600 * 1000,
    expiresAt: Date.now() + 12 * 3600 * 1000,
    warmthCount: 41,
    warmedByMe: false,
    seen: true,
  },
];

function formatRemainingHours(expiresAt: number): string {
  const diffMs = Math.max(0, expiresAt - Date.now());
  const hours = Math.max(1, Math.ceil(diffMs / (3600 * 1000)));
  return `${hours}h`;
}

export const VibeStoriesBar: React.FC<VibeStoriesBarProps> = ({
  currentUserName,
  currentUserHandle,
  onNotify,
}) => {
  const [stories, setStories] = useState<VibeStoryItem[]>(() =>
    INITIAL_STORIES.filter((item) => item.expiresAt > Date.now())
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [replyDraft, setReplyDraft] = useState<string>('');

  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [newCaption, setNewCaption] = useState<string>('');
  const [newMood, setNewMood] = useState<StoryMood>('Đêm muộn');
  const [newLocation, setNewLocation] = useState<string>('Sài Gòn');
  const [newPreset, setNewPreset] = useState<StoryCanvasPreset>('dusk-rose');
  const [uploadedImage, setUploadedImage] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeStory = activeIndex !== null ? stories[activeIndex] : null;
  const currentUserTheme = getAvatarThemeFromIdentity(currentUserHandle);

  useEffect(() => {
    if (activeIndex === null || isPaused) return;

    const intervalMs = 50;
    const durationMs = 5500;
    const step = (intervalMs / durationMs) * 100;

    const timer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          if (activeIndex < stories.length - 1) {
            const nextIdx = activeIndex + 1;
            setActiveIndex(nextIdx);
            setStories((list) =>
              list.map((st, idx) => (idx === nextIdx ? { ...st, seen: true } : st))
            );
            return 0;
          } else {
            setActiveIndex(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [activeIndex, isPaused, stories.length]);

  const openStoryAtIndex = (index: number) => {
    setStories((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, seen: true } : item))
    );
    setProgress(0);
    setReplyDraft('');
    setActiveIndex(index);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = newCaption.trim();
    if (!trimmed && !uploadedImage) return;

    const now = Date.now();
    const created: VibeStoryItem = {
      id: `st-${now}`,
      displayName: currentUserName,
      handle: currentUserHandle,
      mood: newMood,
      location: newLocation,
      caption: trimmed || 'Khoảnh khắc 24h tại VibeNest',
      imageUrl: uploadedImage,
      canvasPreset: newPreset,
      createdAt: now,
      expiresAt: now + 24 * 3600 * 1000,
      warmthCount: 1,
      warmedByMe: true,
      seen: false,
    };

    setStories((prev) => [created, ...prev]);
    setNewCaption('');
    setUploadedImage(undefined);
    setIsComposerOpen(false);
    onNotify?.('Đã đăng Khoảnh khắc 24h lên đầu bảng tin');
  };

  return (
    <section
      aria-label="Khoảnh khắc 24h"
      className="rounded-3xl p-4 bg-white/85 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
            Khoảnh khắc 24h
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Chạm để xem toàn màn hình
          </span>
        </div>
        <span className="font-mono text-[11px] text-rose-600 dark:text-rose-400 tabular-nums">
          {stories.length} khoảnh khắc
        </span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setIsComposerOpen(true)}
          className="group relative w-[106px] h-[152px] rounded-2xl overflow-hidden shrink-0 border border-dashed border-rose-500/45 hover:border-rose-500 bg-gradient-to-b from-slate-100 to-slate-200/70 dark:from-white/[0.06] dark:to-white/[0.02] flex flex-col justify-between p-3 text-left transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <div className="flex items-center justify-between">
            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center font-display font-semibold text-xs ${currentUserTheme.textClass}`}
              style={{
                background: currentUserTheme.bgStyle,
                borderColor: currentUserTheme.borderStyle,
              }}
            >
              {currentUserTheme.initial}
            </div>
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-rose-600/30 group-hover:scale-105 transition-transform">
              +
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
              Tạo khoảnh khắc
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Lưu giữ 24 giờ
            </p>
          </div>
        </button>

        {stories.map((story, idx) => {
          const theme = getAvatarThemeFromIdentity(story.handle);
          const preset = STORY_PRESETS[story.canvasPreset];

          return (
            <button
              key={story.id}
              type="button"
              onClick={() => openStoryAtIndex(idx)}
              className={`group relative w-[106px] h-[152px] rounded-2xl overflow-hidden shrink-0 flex flex-col justify-between p-2.5 text-left transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 shadow-md ${preset.cardGradient} ${
                story.seen
                  ? 'ring-1 ring-slate-300/60 dark:ring-white/15 opacity-85'
                  : 'ring-2 ring-rose-500 dark:ring-rose-500/90'
              }`}
            >
              {story.imageUrl && (
                <div className="absolute inset-0 z-0">
                  <img
                    src={story.imageUrl}
                    alt={story.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/50" />
                </div>
              )}

              <div className="relative z-10 flex items-center justify-between gap-1">
                <div
                  className={`p-[1.5px] rounded-xl ${
                    story.seen
                      ? 'bg-white/30'
                      : 'bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-[10px] border flex items-center justify-center font-display font-semibold text-[11px] bg-slate-950/90 text-white"
                    style={{ borderColor: theme.borderStyle }}
                  >
                    {story.displayName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-white/80 tabular-nums drop-shadow">
                  {formatRemainingHours(story.expiresAt)}
                </span>
              </div>

              <div className="relative z-10">
                <p className="text-[11px] text-white/90 line-clamp-2 leading-snug mb-1 drop-shadow-sm">
                  {story.caption}
                </p>
                <p className="text-[11px] font-semibold text-white truncate drop-shadow">
                  {story.displayName}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default VibeStoriesBar;
