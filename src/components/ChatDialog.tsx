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
};

type ChatDialogProps = {
  post: VibePost;
  alias: string;
  onClose: () => void;
  onEnsureIdentity: () => Promise<string>;
};

function friendlyChatError(error: unknown): string {
  const value = error as { code?: string; message?: string } | null;
  if (value?.code === "P0002") return "Bài viết không còn tồn tại hoặc chưa có cuộc trò chuyện nào để mở.";
  if (value?.code === "22023") return "Bạn không thể tự bắt đầu cuộc trò chuyện với bài viết của mình.";
  if (value?.code === "28000" || value?.code === "42501") return "Phiên ẩn danh chưa sẵn sàng hoặc bạn không có quyền vào phòng chat.";
  if (value?.code === "42P01" || value?.code === "PGRST202") return "Chat chưa được cấu hình trong Supabase. Hãy áp dụng migration VibeNest Private Chat.";
  return "Chưa thể kết nối cuộc trò chuyện. Vui lòng thử lại.";
}

export function ChatDialog({ post, alias, onClose, onEnsureIdentity }: ChatDialogProps) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [peerAlias, setPeerAlias] = useState(post.alias);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Đang kết nối riêng tư…");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let channel: RealtimeChannel | null = null;

    async function connect() {
      try {
        const id = await onEnsureIdentity();
        if (!alive) return;
        setUserId(id);

        const supabase = createClient();
        const { data: roomData, error: roomError } = await supabase.rpc(
          "start_vibenest_chat",
          { p_post_id: post.id, p_alias: alias },
        );
        if (roomError) throw roomError;

        const room = Array.isArray(roomData) ? roomData[0] : roomData;
        if (!room?.room_id) throw new Error("Supabase không trả về phòng chat.");
        const idOfRoom = room.room_id as string;
        if (!alive) return;
        setRoomId(idOfRoom);
        setPeerAlias((room.peer_alias as string) || post.alias);

        // Subscribe to a private room topic. Postgres Changes still applies
        // chat_messages RLS before a row is delivered to this participant.
        channel = supabase
          .channel(`vibenest-chat:${idOfRoom}`, { config: { private: true } })
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "chat_messages",
              filter: `room_id=eq.${idOfRoom}`,
            },
            (payload: { new: ChatMessage }) => {
              const incoming = payload.new as ChatMessage;
              if (!alive) return;
              setMessages((current) =>
                current.some((item) => item.id === incoming.id)
                  ? current
                  : [...current, incoming],
              );
            },
          )
          .subscribe((status: string) => {
            if (!alive) return;
            if (status === "SUBSCRIBED") setConnection("Đang trò chuyện trực tiếp");
            else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setConnection("Kết nối bị gián đoạn");
            }
          });

        const { data: history, error: historyError } = await supabase
          .from("chat_messages")
          .select("id,room_id,sender_id,sender_alias,content,created_at")
          .eq("room_id", idOfRoom)
          .order("created_at", { ascending: true })
          .limit(200);
        if (historyError) throw historyError;
        if (alive) {
          setMessages((current) => {
            const merged = new Map(current.map((item) => [item.id, item]));
            for (const item of (history ?? []) as ChatMessage[]) merged.set(item.id, item);
            return [...merged.values()].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );
          });
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
      if (channel) void createClient().removeChannel(channel);
    };
  }, [onEnsureIdentity, post.id, post.alias]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const sendMessage = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !roomId || !userId || sending) return;
    setSending(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("chat_messages")
        .insert({
          room_id: roomId,
          sender_id: userId,
          sender_alias: alias,
          content,
        })
        .select("id,room_id,sender_id,sender_alias,content,created_at")
        .single();
      if (insertError) throw insertError;
      const sent = data as ChatMessage;
      setMessages((current) =>
        current.some((item) => item.id === sent.id) ? current : [...current, sent],
      );
      setDraft("");
    } catch (cause) {
      console.error("[VibeNest] Gửi tin nhắn thất bại:", cause);
      setError(friendlyChatError(cause));
    } finally {
      setSending(false);
    }
  }, [alias, draft, roomId, sending, userId]);

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
              <time>{new Date(message.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {error && <p className="chat-error" role="alert">{error}</p>}
        <form className="chat-compose" onSubmit={sendMessage}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            placeholder="Viết lời nhắn dịu dàng…"
            aria-label="Tin nhắn"
            disabled={loading || !roomId}
          />
          <button type="submit" disabled={!draft.trim() || sending || !roomId}>
            {sending ? "…" : "Gửi"}
          </button>
        </form>
        <p className="chat-privacy-note">Ẩn danh với cộng đồng · Chỉ thành viên phòng mới đọc được tin nhắn</p>
      </section>
    </div>
  );
}
