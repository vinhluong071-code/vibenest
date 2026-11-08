import {NextResponse,type NextRequest} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {createServerSupabaseClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const viewer=await createServerSupabaseClient();const {data:{user},error}=await viewer.auth.getUser();if(error||!user||user.is_anonymous)return NextResponse.json({error:"Liên kết Apple hoặc Google để chặn tài khoản."},{status:401});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:"JSON không hợp lệ."},{status:400});}
 const postId=(body as {postId?:unknown})?.postId;if(typeof postId!=="string"||!/^[0-9a-f-]{36}$/i.test(postId))return NextResponse.json({error:"Bài viết không hợp lệ."},{status:400});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:"Máy chủ chưa cấu hình dịch vụ chặn an toàn."},{status:503});
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:post,error:postError}=await admin.from("vibe_posts").select("user_id").eq("id",postId).maybeSingle();if(postError||!post)return NextResponse.json({error:"Không tìm thấy bài viết."},{status:404});
 if(post.user_id===user.id)return NextResponse.json({error:"Bạn không thể tự chặn mình."},{status:400});
 const {error:insertError}=await admin.from("vibenest_user_blocks").upsert({blocker_id:user.id,blocked_id:post.user_id},{onConflict:"blocker_id,blocked_id"});if(insertError)return NextResponse.json({error:"Không thể lưu yêu cầu chặn."},{status:502});
 return NextResponse.json({blocked:true});
}
