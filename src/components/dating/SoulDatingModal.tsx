"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAgeAccess } from "@/lib/age-gating";
import { ChatDialog } from "@/components/ChatDialog";
import type { VibePost } from "@/lib/vibe/types";

type Candidate = { id: string; birthday: string | null };
type Result = { is_matched?: boolean; is_underage?: boolean };
const noop = () => {};

export function SoulDatingModal({ birthDate, onClose }: { birthDate: string | null; onClose: () => void }) {
  const age = useMemo(() => getAgeAccess(birthDate), [birthDate]);
  const [people, setPeople] = useState<Candidate[]>([]);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [matched, setMatched] = useState(false);
  const [datingRoomId, setDatingRoomId] = useState<string | null>(null);
  const [chatError, setChatError] = useState("");
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef<{ x: number; pointerId: number } | null>(null);
  const [error, setError] = useState("");

  const ensureIdentity = useCallback(async () => {
    const { data: { user }, error: authError } = await createClient().auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Vui lòng đăng nhập để nhắn tin.");
    return user.id;
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const s = createClient();
        const { data: { user } } = await s.auth.getUser();
        if (!user) throw Error("Vui lòng đăng nhập.");
        const { data, error } = await s.from("vibenest_profiles").select("id,birthday").neq("id", user.id).not("birthday", "is", null).limit(30);
        if (error) throw error;
        if (live) setPeople((data ?? []) as Candidate[]);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Không tải được đề xuất.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  async function swipe(action: "like" | "pass") {
    const target = people[i];
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await createClient().rpc("swipe_match", { target_user_id: target.id, action });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("is_underage") || message.includes("underage") || message.includes("18")) {
          setBlocked(true);
          return;
        }
        throw error;
      }
      const result = (Array.isArray(data) ? data[0] : data) as Result | null;
      if (result?.is_underage) { setBlocked(true); return; }
      if (result?.is_matched) { setMatched(true); return; }
      setI(v => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể thực hiện lượt quẹt.");
    } finally {
      setBusy(false);
    }
  }

  function onDeckPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (busy || (event.target as HTMLElement).closest("button")) return;
    dragStart.current = { x: event.clientX, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onDeckPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;
    setDragX(Math.max(-180, Math.min(180, event.clientX - dragStart.current.x)));
  }
  function onDeckPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;
    const delta = event.clientX - dragStart.current.x;
    dragStart.current = null;
    setDragX(0);
    if (delta > 90) void swipe("like"); else if (delta < -90) void swipe("pass");
  }

  async function startDatingChat() {
    const target = people[i];
    if (!target || busy || !age.allowed.dating) return;
    setBusy(true);
    setChatError("");
    try {
      const { data, error } = await createClient().rpc("start_dating_chat", { p_target_user_id: target.id });
      if (error) throw error;
      const room = Array.isArray(data) ? data[0] : data;
      if (!room?.room_id || typeof room.room_id !== "string") {
        throw new Error("Máy chủ chưa trả về mã phòng chat hợp lệ.");
      }
      setDatingRoomId(room.room_id);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Không thể mở cuộc trò chuyện hẹn hò.");
    } finally {
      setBusy(false);
    }
  }

  if (datingRoomId) {
    const datingPost: VibePost = {
      id: datingRoomId,
      alias: "Người bạn mới",
      mood: "Thầm thương",
      content: "Cuộc trò chuyện bắt đầu từ một lượt ghép đôi Soul Dating.",
      location: null,
      image_path: null,
      created_at: new Date().toISOString(),
      empathy_count: 0,
      replies: [],
      empathized: false,
      saved: false,
    };
    return (
      <ChatDialog
        post={datingPost}
        alias="Bạn"
        initialRoomId={datingRoomId}
        onClose={onClose}
        onEnsureIdentity={ensureIdentity}
        onMessagesRead={noop}
      />
    );
  }

  return (
    <div className="vn-feature-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="vn-feature-modal" role="dialog" aria-modal="true" aria-labelledby="soul-title">
        <header><div><small>SOUL MATCH · 18+</small><h2 id="soul-title">Hẹn hò an toàn</h2></div><button onClick={onClose} aria-label="Đóng">×</button></header>
        {!age.allowed.dating ? <>
          <div className="vn-age-shield">🛡️</div><h3>{age.age === null ? "Cần xác minh ngày sinh" : "Chỉ dành cho người từ đủ 18 tuổi"}</h3>
          <p>VibeNest khóa Soul Dating và mọi lượt ghép đôi đối với tài khoản chưa đủ 18 tuổi.</p>
        </> : blocked ? <>
          <div className="vn-age-shield">🛡️</div><h3>Bảo vệ người dùng vị thành niên</h3>
          <p>Máy chủ từ chối thao tác vì tài khoản chưa đáp ứng điều kiện 18+. Tính năng hẹn hò đã bị khóa.</p>
        </> : matched ? <div className="vn-match-celebration">
          <div className="vn-match-sparkle">💜 ✨ 💜</div><h2>It's a Vibe Match!</h2>
          <p>Hai bạn đã cùng thích nhau. Hãy bắt đầu bằng một lời chào tôn trọng.</p>
          <button className="vn-feature-primary" disabled={busy} onClick={() => void startDatingChat()}>{busy ? "Đang mở phòng chat…" : "Nhắn tin ngay"}</button>
          {chatError && <p role="alert">{chatError}</p>}
        </div> : loading ? <p>Đang tải hồ sơ đề xuất…</p> : people[i] ? <>
          <p>Mỗi lượt thích hoặc bỏ qua đều được xác thực lại ở máy chủ.</p>
          <article className="vn-oracle-card vn-dating-swipe-deck" onPointerDown={onDeckPointerDown} onPointerMove={onDeckPointerMove} onPointerUp={onDeckPointerUp} onPointerCancel={() => { dragStart.current = null; setDragX(0); }} style={{ transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)`, transition: dragStart.current ? "none" : "transform .24s cubic-bezier(.16,1,.3,1)", touchAction: "pan-y" }}><span>SOUL DISCOVERY · 18+</span><strong>✧ Hồ sơ VibeNest</strong><p>Thành viên có thông tin ngày sinh</p><div className={dragX > 24 ? "vn-swipe-stamp like" : dragX < -24 ? "vn-swipe-stamp pass" : "vn-swipe-stamp"}>{dragX > 24 ? "LIKE" : dragX < -24 ? "PASS" : "KÉO THẺ ĐỂ QUẸT"}</div>
            <div className="vn-dating-actions"><button disabled={busy} onClick={() => void swipe("pass")}>Bỏ qua</button><button disabled={busy} onClick={() => void swipe("like")}>♡ Thích</button></div>
          </article>
        </> : <p>Chưa có hồ sơ đề xuất. Hãy quay lại sau nhé.</p>}
        {error && <p role="alert">{error}</p>}
        <button className="vn-feature-primary" onClick={onClose}>Đóng</button>
      </section>
    </div>
  );
}
export default SoulDatingModal;
