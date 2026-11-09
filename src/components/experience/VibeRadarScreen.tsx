"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuraDiscoveryRail } from "@/components/discovery/AuraDiscoveryRail";
import type { VibePostItem } from "@/components/feed/VibeFeedCard";
import { createClient } from "@/lib/supabase/client";

type Props = {
  displayName: string;
  vibeTag: string;
  posts: VibePostItem[];
  onOpenChat: (postId: string) => void;
  forceGhostMode?: boolean;
};
type Layer = "street" | "cycling" | "mood";
type Coordinates = { lat: number; lon: number };
type FriendLocation = {
  id: string;
  handle: string;
  avatar: string | null;
  lat: number;
  lon: number;
  battery: number | null;
  charging: boolean;
  ghost: boolean;
  mutual: boolean;
  active: boolean;
};
type BatteryManagerLike = EventTarget & {
  level: number;
  charging: boolean;
};
type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManagerLike>;
};
type RpcFriend = Record<string, unknown>;

const DEFAULT_CENTER: Coordinates = { lat: 10.8231, lon: 106.6297 };
const MAP_DELTA = 0.035;
const SYNC_INTERVAL_MS = 30_000;
const LAYERS: { id: Layer; label: string; icon: string; description: string }[] = [
  { id: "street", label: "Đường phố", icon: "▤", description: "Bản đồ đường phố OpenStreetMap" },
  { id: "cycling", label: "Địa hình", icon: "⌁", description: "Lớp đường đi xe đạp OpenStreetMap" },
  { id: "mood", label: "Mood", icon: "✧", description: "Bản đồ tâm trạng cộng đồng" },
];

function makeMapUrl(center: Coordinates, layer: Layer) {
  const west = center.lon - MAP_DELTA;
  const east = center.lon + MAP_DELTA;
  const south = center.lat - MAP_DELTA;
  const north = center.lat + MAP_DELTA;
  const bbox = [west, south, east, north].join("%2C");
  const tileLayer = layer === "cycling" ? "cyclemap" : "mapnik";
  return "https://www.openstreetmap.org/export/embed.html?bbox=" + bbox + "&layer=" + tileLayer + "&marker=" + center.lat + "%2C" + center.lon;
}

function readNumber(row: RpcFriend, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function readString(row: RpcFriend, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readBoolean(row: RpcFriend, keys: string[]): boolean {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1) return true;
    if (value === "false" || value === 0) return false;
  }
  return false;
}

function normalizeFriends(value: unknown): FriendLocation[] {
  const rows = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data) ? (value as { data: unknown[] }).data : [];
  return rows.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as RpcFriend;
    const lat = readNumber(row, ["lat", "latitude", "p_lat"]);
    const lon = readNumber(row, ["lng", "lon", "longitude", "p_lng"]);
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return [];
    const ghost = readBoolean(row, ["is_ghost", "ghost", "ghost_mode", "p_ghost"]);
    return [{
      id: readString(row, ["user_id", "id", "friend_id"]) ?? "friend-" + index,
      handle: readString(row, ["handle", "username", "display_name", "name"]) ?? "Bạn bè",
      avatar: readString(row, ["avatar_url", "avatar", "photo_url"]),
      lat,
      lon,
      battery: readNumber(row, ["battery", "battery_level", "battery_percent", "p_battery"]),
      charging: readBoolean(row, ["is_charging", "charging", "p_charging"]),
      ghost,
      mutual: readBoolean(row, ["is_mutual_friend", "mutual_friend", "is_friend"]) || readString(row, ["friendship_status", "relationship_status"]) === "accepted",
      active: readBoolean(row, ["is_active", "active", "online"]),
    }];
  });
}

