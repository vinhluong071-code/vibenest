import {NextResponse,type NextRequest} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {createServerSupabaseClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:"Origin không hợp lệ."},{status:403});
 const userClient=await createServerSupabaseClient();const {data:{user},error}=await userClient.auth.getUser();
 if(error||!user)return NextResponse.json({error:"Bạn cần đăng nhập để xóa tài khoản."},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!serviceKey)return NextResponse.json({error:"Máy chủ chưa cấu hình quyền xóa tài khoản an toàn."},{status:503});
 const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
 for(const bucket of ["vibenest-profile-media","vibenest-post-media","vibenest-story-media"]){
  const {data:objects}=await admin.storage.from(bucket).list(user.id,{limit:1000});
  if(objects?.length){await admin.storage.from(bucket).remove(objects.map(item=>user.id+"/"+item.name));}
 }
 const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
 if(deleteError)return NextResponse.json({error:"Không thể xóa tài khoản lúc này. Dữ liệu chưa được xác nhận xóa."},{status:502});
 return NextResponse.json({deleted:true});
}
