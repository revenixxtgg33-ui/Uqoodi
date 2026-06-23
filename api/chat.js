// api/chat.js — Uqoodi AI contract assistant backend (Vercel + Groq version)
// Fixed: Language detection based on CURRENT user message.

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

// Detect language based on current user message
function detectLanguage(text) {
  if (!text || typeof text !== "string") return "ar";
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic >= latin ? "ar" : "en";
}

function buildSystemPrompt(lang) {
  if (lang === "en") {
    return `You are Uqoodi AI, a smart legal assistant specialized in drafting contracts and commercial documents in professional English.

Strict language rules:
- Your entire reply MUST be in English only.
- Do NOT use any Arabic letters or words, except the literal Arabic contract text if the user explicitly asks for an Arabic clause.
- Do not include buttons, links, or phrases like 'Copy contract' or 'Download PDF'; the UI provides those.
- Use a professional, polite tone with no slang or excessive emojis.
- When drafting a contract, use a clear format: title, introduction, numbered clauses, signatures.
- After the contract, always append the risk assessment section in this exact format:
=== RISK ASSESSMENT ===
OVERALL: [GREEN|YELLOW|RED] — one short sentence.
- [GREEN|YELLOW|RED] | Clause X (clause name): brief risk explanation and recommendation.
- [GREEN|YELLOW|RED] | Clause Y (clause name): brief risk explanation and recommendation.
- [GREEN|YELLOW|RED] | Clause Z (clause name): brief risk explanation and recommendation.
=== END RISK ===
- Do not write anything after === END RISK ===.`;
  }

  return `أنت عقودي AI، مساعد قانوني ذكي متخصص في صياغة العقود والوثائق التجارية باللغة العربية الفصحى.

قواعد لغوية صارمة:
- يجب أن يكون كل ردك باللغة العربية الفصحى فقط.
- ممنوع تماماً استخدام أي حرف لاتيني أو كلمة إنجليزية في الرد، ما عدا: GREEN و YELLOW و RED عند تقييم المخاطر.
- لا تكتب أي عبارة مثل 'باللغة الإنجليزية' أو 'in English'.
- لا تضع أزراراً أو روابط أو عبارات مثل 'نسخ العقد' أو 'تحميل PDF'؛ الواجهة توفر ذلك.
- استخدم أسلوباً احترافياً ومهذباً، بدون تعابير عامية أو emojis زائدة.
- عند صياغة العقد، استخدم تنسيقاً واضحاً: عنوان، مقدمة، بنود مرقمة، توقيعات.
- بعد العقد، أضف دائماً قسم تحليل المخاطر بالتنسيق المطلوب:
=== RISK ASSESSMENT ===
OVERALL: [GREEN|YELLOW|RED] — جملة موجزة بالعربية.
- [GREEN|YELLOW|RED] | البند رقم X (اسم البند): شرح موجز وتوصية.
- [GREEN|YELLOW|RED] | البند رقم Y (اسم البند): شرح موجز وتوصية.
- [GREEN|YELLOW|RED] | البند رقم Z (اسم البند): شرح موجز وتوصية.
=== END RISK ===
- لا تضف أي نص بعد === END RISK ===.`;
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
    const currentUserMsg = body?.message?.trim() || "";
    const file = body?.file || null;

    // Detect language from current user message
    const detectedLang = detectLanguage(currentUserMsg);
    const isEnglish = detectedLang === "en";

    // Build the final message with file context if present
    let finalMessage = currentUserMsg;

    if (file) {
      if (file.type && file.type.startsWith("image/")) {
        finalMessage = `[User uploaded an image with the question]. Since you are a text-only model, please ignore the image and answer only the question: ${currentUserMsg}`;
      } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")) {
        const extracted = await extractPdfText(file);
        if (extracted.reason === "missing_base64") {
          finalMessage = `[User uploaded a PDF but the content didn't arrive]. Question: ${currentUserMsg}`;
        } else if (!extracted.text) {
          finalMessage = `[PDF uploaded but no text was extracted even after OCR]. Question: ${currentUserMsg}`;
        } else {
          const readMethod = extracted.reason === "ocr" ? "OCR" : (extracted.reason === "browser" ? "Browser" : "Native");
          finalMessage = `[PDF uploaded — file: ${file.name || "document.pdf"} — method: ${readMethod}]. Extracted text:\n\n"""${extracted.text}"""\n\nUse the text above in your answer.\nUser question: ${currentUserMsg || "Please analyze this contract."}`;
        }
      }
    }

    if (!finalMessage) {
      return res.status(400).json({ reply: "Please write a message first." });
    }

    // Build conversation
    const systemPrompt = { role: "system", content: buildSystemPrompt(detectedLang) };

    let convo = [];
    if (incomingMessages && incomingMessages.length) {
      convo = incomingMessages
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map(m => ({ role: m.role, content: m.content }));
    }

    // Replace last user message with finalMessage (with file context)
    if (convo.length && convo[convo.length - 1].role === "user") {
      convo[convo.length - 1] = { role: "user", content: finalMessage };
    } else {
      convo.push({ role: "user", content: finalMessage });
    }

    // Keep only last 20 turns
    if (convo.length > 20) convo = convo.slice(-20);

    // Call Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.25,
        max_tokens: 2500,
        messages: [systemPrompt, ...convo]
      })
    });

    const result = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq API error:", result);
      return res.status(200).json({
        reply: isEnglish
          ? "An error occurred while contacting the AI model. Please try again."
          : "حدث خطأ أثناء التواصل مع نموذج الذكاء الاصطناعي. حاول مرة أخرى."
      });
    }

    let reply = result?.choices?.[0]?.message?.content || "";

    if (!reply) {
      return res.status(200).json({
        reply: isEnglish ? "Sorry, I couldn't generate a reply." : "عذراً، لم أتمكن من توليد رد."
      });
    }

    // Clean up any stray copy/download lines
    reply = reply
      .replace(/^[ \t]*[-•*]?[ \t]*(?:\*\*)?(?:نسخ(?:\s+العقد)?|تحميل(?:\s+(?:PDF|الملف|العقد))?|تنزيل|Copy(?:\s+contract)?|Download(?:\s+PDF)?)(?:\*\*)?[ \t]*[:：]?[ \t]*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Chat endpoint error:", error);
    return res.status(500).json({
      reply: "An unexpected error occurred. Please try again."
    });
  }
    }
