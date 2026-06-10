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
            content: "أنت مساعد عقودي الذكي. إذا طلب المستخدم عرض سعر أو quotation أخرج عرض سعر فقط وبشكل مختصر واحترافي. إذا طلب عقد أو contract أخرج عقدًا فقط وبشكل مرتب واحترافي. إذا كانت النية غير واضحة اسأل سؤالًا واحدًا فقط لتحديد هل يريد عرض سعر أم عقد. لا تخلط بين النوعين. لا تكتب غرامات أو توقيعات إلا في العقد. استخدم العربية الواضحة والمختصرة."
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
