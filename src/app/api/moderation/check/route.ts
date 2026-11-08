import {NextResponse,type NextRequest} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return NextResponse.json({error:"Cần phiên hợp lệ để kiểm tra ảnh."},{status:401});
 const declared=Number(request.headers.get("content-length")??"0");if(declared>6_000_000)return NextResponse.json({error:"Ảnh vượt quá giới hạn kiểm duyệt."},{status:413});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:"JSON không hợp lệ."},{status:400});}
 const image=(body as {image?:unknown})?.image;if(typeof image!=="string"||image.length>5_500_000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))return NextResponse.json({error:"Định dạng ảnh không hợp lệ."},{status:400});
 const key=process.env.OPENAI_API_KEY;if(!key)return NextResponse.json({error:"Kiểm duyệt ảnh chưa được cấu hình. Không thể tải ảnh lên lúc này."},{status:503});
 try{const response=await fetch("https://api.openai.com/v1/moderations",{method:"POST",headers:{authorization:"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({model:"omni-moderation-latest",input:[{type:"image_url",image_url:{url:image}}]}),signal:AbortSignal.timeout(20000)});const data=await response.json() as {results?:Array<{flagged?:boolean}>};if(!response.ok)return NextResponse.json({error:"Dịch vụ kiểm duyệt ảnh tạm thời không khả dụng."},{status:502});if(data.results?.[0]?.flagged)return NextResponse.json({error:"Ảnh có thể vi phạm tiêu chuẩn cộng đồng. Hãy chọn ảnh khác."},{status:422});return NextResponse.json({allowed:true});}catch{return NextResponse.json({error:"Kiểm duyệt ảnh hết thời gian chờ."},{status:504});}
}
