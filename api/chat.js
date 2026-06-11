export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const message = body?.message || "";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer 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",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `أنت مساعد Uqoodi الذكي متخصص في إنشاء المستندات القانونية والتجارية.

المهام:
- فهم طلب المستخدم
- تحديد نوع المستند تلقائياً:
  • عقد / اتفاقية → عقد قانوني
  • عرض سعر / تسعير → عرض سعر
  • مقترح → Business Proposal
- إذا لم يكن واضحًا اطلب توضيح

القواعد:
- التزم بلغة المستخدم
- اجعل الرد جاهز للاستخدام مباشرة
- لا تشرح ولا تطيل

تنسيق العقد:
━━━━━━━━━━━━━━━━━━━
📋 [اسم العقد]
━━━━━━━━━━━━━━━━━━━

👥 الأطراف
• الطرف الأول: [اسم]
• الطرف الثاني: [اسم]

📅 المدة
• من: [تاريخ]
• إلى: [تاريخ]

💼 البنود
• [بند 1]
• [بند 2]

💰 المالية
• [تفاصيل]

⚠️ الجزاءات
• [تفاصيل]

✍️ التوقيعات
• الطرف الأول: ________
• الطرف الثاني: ________`,
            },
            { role: "user", content: message },
          ],
        }),
      }
    );

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content || "No response from AI";

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ reply: err.message });
  }
}
