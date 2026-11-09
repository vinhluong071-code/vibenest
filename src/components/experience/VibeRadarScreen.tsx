"use client";

import { useEffect, useMemo, useState } from "react";
import { AuraDiscoveryRail } from "@/components/discovery/AuraDiscoveryRail";
import type { VibePostItem } from "@/components/feed/VibeFeedCard";

type Props = {
  displayName: string;
  vibeTag: string;
  posts: VibePostItem[];
  onOpenChat: (postId: string) => void;
  forceGhostMode?: boolean;
};
type Layer = "street" | "cycling" | "mood";
type Coordinates = { lat: number; lon: number };

const DEFAULT_CENTER: Coordinates = { lat: 10.8231, lon: 106.6297 };
const LAYERS: { id: Layer; label: string; icon: string; description: string }[] = [
  { id: "street", label: "Đường phố", icon: "▤", description: "Bản đồ đường phố OpenStreetMap" },
  { id: "cycling", label: "Địa hình", icon: "⌁", description: "Lớp đường đi xe đạp OpenStreetMap" },
  { id: "mood", label: "Mood", icon: "✧", description: "Lớp tâm trạng sẽ cần dữ liệu vị trí đã được người dùng đồng ý chia sẻ" },
];

function makeMapUrl(center: Coordinates, layer: Layer) {
  const delta = 0.035;
  const bbox = [center.lon - delta, center.lat - delta, center.lon + delta, center.lat + delta].join("%2C");
  const tileLayer = layer === "cycling" ? "cyclemap" : "mapnik";
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=${tileLayer}&marker=${center.lat}%2C${center.lon}`;
}

export function VibeRadarScreen({ displayName, vibeTag, posts, onOpenChat, forceGhostMode = false }: Props) {
  const [ghostMode, setGhostMode] = useState(true);
  const [layer, setLayer] = useState<Layer>("street");
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("Ghost Mode đang bật. VibeNest không yêu cầu hoặc chia sẻ vị trí.");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [city, setCity] = useState("Thành phố Hồ Chí Minh");
  const [weather] = useState("29°C · ⛅");
  const [activeDiscovery, setActiveDiscovery] = useState("Kỷ niệm");

  useEffect(() => {
    if (forceGhostMode) {
      setGhostMode(true);
      setLocationMessage("Ghost Mode bắt buộc theo nhóm tuổi. Vị trí chính xác không được yêu cầu hoặc chia sẻ.");
    }
  }, [forceGhostMode]);

  const mapUrl = useMemo(() => makeMapUrl(center, layer === "mood" ? "street" : layer), [center, layer]);

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationMessage("Thiết bị không hỗ trợ GPS. Bản đồ vẫn giữ vị trí mặc định.");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCenter({ lat: coords.latitude, lon: coords.longitude });
        setLocationBusy(false);
        setLocationMessage("Đã định vị trên thiết bị. Tọa độ chỉ dùng để căn giữa bản đồ, chưa gửi lên máy chủ hay chia sẻ.");
      },
      () => {
        setLocationBusy(false);
        setLocationMessage("Không lấy được vị trí. Hãy kiểm tra quyền Location trong cài đặt thiết bị.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  function toggleGhostMode() {
    if (forceGhostMode) {
      setGhostMode(true);
      setLocationMessage("Ghost Mode bắt buộc theo nhóm tuổi.");
      return;
    }
    if (ghostMode) {
      setGhostMode(false);
      setLocationMessage("Ghost Mode đã tắt trên thiết bị. Chia sẻ vị trí với bạn bè vẫn chưa khả dụng ở máy chủ.");
      locateMe();
    } else {
      setGhostMode(true);
      setLocationMessage("Ghost Mode đã bật trên thiết bị. Không có vị trí nào được phát lên máy chủ.");
    }
  }

  return (
    <section className="experience-screen radar-screen vn-snapmap-screen" aria-label="Bản đồ VibeNest">
      <div className="vn-snapmap-map">
        <iframe title="Bản đồ đường phố Thành phố Hồ Chí Minh" src={mapUrl} loading="lazy" referrerPolicy="no-referrer" />
        {layer === "mood" && <div className="vn-snapmap-mood-overlay"><span>✧</span><strong>Mood Map</strong><small>Lớp dữ liệu cộng đồng chưa khả dụng</small></div>}
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
        <div className="vn-snapmap-self-marker" aria-label="Vị trí của tôi, không chia sẻ">
          <span className="vn-snapmap-marker-glow" />
          <span className="vn-snapmap-marker-avatar" aria-hidden="true"><span>🧍</span><i>⚑</i></span>
          <strong>Tôi <small>🔋 100%</small></strong>
        </div>
        <div className="vn-snapmap-actions">
          <button type="button" className="vn-snapmap-friends" onClick={() => setFriendsOpen(true)} aria-label="Bạn bè">●</button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Cài đặt bản đồ">⚙</button>
          <button type="button" onClick={() => setLayersOpen((value) => !value)} aria-label="Đổi lớp bản đồ">▱</button>
          <button type="button" onClick={locateMe} disabled={locationBusy} aria-label="Định vị GPS">{locationBusy ? "…" : "➤"}</button>
        </div>
        {layersOpen && <div className="vn-snapmap-layer-menu" role="group" aria-label="Lớp bản đồ">{LAYERS.map((item) => <button type="button" key={item.id} className={layer === item.id ? "selected" : ""} onClick={() => { setLayer(item.id); setLayersOpen(false); }}><span>{item.icon}</span><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}</div>}
        <div className="vn-snapmap-location-status" role="status">{locationMessage}</div>
        <div className="vn-snapmap-bottom-actions">
          <button type="button" className="vn-snapmap-contact" onClick={() => setFriendsOpen(true)} aria-label="Danh bạ bạn bè">♧</button>
          <button type="button" className="vn-snapmap-add-friends" onClick={() => setFriendsOpen(true)}>＋ <span>Thêm bạn bè</span></button>
        </div>
      </div>
      {settingsOpen && <div className="vn-snapmap-sheet-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}><section className="vn-snapmap-sheet" role="dialog" aria-modal="true" aria-labelledby="vn-snapmap-settings-title" onClick={(event) => event.stopPropagation()}><header><div><small>QUYỀN RIÊNG TƯ</small><h2 id="vn-snapmap-settings-title">Cài đặt bản đồ</h2></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Đóng">×</button></header><div className="vn-snapmap-ghost-row"><span><strong>Ghost Mode</strong><small>Ẩn vị trí khỏi bạn bè. Tùy chọn thiết bị; chưa đồng bộ với dịch vụ vị trí máy chủ.</small></span><button type="button" role="switch" aria-checked={ghostMode} disabled={forceGhostMode} onClick={toggleGhostMode} className={ghostMode ? "enabled" : ""}><i /></button></div><p>VibeNest chưa gửi vị trí lên máy chủ. Không có dữ liệu GPS nào được chia sẻ với người khác. Làm mờ 500 m chưa được thực thi ở backend; không hiển thị vị trí người khác cho đến khi có sự đồng ý hai chiều.</p></section></div>}
      {friendsOpen && <div className="vn-snapmap-sheet-backdrop" role="presentation" onClick={() => setFriendsOpen(false)}><section className="vn-snapmap-sheet" role="dialog" aria-modal="true" aria-labelledby="vn-snapmap-friends-title" onClick={(event) => event.stopPropagation()}><header><div><small>VIBENEST · CONNECTIONS</small><h2 id="vn-snapmap-friends-title">Thêm bạn bè</h2></div><button type="button" onClick={() => setFriendsOpen(false)} aria-label="Đóng">×</button></header><p>Danh sách bạn bè và lời mời trên bản đồ sẽ xuất hiện tại đây khi kết nối với hệ thống bạn bè. Vị trí chỉ hiển thị khi cả hai phía chủ động đồng ý.</p><button className="vn-snapmap-primary" type="button" onClick={() => setFriendsOpen(false)}>Đã hiểu</button></section></div>}
      <div className="vn-snapmap-accessible-copy"><strong>{displayName}</strong><span>{vibeTag}</span></div>
      <div className="vn-snapmap-below-map">
        {posts.length > 0 ? <AuraDiscoveryRail posts={posts} onOpenChat={onOpenChat} /> : <p>Chưa có tín hiệu bạn bè được chia sẻ.</p>}
      </div>
    </section>
  );
}
