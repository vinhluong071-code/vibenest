"use client";

import { useEffect, useRef, useState } from "react";
import { getAgeAccess } from "@/lib/age-gating";

const groups = [
  { id: "music", name: "Âm nhạc & playlist", emoji: "🎧", description: "Chia sẻ giai điệu hợp mood." },
  { id: "booth", name: "Photobooth Studio", emoji: "📸", description: "Ý tưởng pose, frame và photobooth." },
  { id: "night", name: "Tâm sự đêm", emoji: "🌙", description: "Một góc lắng nghe không phán xét." },
  { id: "astro", name: "Chiêm tinh vui", emoji: "✨", description: "Cung hoàng đạo và câu chuyện vũ trụ." },
] as const;

type GroupId = (typeof groups)[number]["id"];
type Message = { id: string; group: string; body: string; createdAt: number };

export function CommunitySpacesModal({ birthDate, onClose }: { birthDate: string | null; onClose: () => void }) {
  const [joined, setJoined] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micError, setMicError] = useState("");
  const micStream = useRef<MediaStream | null>(null);
  const access = getAgeAccess(birthDate);
  const canJoinSpaces = access.allowed["interest-groups"];

  useEffect(() => {
    if (!canJoinSpaces) return;
    const restoreTimer = window.setTimeout(() => {
    try {
      const savedJoined: unknown = JSON.parse(localStorage.getItem("vibenest.spaces.joined.v1") || "[]");
      if (Array.isArray(savedJoined)) setJoined(savedJoined.filter((item): item is string => typeof item === "string" && groups.some((group) => group.id === item)));
      const savedMessages: unknown = JSON.parse(localStorage.getItem("vibenest.spaces.messages.v1") || "[]");
      if (Array.isArray(savedMessages)) {
        setMessages(savedMessages.filter((item): item is Message =>
          !!item && typeof item === "object" &&
          typeof (item as Message).id === "string" &&
          typeof (item as Message).body === "string" &&
          typeof (item as Message).group === "string" &&
          groups.some((group) => group.id === (item as Message).group) &&
          typeof (item as Message).createdAt === "number"
        ));
      }
    } catch {
      // Ignore malformed or unavailable local cache.
    }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [canJoinSpaces]);

  useEffect(() => () => { micStream.current?.getTracks().forEach(track => track.stop()); }, []);

  async function toggleMicrophone() {
    if (micEnabled) { micStream.current?.getTracks().forEach(track => track.stop()); micStream.current = null; setMicEnabled(false); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setMicError("Thiết bị hoặc trình duyệt không hỗ trợ micro."); return; }
    try { micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); setMicEnabled(true); setMicError(""); }
    catch { setMicError("Chưa cấp quyền micro. Hãy cho phép truy cập micro trong cài đặt trình duyệt."); }
  }

  function join(id: GroupId) {
    setJoined((current) => {
      const next = current.includes(id) ? current : [...current, id];
      try { localStorage.setItem("vibenest.spaces.joined.v1", JSON.stringify(next)); } catch { /* Local cache is optional. */ }
      return next;
    });
    setActive(id);
  }

  function send() {
    const body = draft.trim();
    if (!active || !body || !groups.some((group) => group.id === active)) return;
    const next = [...messages, { id: crypto.randomUUID(), group: active, body: body.slice(0, 500), createdAt: Date.now() }];
    setMessages(next);
    setDraft("");
    try { localStorage.setItem("vibenest.spaces.messages.v1", JSON.stringify(next)); } catch { /* Keep this session's messages. */ }
  }

  const current = groups.find((group) => group.id === active);

  return (
    <div className="vn-feature-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="vn-feature-modal" role="dialog" aria-modal="true" aria-labelledby="vn-spaces-title">
        <header>
          <div><small>COMMUNITY SPACES</small><h2 id="vn-spaces-title">{current ? current.name : "Cộng đồng VibeNest"}</h2></div>
          <button onClick={() => active ? setActive(null) : onClose()} aria-label={active ? "Quay lại" : "Đóng"}>{active ? "‹" : "×"}</button>
        </header>
        {!canJoinSpaces ? (
          <article className="vn-oracle-card">
            <span>🛡️ BẢO VỆ NGƯỜI DÙNG TRẺ</span>
            <strong>{access.age === null ? "Cần xác minh ngày sinh" : "Không gian cộng đồng từ 16 tuổi"}</strong>
            <p>{access.age === null ? "Hãy cập nhật ngày sinh hợp lệ trong hồ sơ để xác định các tính năng phù hợp." : "Nhóm sở thích và phòng chat cộng đồng chỉ dành cho người dùng từ đủ 16 tuổi."}</p>
          </article>
        ) : active && current ? (
          <>
            <p>{current.description}</p>
            <section className="vn-voice-stage" aria-label={"Voice Stage " + current.name}><div className="vn-voice-stage-head"><span>LIVE VOICE STAGE</span><small>Phòng thoại · {current.emoji}</small></div><div className="vn-voice-stage-speaker"><div className={micEnabled ? "vn-voice-avatar is-speaking" : "vn-voice-avatar"}><span>{micEnabled ? "🎙️" : "🙂"}</span>{micEnabled && <i />}</div><strong>Bạn</strong><small>{micEnabled ? "Micro đang bật trên thiết bị này" : "Người nghe"}</small></div><div className="vn-voice-stage-list"><span>NGƯỜI NGHE</span><p>Chưa có người nghe khác trong phòng.</p></div><button type="button" className={micEnabled ? "vn-voice-mic is-on" : "vn-voice-mic"} onClick={() => void toggleMicrophone()}>{micEnabled ? "Tắt micro" : "Bật micro"}</button>{micError && <p role="alert">{micError}</p>}<p className="vn-feature-footnote">Bản hiện tại chỉ kiểm tra micro cục bộ; chưa truyền âm thanh tới thành viên khác (chưa có WebRTC/signaling).</p></section>
            <div className="vn-space-chat-log" aria-live="polite">
              {messages.filter((message) => message.group === active).map((message) => (
                <p key={message.id}>{message.body}<small>{new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</small></p>
              ))}
              {!messages.some((message) => message.group === active) && <p className="vn-feature-footnote">Chưa có tin nhắn. Hãy mở lời đầu tiên.</p>}
            </div>
            <form className="vn-space-chat-compose" onSubmit={(event) => { event.preventDefault(); send(); }}>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} placeholder="Viết tin nhắn trong phiên này…" aria-label="Tin nhắn nhóm" />
              <button type="submit" disabled={!draft.trim()}>Gửi</button>
            </form>
            <p className="vn-feature-footnote">Phòng chat hiện chỉ lưu trên thiết bị này; chưa đồng bộ giữa các thành viên hoặc realtime.</p>
          </>
        ) : (
          <div className="vn-space-list">
            {groups.map((group) => (
              <article key={group.id}>
                <span>{group.emoji}</span><div><strong>{group.name}</strong><p>{group.description}</p></div>
                <button onClick={() => { join(group.id); }}>{joined.includes(group.id) ? "Mở phòng" : "Tham gia"}</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default CommunitySpacesModal;
