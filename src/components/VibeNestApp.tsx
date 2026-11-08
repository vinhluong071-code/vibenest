"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { signInAnonymously } from "@/lib/supabase/anonymous-auth";
import { ComposerModal } from "@/components/ComposerModal";
import { ChatDialog } from "@/components/ChatDialog";
import { Sidebar } from "@/components/Sidebar";
import { VibeStoriesBar } from "@/components/stories/VibeStoriesBar";
import { VibeFeedCard, type VibePostItem } from "@/components/feed/VibeFeedCard";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { AnimatedSplashScreen } from "@/components/intro/AnimatedSplashScreen";
import { LitmatchThirdPartyAuthModal } from "@/components/auth/LitmatchThirdPartyAuthModal";
import { SnapProfileView } from "@/components/profile/SnapProfileView";
import { CameraFirstView } from "@/components/camera/CameraFirstView";
import { LitmatchOnboardingModal, type UserProfile } from "@/components/auth/LitmatchOnboardingModal";
import { AccountLinkingModal } from "@/components/auth/AccountLinkingModal";
import { InboxCenter } from "@/components/InboxCenter";
import { VibeDirectMessenger } from "@/components/chat/VibeDirectMessenger";
import { AuraDiscoveryRail } from "@/components/discovery/AuraDiscoveryRail";
import { VoiceLoungeScreen } from "@/components/experience/VoiceLoungeScreen";
import { VibeRadarScreen } from "@/components/experience/VibeRadarScreen";
import type { InteractionType, Mood, VibePost, VibeReply } from "@/lib/vibe/types";

type VibePostRow = {
  id: string;
  alias: string;
  mood: string;
  content: string;
  location: string | null;
  image_path: string | null;
  created_at: string;
  empathy_count: number | null;
};

const moods = ["Tất cả", "Đêm muộn", "Chênh vênh", "Chữa lành", "Thầm thương", "Đã lưu"] as const;
const aliases = ["Mây Lang Thang", "Người Qua Đêm", "Kẻ Mộng Mơ", "Một Vì Sao", "Gió Nhẹ"];
const makeAlias = () => aliases[Math.floor(Math.random() * aliases.length)] + " #" + Math.floor(100 + Math.random() * 900);

function getProfileFromAuthUser(user: Session["user"] | null, fallbackName: string): UserProfile {
  const rawProfile: unknown = user?.user_metadata?.vibenest_profile;
  const stored = typeof rawProfile === "object" && rawProfile !== null
    ? rawProfile as Record<string, unknown>
    : {};
  const read = (key: string, fallback: string, maxLength: number) => {
    const value = stored[key];
    return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
  };
  const displayName = read("displayName", fallbackName, 32);
  const fallbackHandle = displayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9._]/g, ".").replace(/^\.+|\.+$/g, "") || "vibenest.user";
  return {
    displayName,
    handle: read("handle", fallbackHandle, 24).toLowerCase().replace(/[^a-z0-9._]/g, "") || "vibenest.user",
    city: read("city", "Sài Gòn", 48),
    vibeTag: read("vibeTag", "Kẻ Mộng Mơ Đêm Muộn", 48),
    bio: read("bio", "", 120),
  };
}

function getFriendlyError(error: unknown, fallback: string): string {
  const value = error as { code?: string; message?: string; status?: number } | null;
  const code = value?.code;
  const message = value?.message?.toLowerCase() ?? "";

  if (code === "anonymous_provider_disabled") return "Supabase chưa bật Anonymous Sign-Ins. Hãy bật tính năng này trong Authentication → Sign In / Providers.";
  if (code === "42501" || code === "PGRST301" || value?.status === 401 || value?.status === 403) {
    return "Bạn chưa có quyền thực hiện thao tác này. Hãy kiểm tra phiên ẩn danh và chính sách quyền truy cập Supabase (RLS).";
  }
  if (code === "42P01" || code === "PGRST205" || code === "PGRST204" || code === "PGRST106") {
    return "Cấu trúc dữ liệu VibeNest chưa sẵn sàng. Hãy kiểm tra migration và quyền Data API trong Supabase.";
  }
  if (code === "23505") return "Tương tác này đã tồn tại. Hãy làm mới bảng tin để cập nhật trạng thái.";
  if (code === "23514" || code === "22001") return "Nội dung không đúng giới hạn cho phép. Vui lòng kiểm tra độ dài và tâm trạng đã chọn.";
  if (code === "23503") return "Bài viết không còn tồn tại hoặc phiên của bạn không hợp lệ. Hãy tải lại bảng tin.";
  if (value?.status === 429 || message.includes("rate limit") || message.includes("too many")) {
    return "Bạn thao tác hơi nhanh. Vui lòng chờ một chút rồi thử lại.";
  }
  if (message.includes("anonymous") && (message.includes("disabled") || message.includes("not enabled"))) {
    return "Đăng nhập ẩn danh chưa được bật. Hãy bật Anonymous Sign-Ins trong Supabase Authentication.";
  }
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("fetch")) {
    return "Không thể kết nối Supabase. Hãy kiểm tra mạng và cấu hình URL/Publishable Key.";
  }
  return fallback;
}

