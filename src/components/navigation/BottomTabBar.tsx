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

export function BottomTabBar({ activeTab, unreadCount, onSelectTab, onOpenComposer, onOpenMessages, onOpenBooth, onOpenProfile, userInitial }: BottomTabBarProps) {
  return (
    <div className="hybrid-bottom-wrap">
      <nav className="hybrid-bottom-nav" aria-label="Điều hướng VibeNest">
        <button type="button" className={activeTab === 'radar' ? 'is-active' : ''} onClick={() => onSelectTab('radar')} aria-label="Bản đồ Radar">
          <span className="hybrid-nav-icon" aria-hidden="true">📍</span><span>Radar</span>
        </button>
        <button type="button" className={activeTab === 'messages' ? 'is-active' : ''} onClick={onOpenMessages} aria-label={`Tin nhắn, ${unreadCount} chưa đọc`}>
          <span className="hybrid-nav-icon hybrid-message-icon" aria-hidden="true">💬{unreadCount > 0 && <b className="hybrid-nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</b>}</span><span>Tin nhắn</span>
        </button>
        <button type="button" className="hybrid-camera-button" onClick={onOpenComposer} aria-label="Camera chụp nhanh"><span aria-hidden="true">📷</span></button>
        <button type="button" className={activeTab === 'booth' ? 'is-active' : ''} onClick={onOpenBooth} aria-label="Tiệm ảnh VibeBooth">
          <span className="hybrid-nav-icon" aria-hidden="true">🎞️</span><span>VibeBooth</span>
        </button>
        <button type="button" className={activeTab === 'profile' ? 'is-active' : ''} onClick={onOpenProfile} aria-label="Trang cá nhân">
          <span className="hybrid-profile-avatar">{userInitial}</span><span>Cá nhân</span>
        </button>
      </nav>
    </div>
  );
}
export default BottomTabBar;
