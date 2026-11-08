"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Mood } from "@/lib/vibe/types";

const moods: Mood[] = ["Đêm muộn", "Chênh vênh", "Chữa lành", "Thầm thương", "Khác"];

type ComposerModalProps = {
  open: boolean;
  alias: string;
  initialMood?: Mood;
  busy: boolean;
  onClose: () => void;
  onSubmit: (content: string, mood: Mood, location: string, media: File | null) => Promise<void>;
};

export function ComposerModal({ open, alias, initialMood = "Đêm muộn", busy, onClose, onSubmit }: ComposerModalProps) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood>(initialMood);
  const [location, setLocation] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    await onSubmit(content.trim(), mood, location.trim(), media);
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
          <label className="field-label" htmlFor="vibe-media">Ảnh khoảnh khắc (không bắt buộc)</label>
          <div className="media-picker">
            <input
              id="vibe-media"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(event) => {
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
              }}
            />
            {media && <div className="selected-media"><span>{media.name} · {(media.size / (1024 * 1024)).toFixed(1)} MB</span><button type="button" onClick={() => setMedia(null)}>Bỏ ảnh</button></div>}
            {mediaError && <p className="reply-error" role="alert">{mediaError}</p>}
          </div>
          <label className="field-label" htmlFor="vibe-content">Điều bạn muốn chia sẻ</label>
          <textarea id="vibe-content" value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={6} placeholder="Không cần phải viết thật hay. Cứ thành thật với cảm xúc của mình nhé…" required />
          <div className="field-footer"><label htmlFor="vibe-location">Địa điểm (không bắt buộc)</label><input id="vibe-location" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={80} placeholder="Một thành phố, hoặc để trống" /><span>{content.length}/2000</span></div>
          <button className="primary-button submit-post" type="submit" disabled={!content.trim() || busy}>{busy ? "Đang gửi tâm sự…" : "Chia sẻ ẩn danh"}</button>
          <p className="privacy-note">Đừng chia sẻ số điện thoại, địa chỉ nhà hoặc thông tin có thể nhận diện bạn.</p>
        </form>
      </section>
    </div>
  );
}