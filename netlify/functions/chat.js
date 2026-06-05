exports.handler = async (event) => {
  const h = {"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type"};
  if (event.httpMethod === "OPTIONS") return {statusCode:200,headers:h,body:""};
  try {
    const {message} = JSON.parse(event.body);
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer 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"},
      body:JSON.stringify({model:"llama3-8b-8192",messages:[{role:"system",content:"أنت مساعد متخصص في إنشاء العقود الاحترافية باللغة العربية."},{role:"user",content:message}]})
    });
    const d = await r.json();
    const reply = d.choices?.[0]?.message?.content || d.error?.message || JSON.stringify(d);
    return {statusCode:200,headers:h,body:JSON.stringify({reply})};
  } catch(e) {
    return {statusCode:200,headers:h,body:JSON.stringify({reply:e.message})};
  }
};
