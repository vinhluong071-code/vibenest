"use client";

import { useEffect, useState } from "react";
import { AuraDiscoveryRail } from "@/components/discovery/AuraDiscoveryRail";
import type { VibePostItem } from "@/components/feed/VibeFeedCard";

type Props = {
  displayName: string;
  vibeTag: string;
  posts: VibePostItem[];
  onOpenChat: (postId: string) => void;
  forceGhostMode?: boolean;
};

export function VibeRadarScreen({ displayName, vibeTag, posts, onOpenChat, forceGhostMode = false }: Props) {
  const [ghostMode, setGhostMode] = useState(true);
  const [locationReady, setLocationReady] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("Ghost Mode đang bật. Vị trí thiết bị không được yêu cầu hoặc chia sẻ.");
  useEffect(()=>{if(forceGhostMode){setGhostMode(true);setLocationReady(false);setLocationMessage("Ghost Mode bắt buộc theo nhóm tuổi. Vị trí chính xác không được yêu cầu hoặc chia sẻ.");}},[forceGhostMode]);

  async function toggleGhostMode() {
    if (forceGhostMode) { setGhostMode(true); setLocationReady(false); setLocationMessage("Ghost Mode bắt buộc theo nhóm tuổi."); return; }
    if (!ghostMode) {
      setGhostMode(true);
      setLocationReady(false);
      setLocationMessage("Ghost Mode đang bật. Vị trí thiết bị không được yêu cầu hoặc chia sẻ.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage("Trình duyệt này không hỗ trợ định vị. Ghost Mode vẫn được giữ bật.");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setGhostMode(false);
        setLocationReady(true);
        setLocationMessage("Đã cho phép vị trí trên thiết bị này. Tọa độ chỉ được dùng cục bộ; chưa phát trực tiếp cho bạn bè.");
        setLocationBusy(false);
      },
      () => {
        setLocationMessage("Không lấy được quyền vị trí. Ghost Mode vẫn bật và không có dữ liệu vị trí nào được chia sẻ.");
        setGhostMode(true);
        setLocationBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <section className="experience-screen radar-screen vn-lbs-screen" aria-labelledby="radar-screen-title">
      <div className="experience-kicker">VIBENEST · FRIEND MAP</div>
      <h1 id="radar-screen-title">Bản đồ</h1>
      <p className="experience-lead">Kết nối gần nhau, nhưng quyền riêng tư luôn nằm trong tay bạn.</p>
      <div className="vn-lbs-map" role="region" aria-label="Bản đồ bạn bè">
        <div className="vn-lbs-map-grid" aria-hidden="true" />
        <div className="vn-lbs-radar-ring vn-lbs-ring-one" aria-hidden="true" />
        <div className="vn-lbs-radar-ring vn-lbs-ring-two" aria-hidden="true" />
        <div className="vn-lbs-map-center">
          {ghostMode ? <span className="vn-lbs-ghost">◌</span> : <span className="vn-lbs-self">●</span>}
          <strong>{ghostMode ? "Bạn đang ẩn" : "Thiết bị của bạn"}</strong>
          <small>{ghostMode ? "Ghost Mode · làm mờ bán kính 500 m" : locationReady ? "Vị trí được cấp quyền · chỉ cục bộ" : "Chưa có vị trí"}</small>
        </div>
        <div className="vn-lbs-map-legend"><span>●</span> Bạn bè chia sẻ vị trí sẽ xuất hiện tại đây</div>
      </div>
      <section className="vn-lbs-privacy glass-panel">
        <div><strong>Ghost Mode</strong><small>Ẩn vị trí chính xác · vùng hiển thị làm mờ 500 m</small></div>
        <button type="button" role="switch" aria-checked={ghostMode} disabled={locationBusy} onClick={() => void toggleGhostMode()} className={`vn-lbs-switch ${ghostMode ? "is-on" : ""}`}><span /></button>
      </section>
      <p className="vn-lbs-status" role="status">{locationBusy ? "Đang chờ quyền vị trí…" : locationMessage}</p>
      <div className="vn-lbs-friends glass-panel">
        <div className="vn-lbs-friends-heading"><strong>Bạn bè trên bản đồ</strong><span>Đồng ý chia sẻ mới hiển thị</span></div>
        <div className="vn-lbs-empty"><span>⌖</span><strong>Chưa có vị trí bạn bè được chia sẻ</strong><p>VibeNest chưa có backend đồng thuận chia sẻ vị trí, trạng thái di chuyển hoặc mức pin. Vì vậy ứng dụng không hiển thị tọa độ, phần trăm pin hay trạng thái nghe nhạc/ngủ giả.</p></div>
      </div>
      <div className="radar-user-chip"><span>{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>Tần số bạn chọn · {vibeTag}</small></div></div>
      <div className="radar-privacy-note"><strong>Riêng tư theo thiết kế</strong><p>Vị trí thiết bị chỉ được hỏi sau thao tác tắt Ghost Mode. Hiện tại quyền vị trí chỉ được kiểm tra cục bộ, chưa được gửi lên máy chủ hay chia sẻ với người khác.</p></div>
      {posts.length > 0 ? <AuraDiscoveryRail posts={posts} onOpenChat={onOpenChat} /> : <div className="empty-state glass-panel"><h2>Chưa có tín hiệu phù hợp</h2><p>Khi có bài đăng mới, chúng sẽ xuất hiện ở đây để bạn tự chọn kết nối.</p></div>}
    </section>
  );
}
