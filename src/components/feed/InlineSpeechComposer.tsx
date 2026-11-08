"use client";

import { useEffect, useRef, useState } from "react";

type SpeechAlternative = { transcript: string };
type SpeechResult = ArrayLike<SpeechAlternative> & { isFinal?: boolean };
type SpeechResultEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechErrorEvent = { error?: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export type InlineSpeechComposerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
};

export function InlineSpeechComposer({
  value,
  onChange,
  placeholder = "Chia sẻ điều bạn đang nghĩ…",
  disabled = false,
  rows = 4,
}: InlineSpeechComposerProps) {
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    recognition.current?.abort();
    recognition.current = null;
  }, []);

  function toggleSpeech() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setMessage("Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Bạn có thể nhập văn bản.");
      return;
    }

    const engine = new Constructor();
    recognition.current = engine;
    engine.lang = "vi-VN";
    engine.continuous = true;
    engine.interimResults = true;
    engine.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length - event.resultIndex },
        (_, index) => event.results[event.resultIndex + index]?.[0]?.transcript ?? "",
      ).join("");
      if (transcript.trim()) {
        const separator = value.trim() ? " " : "";
        onChange(value + separator + transcript.trim());
      }
    };
    engine.onerror = (event) => {
      setMessage(event.error === "not-allowed"
        ? "Bạn chưa cấp quyền micro cho trình duyệt."
        : "Không thể nhận diện giọng nói. Hãy thử lại hoặc nhập văn bản.");
      setListening(false);
    };
    engine.onend = () => {
      setListening(false);
      recognition.current = null;
    };
    setMessage("");
    try {
      engine.start();
      setListening(true);
    } catch {
      setMessage("Micro đang được sử dụng hoặc chưa sẵn sàng.");
      recognition.current = null;
      setListening(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor="vibenest-speech-composer">Nội dung bài viết</label>
      <textarea
        id="vibenest-speech-composer"
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-h-28 resize-y rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-900 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="min-h-5 text-xs text-slate-500" role="status" aria-live="polite">
          {message || (listening ? "Đang nghe tiếng Việt…" : "Nhập văn bản hoặc đọc để chuyển thành chữ.")}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={toggleSpeech}
          aria-pressed={listening}
          className={listening
            ? "min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white"
            : "min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-white/15 dark:text-slate-200"}
        >
          {listening ? "Dừng đọc" : "🎙 Đọc tiếng Việt"}
        </button>
      </div>
    </div>
  );
}

export default InlineSpeechComposer;
