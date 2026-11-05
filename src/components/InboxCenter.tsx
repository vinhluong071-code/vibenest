"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mood, VibePost } from "@/lib/vibe/types";

type InboxCenterProps = {
  userId: string;
  initialTab: "messages" | "notifications";
  onClose: () => void;
  onOpenConversation: (post: VibePost) => void;
  onNotificationsRead: () => void;
};
type RoomRow = { id: string; post_id: string; participant_a: string; participant_b: string; participant_a_alias: string; participant_b_alias: string; last_message_at: string };
type PostRow = { id: string; alias: string; mood: string; content: string; location: string | null; created_at: string; empathy_count: number | null };
type MessageRow = { id: string; room_id: string; sender_id: string; sender_alias: string; content: string; created_at: string; read_at: string | null };
type NotificationRow = { id: string; notification_type: "empathy" | "reply"; actor_alias: string; post_id: string; created_at: string; read_at: string | null };

export function InboxCenter({ userId, initialTab, onClose, onOpenConversation, onNotificationsRead }: InboxCenterProps) {
  const [tab, setTab] = useState<"messages" | "notifications">(initialTab);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [posts, setPosts] = useState<Record<string, PostRow>>({});
  const [latestMessages, setLatestMessages] = useState<Record<string, MessageRow>>({});
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notificationPosts, setNotificationPosts] = useState<Record<string, PostRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      const supabase = createClient();
      try {
        if (tab === "messages") {
          const { data: roomData, error: roomError } = await supabase.from("chat_rooms")
            .select("id,post_id,participant_a,participant_b,participant_a_alias,participant_b_alias,last_message_at")
            .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
            .order("last_message_at", { ascending: false }).limit(100);
          if (roomError) throw roomError;
          const roomRows = (roomData ?? []) as RoomRow[];
          const postIds = [...new Set(roomRows.map((room) => room.post_id))];
          const roomIds = roomRows.map((room) => room.id);
          if (!alive) return;
          setRooms(roomRows);
          if (!postIds.length) { setPosts({}); setLatestMessages({}); setUnreadByRoom({}); return; }
          const [{ data: postData, error: postError }, { data: messageData, error: messageError }] = await Promise.all([
            supabase.from("vibe_posts").select("id,alias,mood,content,location,created_at,empathy_count").in("id", postIds),
            supabase.from("chat_messages").select("id,room_id,sender_id,sender_alias,content,created_at,read_at")
              .in("room_id", roomIds).order("created_at", { ascending: false }).limit(1000),
          ]);
          if (postError) throw postError;
          if (messageError) throw messageError;
          if (!alive) return;
          const postMap: Record<string, PostRow> = {};
          for (const post of (postData ?? []) as PostRow[]) postMap[post.id] = post;
          const latest: Record<string, MessageRow> = {};
          const unread: Record<string, number> = {};
          for (const message of (messageData ?? []) as MessageRow[]) {
            if (!latest[message.room_id]) latest[message.room_id] = message;
            if (message.sender_id !== userId && !message.read_at) unread[message.room_id] = (unread[message.room_id] ?? 0) + 1;
          }
          setPosts(postMap);
          setLatestMessages(latest);
          setUnreadByRoom(unread);
        } else {
          const { data, error: notificationError } = await supabase.from("notifications")
            .select("id,notification_type,actor_alias,post_id,created_at,read_at")
            .eq("recipient_id", userId).order("created_at", { ascending: false }).limit(50);
          if (notificationError) throw notificationError;
          const rows = (data ?? []) as NotificationRow[];
          const postIds = [...new Set(rows.map((item) => item.post_id))];
          const { data: postData, error: postError } = postIds.length
            ? await supabase.from("vibe_posts").select("id,alias,mood,content,location,created_at,empathy_count").in("id", postIds)
            : { data: [], error: null };
          if (postError) throw postError;
          if (!alive) return;
          const postMap: Record<string, PostRow> = {};
          for (const post of (postData ?? []) as PostRow[]) postMap[post.id] = post;
          setNotifications(rows);
          setNotificationPosts(postMap);
        }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu hộp thư.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [tab, userId]);

  async function markNotificationRead(id: string) {
    const { error: updateError } = await createClient().from("notifications")
      .update({ read_at: new Date().toISOString() }).eq("id", id).eq("recipient_id", userId).is("read_at", null);
    if (updateError) { setError("Chưa thể cập nhật trạng thái thông báo."); return; }
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    onNotificationsRead();
  }

  async function markAllRead() {
    const { error: updateError } = await createClient().from("notifications")
      .update({ read_at: new Date().toISOString() }).eq("recipient_id", userId).is("read_at", null);
    if (updateError) { setError("Chưa thể đánh dấu tất cả thông báo đã đọc."); return; }
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    onNotificationsRead();
  }

  function openRoom(room: RoomRow) {
    const post = posts[room.post_id];
    if (!post) { setError("Tâm sự gốc không còn khả dụng để mở cuộc trò chuyện."); return; }
    onOpenConversation({
      id: post.id, alias: post.alias, mood: post.mood as Mood, content: post.content,
      location: post.location, created_at: post.created_at, empathy_count: post.empathy_count ?? 0,
      replies: [], empathized: false, saved: false,
    });
  }

  return (
    <div className="center-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="inbox-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="inbox-title">
        <header className="center-header">
          <div><p className="eyebrow">VIBENEST · PRIVATE SPACE</p><h2 id="inbox-title">{tab === "messages" ? "Hộp thư của bạn" : "Thông báo"}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng hộp thư">×</button>
        </header>
        <div className="center-tabs" role="tablist" aria-label="Hộp thư VibeNest">
          <button className={tab === "messages" ? "selected" : ""} onClick={() => setTab("messages")}>Tin nhắn</button>
          <button className={tab === "notifications" ? "selected" : ""} onClick={() => setTab("notifications")}>Thông báo</button>
        </div>
        {tab === "notifications" && notifications.some((item) => !item.read_at) && <button className="text-action inbox-mark-all" onClick={() => void markAllRead()}>Đánh dấu tất cả đã đọc</button>}
        {loading ? <p className="center-state">Đang tải hộp thư…</p> : error ? <p className="center-error" role="alert">{error}</p> : tab === "messages" ? (
          rooms.length ? <div className="center-list">{rooms.map((room) => {
            const peerAlias = room.participant_a === userId ? room.participant_b_alias : room.participant_a_alias;
            const latest = latestMessages[room.id];
            const unread = unreadByRoom[room.id] ?? 0;
            return <button className="center-list-item" key={room.id} onClick={() => openRoom(room)}>
              <span className="center-avatar">{peerAlias.slice(0, 1)}</span>
              <span className="center-list-copy"><strong>{peerAlias}</strong><small>{latest ? latest.content : posts[room.post_id]?.content ?? "Bắt đầu cuộc trò chuyện"}</small><time>{latest ? new Date(latest.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : new Date(room.last_message_at).toLocaleDateString("vi-VN")}</time></span>
              {unread > 0 && <b className="center-unread">{unread > 99 ? "99+" : unread}</b>}
            </button>;
          })}</div> : <p className="center-state">Chưa có cuộc trò chuyện nào. Khi bạn bắt đầu trò chuyện riêng, các cuộc hội thoại sẽ xuất hiện tại đây.</p>
        ) : (
          notifications.length ? <div className="center-list">{notifications.map((item) => {
            const post = notificationPosts[item.post_id];
            return <button className={`center-list-item notification-item ${item.read_at ? "" : "unread"}`} key={item.id} onClick={() => void markNotificationRead(item.id)}>
              <span className="center-avatar">{item.notification_type === "reply" ? "↩" : "♡"}</span>
              <span className="center-list-copy"><strong>{item.actor_alias} {item.notification_type === "reply" ? "đã hồi âm tâm sự của bạn" : "đã gửi đồng cảm"}</strong><small>{post?.content ?? "Tâm sự đã được cập nhật."}</small><time>{new Date(item.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</time></span>
              {!item.read_at && <i className="notification-dot" aria-label="Chưa đọc" />}
            </button>;
          })}</div> : <p className="center-state">Bạn chưa có thông báo mới. Khi có đồng cảm hoặc lời hồi âm, chúng sẽ xuất hiện ở đây.</p>
        )}
      </section>
    </div>
  );
}
