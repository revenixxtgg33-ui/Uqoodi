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
      // ---- Image: ignore (text-only model) ----
      if (file.type && file.type.startsWith("image/")) {
        finalMessage = `[رفع المستخدم صورة مع السؤال التالي]. بما أنك نموذج نصي، يرجى تجاهل الصورة والإجابة على السؤال فقط: ${message}`;
      }
      // ---- PDF: extract text via pdf-parse ----
      else if (file.type === "application/pdf") {
        // Accept both `base64` (current frontend) and legacy `buffer` field, with or without data: prefix
        let b64 = file.base64 || file.buffer || file.data || "";
        if (typeof b64 === "string" && b64.startsWith("data:")) {
          const i = b64.indexOf(",");
          if (i >= 0) b64 = b64.substring(i + 1);
        }

        if (!b64) {
          finalMessage = `[رفع المستخدم ملف PDF لكن لم يصل محتواه]. السؤال: ${message}`;
        } else {
          try {
            const pdfBuffer = Buffer.from(b64, "base64");
            const pdfData = await pdfParse(pdfBuffer);
            const pdfText = (pdfData.text || "").trim().substring(0, 6000);
            if (!pdfText) {
              finalMessage = `[تم رفع ملف PDF لكن لم يُستخرج منه نص — قد يكون صورة ممسوحة ضوئياً]. السؤال: ${message}`;
            } else {
              finalMessage = `[تم رفع ملف PDF — اسم الملف: ${file.name || "document.pdf"}]. النص المستخرج من الملف:\n\n"""${pdfText}"""\n\nاعتمد على النص أعلاه في إجابتك.\nسؤال المستخدم: ${message || "الرجاء تحليل هذا العقد وتلخيص أهم بنوده ومخاطره."}`;
            }
          } catch (pdfError) {
            console.error("pdf-parse error:", pdfError);
            finalMessage = `[رفع ملف PDF لكن حدث خطأ في قراءته]. سؤالي: ${message}`;
          }
        }
      }
    }

    if (!finalMessage) {
      return res.status(400).json({ reply: "يرجى كتابة رسالة أولاً." });
    }

    // ---- Send to Groq ----
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
          temperature: 0.5,
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
  - Politely redirect them in the user's language:
    *"I am specialized only in business contracts and quotations. If you have any contract-related question, I am happy to help."*
  - Keep it short and professional. Do not over-explain.

============== CRITICAL INSTRUCTION ==============
- You are a TEXT-ONLY AI. You CANNOT see images.
- If a user uploads an image, ignore it completely and answer only the text question.
- If the user uploads a PDF, the extracted text will be provided to you between triple quotes ("""...""") — analyze it directly.

============== UI SAFETY RULES — ABSOLUTELY FORBIDDEN ==============
The application UI already renders its own "Copy" and "Download" buttons below every reply.
You MUST NEVER, under ANY circumstances, output any of the following inside your reply:
- The Arabic words: "نسخ", "تحميل", "تنزيل", "حفظ كملف", "اضغط هنا للنسخ", "اضغط هنا للتحميل".
- The English words: "Copy", "Download", "Save as file", "Click to copy", "Click to download", "Click here".
- Any emoji used as an action button: 📋, ⬇️, ⬇, 📥, 💾 when paired with the words above.
- Any HTML tags whatsoever: <button>, <a>, <div>, <span>, <p>, <br>, <img>, <input>, <form>, <script>, <style>, or any tag at all. Output PLAIN TEXT ONLY (Markdown bold ** is allowed).
- Any markdown link syntax like [Copy](...) or [Download](...).
- Any instruction telling the user how to copy or download the document.

If you violate these rules, the UI will show DUPLICATE buttons and the user will be confused. Never write copy/download instructions — the buttons are already there.
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

    let reply = data?.choices?.[0]?.message?.content || "تعذر إنشاء رد في الوقت الحالي.";

    // ---- Safety net: strip any forbidden copy/download lines or HTML the model may still emit ----
    reply = reply
      .replace(/<\/?[a-zA-Z][^>]*>/g, "")
      .replace(/^.*\[(?:نسخ|تحميل|تنزيل|Copy|Download)\]\([^)]*\).*$/gim, "")
      .replace(/^[^\n]*(?:اضغط هنا (?:للنسخ|للتحميل|لتنزيل)|Click (?:here )?to (?:copy|download)).*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ reply: "حدث خطأ غير متوقع. حاول مرة أخرى." });
  }
}
