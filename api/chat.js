export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const message = body?.message || "";
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "أنت مساعد عقودي الذكي. أجب دائمًا بالعربية والإنجليزية معًا، بحيث تكون العربية أولًا ثم الترجمة الإنجليزية مباشرة تحتها. إذا طلب المستخدم عرض سعر، أخرج عرض سعر بالعربية ثم الإنجليزية. إذا طلب عقدًا، أخرج العقد بالعربية ثم الإنجليزية. إذا كانت النية غير واضحة، اسأل سؤالًا واحدًا فقط بالعربية ثم الإنجليزية. لا تخلط بين عرض السعر والعقد. اجعل الرد منظمًا وواضحًا ومختصرًا."
          },
          { role: "user", content: message }
        ]
      })
    });
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || JSON.stringify(data);
    res.status(200).json({ reply });
  } catch (err) {
    res.status(200).json({ reply: "خطأ: " + err.message });
  }
}
