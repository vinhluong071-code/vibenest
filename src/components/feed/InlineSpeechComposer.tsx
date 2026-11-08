'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAvatarThemeFromAlias } from '../../lib/avatar-hash';

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface InlineSpeechComposerProps {
  displayName: string;
  handle: string;
  city: string;
  onPublish: (payload: { content: string; mood: string; city: string }) => void;
  onOpenFullComposer?: () => void;
  onNotify?: (message: string) => void;
}

const QUICK_MOODS = ['Đêm muộn', 'Chữa lành', 'Thầm thương', 'Chênh vênh'] as const;

export const InlineSpeechComposer: React.FC<InlineSpeechComposerProps> = ({
  displayName,
  handle,
  city,
  onPublish,
  onOpenFullComposer,
  onNotify,
}) => {
  const [content, setContent] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('Đêm muộn');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const avatarTheme = getAvatarThemeFromAlias(handle || displayName);

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Bỏ qua lỗi khi phiên đã đóng
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Bỏ qua khi unmount
        }
      }
    };
  }, []);

  const toggleVoiceDictation = () => {
    if (typeof window === 'undefined') return;

    const SpeechConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechConstructor) {
      onNotify?.('Trình duyệt hiện tại chưa hỗ trợ Web Speech API (Hãy dùng Safari / Chrome / Edge).');
      return;
    }

    if (isListening) {
      stopDictation();
      return;
    }

    try {
      const recognition = new SpeechConstructor();
      recognition.lang = 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
        onNotify?.('Đang lắng nghe giọng nói (Tiếng Việt)...');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const chunk = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalText += chunk + ' ';
          } else {
            interimText += chunk;
          }
        }

        setInterimTranscript(interimText);

        if (finalText.trim()) {
          setContent((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return (prev + separator + finalText.trim()).slice(0, 600);
          });
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      onNotify?.('Không thể truy cập Micro. Vui lòng cấp quyền Micro cho trình duyệt.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    if (isListening) {
      stopDictation();
    }

    onPublish({
      content: trimmed,
      mood: selectedMood,
      city,
    });
    setContent('');
    setInterimTranscript('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl p-4 sm:p-5 bg-white/85 dark:bg-[#11131e]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.09] shadow-sm space-y-3"
    >
      <div className="flex items-start gap-3">
        <div
          style={{
            background: avatarTheme.bgStyle,
            borderColor: avatarTheme.borderStyle,
          }}
          className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-semibold text-sm shrink-0 mt-0.5 ${avatarTheme.textClass}`}
        >
          {avatarTheme.initial}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="relative flex items-center">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 600))}
              maxLength={600}
              placeholder="Nói bằng giọng nói hoặc gõ nhanh tâm sự của bạn..."
              className="w-full min-h-[44px] pl-4 pr-28 py-2.5 rounded-2xl bg-slate-100/85 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.08] focus:border-rose-500/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition"
            />

            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={toggleVoiceDictation}
                title="Chuyển giọng nói thành văn bản (Web Speech API)"
                className={`min-h-[34px] px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-600/30'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 text-rose-600 dark:text-rose-300'
                }`}
              >
                {isListening && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
                <span className="hidden sm:inline">{isListening ? 'Đang nghe' : 'Giọng nói'}</span>
              </button>

              <button
                type="submit"
                disabled={!content.trim()}
                className="min-h-[34px] px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold transition"
              >
                Đăng
              </button>
            </div>
          </div>

          {isListening && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] text-rose-600 dark:text-rose-300">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="truncate font-medium">
                  {interimTranscript
                    ? `Đang nhận diện: "${interimTranscript}"`
                    : 'Đang lắng nghe tiếng Việt (vi-VN)... Hãy bắt đầu nói'}
                </span>
              </div>
              <button type="button" onClick={stopDictation} className="font-semibold underline shrink-0">
                Dừng
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_MOODS.map((mood) => {
            const active = selectedMood === mood;
            return (
              <button
                key={mood}
                type="button"
                onClick={() => setSelectedMood(mood)}
                className={`min-h-[32px] px-2.5 py-1 rounded-xl font-medium transition whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]'
                }`}
              >
                + {mood}
              </button>
            );
          })}
        </div>
        <span className="hidden sm:inline font-mono text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
          @{handle}
        </span>
      </div>
    </form>
  );
};

export default InlineSpeechComposer;
