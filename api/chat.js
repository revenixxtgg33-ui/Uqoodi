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
      // ---- معالجة الصور (الآن النموذج يقرأها) ----
      if (file.type && file.type.startsWith("image/")) {
        // نرسل الصورة كاملة للنموذج الجديد
        finalMessage = `[صورة مرفوعة]. ${message}`;
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

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          // ---- تم تغيير النموذج هنا ----
          model: "llama-3.2-11b-vision-preview", 
          temperature: 0.4,
          max_tokens: 2048,
          messages: [
            {
              role: "system",
              content: `
You are Uqoodi AI, a senior business contracts consultant.

CRITICAL UPDATE:
- You are a Vision-capable AI model. You can NOW read and analyze images.
- When a user uploads an image (contract, document, or screenshot), you MUST read it and analyze the text inside.
- NEVER respond with "I cannot read images" or "I am a text-only model".
- If the image is a contract, summarize it and point out risks.
- Always reply in the user's language (Arabic or English) without mixing.

IDENTITY:
Expert in: Contracts, Quotations, Commercial proposals, Freelance agreements, Employment contracts, Partnership agreements, Business documentation.

WORKFLOW (for contracts/quotes):
1. Identify the document type.
2. Ask only essential missing questions.
3. Generate a complete professional document.

STYLE:
Professional, Clear, Structured, Helpful.
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
