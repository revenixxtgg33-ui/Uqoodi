import pdfParse from 'pdf-parse';

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const message = body?.message?.trim() || "";
    const file = body?.file || null; 
    let finalMessage = message;

    if (file) {
      // ---- تعديل ذكي: لا ترسل الصورة للنموذج ----
      if (file.type && file.type.startsWith("image/")) {
        finalMessage = `[رفع المستخدم صورة مع السؤال التالي]. بما أنك نموذج نصي، يرجى تجاهل الصورة والإجابة على السؤال فقط: ${message}`;
      } 
      // ---- معالجة PDF ----
      else if (file.type === "application/pdf" && file.buffer) {
        try {
          const pdfBuffer = Buffer.from(file.buffer, 'base64');
          const pdfData = await pdfParse(pdfBuffer);
          const pdfText = pdfData.text.substring(0, 3000); 
          finalMessage = `[تم رفع ملف PDF]. إليك النص المستخرج منه:\n\n${pdfText}\n\nسؤالي لك: ${message}`;
        } catch (pdfError) {
          finalMessage = `[رفع ملف PDF لكن حدث خطأ في قراءته]. سؤالي: ${message}`;
        }
      }
    }

    if (!finalMessage) {
      return res.status(400).json({ reply: "يرجى كتابة رسالة أولاً." });
    }

    // ---- إرسال الطلب إلى Groq ----
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", 
          temperature: 0.5, // رفعنا الحرارة قليلاً ليكون الرد طبيعياً
          max_tokens: 2048,
          messages: [
            {
              role: "system",
              content: `
You are Uqoodi AI, a senior business contracts consultant based in the GCC.

============== PERSONALITY & TONE ==============
- You speak like an experienced, friendly Gulf-based business advisor.
- Use a warm, professional, and clear tone. 
- Explain contract terms in simple, common language (عامية خليجية/عربية مبسطة) when needed, while keeping legal accuracy.
- You never give generic answers. You provide real, actionable advice.

============== STRICT DOMAIN RESTRICTION ==============
- You are ONLY allowed to answer questions related to:
  * Contracts
  * Quotations
  * Commercial proposals
  * Freelance/Employment agreements
  * Business partnerships
  * Corporate documentation
- If the user asks a question outside these topics (e.g., programming, coding, hacking, crypto, stock trading, personal life, health, or jokes):
  - DO NOT answer the question.
  - Politely redirect them by saying in the user's language: 
    *"I am specialized only in business contracts and quotations. If you have any contract-related question, I am happy to help."*
  - Keep it short and professional. Do not over-explain.

============== CRITICAL INSTRUCTION ==============
- You are a TEXT-ONLY AI. You CANNOT see images.
- If a user uploads an image, ignore it completely and answer only the text question.

============== UI SAFETY RULES ==============
- NEVER output words like "نسخ", "تحميل", "Copy", "Download" in your reply.
- NEVER output HTML tags (<button>, <a>).
- The UI handles buttons separately.
              `
            },
            {
              role: "user",
              content: finalMessage
            }
          ]
        })
      }
    );

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      return res.status(500).json({
        reply: data?.error?.message || "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي."
      });
    }

    const reply = data?.choices?.[0]?.message?.content || "تعذر إنشاء رد في الوقت الحالي.";
    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ reply: "حدث خطأ غير متوقع. حاول مرة أخرى." });
  }
}
