"use client";
import {useEffect,useRef,useState,type TouchEvent} from "react";
import {VibeNestApp} from "@/components/VibeNestApp";
import {CameraFirstView} from "@/components/camera/CameraFirstView";
import {VibeBoothStudio} from "@/components/booth/VibeBoothStudio";
import {SnapProfileView} from "@/components/profile/SnapProfileView";
import {AuraAIChat} from "@/components/ai/AuraAIChat";
import {ZenlyMoodRadar} from "@/components/radar/ZenlyMoodRadar";
import {SafetyComplianceModal} from "@/components/safety/SafetyComplianceModal";
import {LitmatchThirdPartyAuthModal} from "@/components/auth/LitmatchThirdPartyAuthModal";
type Tab="camera"|"feed"|"aura"|"radar"|"profile";
const TABS:Tab[]=["camera","feed","aura","radar","profile"];
export function VibeNestCameraFirst(){
 const [tab,setTab]=useState<Tab>("camera");const [booth,setBooth]=useState(false);const [auth,setAuth]=useState(false);const [safety,setSafety]=useState(false);const [captured,setCaptured]=useState<File|null>(null);const [preview,setPreview]=useState("");const touch=useRef<{x:number;y:number;blocked:boolean}|null>(null);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 function handleCapture(file:File){setCaptured(file);setPreview(URL.createObjectURL(file));}
 function clearCapture(){setCaptured(null);setPreview("");}
 function startTouch(e:TouchEvent<HTMLDivElement>){const target=e.target as HTMLElement;touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY,blocked:Boolean(target.closest(".aura-card-track,.mood-tabs,[data-no-swipe]"))};}
 function endTouch(e:React.TouchEvent<HTMLDivElement>){const start=touch.current;touch.current=null;if(!start||start.blocked)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.25)return;const current=TABS.indexOf(tab);setTab(TABS[Math.max(0,Math.min(TABS.length-1,current+(dx<0?1:-1)))]);}
 return <main className="vn-app-root" onTouchStart={startTouch} onTouchEnd={endTouch}>
  <div className="vn-ambient vn-ambient-a"/><div className="vn-ambient vn-ambient-b"/>
  <div className={tab==="camera"?"vn-tab-pane":"vn-tab-pane vn-hidden"}><CameraFirstView active={tab==="camera"} onCapture={handleCapture} onOpenBooth={()=>setBooth(true)} onOpenFeed={()=>setTab("feed")} onSoftGate={()=>setAuth(true)}/></div>
  <div className={tab==="feed"?"vn-tab-pane vn-feed-pane":"vn-tab-pane vn-feed-pane vn-hidden"}><VibeNestApp/></div>
  <div className={tab==="aura"?"vn-tab-pane vn-feature-pane":"vn-tab-pane vn-feature-pane vn-hidden"}><AuraAIChat/></div>
  <div className={tab==="radar"?"vn-tab-pane vn-feature-pane":"vn-tab-pane vn-feature-pane vn-hidden"}><ZenlyMoodRadar/></div>
  {tab==="profile"&&<SnapProfileView onClose={()=>setTab("camera")} onSafety={()=>setSafety(true)} onSoftGate={()=>setAuth(true)}/>}
  <nav className="vn-bottom-nav" aria-label="Điều hướng chính">{TABS.map((id,i)=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><span>{["◉","⌂","✧","◎","◌"][i]}</span>{["Camera","Bảng tin","Aura","Radar","Hồ sơ"][i]}</button>)}</nav>
  {booth&&<VibeBoothStudio open={booth} onClose={()=>setBooth(false)} onSoftGate={()=>setAuth(true)}/>}
  <LitmatchThirdPartyAuthModal open={auth} onClose={()=>setAuth(false)} intent="chia sẻ khoảnh khắc"/>
  <SafetyComplianceModal open={safety} onClose={()=>setSafety(false)}/>
  {preview&&<div className="vn-modal-backdrop" role="dialog" aria-modal="true"><section className="vn-capture-preview"><header><h2>Khoảnh khắc của bạn</h2><button onClick={clearCapture}>×</button></header><img src={preview} alt="Ảnh vừa chụp"/><div><button className="vn-primary-button" onClick={()=>{clearCapture();setAuth(true);}}>Chia sẻ ảnh</button><a className="vn-secondary-button" href={preview} download="vibenest-photo.webp">Lưu vào thiết bị</a></div></section></div>}
 </main>;
}