function moodOrbPosition(friend: FriendLocation): Coordinates {
  const hash = Array.from(friend.id).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
  const angle = (hash % 360) * Math.PI / 180;
  const radiusMeters = 180 + ((hash >>> 8) % 120);
  const latOffset = (radiusMeters * Math.cos(angle)) / 111_320;
  const lonScale = Math.max(0.2, Math.cos(friend.lat * Math.PI / 180));
  const lonOffset = (radiusMeters * Math.sin(angle)) / (111_320 * lonScale);
  return { lat: friend.lat + latOffset, lon: friend.lon + lonOffset };
}

function mercatorY(latitude: number) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const radians = (clamped * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

function getMarkerPosition(point: Coordinates, center: Coordinates) {
  const west = center.lon - MAP_DELTA;
  const east = center.lon + MAP_DELTA;
  const north = center.lat + MAP_DELTA;
  const south = center.lat - MAP_DELTA;
  const x = ((point.lon - west) / (east - west)) * 100;
  const northY = mercatorY(north);
  const southY = mercatorY(south);
  const y = ((northY - mercatorY(point.lat)) / (northY - southY)) * 100;
  return { left: x, top: y };
}

export function VibeRadarScreen({ displayName, vibeTag, posts, onOpenChat, forceGhostMode = false }: Props) {
  const [ghostMode, setGhostMode] = useState(true);
  const [layer, setLayer] = useState<Layer>("street");
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("Ghost Mode đang bật. Bật chia sẻ vị trí để xuất hiện trên bản đồ bạn bè.");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [city] = useState("Thành phố Hồ Chí Minh");
  const [weather] = useState("29°C · ⛅");
  const [activeDiscovery, setActiveDiscovery] = useState("Kỷ niệm");
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);
  const [friends, setFriends] = useState<FriendLocation[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [syncAt, setSyncAt] = useState<number | null>(null);
  const [rpcAvailable, setRpcAvailable] = useState(true);
  const watchIdRef = useRef<number | null>(null);
  const positionRef = useRef<Coordinates | null>(null);
  const speedRef = useRef<number | null>(null);
  const batteryRef = useRef<{ percent: number | null; charging: boolean }>({ percent: null, charging: false });
  const ghostRef = useRef(ghostMode);
  const syncingRef = useRef(false);
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    ghostRef.current = ghostMode;
  }, [ghostMode]);

  useEffect(() => {
    if (forceGhostMode) {
      setGhostMode(true);
      setLocationMessage("Ghost Mode bắt buộc theo chính sách an toàn tài khoản.");
    }
  }, [forceGhostMode]);

  const loadFriends = useCallback(async () => {
    if (!supabase) return;
    setFriendsLoading(true);
    const { data, error } = await supabase.rpc("get_friends_map_locations");
    setFriendsLoading(false);
    if (error) {
      setRpcAvailable(false);
      setLocationMessage("Không tải được vị trí bạn bè: " + error.message);
      return;
    }
    setRpcAvailable(true);
    setFriends(normalizeFriends(data));
  }, [supabase]);

  const syncLocation = useCallback(async () => {
    const position = positionRef.current;
    if (!supabase || !position || syncingRef.current) return;
    syncingRef.current = true;
    const battery = batteryRef.current;
    const { error } = await supabase.rpc("update_my_location", {
      p_lat: position.lat,
      p_lng: position.lon,
      p_battery: battery.percent,
      p_charging: battery.charging,
      p_speed: speedRef.current,
      p_ghost: ghostRef.current,
    });
    syncingRef.current = false;
    if (error) {
      setRpcAvailable(false);
      setLocationMessage("Đã lấy GPS nhưng đồng bộ vị trí thất bại: " + error.message);
      return;
    }
    setRpcAvailable(true);
    setSyncAt(Date.now());
    setLocationMessage(ghostRef.current
      ? "GPS đang đồng bộ ở chế độ Ghost. Máy chủ chịu trách nhiệm làm mờ vị trí trước khi chia sẻ."
      : "Vị trí và pin thiết bị đã đồng bộ với bản đồ bạn bè.");
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setLocationMessage("Chưa cấu hình Supabase trên thiết bị này.");
      return;
    }
    void loadFriends();
    const friendTimer = window.setInterval(() => void loadFriends(), SYNC_INTERVAL_MS);
    return () => window.clearInterval(friendTimer);
  }, [loadFriends, supabase]);

  useEffect(() => {
    let batteryManager: BatteryManagerLike | null = null;
    const batteryChanged = () => {
      if (!batteryManager) return;
      const percent = Math.round(Math.max(0, Math.min(1, batteryManager.level)) * 100);
      batteryRef.current = { percent, charging: batteryManager.charging };
      setBatteryPercent(percent);
      setCharging(batteryManager.charging);
    };
    const batteryApi = navigator as NavigatorWithBattery;
    if (typeof batteryApi.getBattery === "function") {
      void batteryApi.getBattery().then((battery) => {
        batteryManager = battery;
        batteryChanged();
        battery.addEventListener("levelchange", batteryChanged);
        battery.addEventListener("chargingchange", batteryChanged);
      }).catch(() => setLocationMessage("Trình duyệt không cấp quyền đọc trạng thái pin."));
    }
    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener("levelchange", batteryChanged);
        batteryManager.removeEventListener("chargingchange", batteryChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationMessage("Thiết bị không hỗ trợ GPS hoặc chưa cấp quyền vị trí.");
      return;
    }
    setLocationBusy(true);
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lon: coords.longitude };
        positionRef.current = next;
        speedRef.current = Number.isFinite(coords.speed) ? coords.speed : null;
        setMyLocation(next);
        setCenter(next);
        setLocationBusy(false);
      },
      (error) => {
        setLocationBusy(false);
        const messages: Record<number, string> = {
          1: "Bạn chưa cấp quyền GPS. Hãy bật quyền vị trí để sử dụng bản đồ.",
          2: "GPS hiện không xác định được vị trí thiết bị.",
          3: "GPS hết thời gian chờ. Đang thử tiếp tục theo dõi.",
        };
        setLocationMessage(messages[error.code] ?? "Không thể lấy vị trí GPS.");
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 },
    );
    watchIdRef.current = watchId;
    return () => {
      navigator.geolocation.clearWatch(watchId);
      watchIdRef.current = null;
    };
  }, [syncLocation]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void syncLocation();
      void loadFriends();
    }, SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadFriends, syncLocation]);

  const mapUrl = useMemo(() => makeMapUrl(center, layer), [center, layer]);
  const batteryLabel = batteryPercent === null ? "Pin N/A" : "🔋 " + batteryPercent + "%" + (charging ? " ⚡" : "");
  const visibleFriends = friends.filter((friend) => {
    const point = getMarkerPosition(friend, center);
    return point.left >= 0 && point.left <= 100 && point.top >= 0 && point.top <= 100;
  });

  function locateMe() {
    if (!myLocation) {
      setLocationBusy(true);
      setLocationMessage("Đang chờ tín hiệu GPS từ thiết bị…");
      return;
    }
    setCenter(myLocation);
    setLocationMessage("Đã căn giữa bản đồ tại vị trí GPS mới nhất.");
  }

  function toggleGhostMode() {
    if (forceGhostMode) {
      setGhostMode(true);
      setLocationMessage("Ghost Mode bắt buộc theo chính sách an toàn tài khoản.");
      return;
    }
    setGhostMode((current) => !current);
  }

  return (
    <section className="experience-screen radar-screen vn-snapmap-screen" aria-label="Bản đồ VibeNest">
      <div className="vn-snapmap-map">
        <iframe title="Bản đồ đường phố Thành phố Hồ Chí Minh" src={mapUrl} loading="lazy" referrerPolicy="no-referrer" />
        {layer === "mood" && <div className="vn-snapmap-mood-overlay"><span>✧</span><strong>Mood Map</strong><small>Lớp dữ liệu tâm trạng đang chờ đồng thuận cộng đồng</small></div>}
        <div className="vn-snapmap-friend-markers" aria-label="Vị trí bạn bè">
          {visibleFriends.map((friend) => {
            const isPrivateOrb = !friend.mutual || friend.ghost;
            const point = getMarkerPosition(isPrivateOrb ? moodOrbPosition(friend) : friend, center);
            return isPrivateOrb ? (
              <div key={friend.id} className="vn-snapmap-friend-marker is-ghost is-mood-orb" style={{ left: point.left + "%", top: point.top + "%" }} title="Đốm sáng cảm xúc · vị trí đã làm mờ">
                <span className="vn-snapmap-marker-glow" aria-hidden="true" />
                <strong>✧</strong><small>Mood Orb · ~500m</small>
              </div>
            ) : (
              <div key={friend.id} className="vn-snapmap-friend-marker" style={{ left: point.left + "%", top: point.top + "%" }} title={friend.handle}>
                <span className={"vn-snapmap-friend-avatar" + (friend.active ? " is-active" : "")}>
                  {friend.avatar ? <img src={friend.avatar} alt="" /> : <span>{friend.handle.slice(0, 1).toUpperCase()}</span>}
                </span>
                <strong>@{friend.handle}</strong>
                <small>{friend.battery === null ? "Pin N/A" : "🔋 " + friend.battery + "%" + (friend.charging ? " ⚡" : "")}</small>
              </div>
            );
          })}
        </div>
        <header className="vn-snapmap-header">
          <button className="vn-snapmap-avatar" type="button" onClick={() => setFriendsOpen(true)} aria-label="Mở bạn bè">{displayName.slice(0, 1).toUpperCase()}</button>
          <div className="vn-snapmap-heading"><strong>{city}</strong><span>☁ {weather}</span></div>
          <button className="vn-snapmap-story" type="button" onClick={() => setFriendsOpen(true)} aria-label="Story của bạn">✦</button>
        </header>
        <nav className="vn-snapmap-pills" aria-label="Khám phá bản đồ">
          <button type="button" className={activeDiscovery === "Kỷ niệm" ? "selected" : ""} aria-pressed={activeDiscovery === "Kỷ niệm"} onClick={() => { setActiveDiscovery("Kỷ niệm"); setLocationMessage("Kỷ niệm địa điểm sẽ hiển thị khi kho lưu trữ cá nhân được kết nối."); }}>📖 <span>Kỷ niệm</span></button>
          <button type="button" className={activeDiscovery === "Nhiều người ghé thăm nhất" ? "selected" : ""} aria-pressed={activeDiscovery === "Nhiều người ghé thăm nhất"} onClick={() => { setActiveDiscovery("Nhiều người ghé thăm nhất"); setLocationMessage("Chưa có dữ liệu lượt ghé thăm/check-in được tổng hợp."); }}>🏆 <span>Nhiều người ghé thăm nhất</span></button>
          <button type="button" className={activeDiscovery === "Thịnh hành" ? "selected" : ""} aria-pressed={activeDiscovery === "Thịnh hành"} onClick={() => { setActiveDiscovery("Thịnh hành"); setLocationMessage("Xu hướng địa điểm cần dữ liệu check-in có đồng thuận."); }}>↗ <span>Thịnh hành</span></button>
        </nav>
        <div className="vn-snapmap-self-marker" aria-label="Vị trí của tôi">
          <span className="vn-snapmap-marker-glow" />
          <span className="vn-snapmap-marker-avatar" aria-hidden="true"><span>🧍</span><i>⚑</i></span>
          <strong>Tôi <small>{batteryLabel}</small></strong>
        </div>
        {visibleFriends.length === 0 && <div className="vn-snapmap-empty-friends">{friendsLoading ? "Đang tải bạn bè…" : "Chưa có bạn bè chia sẻ vị trí quanh đây"}</div>}
        <div className="vn-snapmap-actions">
          <button type="button" className="vn-snapmap-friends" onClick={() => setFriendsOpen(true)} aria-label="Bạn bè">●</button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Cài đặt bản đồ">⚙</button>
          <button type="button" onClick={() => setLayersOpen((value) => !value)} aria-label="Đổi lớp bản đồ">▱</button>
          <button type="button" onClick={locateMe} disabled={locationBusy} aria-label="Định vị GPS">{locationBusy ? "…" : "➤"}</button>
        </div>
        {layersOpen && <div className="vn-snapmap-layer-menu" role="group" aria-label="Lớp bản đồ">{LAYERS.map((item) => <button type="button" key={item.id} className={layer === item.id ? "selected" : ""} onClick={() => { setLayer(item.id); setLayersOpen(false); }}><span>{item.icon}</span><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}</div>}
        <div className="vn-snapmap-location-status" role="status">
          {locationMessage}
          {syncAt !== null && <span> · Đồng bộ {new Date(syncAt).toLocaleTimeString("vi-VN")}</span>}
          {!rpcAvailable && <span> · RPC chưa sẵn sàng</span>}
        </div>
        <div className="vn-snapmap-bottom-actions">
          <button type="button" className="vn-snapmap-contact" onClick={() => setFriendsOpen(true)} aria-label="Danh bạ bạn bè">♧</button>
          <button type="button" className="vn-snapmap-add-friends" onClick={() => setFriendsOpen(true)}>＋ <span>Thêm bạn bè</span></button>
        </div>
      </div>
      {settingsOpen && <div className="vn-snapmap-sheet-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}><section className="vn-snapmap-sheet" role="dialog" aria-modal="true" aria-labelledby="vn-snapmap-settings-title" onClick={(event) => event.stopPropagation()}><header><div><small>QUYỀN RIÊNG TƯ</small><h2 id="vn-snapmap-settings-title">Cài đặt bản đồ</h2></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Đóng">×</button></header><div className="vn-snapmap-ghost-row"><span><strong>Ghost Mode</strong><small>Gửi cờ Ghost Mode tới RPC để backend áp dụng chính sách làm mờ vị trí.</small></span><button type="button" role="switch" aria-checked={ghostMode} disabled={forceGhostMode} onClick={toggleGhostMode} className={ghostMode ? "enabled" : ""}><i /></button></div><p>Trạng thái: {ghostMode ? "Đang bật Ghost Mode" : "Đang chia sẻ vị trí chính xác với bạn bè được phép"}. Bán kính làm mờ ~500 m chỉ an toàn khi hàm update_my_location thực hiện jitter phía máy chủ và RPC chỉ trả tọa độ đã làm mờ cho người xem.</p></section></div>}
      {friendsOpen && <div className="vn-snapmap-sheet-backdrop" role="presentation" onClick={() => setFriendsOpen(false)}><section className="vn-snapmap-sheet" role="dialog" aria-modal="true" aria-labelledby="vn-snapmap-friends-title" onClick={(event) => event.stopPropagation()}><header><div><small>VIBENEST · CONNECTIONS</small><h2 id="vn-snapmap-friends-title">Bạn bè trên bản đồ</h2></div><button type="button" onClick={() => setFriendsOpen(false)} aria-label="Đóng">×</button></header><p>{friends.length} bạn bè trả về từ máy chủ. {friendsLoading ? "Đang cập nhật…" : "Danh sách được làm mới mỗi 30 giây."}</p><button className="vn-snapmap-primary" type="button" onClick={() => void loadFriends()}>Làm mới vị trí</button></section></div>}
      <div className="vn-snapmap-accessible-copy"><strong>{displayName}</strong><span>{vibeTag}</span></div>
      <div className="vn-snapmap-below-map">
        {posts.length > 0 ? <AuraDiscoveryRail posts={posts} onOpenChat={onOpenChat} /> : <p>Chưa có tín hiệu bạn bè được chia sẻ.</p>}
      </div>
    </section>
  );
}
