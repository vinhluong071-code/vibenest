"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mood, VibePost } from "@/lib/vibe/types";

type InboxRow = {
  room_id: string;
  post_id: string;
  peer_alias: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};
type PostRow = {
  id: string; alias: string; mood: string; content: string;
  location: string | null; image_path: string | null; created_at: string;
  empathy_count: number | null;
};

type Props = {
  userId: string;
  alias: string;
  onClose: () => void;
  onOpenConversation: (post: VibePost) => void;
};

export function VibeDirectMessenger({ userId, alias, onClose, onOpenConversation }: Props) {
  const [tab, setTab] = useState<"inbox" | "discover">("inbox");
  const [rooms, setRooms] = useState<InboxRow[]>([]);
  const [people, setPeople] = useState<PostRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const loadInbox = useCallback(async () => {
    const { data, error: queryError } = await createClient().rpc("get_vibenest_inbox");
    if (queryError) throw queryError;
    setRooms((data ?? []) as InboxRow[]);
  }, []);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error: queryError } = await supabase.rpc("get_vibenest_inbox");
        if (queryError) throw queryError;
        if (alive) setRooms((data ?? []) as InboxRow[]);
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : "Không thể tải hộp thư.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const channel = supabase.channel(`vibenest-dm-inbox:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        if (alive) void loadInbox().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không thể đồng bộ hộp thư."));
      })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [userId, loadInbox]);

  useEffect(() => {
    if (tab !== "discover" || !search.trim()) return;
    let alive = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error: queryError } = await createClient().from("vibe_posts")
          .select("id,alias,mood,content,location,image_path,created_at,empathy_count")
          .order("created_at", { ascending: false }).limit(80);
        if (queryError) throw queryError;
        if (!alive) return;
        const term = search.trim().toLocaleLowerCase("vi");
        const filtered = ((data ?? []) as PostRow[]).filter((post) =>
          post.alias.toLocaleLowerCase("vi").includes(term) ||
          post.content.toLocaleLowerCase("vi").includes(term),
        ).filter((post) => post.alias !== alias);
        setPeople(filtered.slice(0, 30));
        setError("");
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : "Không thể tìm người dùng.");
      } finally { if (alive) setSearching(false); }
    }, 260);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [alias, search, tab]);

  const totalUnread = useMemo(() => rooms.reduce((sum, room) => sum + Number(room.unread_count || 0), 0), [rooms]);
  const visiblePeople = search.trim() ? people : [];
  function openPost(post: PostRow) {
    onOpenConversation({
      id: post.id, alias: post.alias, mood: post.mood as Mood, content: post.content,
      location: post.location, image_path: post.image_path, created_at: post.created_at,
      empathy_count: post.empathy_count ?? 0, replies: [], empathized: false, saved: false,
    });
  }

  return (
    <div className="dm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dm-panel glass-panel" role="dialog" aria-modal="true" aria-labelledby="dm-title">
        <header className="dm-header">
          <div><p className="eyebrow">VIBENEST · PRIVATE CONNECTION</p><h2 id="dm-title">Tin nhắn</h2><p className="dm-subtitle">Những cuộc trò chuyện riêng tư của bạn</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng tin nhắn">×</button>
        </header>
        <div className="dm-tabs" role="tablist" aria-label="Tin nhắn">
          <button role="tab" aria-selected={tab === "inbox"} className={tab === "inbox" ? "selected" : ""} onClick={() => setTab("inbox")}>Hộp thư {totalUnread > 0 && <b>{totalUnread > 99 ? "99+" : totalUnread}</b>}</button>
          <button role="tab" aria-selected={tab === "discover"} className={tab === "discover" ? "selected" : ""} onClick={() => setTab("discover")}>Tìm người</button>
        </div>
        {tab === "inbox" ? (
          loading ? <p className="dm-state">Đang tải hội thoại…</p> : error ? <p className="dm-error" role="alert">{error}</p> :
          rooms.length ? <div className="dm-list">{rooms.map((room) => (
            <button key={room.room_id} className="dm-row" onClick={() => {
              void (async () => {
                const { data, error: postError } = await createClient().from("vibe_posts")
                  .select("id,alias,mood,content,location,image_path,created_at,empathy_count")
                  .eq("id", room.post_id).single();
                if (postError || !data) { setError("Không tìm thấy bài viết gốc của cuộc trò chuyện."); return; }
                openPost(data as PostRow);
              })();
            }}>
              <span className="dm-avatar">{room.peer_alias.slice(0, 1).toUpperCase()}<i /></span>
              <span className="dm-copy"><strong>{room.peer_alias}</strong><small>{room.last_message || "Bắt đầu cuộc trò chuyện"}</small><time>{new Date(room.last_message_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</time></span>
              {room.unread_count > 0 && <b className="dm-unread">{room.unread_count > 99 ? "99+" : room.unread_count}</b>}
            </button>
          ))}</div> : <p className="dm-state">Chưa có hội thoại. Chuyển sang “Tìm người” để bắt đầu kết nối từ những bài tâm sự công khai.</p>
        ) : (
          <>
            <input className="dm-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc nội dung tâm sự…" aria-label="Tìm người để nhắn tin" />
            {searching ? <p className="dm-state">Đang tìm…</p> : visiblePeople.length ? <div className="dm-list">{visiblePeople.map((person) => (
              <button key={person.id} className="dm-row" onClick={() => openPost(person)}>
                <span className="dm-avatar">{person.alias.slice(0, 1).toUpperCase()}<i /></span>
                <span className="dm-copy"><strong>{person.alias}</strong><small>{person.content}</small><time>{person.mood} · Có thể nhắn riêng</time></span>
                <span className="dm-start">Nhắn</span>
              </button>
            ))}</div> : <p className="dm-state">{search ? "Không tìm thấy người phù hợp." : "Nhập tên hoặc từ khóa để khám phá người dùng VibeNest."}</p>}
          </>
        )}
        <p className="dm-footnote">Chỉ thành viên của từng phòng chat mới đọc được tin nhắn. Tìm kiếm dựa trên bài tâm sự công khai.</p>
      </section>
    </div>
  );
}
