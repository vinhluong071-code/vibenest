"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Mood } from "@/lib/vibe/types";

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

const moods: Mood[] = ["Đêm muộn", "Chênh vênh", "Chữa lành", "Thầm thương", "Khác"];

type ComposerModalProps = {
  open: boolean;
  alias: string;
  initialMood?: Mood;
  busy: boolean;
  onClose: () => void;
  onSubmit: (content: string, mood: Mood, location: string) => Promise<void>;
};

export function ComposerModal({ open, alias, initialMood = "Đêm muộn", busy, onClose, onSubmit }: ComposerModalProps) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood>(initialMood);
  const [location, setLocation] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stopSpeech = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop errors
        }
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  function toggleVoiceDictation() {
    if (typeof window === "undefined") return;
    const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechCtor) return;

    if (isListening) {
      stopSpeech();
      return;
    }

    try {
      const recognizer = new SpeechCtor();
      recognizer.lang = "vi-VN";
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.onstart = () => setIsListening(true);
      recognizer.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalText += (event.results[i][0]?.transcript ?? "") + " ";
          }
        }
        if (finalText.trim()) {
          setContent((prev) => {
            const sep = prev && !prev.endsWith(" ") ? " " : "";
            return (prev + sep + finalText.trim()).slice(0, 2000);
          });
        }
      };
      recognizer.onerror = () => setIsListening(false);
      recognizer.onend = () => setIsListening(false);
      recognitionRef.current = recognizer;
      recognizer.start();
    } catch {
      setIsListening(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    stopSpeech();
    await onSubmit(content.trim(), mood, location.trim());
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="composer-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <div className="modal-handle" />
        <div className="modal-heading">
          <div><p className="eyebrow">MỘT KHOẢNG TRỜI RIÊNG</p><h2 id="composer-title">Gửi một lời tâm sự</h2><p className="muted">Bạn được gọi bằng một bút danh, không phải danh tính thật.</p></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <form onSubmit={submit}>
          <div className="composer-identity"><span className="avatar">{alias.slice(0, 1)}</span><div><small>Bút danh của bạn</small><strong>{alias}</strong></div><span className="privacy-tag">Ẩn danh</span></div>
          <label className="field-label">Bạn đang cảm thấy thế nào?</label>
          <div className="mood-picker">{moods.map((item) => <button key={item} type="button" className={mood === item ? "mood-choice selected" : "mood-choice"} onClick={() => setMood(item)}>{item}</button>)}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8 }}>
            <label className="field-label" htmlFor="vibe-content" style={{ margin: 0 }}>Điều bạn muốn chia sẻ</label>
            <button type="button" className="mood-choice" onClick={toggleVoiceDictation} aria-label="Nhập tâm sự bằng giọng nói">
              {isListening ? "● Đang nghe (Dừng)" : "🎙 Nhập bằng giọng nói"}
            </button>
          </div>
          <textarea id="vibe-content" value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={6} placeholder="Không cần phải viết thật hay. Cứ thành thật với cảm xúc của mình nhé…" required />
          <div className="field-footer"><label htmlFor="vibe-location">Địa điểm (không bắt buộc)</label><input id="vibe-location" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={80} placeholder="Một thành phố, hoặc để trống" /><span>{content.length}/2000</span></div>
          <button className="primary-button submit-post" type="submit" disabled={!content.trim() || busy}>{busy ? "Đang gửi tâm sự…" : "Chia sẻ ẩn danh"}</button>
          <p className="privacy-note">Đừng chia sẻ số điện thoại, địa chỉ nhà hoặc thông tin có thể nhận diện bạn.</p>
        </form>
      </section>
    </div>
  );
}