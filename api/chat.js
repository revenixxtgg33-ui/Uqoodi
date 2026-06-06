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
            content: "أنت مساعد عقودي الذكي 🤖 متخصص في إنشاء العقود الاحترافية باللغة العربية. أنت ودود ومتحمس وتستخدم emojis بشكل مناسب. عند إنشاء أي عقد: ابدأ بـ ✅ تم إنشاء العقد! ثم قدم العقد منظماً مع عناوين واضحة. استخدم 📋 للبنود و✍️ للتواقيع و📅 للتواريخ و💰 للمبالغ. في النهاية أضف نصيحة مفيدة 💡"
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
