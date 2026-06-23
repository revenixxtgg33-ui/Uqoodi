// api/chat.js — Uqoodi AI contract assistant backend
// Fixed: language detection is based on the CURRENT user message and strictly locked.

const express = require("express");
const pdfParse = require("pdf-parse");

const router = express.Router();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const API_KEY = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "";
const API_URL = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detect the dominant script of the current user message.
 * Returns "ar" if Arabic letters are >= Latin letters, otherwise "en".
 */
function detectLanguage(text) {
  if (!text || typeof text !== "string") return "ar";
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic >= latin ? "ar" : "en";
}

function isArabic(text) {
  return detectLanguage(text) === "ar";
}

function sanitizeReply(reply, lang) {
  let clean = (reply || "").trim();

  // Remove any stray "copy / download" lines the model might emit.
  clean = clean
    .replace(/^[ \t]*[-•*]?[ \t]*(?:\*\*)?(?:نسخ(?:\s+العقد)?|تحميل(?:\s+(?:PDF|الملف|العقد))?|تنزيل|Copy(?:\s+contract)?|Download(?:\s+PDF)?)(?:\*\*)?[ \t]*[:：]?[ \t]*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // If English was requested, aggressively strip isolated Arabic words/lines.
  if (lang === "en") {
    clean = clean
      .replace(/^[\u0600-\u06FF][^\n]{0,60}[.؟!]?$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // If Arabic was requested, aggressively strip isolated English words/lines.
  if (lang === "ar") {
    clean = clean
      .replace(/^[A-Za-z][^\n]{0,60}[.?!]?$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return clean;
}

async function extractPdfText(base64) {
  try {
    const buffer = Buffer.from(base64, "base64");
    if (!buffer || buffer.length === 0) return { text: "", reason: "empty" };

    let nativeText = "";
    try {
      const parsed = await pdfParse(buffer);
      nativeText = (parsed.text || "").trim();
    } catch (e) {
      nativeText = "";
    }

    // If native text is reasonably present, use it.
    if (nativeText && nativeText.length > 30) {
      return { text: nativeText.substring(0, 12000), reason: "native" };
    }

    // OCR fallback is not implemented server-side in this file.
    // The browser already sends `file.text` from pdf.js extraction.
    return { text: "", reason: "corrupted" };
  } catch (error) {
    return { text: "", reason: "corrupted" };
  }
}

function buildSystemPrompt(lang) {
  const arInstructions = [
    "أنت عقودي AI، مساعد قانوني ذكي متخصص في صياغة العقود والوثائق التجارية باللغة العربية الفصحى.",
    "قواعد لغوية صارمة:",
    "- يجب أن يكون كل ردك باللغة العربية الفصحى فقط.",
    "- ممنوع تماماً استخدام أي حرف لاتيني أو كلمة إنجليزية في الرد، ما عدا: GREEN و YELLOW و RED عند تقييم المخاطر.",
    "- إذا كان طلب المستخدم بالإنجليزي، صاغ الرد بالعربية (لأن الواجهة العربية هي الافتراضية) — لا ترد بالإنجليزي أبداً.",
    "- لا تكتب أي عبارة مثل 'باللغة الإنجليزية' أو 'in English'.",
    "- لا تضع أزراراً أو روابط أو عبارات مثل 'نسخ العقد' أو 'تحميل PDF'؛ الواجهة توفر ذلك.",
    "- استخدم أسلوباً احترافياً ومهذباً، بدون تعابير عامية أو emojis زائدة.",
    "- عند صياغة العقد، استخدم تنسيقاً واضحاً: عنوان، مقدمة، بنود مرقمة، توقيعات.",
    "- بعد العقد، أضف دائماً قسم تحليل المخاطر بالتنسيق المطلوب:",
    "=== RISK ASSESSMENT ===",
    "OVERALL: [GREEN|YELLOW|RED] — جملة موجزة بالعربية.",
    "- [GREEN|YELLOW|RED] | البند رقم X (اسم البند): شرح موجز وتوصية.",
    "- [GREEN|YELLOW|RED] | البند رقم Y (اسم البند): شرح موجز وتوصية.",
    "- [GREEN|YELLOW|RED] | البند رقم Z (اسم البند): شرح موجز وتوصية.",
    "=== END RISK ===",
    "- لا تضف أي نص بعد === END RISK ===.",
  ];

  const enInstructions = [
    "You are Uqoodi AI, a smart legal assistant specialized in drafting contracts and commercial documents in professional English.",
    "Strict language rules:",
    "- Your entire reply MUST be in English only.",
    "- Do NOT use any Arabic letters or words, except the literal Arabic contract text if the user explicitly asks for an Arabic clause.",
    "- If the user's message is in Arabic but the interface language is English, reply in English.",
    "- Do not include phrases like 'in Arabic' or 'بالعربية'.",
    "- Do not include buttons, links, or phrases like 'Copy contract' or 'Download PDF'; the UI provides those.",
    "- Use a professional, polite tone with no slang or excessive emojis.",
    "- When drafting a contract, use a clear format: title, introduction, numbered clauses, signatures.",
    "- After the contract, always append the risk assessment section in this exact format:",
    "=== RISK ASSESSMENT ===",
    "OVERALL: [GREEN|YELLOW|RED] — one short sentence.",
    "- [GREEN|YELLOW|RED] | Clause X (clause name): brief risk explanation and recommendation.",
    "- [GREEN|YELLOW|RED] | Clause Y (clause name): brief risk explanation and recommendation.",
    "- [GREEN|YELLOW|RED] | Clause Z (clause name): brief risk explanation and recommendation.",
    "=== END RISK ===",
    "- Do not write anything after === END RISK ===.",
  ];

  return {
    role: "system",
    content: (lang === "ar" ? arInstructions : enInstructions).join("\n"),
  };
}

function userLanguageReminder(lang) {
  if (lang === "ar") {
    return "\n\nتذكير: ردّ بالعربية الفصحى فقط. ممنوع أي نص إنجليزي إلا GREEN/YELLOW/RED.";
  }
  return "\n\nReminder: reply in English only. No Arabic text except literal Arabic clauses if requested.";
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { messages, message, file, lang: clientLang } = req.body || {};

    // Determine language from the CURRENT user message, not history.
    const currentUserText = (message || "").toString();
    const detectedLang = detectLanguage(currentUserText);
    const isEnglish = detectedLang === "en";

    // -----------------------------------------------------------------------
    // File handling
    // -----------------------------------------------------------------------
    let fileContext = "";
    if (file && file.base64) {
      const extraction = await extractPdfText(file.base64);

      if (extraction.reason === "empty") {
        return res.status(400).json({
          reply: isEnglish
            ? "The uploaded PDF appears to be empty. Please upload a valid file."
            : "يبدو أن ملف PDF فارغ. يرجى رفع ملف صالح.",
        });
      }

      if (extraction.reason === "corrupted") {
        // Use browser-extracted text as fallback if provided.
        const browserText = file.text || "";
        if (browserText.length > 30) {
          fileContext = isEnglish
            ? `\n\n[Extracted file text from ${file.name}]:\n${browserText.substring(0, 12000)}`
            : `\n\n[نص مستخرج من الملف ${file.name}]:\n${browserText.substring(0, 12000)}`;
        } else {
          return res.status(400).json({
            reply: isEnglish
              ? "Could not read the PDF. It may be corrupted or scanned. Please try another file."
              : "تعذّر قراءة ملف PDF. قد يكون تالفاً أو ممسوحاً ضوئياً. جرّب ملفاً آخر.",
          });
        }
      } else {
        fileContext = isEnglish
          ? `\n\n[Extracted file text from ${file.name}]:\n${extraction.text}`
          : `\n\n[نص مستخرج من الملف ${file.name}]:\n${extraction.text}`;
      }
    }

    // -----------------------------------------------------------------------
    // Build messages
    // -----------------------------------------------------------------------
    const systemPrompt = buildSystemPrompt(detectedLang);

    let incomingMessages = Array.isArray(messages) ? messages : [];

    // Filter history to valid role/content pairs and append file context to the last user message.
    const history = incomingMessages
      .filter((m) => m && typeof m.content === "string" && ["user", "assistant", "system"].includes(m.role))
      .map((m) => ({ role: m.role, content: m.content }));

    // The last message should be the current user message; attach file context there.
    if (history.length > 0 && history[history.length - 1].role === "user") {
      history[history.length - 1].content += fileContext;
      history[history.length - 1].content += userLanguageReminder(detectedLang);
    } else if (currentUserText) {
      history.push({
        role: "user",
        content: currentUserText + fileContext + userLanguageReminder(detectedLang),
      });
    }

    const finalMessages = [systemPrompt, ...history];

    // -----------------------------------------------------------------------
    // AI call
    // -----------------------------------------------------------------------
    if (!API_KEY) {
      return res.status(500).json({
        reply: isEnglish
          ? "AI service is not configured. Please contact support."
          : "خدمة الذكاء الاصطناعي غير مُعدّة. يرجى التواصل مع الدعم.",
      });
    }

    const aiRes = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: finalMessages,
        temperature: 0.25,
        max_tokens: 2500,
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      const text = await aiRes.text();
      console.error("AI API error:", status, text);
      return res.status(200).json({
        reply: isEnglish
          ? "An error occurred while contacting the AI model. Please try again in a moment."
          : "حدث خطأ أثناء التواصل مع نموذج الذكاء الاصطناعي. حاول مرة أخرى بعد قليل.",
      });
    }

    const aiData = await aiRes.json();
    let reply = aiData.choices?.[0]?.message?.content || "";

    if (!reply) {
      return res.status(200).json({
        reply: isEnglish
          ? "Sorry, I couldn't generate a reply."
          : "عذراً، لم أتمكن من توليد رد.",
      });
    }

    reply = sanitizeReply(reply, detectedLang);

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    const fallbackLang = req.body && req.body.lang === "en" ? "en" : "ar";
    return res.status(500).json({
      reply: fallbackLang === "en"
        ? "An unexpected error occurred. Please try again."
        : "حدث خطأ غير متوقع. حاول مرة أخرى.",
    });
  }
});

module.exports = router;
