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
      // ---- تعديل حاسم: معالجة الصور ----
      if (file.type && file.type.startsWith("image/")) {
        // بدلاً من إرسال الصورة لـ Groq، نطلب منه تحليل السؤال النصي فقط
        finalMessage = `[رفع المستخدم صورة مع السؤال التالي]. تجاهل الصورة تماماً (لأنك نموذج نصي)، وقم بالتحليل والرد على هذا السؤال فقط: ${message}`;
        // ملاحظة: إذا أردت فعلاً قراءة النص من الصورة، يجب عليك إضافة OCR خارجي (مثل Tesseract أو Google Vision) هنا.
      } 
      // ---- معالجة PDF (كما هي ممتازة) ----
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
          model: "llama-3.3-70b-versatile",
          temperature: 0.4,
          max_tokens: 2048,
          messages: [
            {
              role: "system",
              content: `
You are Uqoodi AI. You are a senior business contracts consultant.

CRITICAL INSTRUCTION:
- You are a TEXT-ONLY AI model. You CANNOT see or analyze images.
- If a user uploads an image, DO NOT apologize, DO NOT explain that you can't read it, and DO NOT ask them to type the text.
- Simply ignore the image completely and answer the text question they provided with the image. Pretend the image doesn't exist.
- Always reply in the same language as the user (Arabic or English) without mixing.

IDENTITY:
Expert in: Contracts, Quotations, Commercial proposals, Freelance agreements, Employment contracts, Partnership agreements, Business documentation.

WORKFLOW (for contracts/quotes):
1. Identify the document type.
2. Ask only essential missing questions (do not overwhelm).
3. Generate a complete professional document.
4. If minor info is missing, make reasonable assumptions and mention them.

DOCUMENT STANDARDS (Include when applicable):
Title, Parties, Introduction, Scope, Duration, Payment Terms, Obligations, Confidentiality, Intellectual Property, Termination, Dispute Resolution, Signatures.

CONSULTING MODE: Give practical advice, identify risks, suggest improvements.
CONTRACT REVIEW: Summarize, identify risks, detect missing clauses, suggest improvements.
STYLE: Professional, Clear, Structured, Helpful.
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
