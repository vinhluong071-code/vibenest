'use client';

export type BottomNavTab = 'all' | 'Chữa lành' | 'saved' | 'voice' | 'radar' | 'profile';

const items: { id: Exclude<BottomNavTab, 'profile'>; label: string; icon: string }[] = [
  { id: 'all', label: 'Home', icon: '⌂' },
  { id: 'voice', label: 'Voice', icon: '♫' },
  { id: 'radar', label: 'Radar', icon: '✧' },
  { id: 'saved', label: 'Đã lưu', icon: '▱' },
];

export interface BottomTabBarProps {
  activeTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
  onOpenComposer: () => void;
  onOpenProfile: () => void;
  userInitial: string;
}

export function BottomTabBar({ activeTab, onSelectTab, onOpenComposer, onOpenProfile, userInitial }: BottomTabBarProps) {
  return (
    <div className="hybrid-bottom-wrap">
      <nav className="hybrid-bottom-nav" aria-label="Điều hướng VibeNest">
        {items.slice(0, 2).map((item) => (
          <button key={item.id} type="button" className={activeTab === item.id ? 'is-active' : ''} onClick={() => onSelectTab(item.id)} aria-label={item.label}>
            <span className="hybrid-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
        <button type="button" className="hybrid-camera-button" onClick={onOpenComposer} aria-label="Tạo bài đăng">
          <span aria-hidden="true">＋</span>
        </button>
        {items.slice(2).map((item) => (
          <button key={item.id} type="button" className={activeTab === item.id ? 'is-active' : ''} onClick={() => onSelectTab(item.id)} aria-label={item.label}>
            <span className="hybrid-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
        <button type="button" className={activeTab === 'profile' ? 'is-active' : ''} onClick={onOpenProfile} aria-label="Hồ sơ cá nhân">
          <span className="hybrid-profile-avatar">{userInitial}</span><span>Hồ sơ</span>
        </button>
      </nav>
    </div>
  );
}

export default BottomTabBar;
