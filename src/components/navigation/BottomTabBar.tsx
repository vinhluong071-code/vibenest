'use client';

export type BottomNavTab = 'camera' | 'radar' | 'messages' | 'booth' | 'profile';

export interface BottomTabBarProps {
  activeTab: BottomNavTab;
  unreadCount: number;
  onSelectTab: (tab: BottomNavTab) => void;
  onOpenComposer: () => void;
  onOpenMessages: () => void;
  onOpenBooth: () => void;
  onOpenProfile: () => void;
  userInitial: string;
}

function RadarIcon() {
  return <svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="10.5" /><circle cx="14" cy="14" r="6.5" /><path d="M14 14 22 6M14 3.5v2M24.5 14h-2M14 24.5v-2M3.5 14h2" /><path d="M14 14 20.5 10" className="nav-icon__accent" /></svg>;
}
function MessengerIcon() {
  return <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 7.5A4.5 4.5 0 0 1 8.5 3h11A4.5 4.5 0 0 1 24 7.5v7a4.5 4.5 0 0 1-4.5 4.5H12l-5.5 4v-4.8A4.5 4.5 0 0 1 4 14.5z" /><path d="m8 12 4-4 3 3 5-4" className="nav-icon__accent" /><path d="M2.5 9v9a4 4 0 0 0 4 4" /></svg>;
}
function CameraIcon() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 10.5A2.5 2.5 0 0 1 7.5 8h3l2-3h7l2 3h3a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 5 23.5z" /><circle cx="16" cy="17" r="5.2" /><circle cx="24" cy="11.5" r="1" className="nav-icon__accent-fill" /></svg>;
}
function BoothIcon() {
  return <svg viewBox="0 0 28 28" aria-hidden="true"><rect x="5" y="2.5" width="18" height="23" rx="2.5" /><path d="M9 6.5h4v4H9zM15 6.5h4v4h-4zM9 13.5h4v4H9zM15 13.5h4v4h-4z" /><path d="M9 21h10" className="nav-icon__accent" /></svg>;
}
function ProfileIcon() {
  return <svg viewBox="0 0 28 28" aria-hidden="true"><path d="m8 7 3 3 3-5 3 5 3-3-.8 6H8.8z" className="nav-icon__accent-fill" /><circle cx="14" cy="16.5" r="4" /><path d="M5 26a9 9 0 0 1 18 0" /><path d="m8 7 3 3 3-5 3 5 3-3" /></svg>;
}

export function BottomTabBar({ activeTab, unreadCount, onSelectTab, onOpenComposer, onOpenMessages, onOpenBooth, onOpenProfile, userInitial }: BottomTabBarProps) {
  return (
    <div className="hybrid-bottom-wrap">
      <nav className="hybrid-bottom-nav" aria-label="Điều hướng VibeNest">
        <button type="button" className={activeTab === 'radar' ? 'is-active' : ''} onClick={() => onSelectTab('radar')} aria-label="Bản đồ Radar" aria-current={activeTab === 'radar' ? 'page' : undefined}>
          <span className="hybrid-nav-icon"><RadarIcon /></span><span>Radar</span>
        </button>
        <button type="button" className={activeTab === 'messages' ? 'is-active' : ''} onClick={onOpenMessages} aria-label={`Tin nhắn, ${unreadCount} chưa đọc`} aria-current={activeTab === 'messages' ? 'page' : undefined}>
          <span className="hybrid-nav-icon hybrid-message-icon"><MessengerIcon />{unreadCount > 0 && <b className="hybrid-nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</b>}</span><span>Tin nhắn</span>
        </button>
        <button type="button" className={`hybrid-camera-button ${activeTab === 'camera' ? 'is-active' : ''}`} onClick={onOpenComposer} aria-label="Mở camera VibeNest">
          <span className="hybrid-camera-ring"><CameraIcon /></span>
        </button>
        <button type="button" className={activeTab === 'booth' ? 'is-active' : ''} onClick={onOpenBooth} aria-label="Tiệm ảnh VibeBooth" aria-current={activeTab === 'booth' ? 'page' : undefined}>
          <span className="hybrid-nav-icon"><BoothIcon /></span><span>VibeBooth</span>
        </button>
        <button type="button" className={activeTab === 'profile' ? 'is-active' : ''} onClick={onOpenProfile} aria-label={`Trang cá nhân ${userInitial}`} aria-current={activeTab === 'profile' ? 'page' : undefined}>
          <span className="hybrid-nav-icon"><ProfileIcon /></span><span>Cá nhân</span>
        </button>
      </nav>
    </div>
  );
}
export default BottomTabBar;
