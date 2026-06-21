import pdfParse from 'pdf-parse';

const MIN_PDF_TEXT_CHARS = 50;
const MAX_PDF_TEXT_CHARS = 12000;

function cleanBase64(input = "") {
  let b64 = String(input || "");
  if (b64.startsWith("data:")) {
    const i = b64.indexOf(",");
    if (i >= 0) b64 = b64.substring(i + 1);
  }
  return b64.replace(/\s/g, "");
}

function normalizePdfText(text = "") {
  return String(text || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractWithGeminiOcr(pdfBase64) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return "";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Extract all readable contract text from this PDF. Return only the extracted text, preserving Arabic and English as accurately as possible." },
              { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
            ]
          }
        ],
        generationConfig: { temperature: 0 }
      })
    }
  );

  const result = await response.json();
  if (!response.ok) {
    console.error("Gemini OCR error:", result);
    return "";
  }

  return normalizePdfText(result?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n") || "");
}

async function extractPdfText(file) {
  const clientText = normalizePdfText(file?.text || file?.extractedText || "");
  if (clientText.length >= MIN_PDF_TEXT_CHARS) {
    return { text: clientText.substring(0, MAX_PDF_TEXT_CHARS), reason: "browser" };
  }

  const b64 = cleanBase64(file?.base64 || file?.buffer || file?.data || "");
  if (!b64) return { text: "", reason: "missing_base64" };

  let nativeText = "";
  try {
    const pdfBuffer = Buffer.from(b64, "base64");
    const pdfData = await pdfParse(pdfBuffer);
    nativeText = normalizePdfText(pdfData.text || "");
  } catch (pdfError) {
    console.error("pdf-parse error:", pdfError);
  }

  if (nativeText.length >= MIN_PDF_TEXT_CHARS) {
    return { text: nativeText.substring(0, MAX_PDF_TEXT_CHARS), reason: "native" };
  }

  try {
    const ocrText = await extractWithGeminiOcr(b64);
    if (ocrText.length >= MIN_PDF_TEXT_CHARS) {
      return { text: ocrText.substring(0, MAX_PDF_TEXT_CHARS), reason: "ocr" };
    }
  } catch (ocrError) {
    console.error("OCR fallback error:", ocrError);
  }

  return { text: nativeText.substring(0, MAX_PDF_TEXT_CHARS), reason: "empty" };
}

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

    const incomingMessages = Array.isArray(body?.messages) ? body.messages : null;
    // Last user message text (fallback to `message` field for older clients)
    const lastUserMsg = incomingMessages
      ? (() => {
          for (let i = incomingMessages.length - 1; i >= 0; i--) {
            if (incomingMessages[i]?.role === "user") {
              const c = incomingMessages[i].content;
              return typeof c === "string" ? c.trim() : "";
            }
          }
          return "";
        })()
      : (body?.message?.trim() || "");
    const message = lastUserMsg;
    const file = body?.file || null;
    let finalMessage = message;

    if (file) {
      // ---- Image: ignore (text-only model) ----
      if (file.type && file.type.startsWith("image/")) {
        finalMessage = `[رفع المستخدم صورة مع السؤال التالي]. بما أنك نموذج نصي، يرجى تجاهل الصورة والإجابة على السؤال فقط: ${message}`;
      }
      // ---- PDF: extract text natively, then fallback to OCR for scanned/image PDFs ----
      else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")) {
        const extracted = await extractPdfText(file);
        if (extracted.reason === "missing_base64") {
          finalMessage = `[رفع المستخدم ملف PDF لكن لم يصل محتواه]. السؤال: ${message}`;
        } else if (!extracted.text) {
          finalMessage = `[تم رفع ملف PDF لكن لم يُستخرج منه نص واضح حتى بعد محاولة قراءة الملف بالـ OCR]. السؤال: ${message}`;
        } else {
          const readMethod = extracted.reason === "ocr" ? "OCR" : (extracted.reason === "browser" ? "المتصفح" : "نص مباشر");
          finalMessage = `[تم رفع ملف PDF — اسم الملف: ${file.name || "document.pdf"} — طريقة القراءة: ${readMethod}]. النص المستخرج من الملف:\n\n"""${extracted.text}"""\n\nاعتمد على النص أعلاه في إجابتك.\nسؤال المستخدم: ${message || "الرجاء تحليل هذا العقد وتلخيص أهم بنوده ومخاطره."}`;
        }
      }
    }

    if (!finalMessage) {
      return res.status(400).json({ reply: "يرجى كتابة رسالة أولاً." });
    }

    // ---- Build conversation messages: system prompt + prior history + current user message ----
    // If a file is attached, the LAST user message is replaced with `finalMessage` (which
    // embeds the extracted PDF text or image notice) so the model has full context.
    const systemPrompt = {
      role: "system",
      content: `
You are Uqoodi AI, a senior business contracts consultant based in the GCC.

============== PERSONALITY & TONE ==============
- You speak like an experienced, friendly Gulf-based business advisor.
- Use a warm, professional, and clear tone.
- Explain contract terms in simple, common language (عامية خليجية/عربية مبسطة) when needed, while keeping legal accuracy.
- You never give generic answers. You provide real, actionable advice.
- You REMEMBER prior messages in this conversation and refer back to them when relevant.

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

============== MANDATORY RISK ANALYSIS (3 CLAUSES — NO EXCEPTIONS) ==============
Whenever you analyze ANY contract, agreement, proposal, or legal document
(whether pasted as text or extracted from a PDF), you MUST ALWAYS analyze
these THREE specific clauses — even if the user didn't ask for them, and
even if they are not explicitly written in the contract (in which case,
flag their absence as a risk):

  1) **بند التعويض (Indemnification)**
     - Explain in simple words: "إذا صار ضرر أو خسارة، مَن اللي بيدفع؟"
     - Who carries financial responsibility if something goes wrong?
     - Are the limits fair, one-sided, or unlimited?

  2) **بند الملكية الفكرية (Intellectual Property)**
     - Explain in simple words: "لمن تروح ملكية الشغل/التصاميم/الكود/الأفكار؟"
     - Does the client own it, the freelancer, or is it shared?
     - Are there hidden transfers of rights?

  3) **بند الإنهاء (Termination)**
     - Explain in simple words: "كيف نقدر نوقف العقد، وشنو الشروط والغرامات؟"
     - Notice period? Penalties? Can one party cancel without reason?
     - Is the exit fair for both sides?

For EACH of these 3 clauses you MUST:
- State the risk level clearly: **آمن (GREEN)** / **يحتاج انتباه (YELLOW)** / **خطر (RED)**.
- Explain the risk in plain, simple, everyday language a non-lawyer fully understands.
- Give one concrete, actionable recommendation (e.g. "اطلب تعديل الفقرة لتصبح…").

When the user asks for a risk report, format the analysis section EXACTLY like this:

=== RISK ASSESSMENT ===
OVERALL: [GREEN|YELLOW|RED] — جملة موجزة عن المستوى العام للمخاطر.
- [GREEN|YELLOW|RED] | بند التعويض (Indemnification): شرح بسيط للمخاطرة + التوصية.
- [GREEN|YELLOW|RED] | بند الملكية الفكرية (Intellectual Property): شرح بسيط للمخاطرة + التوصية.
- [GREEN|YELLOW|RED] | بند الإنهاء (Termination): شرح بسيط للمخاطرة + التوصية.
=== END RISK ===

Do not write anything after === END RISK ===.

============== UI SAFETY RULES — ABSOLUTELY FORBIDDEN ==============
The application UI already renders its own "Copy" and "Download" buttons
below every reply, exactly once. You MUST NEVER, under ANY circumstances,
output any of the following inside your reply:

- The Arabic words: "نسخ", "تحميل", "تنزيل", "حفظ كملف", "اضغط هنا للنسخ", "اضغط هنا للتحميل".
- The English words: "Copy", "Download", "Save as file", "Click to copy", "Click to download", "Click here".
- Any emoji used as an action button: 📋, ⬇️, ⬇, 📥, 💾 when paired with the words above.
- Any HTML tags whatsoever: <button>, <a>, <div>, <span>, <p>, <br>, <img>, <input>, <form>, <script>, <style>, or any tag at all. Output PLAIN TEXT ONLY (Markdown bold ** is allowed).
- Any markdown link syntax like [Copy](...) or [Download](...).
- Any instruction telling the user how to copy or download the document.

If you violate these rules, the UI will show DUPLICATE buttons and the user
will be confused. The buttons are already there — never write copy/download
instructions, labels, or hints.
              `
    };

    // Sanitize incoming history into the shape Groq expects
    let convo = [];
    if (incomingMessages && incomingMessages.length) {
      convo = incomingMessages
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map(m => ({ role: m.role, content: m.content }));
    }

    // Ensure the last user message carries the file-augmented `finalMessage`
    if (convo.length && convo[convo.length - 1].role === "user") {
      convo[convo.length - 1] = { role: "user", content: finalMessage };
    } else {
      convo.push({ role: "user", content: finalMessage });
    }

    // Keep only the last ~20 turns to stay within token limits
    if (convo.length > 20) convo = convo.slice(-20);

    const groqMessages = [systemPrompt, ...convo];

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
          messages: groqMessages
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
      // strip any HTML tags
      .replace(/<\/?[a-zA-Z][^>]*>/g, "")
      // strip markdown-link forms like [نسخ](...) / [Download](...)
      .replace(/^.*\[(?:نسخ|تحميل|تنزيل|Copy|Download)\]\([^)]*\).*$/gim, "")
      // strip "click here to copy/download" style lines
      .replace(/^[^\n]*(?:اضغط هنا (?:للنسخ|للتحميل|لتنزيل)|Click (?:here )?to (?:copy|download)).*$/gim, "")
      // strip standalone bullet/heading lines that are basically "Copy" / "Download" labels
      .replace(/^[ \t]*[-•*]?[ \t]*(?:\*\*)?(?:نسخ(?:\s+العقد)?|تحميل(?:\s+(?:PDF|الملف|العقد))?|تنزيل|Copy(?:\s+contract)?|Download(?:\s+PDF)?)(?:\*\*)?[ \t]*[:：]?[ \t]*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ reply: "حدث خطأ غير متوقع. حاول مرة أخرى." });
  }
          }
