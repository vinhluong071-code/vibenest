"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { VibePost } from "@/lib/vibe/types";

type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  sender_alias: string;
  content: string;
  created_at: string;
  read_at: string | null;
  media_url?: string | null;
  message_type?: "text" | "image" | "photostrip" | "voice" | null;
};

type ChatDialogProps = {
  post: VibePost;
  initialRoomId?: string;
  alias: string;
  onClose: () => void;
  onEnsureIdentity: () => Promise<string>;
  onMessagesRead: () => void;
};

function friendlyChatError(error: unknown): string {
  const value = error as { code?: string; message?: string } | null;
  if (value?.code === "P0002") return "Bài viết không còn tồn tại hoặc chưa có cuộc trò chuyện nào để mở.";
  if (value?.code === "22023") return "Bạn không thể tự bắt đầu cuộc trò chuyện với bài viết của mình.";
  if (value?.code === "28000" || value?.code === "42501") return "Phiên ẩn danh chưa sẵn sàng hoặc bạn không có quyền vào phòng chat.";
  if (value?.code === "42P01" || value?.code === "PGRST202") return "Chat chưa được cấu hình trong Supabase. Hãy áp dụng migration VibeNest Realtime UX.";
  return "Chưa thể kết nối cuộc trò chuyện. Vui lòng thử lại.";
}