export function VibeNestApp() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const [alias, setAlias] = useState("Mây Lang Thang #409");
  const [profile, setProfile] = useState<UserProfile>(() => getProfileFromAuthUser(null, "Mây Lang Thang #409"));
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<VibePost[]>([]);
  const [filter, setFilter] = useState<string>("Tất cả");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [composerOpen, setComposerOpen] = useState(false);
  const [chatPost, setChatPost] = useState<VibePost | null>(null);
  const [composerMood, setComposerMood] = useState<Mood>("Đêm muộn");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [now, setNow] = useState<number | null>(null);
  const [feedError, setFeedError] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [realtimeToast, setRealtimeToast] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState("tiếp tục kết nối");
  const [snapProfileOpen, setSnapProfileOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [localProfileComplete, setLocalProfileComplete] = useState(false);
  const [activeSurface, setActiveSurface] = useState<"home" | "voice" | "radar">("home");
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const [inboxTab, setInboxTab] = useState<"messages" | "notifications" | null>(null);
  const [messengerOpen, setMessengerOpen] = useState(false);
  const [authUser, setAuthUser] = useState<Session["user"] | null>(null);
  const [pinnedPostIds, setPinnedPostIds] = useState<string[]>([]);


  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("vibenest.pinned-posts.v1");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) setPinnedPostIds(parsed);
      }
    } catch { /* Pins remain optional when storage is unavailable. */ }
  }, []);

  const togglePinnedPost = useCallback((postId: string) => {
    setPinnedPostIds((current) => {
      const next = current.includes(postId) ? current.filter((id) => id !== postId) : [postId, ...current];
      try { window.localStorage.setItem("vibenest.pinned-posts.v1", JSON.stringify(next)); } catch { /* Keep this session's pin state. */ }
      return next;
    });
  }, []);

  // Keep feedback lightweight: action notices dismiss themselves without
  // interrupting feed browsing or requiring an extra tap.
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("vibenest.profile.v1");
        if (saved) {
          const value = JSON.parse(saved) as Partial<UserProfile>;
          if (typeof value.displayName === "string" && typeof value.handle === "string") {
            const restored = { ...getProfileFromAuthUser(null, value.displayName), ...value };
            setProfile(restored); setAlias(restored.displayName); setLocalProfileComplete(true);
          }
        }
      } catch { /* Ignore invalid or unavailable local profile data. */ }
    }, 0);
    const initialClock = window.setTimeout(() => setNow(Date.now()), 0);
    const clockInterval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(restoreTimer);
      window.clearTimeout(initialClock);
      window.clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);
  const refreshBadges = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const [notifications, messages] = await Promise.all([
      supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("recipient_id", userId).is("read_at", null),
      supabase.from("chat_messages").select("id", { count: "exact", head: true })
        .neq("sender_id", userId).is("read_at", null),
    ]);
    if (notifications.error) console.warn("[VibeNest] Không thể tải số thông báo:", notifications.error);
    else setNotificationCount(notifications.count ?? 0);
    if (messages.error) console.warn("[VibeNest] Không thể tải số tin nhắn chưa đọc:", messages.error);
    else setChatUnreadCount(messages.count ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!realtimeToast) return;
    const timeoutId = window.setTimeout(() => setRealtimeToast(""), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [realtimeToast]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const supabase = createClient();
    const badgeRefreshTimer = window.setTimeout(() => {
      void refreshBadges();
    }, 0);
    const channel = supabase.channel(`vibenest-app-events:${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      }, (payload: { new: { notification_type?: string } }) => {
        if (!alive) return;
        const event = payload.new;
        setNotificationCount((count) => count + 1);
        setRealtimeToast(event.notification_type === "reply"
          ? "Có người vừa gửi lời hồi âm cho tâm sự của bạn."
          : "Có người vừa gửi đồng cảm đến tâm sự của bạn.");
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages",
      }, (payload: { new: { sender_id?: string } }) => {
        if (!alive) return;
        const message = payload.new;
        if (message.sender_id === userId) return;
        setChatUnreadCount((count) => count + 1);
        if (!chatPost) setRealtimeToast("Bạn có tin nhắn mới trong VibeNest.");
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "chat_messages",
      }, () => {
        if (alive) void refreshBadges();
      })
      .subscribe();
    return () => {
      alive = false;
      window.clearTimeout(badgeRefreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [userId, chatPost, refreshBadges]);

  const hasCompletedProfile = localProfileComplete || Boolean(authUser?.user_metadata?.vibenest_profile);
  const requestAuth = useCallback((intent: string) => { setAuthIntent(intent); setIsAuthModalOpen(true); }, []);

  const handleChatMessagesRead = useCallback(() => {
    void refreshBadges();
  }, [refreshBadges]);


  const loadFeed = useCallback(async () => {
    setLoading(true);
    setFeedError("");
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase.from("vibe_posts")
        .select("id,alias,mood,content,location,image_path,created_at,empathy_count")
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
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let alive = true;
    if (!hasSupabaseConfig) return;

    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (alive) {
          const nextUser = session?.user ?? null;
          const nextProfile = getProfileFromAuthUser(nextUser, "Mây Lang Thang #409");
          setUserId(nextUser?.id ?? null);
          if (!nextUser) {
            setNotificationCount(0);
            setChatUnreadCount(0);
          }
          setAuthUser(nextUser);
          setProfile(nextProfile);
          setAlias(nextProfile.displayName);
        }
      },
    );

    // Start silently on first visit. The same promise is reused by publish,
    // reply and interaction handlers if the visitor acts before it resolves.
    void signInAnonymously().then((session) => {
      if (alive) {
        const nextUser = session?.user ?? null;
        const nextProfile = getProfileFromAuthUser(nextUser, "Mây Lang Thang #409");
        setUserId(nextUser?.id ?? null);
        if (!nextUser) {
          setNotificationCount(0);
          setChatUnreadCount(0);
        }
        setAuthUser(nextUser);
        setProfile(nextProfile);
        setAlias(nextProfile.displayName);
      }
    }).catch((error: unknown) => {
      // Keep browsing uninterrupted; show feedback only if an action needs auth.
      console.warn("[VibeNest] Silent anonymous session is not ready yet:", error);
    });

    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [hasSupabaseConfig]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    let alive = true;
    const timerId = window.setTimeout(() => {
      void loadFeed().catch((error: unknown) => {
        console.error("[VibeNest] Không thể tải bảng tâm sự:", error);
        if (alive) {
          const message = getFriendlyError(error, "Không thể tải bảng tâm sự. Vui lòng thử lại.");
          setFeedError(message);
        }
      });
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(timerId);
    };
  }, [hasSupabaseConfig, loadFeed]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    let alive = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!alive) return;
        void loadFeed().catch((error: unknown) => {
          console.error("[VibeNest] Realtime feed refresh failed:", error);
          if (alive) setFeedError(getFriendlyError(error, "Không thể đồng bộ bảng tin realtime."));
        });
      }, 180);
    };
    const channel = supabase.channel("vibenest-public-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "vibe_posts" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "vibe_post_interactions" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "vibe_replies" }, scheduleRefresh)
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[VibeNest] Feed realtime channel status:", status);
        }
      });
    return () => {
      alive = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [hasSupabaseConfig, loadFeed]);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return posts.filter((post) => {
      const moodMatch = filter === "Tất cả" || (filter === "Đã lưu" ? post.saved : post.mood === filter);
      const queryMatch = !normalized || [post.content, post.alias, post.mood, post.location ?? ""].some((value) => value.toLocaleLowerCase("vi").includes(normalized));
      return moodMatch && queryMatch;
    }).sort((a, b) => {
      const pinDelta = Number(pinnedPostIds.includes(b.id)) - Number(pinnedPostIds.includes(a.id));
      if (pinDelta) return pinDelta;
      return sort === "latest" ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : b.empathy_count - a.empathy_count;
    });
  }, [posts, filter, query, sort, pinnedPostIds]);

  const feedCardPosts = useMemo<VibePostItem[]>(() => filteredPosts.map((post) => {
    const toHandle = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "vibenest.user";
    const timestamp = new Date(post.created_at).getTime();
    const elapsedMinutes = Math.max(0, Math.floor(((now ?? timestamp) - timestamp) / 60000));
    const timeAgo = elapsedMinutes < 1 ? "Vừa xong" : elapsedMinutes < 60 ? `${elapsedMinutes} phút trước` : elapsedMinutes < 1440 ? `${Math.floor(elapsedMinutes / 60)} giờ trước` : `${Math.floor(elapsedMinutes / 1440)} ngày trước`;
    return {
      id: post.id,
      displayName: post.alias,
      handle: toHandle(post.alias),
      vibeTag: post.mood,
      mood: post.mood,
      location: post.location ?? "Chưa chia sẻ địa điểm",
      timeAgo,
      timestamp,
      content: post.content,
      imageUrl: post.image_path
        ? createClient().storage.from("vibenest-post-media").getPublicUrl(post.image_path).data.publicUrl
        : undefined,
      empathyCount: post.empathy_count,
      // Transparent activity score: real empathy + real replies, not personality compatibility.
      auraScore: Math.min(100, post.empathy_count + post.replies.length * 2),
      empathized: post.empathized,
      saved: post.saved,
      replies: post.replies.map((reply) => ({
        id: reply.id,
        displayName: reply.author_alias,
        handle: toHandle(reply.author_alias),
        timeAgo: new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(reply.created_at)),
        text: reply.content,
      })),
    };
  }), [filteredPosts, now]);

  const handleSharePost = useCallback((post: VibePostItem) => {
    const shareText = `${post.displayName}: ${post.content}`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      void navigator.share({ title: "VibeNest", text: shareText, url: window.location.href })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name !== "AbortError") setNotice("Không thể mở bảng chia sẻ trên thiết bị này.");
        });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(shareText).then(
        () => setNotice("Đã sao chép nội dung tâm sự để chia sẻ."),
        () => setNotice("Thiết bị chưa cho phép sao chép nội dung."),
      );
    } else {
      setNotice("Thiết bị này chưa hỗ trợ chia sẻ nhanh.");
    }
  }, []);

  const ensureIdentity = useCallback(async (actionLabel = "thực hiện thao tác này") => {
    if (userId) return userId;
    let session: Session | null;
    try {
      // Reuses the startup promise when an action races silent sign-in.
      session = await signInAnonymously();
    } catch (error) {
      console.error("[VibeNest] Tạo phiên ẩn danh thất bại:", error);
      throw new Error(getFriendlyError(error, `Chưa thể tạo phiên ẩn danh để ${actionLabel}. Vui lòng thử lại.`));
    }
    if (!session?.user) {
      throw new Error(`Chưa thể xác nhận danh tính ẩn danh để ${actionLabel}. Vui lòng thử lại.`);
    }
    setUserId(session.user.id);
    setAuthUser(session.user);
    const nextProfile = getProfileFromAuthUser(session.user, alias);
    setProfile(nextProfile);
    setAlias(nextProfile.displayName);
    return session.user.id;
  }, [userId, alias]);

  const ensureChatIdentity = useCallback(
    () => ensureIdentity("mở trò chuyện riêng"),
    [ensureIdentity],
  );

  async function publish(content: string, mood: Mood, location: string, media: File | null = null) {
    if (!hasCompletedProfile) { requestAuth("đăng tâm sự"); setNotice("Hãy tạo hồ sơ VibeNest trước khi đăng tâm sự. Bản nháp vẫn được giữ lại."); return; }
    setBusy(true);
    let uploadedPath: string | null = null;
    let postCreated = false;
    try {
      const ownerId = await ensureIdentity("đăng tâm sự");
      const supabase = createClient();
      if (media) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(media.type) || media.size > 10 * 1024 * 1024) {
          throw new Error("Ảnh phải là JPG, PNG hoặc WebP và không vượt quá 10 MB.");
        }
        const extension = media.type === "image/jpeg" ? "jpg" : media.type === "image/png" ? "png" : "webp";
        uploadedPath = `${ownerId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("vibenest-post-media")
          .upload(uploadedPath, media, {
            cacheControl: "3600",
            contentType: media.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;
      }

      const { error } = await supabase.from("vibe_posts").insert({
        user_id: ownerId,
        alias,
        mood,
        content,
        location: location || null,
        image_path: uploadedPath,
      });
      if (error) throw error;
      postCreated = true;
      setComposerOpen(false);
      setNotice(media ? "Tâm sự và ảnh của bạn đã được đăng lên VibeNest." : "Tâm sự của bạn đã được gửi vào VibeNest.");
      try {
        await loadFeed();
        setFeedError("");
      } catch (refreshError) {
        console.error("[VibeNest] Đã đăng bài nhưng tải lại bảng tin thất bại:", refreshError);
        setFeedError("Bài đã được gửi, nhưng bảng tin chưa cập nhật. Hãy nhấn Làm mới bảng tâm sự.");
      }
    } catch (error) {
      if (uploadedPath && !postCreated) {
        const { error: cleanupError } = await createClient().storage
          .from("vibenest-post-media")
          .remove([uploadedPath]);
        if (cleanupError) console.warn("[VibeNest] Không thể dọn ảnh tải lên chưa gắn với bài viết:", cleanupError);
      }
      console.error("[VibeNest] Đăng tâm sự thất bại:", error);
      setNotice(getFriendlyError(error, "Chưa thể gửi tâm sự. Vui lòng thử lại."));
    } finally { setBusy(false); }
  }

  async function toggleInteraction(post: VibePost, action: InteractionType) {
    if (!hasCompletedProfile) { requestAuth("gửi đồng cảm và kết nối"); return; }
    setBusyId(post.id);
    try {
      const ownerId = await ensureIdentity(action === "empathy" ? "gửi đồng cảm" : "lưu bài viết");
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
      try {
        await loadFeed();
        setFeedError("");
      } catch (refreshError) {
        console.error("[VibeNest] Tương tác đã lưu nhưng tải lại bảng tin thất bại:", refreshError);
        setFeedError("Tương tác đã được lưu, nhưng bảng tin chưa cập nhật. Hãy nhấn Làm mới.");
      }
    } catch (error) {
      console.error("[VibeNest] Tương tác thất bại:", error);
      setNotice(getFriendlyError(error, "Không thể cập nhật tương tác. Vui lòng thử lại."));
    } finally { setBusyId(null); }
  }

  async function sendReply(post: VibePost, content: string) {
    try {
      const ownerId = await ensureIdentity("gửi lời hồi âm");
      const supabase = createClient();
      const { error } = await supabase.from("vibe_replies").insert({
        post_id: post.id, user_id: ownerId, author_alias: alias, content,
      });
      if (error) throw error;
      try {
        await loadFeed();
      } catch (refreshError) {
        console.error("[VibeNest] Đã gửi hồi âm nhưng tải lại bảng tin thất bại:", refreshError);
        setNotice("Hồi âm đã được gửi, nhưng chưa thể cập nhật bảng tin. Hãy nhấn Làm mới.");
      }
    } catch (error) {
      console.error("[VibeNest] Gửi hồi âm thất bại:", error);
      setNotice(getFriendlyError(error, "Không thể gửi hồi âm. Vui lòng thử lại."));
      throw error;
    }
  }

  async function handleAccountLinked(_payload: { email: string; method: "otp" | "password"; mode: "link" | "recover" }) {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      setNotice("Xác thực thành công nhưng chưa tải được hồ sơ phiên. Vui lòng làm mới trang.");
      return;
    }
    if (user) {
      setAuthUser(user);
      setUserId(user.id);
      const nextProfile = getProfileFromAuthUser(user, alias);
      setProfile(nextProfile);
      setAlias(nextProfile.displayName);
      setNotice("Đã cập nhật trạng thái tài khoản VibeNest.");
    }
  }

  async function handleAccountUnlinked() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      const session = await signInAnonymously();
      setAuthUser(session?.user ?? null);
      setUserId(session?.user.id ?? null);
      const nextProfile = getProfileFromAuthUser(session?.user ?? null, alias);
      setProfile(nextProfile);
      setAlias(nextProfile.displayName);
      setAccountOpen(false);
      setNotice("Thiết bị này đã đăng xuất khỏi tài khoản được liên kết và chuyển sang phiên ẩn danh mới. Tài khoản cũ vẫn được giữ nguyên.");
    } catch (error) {
      setNotice(getFriendlyError(error, "Không thể chuyển thiết bị về chế độ ẩn danh."));
    }
  }

  const savedCount = posts.filter((post) => post.saved).length;
  const ownPostCount = posts.filter((post) => post.alias === alias).length;

  return (
    <div className="app-shell">
      <AnimatedSplashScreen />
      <div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" />
      {realtimeToast && <div className="realtime-toast" role="status" aria-live="polite"><span>{realtimeToast}</span><button onClick={() => setRealtimeToast("")} aria-label="Đóng thông báo">×</button></div>}
      <header className="topbar">
        <a className="brand-lockup" href="#home" aria-label="VibeNest — Trang chủ"><Image src="/icon.svg" alt="" width={34} height={34} priority /><span>VibeNest</span></a>
        <nav className="desktop-nav hybrid-desktop-nav" aria-label="Điều hướng chính">
          <button className={activeSurface === "home" ? "active" : ""} onClick={() => setActiveSurface("home")}>Home Feed</button>
          <button className={activeSurface === "voice" ? "active" : ""} onClick={() => setActiveSurface("voice")}>Voice Lounge</button>
          <button className={activeSurface === "radar" ? "active" : ""} onClick={() => setActiveSurface("radar")}>Vibe Radar</button>
          <button onClick={() => { setActiveSurface("home"); setFilter("Chữa lành"); }}>Chữa lành</button>
        </nav>
        <div className="topbar-actions">
          <span className="session-indicator">{authUser?.email ? "Đã liên kết Email" : userId ? "Đang ẩn danh" : "Đang xem ẩn danh"}</span>
          <button className="realtime-badge" onClick={() => setActiveSurface("radar")} aria-label="Mở Vibe Radar"><span>✦ Vibe Radar</span></button>
          <button className="realtime-badge" onClick={() => setInboxTab("messages")} aria-label={`Hộp thư, ${chatUnreadCount} tin nhắn chưa đọc`}>
            <span>Hộp thư</span>{chatUnreadCount > 0 && <b>{chatUnreadCount > 99 ? "99+" : chatUnreadCount}</b>}
          </button>
          <button className="realtime-badge" onClick={() => setInboxTab("notifications")} aria-label={`Thông báo, ${notificationCount} chưa đọc`}>
            <span>Thông báo</span>{notificationCount > 0 && <b>{notificationCount > 99 ? "99+" : notificationCount}</b>}
          </button>
          <button className="account-button" onClick={() => setAccountOpen(true)}>{authUser?.email ? "Tài khoản" : "Liên kết Email"}</button>
          <button className="primary-button top-compose" onClick={() => setComposerOpen(true)}>＋ Gửi tâm sự</button>
        </div>
      </header>

      <main className={`workspace hybrid-workspace surface-${activeSurface}`} id="home"
        onTouchStart={(event) => { const target = event.target; if (target instanceof Element && target.closest("button,a,input,textarea,select,[data-no-swipe],.aura-card-track,.mood-tabs,.sort-switch")) { touchOrigin.current = null; return; } const touch = event.touches[0]; if (touch) touchOrigin.current = { x: touch.clientX, y: touch.clientY }; }}
        onTouchEnd={(event) => { const start = touchOrigin.current; touchOrigin.current = null; const touch = event.changedTouches[0]; if (!start || !touch) return; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.25) return; setActiveSurface((current) => { const order = ["home", "voice", "radar"] as const; const index = order.indexOf(current); return order[Math.max(0, Math.min(order.length - 1, index + (dx < 0 ? 1 : -1)))]; }); }}>
        {activeSurface === "home" && <>
        <section className="vn-home-header"><div className="vn-home-avatar">{alias.slice(0,1).toUpperCase()}</div><label className="vn-home-search"><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Tìm bạn bè, khoảnh khắc…" aria-label="Tìm bạn bè và khoảnh khắc"/></label><div className="vn-home-title"><h1>Home</h1><p>Khoảnh khắc của bạn bè và những câu chuyện mới</p></div></section>

        <div className="workspace-grid">
          <Sidebar alias={alias} postCount={ownPostCount} savedCount={savedCount} onChangeAlias={() => setAlias(makeAlias())} />
          <section className="feed-column" id="feed" aria-label="Luồng tâm sự">
            <VibeStoriesBar currentUserName={alias} currentUserHandle={profile.handle} onNotify={setNotice} />
            <AuraDiscoveryRail posts={feedCardPosts.slice(0, 3)} onOpenChat={(postId) => { if (!hasCompletedProfile) { requestAuth("kết bạn và bắt đầu trò chuyện"); return; } const target = posts.find((item) => item.id === postId); if (target) setChatPost(target); }} />
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
            {notice && <div className="notice" role="status" aria-live="polite"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Đóng thông báo">×</button></div>}
            {!hasSupabaseConfig ? <div className="notice" role="alert">Hãy cấu hình Supabase URL và Publishable Key trong môi trường Preview để kết nối dữ liệu.</div> : loading ? <div className="loading-state" role="status">Đang lắng nghe những câu chuyện…</div> : feedError ? <div className="empty-state glass-panel" role="alert"><h2>Chưa tải được bảng tâm sự</h2><p>{feedError}</p><button className="secondary-button" onClick={() => { void loadFeed().catch((error: unknown) => { console.error("[VibeNest] Tải lại bảng tin thất bại:", error); setFeedError(getFriendlyError(error, "Vẫn chưa thể tải bảng tin.")); }); }}>Thử tải lại</button></div> : <div className="vn-discovery-grid">
                {feedCardPosts.length === 0 ? (
                  <div className="empty-state glass-panel"><span>✧</span><h2>Khoảng lặng cũng có ý nghĩa</h2><p>Chưa có lời tâm sự phù hợp. Bạn có thể là người đầu tiên mở lời.</p></div>
                ) : feedCardPosts.map((cardPost) => {
                  const sourcePost = posts.find((item) => item.id === cardPost.id);
                  if (!sourcePost) return null;
                  return (
                    <VibeFeedCard
                      key={cardPost.id}
                      post={cardPost}
                      pinned={pinnedPostIds.includes(cardPost.id)}
                      onTogglePin={() => togglePinnedPost(cardPost.id)}
                      busy={busyId === sourcePost.id}
                      onToggleEmpathy={(postId) => {
                        const target = posts.find((item) => item.id === postId);
                        if (target) void toggleInteraction(target, "empathy");
                      }}
                      onToggleSave={(postId) => {
                        const target = posts.find((item) => item.id === postId);
                        if (target) void toggleInteraction(target, "save");
                      }}
                      onAddReply={(postId, text) => {
                        const target = posts.find((item) => item.id === postId);
                        if (target) void sendReply(target, text);
                      }}
                      onShare={handleSharePost}
                      onChat={() => setChatPost(sourcePost)}
                    />
                  );
                })}
              </div>}
            <button className="refresh-button" onClick={() => { void loadFeed().catch((error: unknown) => { console.error("[VibeNest] Làm mới bảng tin thất bại:", error); setFeedError(getFriendlyError(error, "Không thể làm mới bảng tin.")); }); }}>↻ Làm mới bảng tâm sự</button>
          </section>
          <aside className="right-sidebar">
            <section className="glass-panel reflection-card"><p className="eyebrow">CÂU HỎI GỢI MỞ HÔM NAY</p><h2>Nếu có thể nhắn một điều đến chính mình của ba năm trước, bạn sẽ nói gì?</h2><button onClick={() => { setComposerMood("Chữa lành"); setComposerOpen(true); }}>Viết câu trả lời <span>↗</span></button></section>
            <section className="glass-panel guidelines"><h2>Một góc nhỏ dịu dàng</h2><p>01 · Lắng nghe không phán xét.</p><p>02 · Tôn trọng ranh giới và riêng tư.</p><p>03 · Chọn ngôn từ tử tế, kể cả khi bất đồng.</p><small>VibeNest · Kết nối cảm xúc ẩn danh</small></section>
            <section className="glass-panel join-card"><span>✳</span><h2>Một nơi để được là mình.</h2><p>Bạn có thể đọc trước. Khi muốn chia sẻ hoặc tương tác, hãy tạo một phiên ẩn danh.</p><button className="secondary-button" onClick={async () => { try { await ensureIdentity(); setNotice("Bạn đã vào VibeNest bằng danh tính ẩn danh."); } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể tạo phiên."); } }}>Tiếp tục ẩn danh</button></section>
          </aside>
        </div>
        </>}
        {activeSurface === "voice" && <VoiceLoungeScreen />}
        {activeSurface === "radar" && <VibeRadarScreen displayName={profile.displayName} vibeTag={profile.vibeTag} posts={feedCardPosts.slice(0, 12)} onOpenChat={(postId) => { const target = posts.find((item) => item.id === postId); if (target) setChatPost(target); }} />}
      </main>

      {!cameraOpen && <BottomTabBar
        activeTab={messengerOpen ? "messages" : snapProfileOpen || profileOpen || isAuthModalOpen ? "profile" : cameraOpen ? "camera" : activeSurface === "radar" ? "radar" : "home"}
        unreadCount={chatUnreadCount}
        onOpenMessages={async () => {
          setActiveSurface("home"); setSnapProfileOpen(false);
          try { await ensureIdentity("mở hộp thư"); setMessengerOpen(true); setInboxTab(null); }
          catch (error) { requestAuth("mở tin nhắn"); setNotice(error instanceof Error ? error.message : "Không thể mở hộp thư."); }
        }}
        onSelectTab={(tab) => {
          if (tab === "radar") { setMessengerOpen(false); setSnapProfileOpen(false); setCameraOpen(false); setActiveSurface("radar"); return; }
          if (tab === "home") { setMessengerOpen(false); setSnapProfileOpen(false); setCameraOpen(false); setActiveSurface("home"); return; }
          if (tab === "profile") {
            setMessengerOpen(false); setCameraOpen(false); setActiveSurface("home");
            if (!hasCompletedProfile) requestAuth("tạo hồ sơ cá nhân");
            else if (!hasSupabaseConfig) setProfileOpen(true);
            else setSnapProfileOpen(true);
            return;
          }
          if (tab === "camera") { setMessengerOpen(false); setSnapProfileOpen(false); setActiveSurface("home"); setCameraOpen(true); return; }
          setActiveSurface("home");
        }}
        onOpenComposer={() => { setMessengerOpen(false); setActiveSurface("home"); setCameraOpen(true); }}
        onOpenProfile={() => { if (!hasCompletedProfile) requestAuth("tạo hồ sơ cá nhân"); else if (!hasSupabaseConfig) setProfileOpen(true); else setSnapProfileOpen(true); }}
        userInitial={alias.slice(0, 1).toUpperCase()}
      />}
      {messengerOpen && userId && <VibeDirectMessenger userId={userId} alias={alias} onClose={() => setMessengerOpen(false)} onOpenConversation={(post) => { setMessengerOpen(false); setChatPost(post); }} />}
      <CameraFirstView open={cameraOpen} handle={profile.handle} onClose={() => setCameraOpen(false)} onCaptured={(file) => { setCapturedPhoto(file); setCameraOpen(false); setComposerOpen(true); }} />
      {chatPost && <ChatDialog post={chatPost} alias={alias} onClose={() => setChatPost(null)} onEnsureIdentity={ensureChatIdentity} onMessagesRead={handleChatMessagesRead} />}
      {inboxTab && userId && <InboxCenter key={inboxTab} userId={userId} initialTab={inboxTab} onClose={() => setInboxTab(null)} onOpenConversation={(post) => { setInboxTab(null); setChatPost(post); }} onNotificationsRead={() => { void refreshBadges(); }} />}
      <LitmatchThirdPartyAuthModal open={isAuthModalOpen} intent={authIntent} onClose={() => setIsAuthModalOpen(false)} onDemoContinue={() => { setIsAuthModalOpen(false); setProfileOpen(true); }} />
      {snapProfileOpen && <SnapProfileView onClose={() => setSnapProfileOpen(false)} onSafety={() => { setSnapProfileOpen(false); setAccountOpen(true); }} onSoftGate={() => requestAuth("liên kết tài khoản để lưu hồ sơ")} />}
      <LitmatchOnboardingModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUser={profile}
        onCompleteAuth={async (nextProfile) => {
          const localProfile = { displayName: nextProfile.displayName.slice(0, 32), handle: nextProfile.handle.slice(0, 24), city: nextProfile.city.slice(0, 48), vibeTag: nextProfile.vibeTag.slice(0, 48), bio: nextProfile.bio.slice(0, 120) };
          try { window.localStorage.setItem("vibenest.profile.v1", JSON.stringify(localProfile)); } catch { /* local storage may be disabled */ }
          setLocalProfileComplete(true);
          if (!hasSupabaseConfig) {
            setProfile(nextProfile); setAlias(nextProfile.displayName); setProfileOpen(false);
            setNotice("Đã lưu hồ sơ trên thiết bị này. Liên kết Supabase để đồng bộ và sử dụng các tính năng trực tuyến.");
            return;
          }
          const ownerId = await ensureIdentity("lưu hồ sơ cá nhân");
          const supabase = createClient();
          const { data, error } = await supabase.auth.updateUser({
            data: {
              vibenest_profile: {
                displayName: nextProfile.displayName.slice(0, 32),
                handle: nextProfile.handle.slice(0, 24),
                city: nextProfile.city.slice(0, 48),
                vibeTag: nextProfile.vibeTag.slice(0, 48),
                bio: nextProfile.bio.slice(0, 120),
              },
            },
          });
          if (error) throw error;
          if (!data.user || data.user.id !== ownerId) {
            throw new Error("Không xác nhận được tài khoản đã lưu hồ sơ. Vui lòng thử lại.");
          }
          setAuthUser(data.user);
          setProfile(nextProfile);
          setAlias(nextProfile.displayName);
          setNotice("Hồ sơ cá nhân đã được lưu vào tài khoản VibeNest.");
          setProfileOpen(false);
          setSnapProfileOpen(true);
        }}
      />
      <AccountLinkingModal
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        currentAlias={alias}
        onAliasChange={setAlias}
        linkedEmail={authUser?.email && authUser.email_confirmed_at ? authUser.email : undefined}
        onAccountLinked={handleAccountLinked}
        onAccountUnlinked={() => void handleAccountUnlinked()}
      />
      <ComposerModal key={composerOpen ? `${composerMood}-${capturedPhoto?.name ?? "empty"}` : "closed"} open={composerOpen} alias={alias} initialMood={composerMood} initialMedia={capturedPhoto} busy={busy} onClose={() => { setComposerOpen(false); setCapturedPhoto(null); }} onSubmit={publish} />
    </div>
  );
}