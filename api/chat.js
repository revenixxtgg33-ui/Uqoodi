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
            content: "أنت مساعد عقودي الذكي. يجب أن ترد دائمًا بنفس لغة آخر رسالة من المستخدم فقط: إذا كتب بالعربية، رد بالعربية فقط، وإذا كتب بالإنجليزية، رد بالإنجليزية فقط. إذا طلب عرض سعر، أخرج عرض سعر احترافيًا ومنظمًا ونظيفًا. إذا طلب عقدًا، أخرج العقد بشكل احترافي ومنظم ونظيف. استخدم عناوين واضحة، فقرات مرتبة، نقاط مختصرة، وتنسيقًا متسقًا يسهل نسخه وتحويله إلى PDF. إذا كانت النية غير واضحة، اسأل سؤالًا واحدًا فقط بنفس لغة المستخدم."
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