export function ChatDialog({ post, alias, onClose, onEnsureIdentity, onMessagesRead, initialRoomId }: ChatDialogProps) {
  const [roomId, setRoomId] = useState<string | null>(initialRoomId ?? null);
  const [peerAlias, setPeerAlias] = useState(post.alias);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Đang kết nối riêng tư…");
  const [peerTyping, setPeerTyping] = useState(false);
  const [callNotice, setCallNotice] = useState("");
  const [memories, setMemories] = useState<Array<{id:string;caption:string|null;strip_url:string;created_at:string}>>([]);
  const [showMemories, setShowMemories] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAt = useRef(0);

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !userId) return;
    void channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, is_typing: isTyping },
    });
  }, [userId]);

  const updateDraft = useCallback((value: string) => {
    setDraft(value);
    if (!value.trim()) {
      broadcastTyping(false);
      return;
    }
    const now = Date.now();
    if (now - lastTypingSentAt.current > 1100) {
      lastTypingSentAt.current = now;
      broadcastTyping(true);
    }
    if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    localTypingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 1700);
  }, [broadcastTyping]);

  useEffect(() => {
    let alive = true;
    let channel: RealtimeChannel | null = null;

    async function connect() {
      try {
        const id = await onEnsureIdentity();
        if (!alive) return;
        setUserId(id);
        const { data: memoryRows } = await createClient().from("vibenest_memories").select("id,caption,strip_url,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(30);
        if (alive) setMemories((memoryRows ?? []) as Array<{id:string;caption:string|null;strip_url:string;created_at:string}>);

        const supabase = createClient();
        let idOfRoom: string;
        if (initialRoomId) {
          // Dating RPC has already authorized both matched adults and created this room.
          // Reuse it directly; do not call the post-based chat RPC or create another room.
          idOfRoom = initialRoomId;
        } else {
          const { data: roomData, error: roomError } = await supabase.rpc(
            "start_vibenest_chat",
            { p_post_id: post.id, p_alias: alias },
          );
          if (roomError) throw roomError;
          const room = Array.isArray(roomData) ? roomData[0] : roomData;
          if (!room?.room_id) throw new Error("Supabase không trả về phòng chat.");
          idOfRoom = room.room_id as string;
          setPeerAlias((room.peer_alias as string) || post.alias);
        }
        if (!alive) return;
        setRoomId(idOfRoom);

        channel = supabase
          .channel(`vibenest-chat:${idOfRoom}`, { config: { private: true } })
          .on("broadcast", { event: "typing" }, ({ payload }: { payload: { user_id?: string; is_typing?: boolean } }) => {
            if (!alive || payload?.user_id === id) return;
            setPeerTyping(Boolean(payload?.is_typing));
            if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
            if (payload?.is_typing) {
              peerTypingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 2100);
            }
          })
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${idOfRoom}` },
            (payload: { new: ChatMessage }) => {
              const incoming = payload.new;
              if (!alive) return;
              setMessages((current) => current.some((item) => item.id === incoming.id)
                ? current
                : [...current, incoming]);
              if (incoming.sender_id !== id && !incoming.read_at) {
                void (async () => {
                  const { error: readError } = await supabase.from("chat_messages")
                    .update({ read_at: new Date().toISOString() })
                    .eq("id", incoming.id)
                    .is("read_at", null);
                  if (readError) console.warn("[VibeNest] Không thể đánh dấu đã xem:", readError);
                  else onMessagesRead();
                })();
              }
            },
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "chat_messages", filter: `room_id=eq.${idOfRoom}` },
            (payload: { new: ChatMessage }) => {
              const updated = payload.new;
              if (!alive) return;
              setMessages((current) => current.map((item) => item.id === updated.id ? { ...item, read_at: updated.read_at } : item));
              onMessagesRead();
            },
          )
          .subscribe((status: string) => {
            if (!alive) return;
            if (status === "SUBSCRIBED") setConnection("Đang trò chuyện trực tiếp");
            else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("Kết nối bị gián đoạn");
          });
        channelRef.current = channel;

        const { data: history, error: historyError } = await supabase
          .from("chat_messages")
          .select("id,room_id,sender_id,sender_alias,content,created_at,read_at,media_url,message_type")
          .eq("room_id", idOfRoom)
          .order("created_at", { ascending: true })
          .limit(200);
        if (historyError) throw historyError;
        if (alive) {
          const loaded = (history ?? []) as ChatMessage[];
          setMessages((current) => {
            const merged = new Map(current.map((item) => [item.id, item]));
            for (const item of loaded) merged.set(item.id, item);
            return [...merged.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
          const unreadIds = loaded.filter((item) => item.sender_id !== id && !item.read_at).map((item) => item.id);
          if (unreadIds.length) {
            const { error: readError } = await supabase.from("chat_messages")
              .update({ read_at: new Date().toISOString() })
              .in("id", unreadIds)
              .is("read_at", null);
            if (readError) console.warn("[VibeNest] Không thể đánh dấu lịch sử đã xem:", readError);
          }
          onMessagesRead();
        }
      } catch (cause) {
        console.error("[VibeNest] Không thể mở chat riêng:", cause);
        if (alive) setError(friendlyChatError(cause));
      } finally {
        if (alive) setLoading(false);
      }
    }

    void connect();
    return () => {
      alive = false;
      channelRef.current = null;
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
      if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
      if (channel) void createClient().removeChannel(channel);
    };
  }, [alias, initialRoomId, onEnsureIdentity, onMessagesRead, post.id, post.alias]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, peerTyping]);

  const sendMessage = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !roomId || !userId || sending) return;
    setSending(true);
    setError("");
    broadcastTyping(false);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("chat_messages")
        .insert({ room_id: roomId, sender_id: userId, sender_alias: alias, content })
        .select("id,room_id,sender_id,sender_alias,content,created_at,read_at")
        .single();
      if (insertError) throw insertError;
      const sent = data as ChatMessage;
      setMessages((current) => current.some((item) => item.id === sent.id) ? current : [...current, sent]);
      setDraft("");
    } catch (cause) {
      console.error("[VibeNest] Gửi tin nhắn thất bại:", cause);
      setError(friendlyChatError(cause));
    } finally {
      setSending(false);
    }
  }, [alias, broadcastTyping, draft, roomId, sending, userId]);

  const sendPhotostrip = async (memory: {id:string;caption:string|null;strip_url:string}) => {
    if (!roomId || !userId || sending) return;
    setSending(true); setError("");
    try {
      const { data, error: insertError } = await createClient().from("chat_messages").insert({ room_id: roomId, sender_id: userId, sender_alias: alias, content: memory.caption?.trim() || "Đã gửi một dải ảnh kỷ niệm ✨", media_url: memory.strip_url, message_type: "photostrip" }).select("id,room_id,sender_id,sender_alias,content,created_at,read_at,media_url,message_type").single();
      if (insertError) throw insertError;
      const sent = data as ChatMessage;
      setMessages(current => current.some(item => item.id === sent.id) ? current : [...current, sent]);
      setShowMemories(false);
    } catch (cause) { setError(friendlyChatError(cause)); } finally { setSending(false); }
  };
  return (
    <div className="chat-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="chat-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="chat-title">
        <header className="chat-header">
          <div className="avatar">{peerAlias.slice(0, 1)}</div>
          <div className="chat-heading">
            <strong id="chat-title">{peerAlias}</strong>
            <span><i className={connection === "Đang trò chuyện trực tiếp" ? "chat-online" : ""} />{connection}</span>
          </div>
          <button className="icon-button" onClick={() => setCallNotice("Gọi thoại đang ở chế độ mô phỏng; chưa kết nối WebRTC.")} aria-label="Gọi thoại (mô phỏng)">☎</button>
          <button className="icon-button" onClick={onClose} aria-label="Đóng trò chuyện">×</button>
        </header>
        <div className="chat-context">Bắt đầu từ tâm sự: “{post.content.slice(0, 110)}{post.content.length > 110 ? "…" : ""}”</div>
        <div className="chat-messages" aria-live="polite">
          {loading ? <p className="chat-state">Đang mở cuộc trò chuyện riêng tư…</p> : null}
          {!loading && messages.length === 0 ? <p className="chat-state">Hãy gửi lời chào đầu tiên. Cuộc trò chuyện này chỉ dành cho hai người.</p> : null}
          {messages.map((message) => (
            <div className={message.sender_id === userId ? "chat-message mine" : "chat-message"} key={message.id}>
              <span>{message.sender_id === userId ? "Bạn" : message.sender_alias}</span>
              <p>{message.content}</p>
              {message.media_url && <a className="chat-photostrip-link" href={message.media_url} target="_blank" rel="noreferrer"><img className="chat-photostrip" src={message.media_url} alt="Dải ảnh Photobooth được chia sẻ" loading="lazy" /></a>}
              <time>{new Date(message.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>
              {message.sender_id === userId && <small className="chat-read-state">{message.read_at ? "Đã xem" : "Đã gửi"}</small>}
            </div>
          ))}
          {peerTyping && <div className="chat-typing" role="status"><span /><span /><span /> <small>{peerAlias} đang gõ…</small></div>}
          <div ref={bottomRef} />
        </div>
        {error && <p className="chat-error" role="alert">{error}</p>}
        {showMemories && <section className="chat-memory-picker" aria-label="Kho Kỷ Niệm"><strong>Kho Kỷ Niệm · Chọn dải ảnh</strong>{memories.length ? memories.map(memory => <button type="button" key={memory.id} disabled={sending} onClick={() => void sendPhotostrip(memory)}><img src={memory.strip_url} alt="" loading="lazy"/><span>{memory.caption || "Photobooth"}<small>{new Date(memory.created_at).toLocaleDateString("vi-VN")}</small></span></button>) : <p>Chưa có dải ảnh trong Kho Kỷ Niệm.</p>}<button type="button" onClick={() => setShowMemories(false)}>Đóng</button></section>}
        <form className="chat-compose" onSubmit={sendMessage}>
          <button type="button" className="chat-attach-memory" onClick={() => setShowMemories(value => !value)} aria-label="Gửi dải ảnh từ Kho Kỷ Niệm" title="Gửi dải ảnh Photobooth">▧</button>
          <input
            value={draft}
            onChange={(event) => updateDraft(event.target.value)}
            onBlur={() => broadcastTyping(false)}
            maxLength={2000}
            placeholder="Viết lời nhắn dịu dàng…"
            aria-label="Tin nhắn"
            disabled={loading || !roomId}
          />
          <button type="submit" disabled={!draft.trim() || sending || !roomId}>
            {sending ? "…" : "Gửi"}
          </button>
        </form>
        <p className="chat-privacy-note">{callNotice || "Ẩn danh với cộng đồng · Chỉ thành viên phòng mới đọc được tin nhắn"}</p>
      </section>
    </div>
  );
}
