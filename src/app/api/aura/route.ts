import {NextResponse,type NextRequest} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const supabase=await createServerSupabaseClient();const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return NextResponse.json({error:"Cần một phiên khách hợp lệ để sử dụng Aura."},{status:401});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:"JSON không hợp lệ."},{status:400});}
 const message=(body as {message?:unknown})?.message;if(typeof message!=="string"||!message.trim()||message.length>1200)return NextResponse.json({error:"Tin nhắn cần từ 1 đến 1.200 ký tự."},{status:400});
 const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return NextResponse.json({error:"Aura chưa được cấu hình OPENAI_API_KEY trên máy chủ."},{status:503});
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
 try{
  if(message.trim().toLowerCase().startsWith("/imagine ")){
   const prompt=message.trim().slice(9).trim();if(prompt.length<4)return NextResponse.json({error:"Hãy mô tả hình ảnh chi tiết hơn."},{status:400});
   const imageResponse=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{authorization:"Bearer "+apiKey,"content-type":"application/json"},body:JSON.stringify({model:process.env.AURA_IMAGE_MODEL||"gpt-image-1",prompt,size:"1024x1024",quality:"medium",output_format:"webp"}),signal:controller.signal});
   const imageData=await imageResponse.json() as {data?:Array<{b64_json?:string}>};
   if(!imageResponse.ok||!imageData.data?.[0]?.b64_json)return NextResponse.json({error:"Không thể tạo ảnh lúc này. Kiểm tra quyền truy cập model tạo ảnh."},{status:502});
   return NextResponse.json({reply:"Ảnh đã được tạo. Bạn có thể lưu về thiết bị.",imageDataUrl:"data:image/webp;base64,"+imageData.data[0].b64_json});
  }
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:"Bearer "+apiKey,"content-type":"application/json"},body:JSON.stringify({model:process.env.AURA_MODEL||"gpt-4.1-mini",instructions:"Bạn là Aura, trợ lý thân thiện của VibeNest. Trả lời bằng tiếng Việt, ấm áp, ngắn gọn. Không chẩn đoán y tế, không khuyến khích hành vi nguy hiểm.",input:message,max_output_tokens:500}),signal:controller.signal});
  const data=await response.json() as {output_text?:string};
  if(!response.ok)return NextResponse.json({error:"Dịch vụ Aura tạm thời không khả dụng."},{status:502});
  return NextResponse.json({reply:data.output_text||"Mình chưa tìm được câu trả lời phù hợp."});
 }catch{return NextResponse.json({error:"Aura hết thời gian chờ. Hãy thử lại."},{status:504});}finally{clearTimeout(timeout);}
}
