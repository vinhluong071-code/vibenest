import {NextResponse,type NextRequest} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const supabase=await createServerSupabaseClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return NextResponse.json({error:"Cần một phiên khách hợp lệ để sử dụng Aura."},{status:401});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:"JSON không hợp lệ."},{status:400});}
 const message=(body as {message?:unknown})?.message;
 if(typeof message!=="string"||!message.trim()||message.length>1200)return NextResponse.json({error:"Tin nhắn cần từ 1 đến 1.200 ký tự."},{status:400});
 const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return NextResponse.json({error:"Aura chưa được cấu hình OPENAI_API_KEY trên máy chủ."},{status:503});
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:"Bearer "+apiKey,"content-type":"application/json"},body:JSON.stringify({model:process.env.AURA_MODEL||"gpt-4.1-mini",instructions:"Bạn là Aura, trợ lý thân thiện của mạng xã hội VibeNest. Trả lời bằng tiếng Việt, ấm áp, ngắn gọn. Không chẩn đoán y tế, không khuyến khích hành vi nguy hiểm. Nếu người dùng nhập /imagine, hãy giúp tinh chỉnh prompt hình ảnh bằng văn bản và nói rõ rằng phiên bản này chưa trực tiếp tạo ảnh.",input:message,max_output_tokens:500}),signal:controller.signal});
  const data=await response.json() as {output_text?:string;error?:{message?:string}};
  if(!response.ok)return NextResponse.json({error:"Dịch vụ Aura tạm thời không khả dụng."},{status:502});
  return NextResponse.json({reply:data.output_text||"Mình chưa tìm được câu trả lời phù hợp."});
 }catch{return NextResponse.json({error:"Aura hết thời gian chờ. Hãy thử lại."},{status:504});}
 finally{clearTimeout(timeout);}
}
