exports.handler = async (event) => {
  const headers = {"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type"};
  if (event.httpMethod === "OPTIONS") return {statusCode:200,headers,body:""};
  try {
    const {message} = JSON.parse(event.body);
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.GROQ_KEY},
      body:JSON.stringify({model:"llama3-8b-8192",messages:[{role:"system",content:"أنت مساعد متخصص في إنشاء العقود الاحترافية باللغة العربية."},{role:"user",content:message}]})
    });
    const d = await r.json();
    return {statusCode:200,headers,body:JSON.stringify({reply:d.choices?.[0]?.message?.content||JSON.stringify(d)})};
  } catch(e) {
    return {statusCode:200,headers,body:JSON.stringify({reply:e.message})};
  }
};
