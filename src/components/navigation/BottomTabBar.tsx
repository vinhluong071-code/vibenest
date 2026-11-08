'use client';

export type BottomNavTab='home'|'radar'|'camera'|'chat'|'profile';
export interface BottomTabBarProps{activeTab:BottomNavTab;unreadCount:number;onSelectTab:(tab:BottomNavTab)=>void;onOpenComposer:()=>void;onOpenMessages:()=>void;onOpenProfile:()=>void;userInitial:string}

/**
 * VibeNest 21:53 approved icon contract.
 * Keep this version and the SVG path geometry unchanged unless the product owner
 * explicitly approves a new icon-set version. Runtime code must not swap glyphs.
 */
export const VIBENEST_ICON_SET_LOCKED = true as const;
export const VIBENEST_ICON_SET_VERSION = "21:53" as const;

function LocationGlyph(){return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16 29s10-9.1 10-17A10 10 0 1 0 6 12c0 7.9 10 17 10 17Z"/><circle cx="16" cy="12" r="3.5"/></svg>}
function MessageGlyph(){return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M6 6.5A4.5 4.5 0 0 1 10.5 2h11A4.5 4.5 0 0 1 26 6.5v12a4.5 4.5 0 0 1-4.5 4.5H14l-7.5 6v-7.5A4.5 4.5 0 0 1 6 18.5Z"/></svg>}
function CameraGlyph(){return <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false"><path d="M5 11.5A3.5 3.5 0 0 1 8.5 8H13l2.4-3h5.2L23 8h4.5a3.5 3.5 0 0 1 3.5 3.5v15a3.5 3.5 0 0 1-3.5 3.5h-19A3.5 3.5 0 0 1 5 26.5Z"/><circle cx="18" cy="19" r="7"/><circle cx="18" cy="19" r="3.2"/><circle cx="26.5" cy="12" r="1.1" className="glyph-fill"/></svg>}
function FriendsGlyph(){return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="11" cy="10" r="4"/><circle cx="23" cy="11" r="3.5"/><path d="M2.5 27c.4-5.1 3.6-8 8.5-8s8.1 2.9 8.5 8M19 19.5c5.8-1.2 9.4 1.4 10.5 6.8"/></svg>}
function SpotlightGlyph(){return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M8 3.5h16v25l-8-5-8 5Z"/><circle cx="25.5" cy="6.5" r="4" className="glyph-dot"/></svg>}

export function BottomTabBar(p:BottomTabBarProps){return <div className="hybrid-bottom-wrap"><nav className="hybrid-bottom-nav hybrid-bottom-five" aria-label="Điều hướng VibeNest">
<button type="button" className={p.activeTab==='home'?'is-active':''} onClick={()=>p.onSelectTab('home')} aria-label="Home"><span className="hybrid-nav-icon"><FriendsGlyph/></span></button>
<button type="button" className={p.activeTab==='radar'?'is-active':''} onClick={()=>p.onSelectTab('radar')} aria-label="Bản đồ"><span className="hybrid-nav-icon"><LocationGlyph/></span></button>
<button type="button" className={`hybrid-camera-button ${p.activeTab==='camera'?'is-active':''}`} onClick={p.onOpenComposer} aria-label="Camera"><span className="hybrid-camera-ring"><CameraGlyph/></span></button>
<button type="button" className={p.activeTab==='chat'?'is-active':''} onClick={p.onOpenMessages} aria-label={`Chat, ${p.unreadCount} tin chưa đọc`}><span className="hybrid-nav-icon hybrid-message-icon"><MessageGlyph/>{p.unreadCount>0&&<b className="hybrid-nav-badge">{p.unreadCount>99?'99+':p.unreadCount}</b>}</span></button>
<button type="button" className={p.activeTab==='profile'?'is-active':''} onClick={p.onOpenProfile} aria-label="Cá nhân"><span className="hybrid-nav-icon"><SpotlightGlyph/></span></button>
</nav></div>}
export default BottomTabBar;
