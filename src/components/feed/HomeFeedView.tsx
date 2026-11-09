"use client";
import { useState, type ReactNode } from "react";
import Image from "next/image";
import type { VibePostItem } from "@/components/feed/VibeFeedCard";
type Props={alias:string;posts:VibePostItem[];children:ReactNode;onCompose:()=>void;onSearch:()=>void;onNotifications:()=>void};
export function HomeFeedView({alias,posts,children,onCompose,onSearch,onNotifications}:Props){
 const [mode,setMode]=useState<"stories"|"reels">("stories");
 const reels=posts.filter(post=>post.imageUrl);
 const storyPosts=posts.filter(post=>post.imageUrl).slice(0,10);
 return <section className="vn-home-feed-shell" aria-label="Home feed">
  <header className="vn-home-feed-top">
   <span className="vn-home-feed-avatar" aria-hidden="true">{alias.slice(0,1).toUpperCase()}</span>
   <button type="button" className="vn-home-thought-prompt" onClick={onCompose}>Bạn đang nghĩ gì?</button>
   <button type="button" className="vn-home-feed-icon" onClick={onSearch} aria-label="Tìm kiếm"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg></button>
   <button type="button" className="vn-home-feed-icon" onClick={onNotifications} aria-label="Thông báo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button>
  </header>
  {mode==="stories"&&<section className="vn-home-stories-rail" aria-label="Tin bạn bè"><button type="button" className="vn-home-story-create" onClick={onCompose}><span>＋</span><small>Tạo tin</small></button>{storyPosts.map((post,index)=><button type="button" className="vn-home-story-card" key={post.id}><Image src={post.imageUrl!} alt="" fill sizes="88px" unoptimized/><span>{post.displayName}</span><i>{index+1}</i></button>)}</section>}
  <div className="vn-home-feed-tabs" role="tablist" aria-label="Nội dung Home">
   <button type="button" role="tab" aria-selected={mode==="stories"} className={mode==="stories"?"selected":""} onClick={()=>setMode("stories")}>Tin</button>
   <button type="button" role="tab" aria-selected={mode==="reels"} className={mode==="reels"?"selected":""} onClick={()=>setMode("reels")}>Reels</button>
  </div>
  {mode==="stories"?children:<section className="vn-home-reels" aria-label="Reels video ngắn">
   {reels.length?reels.map((post,index)=><article className="vn-home-reel-card" key={post.id}>
    {post.imageUrl&&<Image src={post.imageUrl} alt="" fill sizes="(max-width: 700px) 48vw, 320px" unoptimized/>}
    <div className="vn-home-reel-shade"/><span className="vn-home-reel-play" aria-hidden="true">▶</span>
    <div className="vn-home-reel-copy"><strong>{post.displayName}</strong><p>{post.content.slice(0,110)}</p><small>{index+1} · {post.mood}</small><span className="vn-home-reel-note">Ảnh trong bảng tin · video Reels cần media video</span></div>
   </article>):<div className="empty-state glass-panel"><h2>Chưa có Reels</h2><p>Bài viết có ảnh sẽ xuất hiện tại đây. Video ngắn sẽ hiển thị khi có media video được tải lên.</p></div>}
  </section>}
 </section>;
}