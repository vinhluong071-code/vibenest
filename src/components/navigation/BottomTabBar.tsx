'use client';
export type BottomNavTab='radar'|'messages'|'camera'|'home'|'profile';
export interface BottomTabBarProps{activeTab:BottomNavTab;unreadCount:number;onSelectTab:(tab:BottomNavTab)=>void;onOpenComposer:()=>void;onOpenMessages:()=>void;onOpenProfile:()=>void;userInitial:string}
function RadarGlyph(){return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="7.5"/><circle cx="16" cy="16" r="2" className="glyph-fill"/><path d="M16 16 26 7M16 2v3M30 16h-3M16 30v-3M2 16h3M16 16 24 11" className="glyph-accent"/><circle cx="24" cy="11" r="2" className="glyph-dot"/></svg>}
function MessageGlyph(){return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 7.5A5.5 5.5 0 0 1 10.5 2h11A5.5 5.5 0 0 1 27 7.5v10a5.5 5.5 0 0 1-5.5 5.5H14l-7.5 5v-6.8A5.5 5.5 0 0 1 5 17.5z"/><path d="m9 15 5-5 3.5 3.5L23 9" className="glyph-accent"/></svg>}
function CameraGlyph(){return <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 11a3 3 0 0 1 3-3h4l2.2-3h5.6L24 8h3a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z"/><circle cx="18" cy="18.5" r="7"/><circle cx="18" cy="18.5" r="3" className="glyph-fill"/></svg>}
function HomeGlyph(){return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m4 14 12-10 12 10v13H19v-8h-6v8H4z"/></svg>}
function ProfileGlyph(){return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="6"/><path d="M4 29a12 12 0 0 1 24 0z"/></svg>}
export function BottomTabBar(p:BottomTabBarProps){return <div className="hybrid-bottom-wrap"><nav className="hybrid-bottom-nav hybrid-bottom-five" aria-label="Điều hướng VibeNest">
<button type="button" className={p.activeTab==='home'?'is-active':''} onClick={()=>p.onSelectTab('home')} aria-label="Home, bảng tin và Story"><span className="hybrid-nav-icon"><HomeGlyph/></span></button>
<button type="button" className={p.activeTab==='radar'?'is-active':''} onClick={()=>p.onSelectTab('radar')} aria-label="Bản đồ, Radar"><span className="hybrid-nav-icon"><RadarGlyph/></span></button>
<button type="button" className={`hybrid-camera-button ${p.activeTab==='camera'?'is-active':''}`} onClick={p.onOpenComposer} aria-label="Camera và VibeBooth"><span className="hybrid-camera-ring"><CameraGlyph/></span></button>
<button type="button" className={p.activeTab==='messages'?'is-active':''} onClick={p.onOpenMessages} aria-label={`Chat, ${p.unreadCount} chưa đọc`}><span className="hybrid-nav-icon hybrid-message-icon"><MessageGlyph/>{p.unreadCount>0&&<b className="hybrid-nav-badge">{p.unreadCount>99?'99+':p.unreadCount}</b>}</span></button>
<button type="button" className={p.activeTab==='profile'?'is-active':''} onClick={p.onOpenProfile} aria-label={`Cá nhân, ${p.userInitial}`}><span className="hybrid-nav-icon"><ProfileGlyph/></span></button>
</nav></div>}
export default BottomTabBar;