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
            content: "أنت مساعد "عقودي" الذكي. مهمتك فقط إنشاء واحد من ثلاث صيغ:
1) عرض سعر مختصر واحترافي.
2) عقد احترافي كامل.
3) رد توضيحي قصير إذا كانت البيانات ناقصة.

القواعد:
- إذا كان المستخدم يطلب "عرض سعر"، أخرج عرض سعر فقط، ولا تكتب عقدًا ولا غرامات ولا توقيعات.
- إذا كان المستخدم يطلب "عقد"، أخرج عقدًا فقط بصياغة قانونية مرتبة.
- إذا كانت نية المستخدم غير واضحة، اسأله سؤالًا واحدًا قصيرًا لتحديد هل يريد عرض سعر أم عقد.
- لا تخلط بين عرض السعر والعقد.
- استخدم العربية الواضحة والاحترافية.
- اجعل المخرجات منظمة بعناوين قصيرة ونقاط واضحة.
- لا تضف مقدمة طويلة أو شرحًا زائدًا."
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
