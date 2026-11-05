"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { signInAnonymously } from "@/lib/supabase/anonymous-auth";
import { ComposerModal } from "@/components/ComposerModal";
import { Sidebar } from "@/components/Sidebar";
import { VibeFeed } from "@/components/VibeFeed";
import type { InteractionType, Mood, VibePost, VibeReply } from "@/lib/vibe/types";

type VibePostRow = {
  id: string;
  alias: string;
  mood: string;
  content: string;
  location: string | null;
  created_at: string;
  empathy_count: number | null;
};

const moods = ["Tất cả", "Đêm muộn", "Chênh vênh", "Chữa lành", "Thầm thương", "Đã lưu"] as const;
const aliases = ["Mây Lang Thang", "Người Qua Đêm", "Kẻ Mộng Mơ", "Một Vì Sao", "Gió Nhẹ"];
const makeAlias = () => aliases[Math.floor(Math.random() * aliases.length)] + " #" + Math.floor(100 + Math.random() * 900);

export function VibeNestApp() {
  const [alias, setAlias] = useState("Mây Lang Thang #409");
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<VibePost[]>([]);
  const [filter, setFilter] = useState<string>("Tất cả");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMood, setComposerMood] = useState<Mood>("Đêm muộn");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    const supabase = createClient();
    const { data: rows, error } = await supabase.from("vibe_posts")
      .select("id,alias,mood,content,location,created_at,empathy_count")
      .order("created_at", { ascending: false }).limit(60);
    if (error) throw error;

    const postRows = (rows ?? []) as VibePostRow[];
    const ids = postRows.map((row: VibePostRow) => row.id);
    let interactionRows: { post_id: string; action_type: InteractionType }[] = [];
    let replyRows: VibeReply[] = [];
    if (userId && ids.length) {
      const { data, error: interactionError } = await supabase.from("vibe_post_interactions")
        .select("post_id,action_type").in("post_id", ids);
      if (interactionError) throw interactionError;
      interactionRows = (data ?? []) as { post_id: string; action_type: InteractionType }[];
    }
    if (ids.length) {
      const { data, error: replyError } = await supabase.from("vibe_replies")
        .select("id,post_id,author_alias,content,created_at").in("post_id", ids)
        .order("created_at", { ascending: true });
      if (replyError) throw replyError;
      replyRows = (data ?? []) as VibeReply[];
    }
    setPosts(postRows.map((row: VibePostRow) => ({
      ...row,
      mood: row.mood as Mood,
      location: row.location ?? null,
      empathy_count: row.empathy_count ?? 0,
      replies: replyRows.filter((reply) => reply.post_id === row.id),
      empathized: interactionRows.some((item) => item.post_id === row.id && item.action_type === "empathy"),
      saved: interactionRows.some((item) => item.post_id === row.id && item.action_type === "save"),
    })));
  }, [userId]);

  useEffect(() => {
    let alive = true;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setLoading(false);
      return () => { alive = false; };
    }
    const supabase = createClient();
    void supabase.auth.getSession().then(
      (result: { data: { session: Session | null } }) => {
        if (alive) setUserId(result.data.session?.user.id ?? null);
      },
    );
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => setUserId(session?.user.id ?? null),
    );
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void loadFeed().catch((error: unknown) => {
      if (alive) setNotice(error instanceof Error ? error.message : "Không thể tải bảng tâm sự.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadFeed]);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return posts.filter((post) => {
      const moodMatch = filter === "Tất cả" || (filter === "Đã lưu" ? post.saved : post.mood === filter);
      const queryMatch = !normalized || [post.content, post.alias, post.mood, post.location ?? ""].some((value) => value.toLocaleLowerCase("vi").includes(normalized));
      return moodMatch && queryMatch;
    }).sort((a, b) => sort === "latest" ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : b.empathy_count - a.empathy_count);
  }, [posts, filter, query, sort]);

  async function ensureIdentity() {
    if (userId) return userId;
    const session = await signInAnonymously();
    if (!session?.user) throw new Error("Supabase chưa tạo được phiên ẩn danh. Hãy kiểm tra Anonymous Sign-Ins trong Auth settings.");
    setUserId(session.user.id);
    return session.user.id;
  }

  async function publish(content: string, mood: Mood, location: string) {
    setBusy(true);
    try {
      const ownerId = await ensureIdentity();
      const supabase = createClient();
      const { error } = await supabase.from("vibe_posts").insert({
        user_id: ownerId, alias, mood, content, location: location || null,
      });
      if (error) throw error;
      setComposerOpen(false);
      setNotice("Tâm sự của bạn đã được gửi vào VibeNest.");
      await loadFeed();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa thể gửi tâm sự.");
    } finally { setBusy(false); }
  }

  async function toggleInteraction(post: VibePost, action: InteractionType) {
    setBusyId(post.id);
    try {
      const ownerId = await ensureIdentity();
      const supabase = createClient();
      const active = action === "empathy" ? post.empathized : post.saved;
      if (active) {
        const { error } = await supabase.from("vibe_post_interactions").delete()
          .eq("post_id", post.id).eq("action_type", action);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vibe_post_interactions").insert({
          post_id: post.id, user_id: ownerId, action_type: action,
        });
        if (error) throw error;
      }
      await loadFeed();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể lưu tương tác.");
    } finally { setBusyId(null); }
  }

  async function sendReply(post: VibePost, content: string) {
    const ownerId = await ensureIdentity();
    const supabase = createClient();
    const { error } = await supabase.from("vibe_replies").insert({
      post_id: post.id, user_id: ownerId, author_alias: alias, content,
    });
    if (error) throw error;
    await loadFeed();
  }

  const savedCount = posts.filter((post) => post.saved).length;
  const ownPostCount = posts.filter((post) => post.alias === alias).length;

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" />
      <header className="topbar">
        <a className="wordmark" href="#home">VibeNest<span>✳</span></a>
        <nav className="desktop-nav" aria-label="Điều hướng chính">
          <a className="active" href="#feed">Bảng tâm sự</a><a href="#feed" onClick={() => setFilter("Chữa lành")}>Góc chữa lành</a><a href="#feed" onClick={() => setFilter("Đêm muộn")}>Tần số đêm</a><a href="#feed" onClick={() => setFilter("Đã lưu")}>Đã lưu</a>
        </nav>
        <div className="topbar-actions">
          <span className="session-indicator">{userId ? "Đã kết nối ẩn danh" : "Đang xem ẩn danh"}</span>
          <button className="primary-button top-compose" onClick={() => setComposerOpen(true)}>＋ Gửi tâm sự</button>
        </div>
      </header>

      <main className="workspace" id="home">
        <section className="intro-row">
          <div><p className="eyebrow">KHÔNG GIAN LẮNG NGHE ẨN DANH</p><h1>Hôm nay trong lòng bạn<br className="desktop-break" /> đang mang theo điều gì?</h1><p className="muted">Không cần hoàn hảo. Chỉ cần là chính cảm xúc của bạn.</p></div>
          <div className="intro-note"><span>✧</span><p>Mọi câu chuyện đều xứng đáng được lắng nghe.</p></div>
        </section>

        <div className="workspace-grid">
          <Sidebar alias={alias} postCount={ownPostCount} savedCount={savedCount} onChangeAlias={() => setAlias(makeAlias())} />
          <section className="feed-column" id="feed" aria-label="Luồng tâm sự">
            <div className="composer-prompt glass-panel">
              <div className="avatar">{alias.slice(0, 1)}</div>
              <button className="prompt-trigger" onClick={() => setComposerOpen(true)}>Viết vài dòng trút bầu tâm sự ẩn danh…</button>
              <button className="prompt-plus" onClick={() => setComposerOpen(true)} aria-label="Viết tâm sự">＋</button>
            </div>
            <div className="feed-tools">
              <input className="search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo từ khóa hoặc tâm trạng…" aria-label="Tìm tâm sự" />
              <div className="sort-switch"><button className={sort === "latest" ? "selected" : ""} onClick={() => setSort("latest")}>Mới nhất</button><button className={sort === "popular" ? "selected" : ""} onClick={() => setSort("popular")}>Nổi bật</button></div>
            </div>
            <div className="mood-tabs" role="tablist" aria-label="Lọc tâm trạng">{moods.map((item) => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
            {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Đóng thông báo">×</button></div>}
            {!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? <div className="notice">Hãy cấu hình Supabase URL và Publishable Key trong .env.local để kết nối dữ liệu.</div> : loading ? <div className="loading-state">Đang lắng nghe những câu chuyện…</div> : <VibeFeed posts={filteredPosts} busyId={busyId} onEmpathy={(post) => void toggleInteraction(post, "empathy")} onSave={(post) => void toggleInteraction(post, "save")} onReply={sendReply} />}
            <button className="refresh-button" onClick={() => void loadFeed()}>↻ Làm mới bảng tâm sự</button>
          </section>
          <aside className="right-sidebar">
            <section className="glass-panel reflection-card"><p className="eyebrow">CÂU HỎI GỢI MỞ HÔM NAY</p><h2>Nếu có thể nhắn một điều đến chính mình của ba năm trước, bạn sẽ nói gì?</h2><button onClick={() => { setComposerMood("Chữa lành"); setComposerOpen(true); }}>Viết câu trả lời <span>↗</span></button></section>
            <section className="glass-panel guidelines"><h2>Một góc nhỏ dịu dàng</h2><p>01 · Lắng nghe không phán xét.</p><p>02 · Tôn trọng ranh giới và riêng tư.</p><p>03 · Chọn ngôn từ tử tế, kể cả khi bất đồng.</p><small>VibeNest · Kết nối cảm xúc ẩn danh</small></section>
            <section className="glass-panel join-card"><span>✳</span><h2>Một nơi để được là mình.</h2><p>Bạn có thể đọc trước. Khi muốn chia sẻ hoặc tương tác, hãy tạo một phiên ẩn danh.</p><button className="secondary-button" onClick={async () => { try { await ensureIdentity(); setNotice("Bạn đã vào VibeNest bằng danh tính ẩn danh."); } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể tạo phiên."); } }}>Tiếp tục ẩn danh</button></section>
          </aside>
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Điều hướng di động"><a className="selected" href="#feed">⌂<span>Bảng tin</span></a><button onClick={() => setFilter("Chữa lành")}>♡<span>Chữa lành</span></button><button className="mobile-create" onClick={() => setComposerOpen(true)}>＋<span>Viết nhanh</span></button><button onClick={() => setFilter("Đã lưu")}>⌑<span>Đã lưu</span></button></nav>
      <ComposerModal key={composerOpen ? composerMood : "closed"} open={composerOpen} alias={alias} initialMood={composerMood} busy={busy} onClose={() => setComposerOpen(false)} onSubmit={publish} />
    </div>
  );
}